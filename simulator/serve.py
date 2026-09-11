#!/usr/bin/env python3
"""
serve.py — Sensor (USB) → MQTT → API, versão enxuta com Flask

Faz a mesma ponte que serial_sensor_bridge.py, só que num arquivo só,
sem classes — e com uma página web (Flask) pra ver o que está
acontecendo sem precisar ler log de terminal.

Precisa do Flask instalado: pip install flask

Como rodar:
    python3 serve.py

Depois abre no navegador: http://localhost:5000
(ou do celular, na mesma rede: http://SEU_IP:5000)

Configuração — edite as constantes logo abaixo, não tem argumento de
linha de comando (é isso que faz esse arquivo ser mais enxuto que o
serial_sensor_bridge.py).
"""

import fcntl
import glob
import json
import os
import re
import socket
import termios
import threading
import time
import uuid
from datetime import datetime, timezone

from flask import Flask, jsonify

# ============================================================
# CONFIGURAÇÃO — mude aqui, não tem --flag
# ============================================================

SERIAL_PORT = "/dev/ttyUSB0"
BAUD_RATE = 9600
DEVICE_ID = "ESP32-MQ-01-SENSOR-01"   # precisa já existir na tabela devices
MQTT_HOST = "localhost"
MQTT_PORT = 1883
FLASK_PORT = 5000
HEARTBEAT_SECONDS = 10


# ============================================================
# ESTADO COMPARTILHADO — a thread do sensor escreve, o Flask só lê
# ============================================================

estado = {
    "conectado": False,
    "porta": SERIAL_PORT,
    "ultima_linha_crua": None,
    "contagem_sensor": None,       # último total que o sensor reportou
    "total_enviado": 0,            # soma de peças já publicadas no MQTT
    "eventos_enviados": 0,
    "ultimo_envio_em": None,
    "ultimo_erro": None,
}
estado_lock = threading.Lock()


# ============================================================
# MQTT — publish mínimo (QoS 0), sem lib externa
# ============================================================

def _mqtt_remaining_length(n):
    out = bytearray()
    while True:
        b = n % 128
        n //= 128
        if n > 0:
            b |= 128
        out.append(b)
        if n == 0:
            return bytes(out)


def mqtt_publish(topic: str, payload: str):
    client_id = f"serve_{uuid.uuid4().hex[:6]}".encode()
    connect_pkt = (
        bytes([0x10])
        + _mqtt_remaining_length(10 + 2 + len(client_id))
        + bytes([0x00, 0x04]) + b"MQTT" + bytes([0x04, 0x02, 0x00, 0x3C])
        + bytes([0x00, len(client_id)]) + client_id
    )
    topic_b = topic.encode()
    payload_b = payload.encode()
    publish_body = bytes([0x00, len(topic_b)]) + topic_b + payload_b
    publish_pkt = bytes([0x30]) + _mqtt_remaining_length(len(publish_body)) + publish_body

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    try:
        sock.connect((MQTT_HOST, MQTT_PORT))
        sock.sendall(connect_pkt)
        ack = sock.recv(4)
        if len(ack) < 4 or ack[0] != 0x20 or ack[3] != 0x00:
            raise RuntimeError(f"CONNACK inválido: {ack!r}")
        sock.sendall(publish_pkt)
    finally:
        sock.close()


# ============================================================
# SERIAL — leitura crua linha a linha (termios, sem pyserial)
# ============================================================

def resolver_porta(porta_preferida: str) -> str:
    """
    Se a porta configurada não existir mais (USB reconectado, o Linux às
    vezes numera de novo — ttyUSB0 vira ttyUSB1), usa a primeira porta
    USB serial que encontrar em vez de ficar tentando pra sempre uma
    porta que sumiu.
    """
    if os.path.exists(porta_preferida):
        return porta_preferida
    encontradas = sorted(glob.glob("/dev/ttyUSB*") + glob.glob("/dev/ttyACM*"))
    if encontradas:
        return encontradas[0]
    return porta_preferida  # nenhuma encontrada — mantém a original pro erro ficar claro


