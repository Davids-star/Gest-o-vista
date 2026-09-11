#!/usr/bin/env python3
"""
Ponte Sensor Serial (USB/Cabo) → MQTT - Sistema GP

Pro cenário atual: em vez do ESP32 (WiFi), o sensor de contagem vem
ligado direto no computador por cabo USB — aparece como uma porta
serial (/dev/ttyUSB0, /dev/ttyACM0 no Linux). Este script lê o que
chega nessa porta e publica no broker MQTT embutido da API, exatamente
no mesmo formato que o esp32_simulator.py já usa — pro resto do
sistema (backend, dashboard, totem) não enxergar diferença nenhuma
entre "veio do ESP32 por WiFi" e "veio do sensor por cabo".

PROTOCOLO REAL DO SENSOR (descoberto testando com --debug em
09/2026 — ver SerialBridge._processar_linha mais abaixo): o firmware
da placa fala um protocolo textual próprio, um comando por linha,
9600 baud. No boot ele manda um banner:

    Distancia base: 37.01 cm
    Sistema pronto.
    Comandos: RESET, STATUS, CALIBRAR, HELP
    Contagem atual: 0

E, sozinho — sem precisar perguntar nada —, manda DUAS linhas toda
vez que detecta uma peça passando (mede distância por ultrassom;
"Total" é a contagem acumulada desde o último RESET/boot):

    COUNT:15
    Doce detectado. Distancia: 9.81 cm. Total: 15

A ponte usa só a linha `COUNT:N` (ignora a "Doce detectado..." —
mesma informação, só mais redundância) e calcula a DIFERENÇA entre
o N novo e o último N visto, pra descobrir quantas peças novas
contar — nunca assume "sempre +1", porque se uma linha se perder no
caminho o total ainda corrige sozinho na próxima. A primeira leitura
de contagem (banner ou primeiro COUNT:) só define a base — não gera
evento de produção (senão contaria de novo tudo que o sensor já
tinha contado antes da ponte conectar).

Se o firmware for atualizado e o formato mudar, ajuste o regex
`CONTAGEM_RE` e `SerialBridge._processar_linha`. Rode com --debug
pra ver a linha crua antes de qualquer interpretação.

Não tem dependência nenhuma além do Python padrão — a leitura da
porta serial usa só `termios`/`os`/`fcntl` (sem pyserial), do mesmo
jeito que o cliente MQTT usa só `socket` puro (ver esp32_simulator.py).
Funciona em Linux/macOS; não funciona no Windows (termios não existe
lá — nesse caso, instale `pyserial` e adapte a classe SerialPort).

Exemplo:

    python3 serial_sensor_bridge.py --list-ports
    python3 serial_sensor_bridge.py --port /dev/ttyUSB0 --device ESP32-MQ-01-SENSOR-01 --debug
"""

import argparse
import fcntl
import glob
import json
import os
import re
import socket
import termios
import time
import uuid

from datetime import datetime, timezone


# ============================================================
# CLIENTE MQTT — idêntico ao de esp32_simulator.py (duplicado de
# propósito: cada script deste diretório é autocontido, sem módulo
# compartilhado, pra poder ser copiado/rodado sozinho num Raspberry
# Pi ou outra máquina de chão de fábrica sem levar mais nada junto).
# ============================================================


