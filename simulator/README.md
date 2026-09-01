# 🤖 Simulador ESP32 (MQTT) — Sistema GP

> Visão geral do projeto todo: [`../README.md`](../README.md).

Este simulador simula o envio de pulsos de contagem de produção de um sensor óptico acoplado a uma máquina física via MQTT — e também simula a máquina **parando de produzir**, alternando automaticamente entre dois estados:

```
PRODUZINDO → (production-time segundos) → PARADO → (stop-time segundos) → PRODUZINDO → ...
```

Durante a parada, **nenhum evento de produção é enviado**, mas o heartbeat continua — é exatamente o cenário que faz o backend detectar uma "possível parada" (ver `PossibleStopDetectorService`) e gerar o alerta correspondente.

## 🚀 Como Executar

Não tem dependência nenhuma além do Python padrão (sem `pip install` necessário — o cliente MQTT é implementado do zero via socket TCP puro).

```bash
python3 esp32_simulator.py
```

Ou com argumentos customizados:
```bash
python3 esp32_simulator.py --device ESP32-MQ-01-SENSOR-01 --interval 2 --production-time 30 --stop-time 150
```

### Argumentos

| Flag | Padrão | O que faz |
|---|---|---|
| `--host` | `localhost` | Host do broker MQTT |
| `--port` | `1883` | Porta do broker MQTT |
| `--device` | `ESP32-MQ-01-SENSOR-01` | Identificador do dispositivo |
| `--interval` | `2.0` | Segundos entre cada pulso de produção (enquanto PRODUZINDO) |
| `--production-time` | `30.0` | Quantos segundos fica PRODUZINDO antes de parar |
| `--stop-time` | `150.0` | Quantos segundos fica PARADO (sem produção) antes de voltar a produzir |
| `--heartbeat-interval` | `10.0` | Segundos entre heartbeats (`0` desliga) |
| `--count` | `0` | Limite de eventos de produção (`0` = infinito) |

**⚠️ Sobre `--stop-time` e o alerta de "possível parada":** o backend (`STOP_DETECTION_SECONDS`, ver [`../api/src/common/constants/stop-detection.constants.ts`](../api/src/common/constants/stop-detection.constants.ts)) usa **120 segundos** como padrão pra considerar que uma máquina parou de produzir. Um `--stop-time` menor que isso nunca vai gerar o alerta — o padrão do simulador (150s) já dá uma folga confortável acima do limite.

## 🛰️ Tópicos e Payloads

- **Produção** — `gp/{DEVICE_ID}/production`
  ```json
  {
    "event_uid": "ESP32-001-<uuid>",
    "quantity": 1,
    "occurred_at": "2026-08-30T15:00:00.000Z"
  }
  ```
- **Heartbeat** — `gp/{DEVICE_ID}/heartbeat` (sinal "estou vivo", independente de produção — usado pelo backend pra diferenciar "máquina parada" de "dispositivo offline")
  ```json
  {
    "ts": "2026-08-30T15:00:00.000Z"
  }
  ```