def abrir_serial(porta: str, baud: int):
    # Abre em O_NONBLOCK só pra não travar no open() em si (comum em porta
    # serial "de verdade" esperando sinal de linha) — e tira a flag logo
    # depois, senão os.read() nunca respeitaria o VMIN/VTIME configurado
    # abaixo e a leitura viraria um loop apertado gastando CPU à toa.
    fd = os.open(porta, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
    flags = fcntl.fcntl(fd, fcntl.F_GETFL)
    fcntl.fcntl(fd, fcntl.F_SETFL, flags & ~os.O_NONBLOCK)

    iflag = oflag = lflag = 0
    cflag = termios.CS8 | termios.CREAD | termios.CLOCAL
    cc = [0] * len(termios.tcgetattr(fd)[-1])
    cc[termios.VMIN] = 0
    cc[termios.VTIME] = 1
    baud_const = getattr(termios, f"B{baud}")
    termios.tcsetattr(fd, termios.TCSANOW, [iflag, oflag, cflag, lflag, baud_const, baud_const, cc])
    return fd


def ler_linhas(fd, porta: str):
    """
    Generator: produz uma linha por vez, sem bloquear pra sempre (VTIME=1 =
    até 100ms de espera por leitura).

    Se o cabo for desconectado, o nó /dev/ttyUSBx some do sistema mas o fd
    já aberto continua "válido" pro Linux — só que os.read() passa a
    retornar vazio NA HORA em vez de esperar os 100ms, o que vira um loop
    apertadíssimo consumindo CPU à toa e nunca mais lê nada de verdade.
    Por isso, a cada leitura vazia, confere se o caminho da porta ainda
    existe — se não existir mais, desiste (o chamador reabre do zero,
    inclusive achando a porta nova se ela renumerou).
    """
    buffer = b""
    vazias_seguidas = 0
    while True:
        chunk = os.read(fd, 256)
        if chunk:
            buffer += chunk
            vazias_seguidas = 0
        else:
            vazias_seguidas += 1
            if vazias_seguidas > 5 and not os.path.exists(porta):
                raise OSError(f"Porta {porta} não existe mais (sensor desconectado?)")
        while b"\n" in buffer:
            linha, buffer = buffer.split(b"\n", 1)
            yield linha.decode("utf-8", errors="replace").strip()


# ============================================================
# PROTOCOLO DO SENSOR — só "COUNT:N" / "Contagem atual: N" importam
# (ver serial_sensor_bridge.py pra explicação completa do protocolo)
# ============================================================

CONTAGEM_RE = re.compile(r"^(?:COUNT:|Contagem atual:)\s*(\d+)\s*$")


def thread_sensor():
    ultima_contagem = None
    ultimo_heartbeat = 0.0

    while True:
        fd = None
        try:
            porta = resolver_porta(SERIAL_PORT)
            fd = abrir_serial(porta, BAUD_RATE)
            with estado_lock:
                estado["conectado"] = True
                estado["porta"] = porta
                estado["ultimo_erro"] = None

            for linha in ler_linhas(fd, porta):
                with estado_lock:
                    estado["ultima_linha_crua"] = linha

                if time.time() - ultimo_heartbeat >= HEARTBEAT_SECONDS:
                    try:
                        mqtt_publish(f"gp/{DEVICE_ID}/heartbeat",
                                      json.dumps({"ts": datetime.now(timezone.utc).isoformat()}))
                    except Exception:
                        pass  # heartbeat falhar não é crítico, tenta de novo no próximo ciclo
                    ultimo_heartbeat = time.time()

                m = CONTAGEM_RE.match(linha)
                if not m:
                    continue
                total_sensor = int(m.group(1))

                with estado_lock:
                    estado["contagem_sensor"] = total_sensor

                if ultima_contagem is None:
                    ultima_contagem = total_sensor
                    continue

                diferenca = total_sensor - ultima_contagem
                ultima_contagem = total_sensor
                if diferenca <= 0:
                    continue  # sensor reiniciou/repetiu — só realinha, não conta

                evento = {
                    "event_uid": f"{DEVICE_ID}-{uuid.uuid4()}",
                    "quantity": diferenca,
                    "occurred_at": datetime.now(timezone.utc).isoformat(),
                }
                try:
                    mqtt_publish(f"gp/{DEVICE_ID}/production", json.dumps(evento))
                    with estado_lock:
                        estado["total_enviado"] += diferenca
                        estado["eventos_enviados"] += 1
                        estado["ultimo_envio_em"] = datetime.now().strftime("%H:%M:%S")
                except Exception as error:
                    with estado_lock:
                        estado["ultimo_erro"] = f"Falha ao publicar no MQTT: {error}"

        except Exception as error:
            with estado_lock:
                estado["conectado"] = False
                estado["ultimo_erro"] = str(error)
            if fd is not None:
                try:
                    os.close(fd)
                except Exception:
                    pass  # fd já pode estar inválido (porta removida) — sem problema
            time.sleep(3)  # porta sumiu/erro — tenta reabrir em alguns segundos (achando a nova, se renumerou)


# ============================================================
# FLASK — página de status (sem front-end nenhum, HTML puro)
# ============================================================

app = Flask(__name__)


@app.get("/")
def pagina_status():
    with estado_lock:
        e = dict(estado)
    cor = "#059669" if e["conectado"] else "#dc2626"
    return f"""
    <!doctype html>
    <html><head>
      <meta charset="utf-8">
      <meta http-equiv="refresh" content="2">
      <title>Sensor → API</title>
      <style>
        body {{ font-family: system-ui, sans-serif; background: #f1f5f9; padding: 32px; color: #0f172a; }}
        .card {{ background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; max-width: 480px; }}
        .status {{ display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: {cor}; margin-right: 8px; }}
        table {{ width: 100%; margin-top: 16px; border-collapse: collapse; }}
        td {{ padding: 6px 0; border-bottom: 1px solid #f1f5f9; }}
        td:first-child {{ color: #64748b; font-size: 13px; }}
        td:last-child {{ text-align: right; font-family: monospace; font-weight: bold; }}
      </style>
    </head><body>
      <div class="card">
        <h2><span class="status"></span>{"Conectado" if e["conectado"] else "Desconectado"} — {SERIAL_PORT}</h2>
        <table>
          <tr><td>Device</td><td>{DEVICE_ID}</td></tr>
          <tr><td>Última linha do sensor</td><td>{e["ultima_linha_crua"] or "—"}</td></tr>
          <tr><td>Contagem do sensor</td><td>{e["contagem_sensor"] if e["contagem_sensor"] is not None else "—"}</td></tr>
          <tr><td>Total enviado pro sistema</td><td>{e["total_enviado"]} peças</td></tr>
          <tr><td>Eventos enviados</td><td>{e["eventos_enviados"]}</td></tr>
          <tr><td>Último envio</td><td>{e["ultimo_envio_em"] or "—"}</td></tr>
          <tr><td>Último erro</td><td style="color:#dc2626">{e["ultimo_erro"] or "—"}</td></tr>
        </table>
      </div>
    </body></html>
    """


@app.get("/status")
def status_json():
    with estado_lock:
        return jsonify(estado)


if __name__ == "__main__":
    threading.Thread(target=thread_sensor, daemon=True).start()
    print(f"🌐 Abra http://localhost:{FLASK_PORT} pra ver o status ao vivo")
    # use_reloader=False é essencial: o reloader do Flask sobe um SEGUNDO
    # processo em dev, que tentaria abrir a porta serial duas vezes ao
    # mesmo tempo e falharia.
    app.run(host="0.0.0.0", port=FLASK_PORT, use_reloader=False)