class MqttClient:
    """Publica no broker MQTT via socket TCP puro (QoS 0, sem lib externa)."""

    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port

    def publish(self, topic: str, payload: str):
        socket_client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        socket_client.settimeout(5)
        try:
            socket_client.connect((self.host, self.port))
            self._connect(socket_client)
            self._publish(socket_client, topic, payload)
        finally:
            socket_client.close()

    def _connect(self, socket_client):
        client_id = f"serial_bridge_{uuid.uuid4().hex[:6]}".encode("utf-8")
        protocol_name = b"MQTT"
        protocol_header = (
            bytes([0x00, len(protocol_name)]) + protocol_name
            + bytes([0x04, 0x02, 0x00, 0x3C])
        )
        payload = bytes([0x00, len(client_id)]) + client_id
        remaining_length = len(protocol_header) + len(payload)
        packet = (
            bytes([0x10])
            + self._encode_remaining_length(remaining_length)
            + protocol_header
            + payload
        )
        socket_client.sendall(packet)
        response = socket_client.recv(4)
        if not response or len(response) < 4 or response[0] != 0x20 or response[3] != 0x00:
            raise RuntimeError(f"Falha no CONNACK MQTT: {response.hex() if response else 'sem resposta'}")

    def _publish(self, socket_client, topic: str, payload: str):
        topic_bytes = topic.encode("utf-8")
        payload_bytes = payload.encode("utf-8")
        variable_header = bytes([0x00, len(topic_bytes)]) + topic_bytes
        remaining_length = len(variable_header) + len(payload_bytes)
        packet = (
            bytes([0x30])
            + self._encode_remaining_length(remaining_length)
            + variable_header
            + payload_bytes
        )
        socket_client.sendall(packet)

    @staticmethod
    def _encode_remaining_length(value: int) -> bytes:
        result = bytearray()
        while True:
            digit = value % 128
            value //= 128
            if value > 0:
                digit |= 128
            result.append(digit)
            if value == 0:
                break
        return bytes(result)


# ============================================================
# PORTA SERIAL — leitura crua via termios (sem pyserial)
# ============================================================


BAUD_RATES = {
    1200: termios.B1200,
    2400: termios.B2400,
    4800: termios.B4800,
    9600: termios.B9600,
    19200: termios.B19200,
    38400: termios.B38400,
    57600: termios.B57600,
    115200: termios.B115200,
}


class SerialPort:
    """
    Porta serial em modo "raw" (sem eco, sem processamento de linha
    pelo driver — line buffering é feito aqui mesmo, em `read_line`),
    lendo byte a byte até um '\n'. Suficiente pra qualquer sensor que
    fale texto linha-a-linha, que é o caso mais comum pra esse tipo
    de contador (Arduino/microcontrolador simples "printando" cada
    peça contada).
    """

    def __init__(self, path: str, baud: int):
        if baud not in BAUD_RATES:
            raise ValueError(
                f"Baud rate {baud} não suportado. Use um de: {sorted(BAUD_RATES)}"
            )

        self.path = path
        self.fd = os.open(path, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)

        # Tira o O_NONBLOCK depois de abrir (só precisamos dele pra abrir
        # sem travar esperando DCD em portas USB-serial que não usam isso).
        flags = fcntl.fcntl(self.fd, fcntl.F_GETFL)
        fcntl.fcntl(self.fd, fcntl.F_SETFL, flags & ~os.O_NONBLOCK)

        attrs = termios.tcgetattr(self.fd)
        iflag, oflag, cflag, lflag, ispeed, ospeed, cc = attrs

        baud_const = BAUD_RATES[baud]
        ispeed = baud_const
        ospeed = baud_const

        # Modo raw: sem processamento de entrada/saída, sem eco, sem
        # sinais de controle (Ctrl+C etc. não fazem sentido numa porta
        # de sensor) — igual ao que termios.setraw() faria.
        iflag = 0
        oflag = 0
        lflag = 0
        cflag |= termios.CS8 | termios.CREAD | termios.CLOCAL
        cflag &= ~termios.PARENB
        cflag &= ~termios.CSTOPB
        cflag &= ~termios.CSIZE

        # VMIN=0, VTIME=1: read() volta em até 100ms mesmo sem dado
        # nenhum — permite checar Ctrl+C periodicamente em vez de
        # travar pra sempre esperando o próximo byte.
        cc[termios.VMIN] = 0
        cc[termios.VTIME] = 1

        termios.tcsetattr(
            self.fd, termios.TCSANOW,
            [iflag, oflag, cflag, lflag, ispeed, ospeed, cc],
        )

        self._buffer = b""

    def read_line(self) -> str | None:
        """
        Retorna uma linha completa (sem o '\n'), ou None se nenhuma
        linha nova chegou ainda nesta checagem.
        """
        chunk = os.read(self.fd, 256)
        if chunk:
            self._buffer += chunk

        if b"\n" not in self._buffer:
            return None

        line, self._buffer = self._buffer.split(b"\n", 1)
        return line.decode("utf-8", errors="replace").strip("\r\n \t")

    def close(self):
        os.close(self.fd)


