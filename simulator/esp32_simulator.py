#!/usr/bin/env python3
"""
Simulador ESP32 - Sistema GP

Simula o comportamento de um sensor ESP32 conectado
a uma máquina de produção.

Comportamento:

    PRODUZINDO
        ↓
    envia pulsos de produção
        ↓
    tempo de produção atingido
        ↓
    PARADO
        ↓
    NÃO envia produção
    CONTINUA enviando heartbeat
        ↓
    tempo de parada atingido
        ↓
    PRODUZINDO novamente
        ↓
    ciclo continua...

Exemplo:

    python3 esp32_simulator.py \
        --interval 2 \
        --production-time 30 \
        --stop-time 150

Mais de uma máquina ao mesmo tempo — repita --device (cada uma roda
em sua própria thread, com o mesmo ciclo PRODUZINDO/PARADO,
independente das outras):

    python3 esp32_simulator.py \
        --device ESP32-MQ-01-SENSOR-01 \
        --device ESP32-MQ-02-SENSOR-01

NOTA — pra ver um "possível parada" nascer de verdade no sistema:
o backend (STOP_DETECTION_SECONDS, ver
api/src/common/constants/stop-detection.constants.ts) usa 120s como
padrão de "sem produção" pra criar uma possible_stop. Use
--stop-time maior que 120 (150+ dá folga confortável) pra garantir
que o ciclo de parada dure o suficiente. O heartbeat continua sendo
enviado durante a parada, então o device nunca fica OFFLINE nesse
teste — só "parado" mesmo, que é o cenário que gera o alerta.
"""

import argparse
import json
import socket
import threading
import time
import uuid

from dataclasses import dataclass, replace
from datetime import datetime, timezone
from enum import Enum


# ============================================================
# ESTADOS DO SIMULADOR
# ============================================================


class MachineState(Enum):
    """
    Estado atual da máquina simulada.
    """

    PRODUCING = "producing"
    STOPPED = "stopped"


# ============================================================
# CONFIGURAÇÃO
# ============================================================


@dataclass
class SimulatorConfig:
    """
    Guarda todas as configurações do simulador.
    """

    host: str
    port: int

    device: str

    production_interval: float
    production_time: float
    stop_time: float

    heartbeat_interval: float

    count: int


# ============================================================
# CLIENTE MQTT
# ============================================================


class MqttClient:
    """
    Responsável pela comunicação MQTT.

    Esta classe não sabe nada sobre produção,
    máquina ou parada.

    Ela apenas recebe:
        tópico + mensagem

    e publica no broker MQTT.
    """

    def __init__(self, host: str, port: int):

        self.host = host
        self.port = port

    def publish(self, topic: str, payload: str):
        """
        Publica uma mensagem MQTT QoS 0.
        """

        socket_client = socket.socket(
            socket.AF_INET,
            socket.SOCK_STREAM
        )

        socket_client.settimeout(5)

        try:

            socket_client.connect(
                (self.host, self.port)
            )

            self._connect(socket_client)

            self._publish(
                socket_client,
                topic,
                payload
            )

        finally:

            socket_client.close()

    # --------------------------------------------------------
    # MQTT CONNECT
    # --------------------------------------------------------

    def _connect(self, socket_client):
        """
        Envia o pacote MQTT CONNECT
        e aguarda o CONNACK.
        """

        client_id = (
            f"esp32_sim_"
            f"{uuid.uuid4().hex[:6]}"
        ).encode("utf-8")

        protocol_name = b"MQTT"

        protocol_header = (
            bytes([
                0x00,
                len(protocol_name)
            ])
            + protocol_name
            + bytes([
                0x04,  # MQTT 3.1.1
                0x02,  # Clean Session
                0x00,
                0x3C   # Keep Alive = 60s
            ])
        )

        payload = (
            bytes([
                0x00,
                len(client_id)
            ])
            + client_id
        )

        remaining_length = (
            len(protocol_header)
            + len(payload)
        )

        packet = (
            bytes([0x10])
            + self._encode_remaining_length(
                remaining_length
            )
            + protocol_header
            + payload
        )

        socket_client.sendall(packet)

        response = socket_client.recv(4)

        if (
            not response
            or len(response) < 4
            or response[0] != 0x20
            or response[3] != 0x00
        ):

            raise RuntimeError(
                "Falha no CONNACK MQTT: "
                f"{response.hex() if response else 'sem resposta'}"
            )

    # --------------------------------------------------------
    # MQTT PUBLISH
    # --------------------------------------------------------

    def _publish(
        self,
        socket_client,
        topic: str,
        payload: str
    ):
        """
        Envia um PUBLISH MQTT QoS 0.
        """

        topic_bytes = topic.encode("utf-8")
        payload_bytes = payload.encode("utf-8")

        variable_header = (
            bytes([
                0x00,
                len(topic_bytes)
            ])
            + topic_bytes
        )

        remaining_length = (
            len(variable_header)
            + len(payload_bytes)
        )

        packet = (
            bytes([0x30])
            + self._encode_remaining_length(
                remaining_length
            )
            + variable_header
            + payload_bytes
        )

        socket_client.sendall(packet)

    # --------------------------------------------------------
    # MQTT REMAINING LENGTH
    # --------------------------------------------------------

    @staticmethod
    def _encode_remaining_length(
        value: int
    ) -> bytes:
        """
        Codifica o Remaining Length
        conforme o protocolo MQTT.
        """

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
# GERADOR DE EVENTOS
# ============================================================


