#!/usr/bin/env python3
"""
serve.py — Sensor (USB) → MQTT → API

Lê a porta serial de um sensor de contagem ligado por cabo USB (em vez
do ESP32 por WiFi) e publica cada peça detectada no broker MQTT
embutido da API — no mesmo formato que esp32_simulator.py usa, pro
resto do sistema (backend, dashboard, totem) não enxergar diferença
nenhuma entre as duas origens.

Um arquivo só, sem classes, configuração por constante no topo (sem
argumento de linha de comando) — e uma página web (Flask) em
http://localhost:5000 (ou do celular, mesma rede: http://SEU_IP:5000)
pra ver o que está acontecendo sem precisar ler log de terminal.

Precisa do Flask instalado: pip install flask

Como rodar:
    python3 serve.py

PROTOCOLO REAL DO SENSOR (descoberto testando com --debug em 09/2026):
o firmware da placa fala um protocolo textual próprio, um comando por
linha, 9600 baud. No boot manda um banner:

    Distancia base: 37.01 cm
    Sistema pronto.
    Comandos: RESET, STATUS, CALIBRAR, HELP
    Contagem atual: 0

E, sozinho — sem precisar perguntar nada —, manda DUAS linhas toda vez
que detecta uma peça passando (mede distância por ultrassom; "Total" é
a contagem acumulada desde o último RESET/boot):

    COUNT:15
    Doce detectado. Distancia: 9.81 cm. Total: 15

Este script usa só a linha `COUNT:N` (ignora a "Doce detectado..." —
mesma informação, redundante) e calcula a DIFERENÇA entre o N novo e o
último N visto — nunca assume "sempre +1", pra se corrigir sozinho se
alguma linha se perder no caminho. Se o firmware for atualizado e o
formato mudar, ajuste CONTAGEM_RE e a função thread_sensor().
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

# Fila local de eventos que ainda não foram confirmados no servidor — ver
# "FILA LOCAL" mais abaixo. Fica ao lado deste arquivo, sobrevive a reinícios
# do script (não do computador desligar/o Arduino perder energia — isso é
# uma limitação de hardware que não dá pra resolver por software nenhum).
FILA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fila_eventos.jsonl")
FILA_RETRY_SECONDS = 10  # de quanto em quanto tempo tenta esvaziar a fila sozinha


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
    "fila_pendente": 0,            # peças já contadas mas ainda não confirmadas no servidor
}
estado_lock = threading.Lock()

# fd da porta serial atualmente aberta, pra dar pro Flask escrever nela (pedir
# RESET) — a thread do sensor é dona de abrir/fechar; o Flask só usa se
# estiver disponível. None enquanto não há porta aberta (ou entre reconexões).
serial_fd_atual = None
serial_fd_lock = threading.Lock()


def enviar_comando_arduino(comando: str) -> bool:
    """Escreve um comando (ex.: "RESET") na porta serial aberta agora, se houver."""
    with serial_fd_lock:
        if serial_fd_atual is None:
            return False
        try:
            os.write(serial_fd_atual, (comando + "\n").encode("utf-8"))
            return True
        except OSError:
            return False


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
# FILA LOCAL — nada de contagem se perde se a API/rede cair
# ============================================================
#
# Toda peça detectada é gravada aqui ANTES de tentar publicar no MQTT
# (arquivo em disco, uma linha JSON por evento). Só sai da fila quando o
# publish é confirmado com sucesso. Se a API ou a rede caírem, os
# eventos continuam se acumulando no arquivo — nada é descartado — e a
# ponte tenta esvaziar a fila de novo sozinha, tanto a cada nova
# detecção quanto periodicamente (FILA_RETRY_SECONDS), até conseguir.
#
# Importante deixar claro o que isso cobre e o que não cobre: isso
# protege contra o SERVIDOR ou a REDE caírem enquanto o sensor continua
# ligado e mandando dado pra ponte. Não protege contra o computador
# rodando este script (ou o próprio Arduino) perder energia — nesse
# caso o que ainda não tinha sido gravado no arquivo (ou o que o
# Arduino ainda não tinha mandado) se perde mesmo, e não tem jeito de
# recuperar isso só por software daqui.

fila_lock = threading.Lock()


def _ler_fila() -> list[dict]:
    if not os.path.exists(FILA_PATH):
        return []
    eventos = []
    with open(FILA_PATH, "r", encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip()
            if not linha:
                continue
            try:
                eventos.append(json.loads(linha))
            except json.JSONDecodeError:
                continue  # linha corrompida (ex.: escrita interrompida) — ignora, não trava a fila
    return eventos


def _escrever_fila(eventos: list[dict]):
    with open(FILA_PATH, "w", encoding="utf-8") as f:
        for evento in eventos:
            f.write(json.dumps(evento) + "\n")


def enfileirar_producao(quantidade: int):
    """
    Grava uma peça contada na fila local — chamado ANTES de qualquer
    tentativa de publicar no MQTT, pra a contagem nunca depender de a
    rede estar de pé no exato momento em que ela aconteceu.
    """
    evento = {
        "event_uid": f"{DEVICE_ID}-{uuid.uuid4()}",
        "quantity": quantidade,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    with fila_lock:
        eventos = _ler_fila()
        eventos.append(evento)
        _escrever_fila(eventos)
    with estado_lock:
        estado["fila_pendente"] = len(eventos)


def tentar_esvaziar_fila():
    """
    Tenta publicar, em ordem, cada evento ainda pendente na fila. Para
    no primeiro que falhar (preserva a ordem cronológica — não faz
    sentido confirmar um evento mais novo antes de um mais velho) e
    tenta o resto de novo na próxima chamada.
    """
    with fila_lock:
        eventos = _ler_fila()
        if not eventos:
            return

        restantes = list(eventos)
        for evento in eventos:
            try:
                mqtt_publish(f"gp/{DEVICE_ID}/production", json.dumps(evento))
            except Exception as error:
                with estado_lock:
                    estado["ultimo_erro"] = f"Fila com {len(restantes)} pendente(s) — falha ao publicar: {error}"
                break
            restantes.pop(0)
            with estado_lock:
                estado["total_enviado"] += evento["quantity"]
                estado["eventos_enviados"] += 1
                estado["ultimo_envio_em"] = datetime.now().strftime("%H:%M:%S")

        if len(restantes) != len(eventos):
            _escrever_fila(restantes)

    with estado_lock:
        estado["fila_pendente"] = len(restantes)
        if not restantes:
            estado["ultimo_erro"] = None


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
# (ver a explicação completa do protocolo no topo do arquivo)
# ============================================================

CONTAGEM_RE = re.compile(r"^(?:COUNT:|Contagem atual:)\s*(\d+)\s*$")


def thread_sensor():
    ultima_contagem = None
    ultimo_heartbeat = 0.0
    ultima_tentativa_fila = 0.0

    # Se o script travou/reiniciou com peças ainda presas na fila de uma
    # execução anterior, tenta entregar elas já na largada.
    tentar_esvaziar_fila()

    while True:
        fd = None
        try:
            porta = resolver_porta(SERIAL_PORT)
            fd = abrir_serial(porta, BAUD_RATE)
            with serial_fd_lock:
                global serial_fd_atual
                serial_fd_atual = fd
            with estado_lock:
                estado["conectado"] = True
                estado["porta"] = porta

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

                # Tenta esvaziar a fila periodicamente mesmo sem detecção
                # nova — senão, se a API voltar mas o sensor não mandar mais
                # nada por um tempo, o que já tinha ficado pendente ficaria
                # parado esperando a próxima peça pra ser reenviado.
                if time.time() - ultima_tentativa_fila >= FILA_RETRY_SECONDS:
                    tentar_esvaziar_fila()
                    ultima_tentativa_fila = time.time()

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

                # Grava na fila ANTES de tentar publicar — a partir daqui a
                # peça está segura em disco, não depende mais da rede/API
                # estarem de pé neste exato instante pra não se perder.
                enfileirar_producao(diferenca)
                tentar_esvaziar_fila()

        except Exception as error:
            with serial_fd_lock:
                serial_fd_atual = None
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
    # Página renderizada UMA vez só — não recarrega mais sozinha (nada de
    # <meta refresh>, que pisca a tela inteira). O JS abaixo busca /status
    # a cada 2s em segundo plano (fetch) e só troca o TEXTO das células que
    # mudaram — atualização "silenciosa", sem piscar nem perder o scroll.
    return f"""
    <!doctype html>
    <html><head>
      <meta charset="utf-8">
      <title>Sensor → API</title>
      <style>
        body {{ font-family: system-ui, sans-serif; background: #f1f5f9; padding: 32px; color: #0f172a; }}
        .card {{ background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; max-width: 480px; }}
        .status {{ display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; transition: background-color 0.3s; }}
        table {{ width: 100%; margin-top: 16px; border-collapse: collapse; }}
        td {{ padding: 6px 0; border-bottom: 1px solid #f1f5f9; }}
        td:first-child {{ color: #64748b; font-size: 13px; }}
        td:last-child {{ text-align: right; font-family: monospace; font-weight: bold; }}
        button {{ margin-top: 20px; width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #334155; font-weight: bold; font-size: 13px; cursor: pointer; }}
        button:hover {{ background: #f1f5f9; }}
        button:disabled {{ opacity: 0.5; cursor: not-allowed; }}
        #reset_msg {{ margin-top: 8px; font-size: 12px; text-align: center; }}
      </style>
    </head><body>
      <div class="card">
        <h2><span class="status" id="dot"></span><span id="titulo">Carregando…</span> — {SERIAL_PORT}</h2>
        <table>
          <tr><td>Device</td><td>{DEVICE_ID}</td></tr>
          <tr><td>Última linha do sensor</td><td id="ultima_linha_crua">—</td></tr>
          <tr><td>Contagem do sensor</td><td id="contagem_sensor">—</td></tr>
          <tr><td>Total enviado pro sistema</td><td id="total_enviado">—</td></tr>
          <tr><td>Eventos enviados</td><td id="eventos_enviados">—</td></tr>
          <tr><td>Último envio</td><td id="ultimo_envio_em">—</td></tr>
          <tr><td>Na fila (ainda não confirmado)</td><td id="fila_pendente" style="color:#d97706">—</td></tr>
          <tr><td>Último erro</td><td id="ultimo_erro" style="color:#dc2626">—</td></tr>
        </table>
        <button id="btn_reset" onclick="resetarArduino()">↺ Zerar contador do Arduino</button>
        <p id="reset_msg"></p>
      </div>
      <script>
        async function atualizar() {{
          let e;
          try {{
            e = await (await fetch('/status')).json();
          }} catch {{
            return; // rede/servidor fora do ar por um instante — tenta de novo no próximo ciclo
          }}
          document.getElementById('dot').style.backgroundColor = e.conectado ? '#059669' : '#dc2626';
          document.getElementById('titulo').textContent = e.conectado ? 'Conectado' : 'Desconectado';
          document.getElementById('ultima_linha_crua').textContent = e.ultima_linha_crua || '—';
          document.getElementById('contagem_sensor').textContent = e.contagem_sensor ?? '—';
          document.getElementById('total_enviado').textContent = e.total_enviado + ' peças';
          document.getElementById('eventos_enviados').textContent = e.eventos_enviados;
          document.getElementById('ultimo_envio_em').textContent = e.ultimo_envio_em || '—';
          document.getElementById('fila_pendente').textContent = e.fila_pendente ? (e.fila_pendente + ' peça(s)') : 'nenhuma';
          document.getElementById('ultimo_erro').textContent = e.ultimo_erro || '—';
          document.getElementById('btn_reset').disabled = !e.conectado || !!e.fila_pendente;
        }}
        async function resetarArduino() {{
          const msg = document.getElementById('reset_msg');
          msg.style.color = '#64748b';
          msg.textContent = 'Enviando RESET...';
          try {{
            const r = await fetch('/reset', {{ method: 'POST' }});
            const d = await r.json();
            if (d.ok) {{
              msg.style.color = '#059669';
              msg.textContent = 'Contador zerado.';
            }} else {{
              msg.style.color = '#dc2626';
              msg.textContent = d.motivo;
            }}
          }} catch {{
            msg.style.color = '#dc2626';
            msg.textContent = 'Falha ao falar com o servidor.';
          }}
        }}
        atualizar();
        setInterval(atualizar, 2000);
      </script>
    </body></html>
    """


@app.get("/status")
def status_json():
    with estado_lock:
        return jsonify(estado)


@app.post("/reset")
def resetar_arduino():
    """
    Manda RESET pro Arduino (zera o contador dele). Só permite se a fila
    local estiver vazia — resetar com peça ainda não confirmada no
    servidor faria essa diferença nunca mais ser calculada (o próximo
    COUNT que chegar já vem baixo, e o bridge trataria como se o
    sensor tivesse reiniciado sozinho, sem gerar evento nenhum pra ela).
    """
    with estado_lock:
        pendente = estado["fila_pendente"]
    if pendente:
        return jsonify({
            "ok": False,
            "motivo": f"Ainda tem {pendente} peça(s) na fila, não confirmadas no servidor — espera esvaziar antes de resetar.",
        }), 409

    if not enviar_comando_arduino("RESET"):
        return jsonify({"ok": False, "motivo": "Sensor não está conectado agora."}), 503

    return jsonify({"ok": True})


if __name__ == "__main__":
    threading.Thread(target=thread_sensor, daemon=True).start()
    print(f"🌐 Abra http://localhost:{FLASK_PORT} pra ver o status ao vivo")
    # use_reloader=False é essencial: o reloader do Flask sobe um SEGUNDO
    # processo em dev, que tentaria abrir a porta serial duas vezes ao
    # mesmo tempo e falharia.
    app.run(host="0.0.0.0", port=FLASK_PORT, use_reloader=False)