def listar_portas():
    """Lista as portas seriais USB que o kernel enxerga agora."""
    portas = sorted(glob.glob("/dev/ttyUSB*") + glob.glob("/dev/ttyACM*"))
    if not portas:
        print("Nenhuma porta serial USB encontrada (/dev/ttyUSB* ou /dev/ttyACM*).")
        print("Confira se o cabo está conectado — 'dmesg | tail' costuma mostrar o dispositivo assim que ele é plugado.")
        return
    print("Portas seriais encontradas:")
    for p in portas:
        print(f"  {p}")


# ============================================================
# INTERPRETAÇÃO DA LINHA — protocolo real do sensor (ver docstring
# do módulo). Só duas formas de linha carregam uma contagem; tudo o
# mais ("Sistema pronto.", "Comandos: ...", "Distancia atual: ...",
# "Doce detectado...", "WARNING: ...") é log informativo e é ignorado.
# ============================================================

CONTAGEM_RE = re.compile(r"^(?:COUNT:|Contagem atual:)\s*(\d+)\s*$")


def extrair_contagem(linha: str) -> int | None:
    """
    Extrai o total acumulado de uma linha "COUNT:N" ou
    "Contagem atual: N" (essa segunda só aparece no banner de boot e
    na resposta do comando STATUS). Retorna None pra qualquer outra
    linha — inclusive "Doce detectado...Total: N", que carrega a
    mesma informação só que redundante; usar as duas contaria cada
    peça em dobro.
    """
    m = CONTAGEM_RE.match(linha.strip())
    return int(m.group(1)) if m else None


# ============================================================
# GERADOR DE EVENTOS — mesmo formato do esp32_simulator.py
# ============================================================


class ProductionEventGenerator:
    def __init__(self, device: str):
        self.device = device

    def create_event(self, quantity: int) -> dict:
        return {
            "event_uid": f"{self.device}-{uuid.uuid4()}",
            "quantity": quantity,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        }


# ============================================================
# PONTE
# ============================================================


class SerialBridge:
    def __init__(self, serial_port: SerialPort, mqtt: MqttClient, device: str,
                 heartbeat_interval: float, debug: bool):
        self.serial_port = serial_port
        self.mqtt = mqtt
        self.device = device
        self.heartbeat_interval = heartbeat_interval
        self.debug = debug

        self.event_generator = ProductionEventGenerator(device)
        self.production_topic = f"gp/{device}/production"
        self.heartbeat_topic = f"gp/{device}/heartbeat"

        self.last_heartbeat = 0.0
        self.total_events = 0
        self.total_pecas = 0

        # Último total que o sensor reportou (via "COUNT:N" ou o
        # "Contagem atual: N" do boot) — None até a primeira leitura,
        # pra distinguir "ainda não sei" de "sensor mandou zero".
        self.ultima_contagem = None

    def run(self):
        self._print_header()
        try:
            while True:
                self._process_heartbeat()

                linha = self.serial_port.read_line()
                if linha is None:
                    continue

                if self.debug:
                    self._log("📥", f"Linha recebida (crua): {linha!r}")

                self._processar_linha(linha)
        except KeyboardInterrupt:
            pass
        finally:
            self.serial_port.close()
        self._print_shutdown()

    def _processar_linha(self, linha: str):
        total_sensor = extrair_contagem(linha)
        if total_sensor is None:
            return  # linha informativa (banner, "Doce detectado...", etc.)

        if self.ultima_contagem is None:
            # Primeira contagem vista — só define a referência. Não
            # gera evento: senão a ponte recontaria, na conexão, tudo
            # que o sensor já tinha contado antes dela existir.
            self.ultima_contagem = total_sensor
            self._log("ℹ️", f"Contagem inicial do sensor: {total_sensor}")
            return

        diferenca = total_sensor - self.ultima_contagem
        self.ultima_contagem = total_sensor

        if diferenca <= 0:
            # Sensor reiniciou/zerou (RESET) ou mandou o mesmo total
            # de novo — nunca manda evento negativo/zero pro backend,
            # só realinha a referência com o novo valor.
            if diferenca < 0:
                self._log("⚠️", f"Contagem do sensor voltou pra trás (RESET?): agora {total_sensor}")
            return

        self._enviar_producao(diferenca)

    def _process_heartbeat(self):
        if self.heartbeat_interval <= 0:
            return
        if time.time() - self.last_heartbeat < self.heartbeat_interval:
            return
        payload = {"ts": datetime.now(timezone.utc).isoformat()}
        try:
            self.mqtt.publish(self.heartbeat_topic, json.dumps(payload))
            if self.debug:
                self._log("❤️", "Heartbeat enviado")
        except Exception as error:
            self._log("❌", f"Erro no heartbeat: {error}")
        self.last_heartbeat = time.time()

    def _enviar_producao(self, quantidade: int):
        event = self.event_generator.create_event(quantidade)
        try:
            self.mqtt.publish(self.production_topic, json.dumps(event))
            self.total_events += 1
            self.total_pecas += quantidade
            self._log("⚡", f"Produção #{self.total_events} → {quantidade} peça(s)")
        except Exception as error:
            self._log("❌", f"Erro ao publicar produção: {error}")

    def _log(self, icon: str, message: str):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"{icon} [{timestamp}] [{self.device}] {message}")

    def _print_header(self):
        print()
        print("╔══════════════════════════════════════╗")
        print("║   🔌 PONTE SENSOR SERIAL → MQTT - GP  ║")
        print("╚══════════════════════════════════════╝")
        print()
        print(f"Porta serial:        {self.serial_port.path}")
        print(f"Device:              {self.device}")
        print(f"Heartbeat:           {self.heartbeat_interval}s")
        print()
        print("Aguardando dados do sensor... (Ctrl+C pra encerrar)")
        print()

    def _print_shutdown(self):
        print()
        print(f"🛑 [{self.device}] Ponte encerrada.")
        print(f"📊 [{self.device}] Total: {self.total_events} evento(s), {self.total_pecas} peça(s)")