class ProductionEventGenerator:
    """
    Responsável por criar eventos de produção.
    """

    def __init__(self, device: str):

        self.device = device
        self.sequence = 1

    def create_event(self) -> dict:
        """
        Cria um novo evento de produção.
        """

        event_uid = (
            f"{self.device}-"
            f"{uuid.uuid4()}"
        )

        event = {
            "event_uid": event_uid,
            "quantity": 1,
            "occurred_at": datetime.now(
                timezone.utc
            ).isoformat()
        }

        self.sequence += 1

        return event


# ============================================================
# SIMULADOR ESP32
# ============================================================


class Esp32Simulator:
    """
    Controla o comportamento completo
    do ESP32 simulado.

    Responsabilidades:

    - controlar estado da máquina;
    - enviar produção;
    - enviar heartbeat;
    - alternar entre PRODUZINDO e PARADO.
    """

    def __init__(
        self,
        config: SimulatorConfig,
        mqtt: MqttClient,
        stop_event: threading.Event = None
    ):

        self.config = config
        self.mqtt = mqtt
        # Compartilhado entre todas as threads (uma por --device) — permite
        # um Ctrl+C único no processo principal avisar todo mundo de uma
        # vez, já que só a thread principal recebe o KeyboardInterrupt do
        # sistema operacional (ver main()).
        self.stop_event = stop_event or threading.Event()

        self.event_generator = (
            ProductionEventGenerator(
                config.device
            )
        )

        self.state = MachineState.PRODUCING

        self.state_started_at = time.monotonic()
        self.last_production_sent_at = 0.0

        self.last_heartbeat = 0.0

        self.total_events = 0

        self.production_topic = (
            f"gp/{config.device}/production"
        )

        self.heartbeat_topic = (
            f"gp/{config.device}/heartbeat"
        )

    # --------------------------------------------------------
    # INICIAR
    # --------------------------------------------------------

    def run(self):

        self._print_header()

        try:

            while not self.stop_event.is_set():

                self._process_heartbeat()

                self._process_machine_state()

                time.sleep(0.5)

        except KeyboardInterrupt:

            # Só acontece rodando um único device (thread principal recebe
            # o Ctrl+C direto). Com múltiplos devices, quem trata o Ctrl+C
            # é o main() — ver stop_event acima.
            pass

        self._print_shutdown()

    # --------------------------------------------------------
    # HEARTBEAT
    # --------------------------------------------------------

    def _process_heartbeat(self):
        """
        Envia heartbeat independentemente
        do estado da máquina.
        """

        if self.config.heartbeat_interval <= 0:
            return

        elapsed = (
            time.time()
            - self.last_heartbeat
        )

        if elapsed < self.config.heartbeat_interval:
            return

        payload = {
            "ts": datetime.now(
                timezone.utc
            ).isoformat()
        }

        try:

            self.mqtt.publish(
                self.heartbeat_topic,
                json.dumps(payload)
            )

            self._log(
                "❤️",
                "Heartbeat enviado"
            )

        except Exception as error:

            self._log(
                "❌",
                f"Erro no heartbeat: {error}"
            )

        self.last_heartbeat = time.time()

    # --------------------------------------------------------
    # ESTADO DA MÁQUINA
    # --------------------------------------------------------

    def _process_machine_state(self):

        elapsed = (
            time.monotonic()
            - self.state_started_at
        )

        if self.state == MachineState.PRODUCING:

            self._process_production(elapsed)

        elif self.state == MachineState.STOPPED:

            self._process_stop(elapsed)

    # --------------------------------------------------------
    # PRODUÇÃO
    # --------------------------------------------------------

    def _process_production(
        self,
        elapsed: float
    ):
        """
        Envia um evento de produção
        enquanto a máquina estiver produzindo.
        """

        # Verifica se já terminou o período
        # de produção.

        if elapsed >= self.config.production_time:

            self._change_state(
                MachineState.STOPPED
            )

            return

        # Verifica se está na hora
        # de enviar uma nova peça.

        now = time.monotonic()

        if (
            now - self.last_production_sent_at
            < self.config.production_interval
        ):

            return

        self._send_production()

        self.last_production_sent_at = now

    # --------------------------------------------------------
    # PARADA
    # --------------------------------------------------------

    def _process_stop(
        self,
        elapsed: float
    ):
        """
        Durante a parada:

        NÃO envia produção.

        Apenas aguarda o tempo configurado
        para voltar a produzir.
        """

        if elapsed >= self.config.stop_time:

            self._change_state(
                MachineState.PRODUCING
            )

    # --------------------------------------------------------
    # ENVIAR PRODUÇÃO
    # --------------------------------------------------------

    def _send_production(self):

        if (
            self.config.count > 0
            and self.total_events >= self.config.count
        ):

            print(
                "\n✅ Quantidade de eventos "
                "configurada foi atingida."
            )

            raise KeyboardInterrupt

        event = (
            self.event_generator.create_event()
        )

        try:

            self.mqtt.publish(
                self.production_topic,
                json.dumps(event)
            )

            self.total_events += 1

            self._log(
                "⚡",
                f"Produção #{self.total_events} "
                f"→ 1 peça"
            )

        except Exception as error:

            self._log(
                "❌",
                f"Erro na produção: {error}"
            )

    # --------------------------------------------------------
    # TROCAR ESTADO
    # --------------------------------------------------------

    def _change_state(
        self,
        new_state: MachineState
    ):

        self.state = new_state

        self.state_started_at = (
            time.monotonic()
        )

        if new_state == MachineState.PRODUCING:

            print(
                "\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"▶️  [{self.config.device}] PRODUÇÃO RETOMADA\n"
                "    Sensor voltou a enviar pulsos.\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            )

        elif new_state == MachineState.STOPPED:

            print(
                "\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"⏸️  [{self.config.device}] PARADA SIMULADA\n"
                f"    Sem produção por "
                f"{self.config.stop_time}s\n"
                "    Heartbeat continuará ativo.\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            )

    # --------------------------------------------------------
    # LOG
    # --------------------------------------------------------

    def _log(
        self,
        icon: str,
        message: str
    ):

        timestamp = datetime.now().strftime(
            "%H:%M:%S"
        )

        # Prefixo do device — com várias threads rodando junto, sem isso
        # não dá pra saber de qual máquina veio cada linha do log.
        print(
            f"{icon} [{timestamp}] [{self.config.device}] {message}"
        )

    # --------------------------------------------------------
    # HEADER
    # --------------------------------------------------------

    def _print_header(self):

        print()
        print(
            "╔══════════════════════════════════════╗"
        )
        print(
            "║       🤖 ESP32 SIMULATOR - GP       ║"
        )
        print(
            "╚══════════════════════════════════════╝"
        )

        print()

        print(
            f"Broker:              "
            f"{self.config.host}:{self.config.port}"
        )

        print(
            f"Device:              "
            f"{self.config.device}"
        )

        print(
            f"Produção:            "
            f"{self.config.production_interval}s/pulso"
        )

        print(
            f"Tempo produzindo:    "
            f"{self.config.production_time}s"
        )

        print(
            f"Tempo parado:        "
            f"{self.config.stop_time}s"
        )

        print(
            f"Heartbeat:           "
            f"{self.config.heartbeat_interval}s"
        )

        print()

        print(
            "🔄 Ciclo automático:"
        )

        print(
            "   PRODUZINDO → PARADO → PRODUZINDO"
        )

        print()

    # --------------------------------------------------------
    # ENCERRAMENTO
    # --------------------------------------------------------

    def _print_shutdown(self):

        print()
        print(
            f"🛑 [{self.config.device}] Simulador encerrado."
        )

        print(
            f"📊 [{self.config.device}] Total de eventos enviados: "
            f"{self.total_events}"
        )


# ============================================================
# ARGUMENTOS
# ============================================================


def parse_arguments():
    """
    Retorna (config, devices):
        config  -> SimulatorConfig "modelo", com config.device = devices[0]
                   (os campos compartilhados — interval, production-time,
                   stop-time, heartbeat, count — valem pra todos os
                   devices igual).
        devices -> lista de identificadores, um por --device repetido
                   (ou só o padrão, se nenhum --device foi passado).
    """

    parser = argparse.ArgumentParser(
        description="Simulador ESP32 - Sistema GP"
    )

    parser.add_argument(
        "--host",
        default="localhost",
        help="Host do Mosquitto"
    )

    parser.add_argument(
        "--port",
        type=int,
        default=1883,
        help="Porta MQTT"
    )

    parser.add_argument(
        "--device",
        action="append",
        default=None,
        help=(
            "ID do dispositivo. Pode repetir pra simular várias máquinas "
            "ao mesmo tempo, cada uma em sua própria thread: "
            "--device ESP32-MQ-01-SENSOR-01 --device ESP32-MQ-02-SENSOR-01 "
            "(padrão: ESP32-MQ-01-SENSOR-01, se nenhum for passado)"
        )
    )

    parser.add_argument(
        "--interval",
        type=float,
        default=2.0,
        help="Intervalo entre pulsos"
    )

    parser.add_argument(
        "--production-time",
        type=float,
        default=30.0,
        help="Tempo produzindo (segundos)"
    )

    parser.add_argument(
        "--stop-time",
        type=float,
        default=150.0,
        help=(
            "Tempo parado (segundos). Mantenha acima de "
            "STOP_DETECTION_SECONDS (120s por padrão no backend) "
            "pra garantir que uma possível parada seja detectada."
        )
    )

    parser.add_argument(
        "--heartbeat-interval",
        type=float,
        default=10.0,
        help="Intervalo do heartbeat (segundos; 0 desliga)"
    )

    parser.add_argument(
        "--count",
        type=int,
        default=0,
        help="Quantidade de eventos de produção. 0 = infinito"
    )

    args = parser.parse_args()

    devices = args.device or ["ESP32-MQ-01-SENSOR-01"]

    config = SimulatorConfig(
        host=args.host,
        port=args.port,
        device=devices[0],
        production_interval=args.interval,
        production_time=args.production_time,
        stop_time=args.stop_time,
        heartbeat_interval=args.heartbeat_interval,
        count=args.count
    )

    return config, devices


# ============================================================
# MAIN
# ============================================================


def main():

    config, devices = parse_arguments()

    # Um único device: comportamento de sempre, sem thread nenhuma —
    # Ctrl+C vai direto pro try/except KeyboardInterrupt de run().
    if len(devices) == 1:
        mqtt = MqttClient(config.host, config.port)
        simulator = Esp32Simulator(config, mqtt)
        simulator.run()
        return

    # Vários devices: cada um em sua própria thread, cada um com seu
    # próprio MqttClient (sem estado compartilhado entre eles — cada
    # publish() abre e fecha a própria conexão TCP) e sua própria cópia
    # de config (só o --device muda entre elas).
    print(
        f"\n🔀 Rodando {len(devices)} dispositivos em paralelo: "
        f"{', '.join(devices)}\n"
    )

    stop_event = threading.Event()
    simulators = []
    threads = []

    for device_id in devices:
        device_config = replace(config, device=device_id)
        mqtt = MqttClient(device_config.host, device_config.port)
        simulator = Esp32Simulator(device_config, mqtt, stop_event)
        simulators.append(simulator)

        thread = threading.Thread(target=simulator.run, daemon=True)
        threads.append(thread)
        thread.start()

    try:
        # A thread principal fica só esperando — é ela quem recebe o
        # Ctrl+C do sistema operacional (as outras, sendo threads
        # secundárias, nunca recebem SIGINT diretamente).
        while any(t.is_alive() for t in threads):
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n🛑 Encerrando todos os dispositivos...")
        stop_event.set()
        for thread in threads:
            thread.join(timeout=3)

    total = sum(s.total_events for s in simulators)
    print(f"\n📊 Total geral de eventos enviados: {total}")


# ============================================================
# ENTRYPOINT
# ============================================================


if __name__ == "__main__":
    main()
