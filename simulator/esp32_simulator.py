#!/usr/bin/env python3
"""
Simulador ESP32 de Sensor de Produção para o Sistema GP.
Envia eventos de contagem de produção via MQTT para o broker Mosquitto.
"""
import time
import json
import uuid
import socket
from datetime import datetime, timezone
import argparse

def send_mqtt_publish(host, port, topic, payload):
    """Envia um pacote MQTT PUBLISH v3.1.1 via TCP socket puro sem dependências externas."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5)
    s.connect((host, port))

    # 1. CONNECT Packet
    client_id = f"esp32_sim_{uuid.uuid4().hex[:6]}".encode('utf-8')
    proto_name = b'MQTT'
    proto_header = bytes([0x00, len(proto_name)]) + proto_name + bytes([0x04, 0x02, 0x00, 0x3c])
    payload_id = bytes([0x00, len(client_id)]) + client_id
    var_len = len(proto_header) + len(payload_id)

    connect_pkt = bytes([0x10, var_len]) + proto_header + payload_id
    s.sendall(connect_pkt)

    # Ler CONNACK
    resp = s.recv(4)
    if not resp or len(resp) < 4 or resp[0] != 0x20 or resp[3] != 0x00:
        s.close()
        raise Exception(f"Falha no CONNACK MQTT: {resp.hex() if resp else 'sem resposta'}")

    # 2. PUBLISH Packet (QoS 0)
    topic_bytes = topic.encode('utf-8')
    payload_bytes = payload.encode('utf-8')

    pub_var_header = bytes([0x00, len(topic_bytes)]) + topic_bytes
    pub_remaining = len(pub_var_header) + len(payload_bytes)

    # Variable length encoder
    rem_bytes = bytearray()
    x = pub_remaining
    while True:
        digit = x % 128
        x = x // 128
        if x > 0:
            digit |= 128
        rem_bytes.append(digit)
        if x <= 0:
            break

    publish_pkt = bytes([0x30]) + bytes(rem_bytes) + pub_var_header + payload_bytes
    s.sendall(publish_pkt)
    s.close()

def main():
    parser = argparse.ArgumentParser(description="Simulador ESP32 - Sistema GP")
    parser.add_argument("--host", default="localhost", help="Mosquitto MQTT Host")
    parser.add_argument("--port", type=int, default=1883, help="Mosquitto MQTT Port")
    parser.add_argument("--device", default="ESP32-MQ-01-SENSOR-01", help="Identificador do Device ESP32")
    parser.add_argument("--interval", type=float, default=2.0, help="Intervalo de emissão em segundos")
    parser.add_argument("--count", type=int, default=0, help="Quantidade total de pulsos (0 para infinito)")
    parser.add_argument("--heartbeat-interval", type=float, default=10.0, help="Intervalo do heartbeat em segundos (0 desliga)")
    args = parser.parse_args()

    topic = f"gp/{args.device}/production"
    heartbeat_topic = f"gp/{args.device}/heartbeat"
    print(f"🤖 [ESP32 SIMULATOR INICIADO]")
    print(f"   Broker: {args.host}:{args.port}")
    print(f"   Device: {args.device}")
    print(f"   Tópico produção: {topic}")
    print(f"   Tópico heartbeat: {heartbeat_topic} (a cada {args.heartbeat_interval}s)")
    print(f"   Intervalo: {args.interval}s\n")

    seq = 1
    last_heartbeat = 0.0
    try:
        while True:
            # Heartbeat: sinal "estou vivo" independente de produção — é o que
            # o backend usa pra saber que o device está ONLINE mesmo quando a
            # máquina não está produzindo nada (ver PossibleStopDetectorService).
            if args.heartbeat_interval > 0 and (time.time() - last_heartbeat) >= args.heartbeat_interval:
                try:
                    send_mqtt_publish(args.host, args.port, heartbeat_topic, json.dumps({
                        "ts": datetime.now(timezone.utc).isoformat(),
                    }))
                    print(f"💓 [{datetime.now().strftime('%H:%M:%S')}] Heartbeat enviado")
                except Exception as e:
                    print(f"❌ [{datetime.now().strftime('%H:%M:%S')}] Erro no heartbeat: {e}")
                last_heartbeat = time.time()

            event_uid = f"{args.device}-{int(time.time())}-{seq:06d}"
            now_iso = datetime.now(timezone.utc).isoformat()

            payload_data = {
                "event_uid": event_uid,
                "quantity": 1,
                "occurred_at": now_iso
            }
            payload_str = json.dumps(payload_data)

            try:
                send_mqtt_publish(args.host, args.port, topic, payload_str)
                print(f"⚡ [{datetime.now().strftime('%H:%M:%S')}] Evento #{seq} publicado -> {event_uid} (1 peça)")
            except Exception as e:
                print(f"❌ [{datetime.now().strftime('%H:%M:%S')}] Erro ao publicar: {e}")

            seq += 1
            if args.count > 0 and seq > args.count:
                print("\n✅ Simulação concluída.")
                break

            time.sleep(args.interval)

    except KeyboardInterrupt:
        print("\n🛑 Simulador encerrado pelo usuário.")

if __name__ == "__main__":
    main()