# ============================================================
# ARGUMENTOS / MAIN
# ============================================================


def parse_arguments():
    parser = argparse.ArgumentParser(description="Ponte Sensor Serial (USB) → MQTT - Sistema GP")

    parser.add_argument("--list-ports", action="store_true",
                         help="Lista as portas seriais USB encontradas e sai")
    parser.add_argument("--port", help="Porta serial do sensor (ex.: /dev/ttyUSB0)")
    parser.add_argument("--baud", type=int, default=9600,
                         help=f"Baud rate (padrão: 9600). Suportados: {sorted(BAUD_RATES)}")
    parser.add_argument("--device", default="SENSOR-CABO-MQ-01",
                         help="Identificador do device — precisa já existir cadastrado na tabela devices (mesma regra do esp32_simulator.py)")
    parser.add_argument("--host", default="localhost", help="Host do broker MQTT")
    parser.add_argument("--mqtt-port", type=int, default=1883, help="Porta do broker MQTT")
    parser.add_argument("--heartbeat-interval", type=float, default=10.0,
                         help="Segundos entre heartbeats (0 desliga)")
    parser.add_argument("--debug", action="store_true",
                         help="Mostra cada linha crua recebida da porta serial, antes de interpretar")

    return parser.parse_args()


def main():
    args = parse_arguments()

    if args.list_ports:
        listar_portas()
        return

    if not args.port:
        print("❌ Informe a porta serial com --port (ou rode --list-ports pra descobrir qual é).")
        raise SystemExit(1)

    try:
        serial_port = SerialPort(args.port, args.baud)
    except FileNotFoundError:
        print(f"❌ Porta {args.port} não encontrada. Rode --list-ports pra ver as disponíveis.")
        raise SystemExit(1)
    except PermissionError:
        print(
            f"❌ Sem permissão pra abrir {args.port}. "
            f"No Linux, adicione seu usuário ao grupo 'dialout': "
            f"sudo usermod -aG dialout $USER (depois faça logout/login)."
        )
        raise SystemExit(1)

    mqtt = MqttClient(args.host, args.mqtt_port)
    bridge = SerialBridge(
        serial_port, mqtt, args.device,
        heartbeat_interval=args.heartbeat_interval,
        debug=args.debug,
    )
    bridge.run()


if __name__ == "__main__":
    main()
