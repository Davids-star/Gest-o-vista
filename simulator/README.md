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

**Mais de uma máquina ao mesmo tempo** — repita `--device`, uma vez por máquina. Cada uma roda na sua própria thread, com o mesmo ciclo PRODUZINDO/PARADO, totalmente independente das outras (parar uma não afeta as demais):
```bash
python3 esp32_simulator.py --device ESP32-MQ-01-SENSOR-01 --device ESP32-MQ-02-SENSOR-01
```
Os campos de tempo (`--interval`, `--production-time`, `--stop-time`, `--heartbeat-interval`, `--count`) valem igual pra todos os devices passados — não dá pra configurar um tempo diferente por máquina numa mesma execução (rode o script duas vezes, em terminais separados, se precisar disso).

### Argumentos

| Flag | Padrão | O que faz |
|---|---|---|
| `--host` | `localhost` | Host do broker MQTT |
| `--port` | `1883` | Porta do broker MQTT |
| `--device` | `ESP32-MQ-01-SENSOR-01` | Identificador do dispositivo. Repetível — uma thread por `--device` |
| `--interval` | `2.0` | Segundos entre cada pulso de produção (enquanto PRODUZINDO) |
| `--production-time` | `30.0` | Quantos segundos fica PRODUZINDO antes de parar |
| `--stop-time` | `150.0` | Quantos segundos fica PARADO (sem produção) antes de voltar a produzir |
| `--heartbeat-interval` | `10.0` | Segundos entre heartbeats (`0` desliga) |
| `--count` | `0` | Limite de eventos de produção (`0` = infinito) |

**⚠️ Pré-requisito — o `--device` precisa já existir no banco:** o backend só aceita eventos de um `Device` já cadastrado e vinculado a uma `Machine` (tabela `devices`) — sem isso, os eventos chegam via MQTT mas são descartados em silêncio (fica só um aviso no log da API, `Device inativo ou não encontrado`). E pra a produção realmente contar em algum lugar, essa máquina também precisa ter uma **sessão ativa** (iniciada pelo Totem, ou via `POST /totem/sessions`).

**⚠️ Sobre `--stop-time` e o alerta de "possível parada":** o backend (`STOP_DETECTION_SECONDS`, ver [`../api/src/common/constants/stop-detection.constants.ts`](../api/src/common/constants/stop-detection.constants.ts)) usa **120 segundos** como padrão pra considerar que uma máquina parou de produzir. Um `--stop-time` menor que isso nunca vai gerar o alerta — o padrão do simulador (150s) já dá uma folga confortável acima do limite.

## 🔌 Sensor real conectado por cabo/USB (sem ESP32/WiFi)

Enquanto o ESP32 não entra em uso, o sensor de contagem é ligado direto no
computador por cabo USB — aparece como porta serial
(`/dev/ttyUSB0`/`/dev/ttyACM0` no Linux). `serial_sensor_bridge.py` lê essa
porta e publica no mesmo broker MQTT, no mesmo formato que o
`esp32_simulator.py` — pro resto do sistema não enxergar diferença nenhuma
entre os dois.

```bash
python3 serial_sensor_bridge.py --list-ports        # descobre a porta
python3 serial_sensor_bridge.py --port /dev/ttyUSB0 --device ESP32-MQ-01-SENSOR-01 --debug
```

`--debug` mostra cada linha crua que chega do sensor antes de interpretar —
use isso na primeira vez pra confirmar o formato real. Regra atual (ver
`interpretar_linha` no script): qualquer linha de texto = 1 peça; se a linha
for só um número, usa esse número como quantidade. Ajuste essa função se o
sensor mandar outro formato (JSON, binário, etc.).

**Sem permissão pra abrir a porta** (`PermissionError`)? No Linux, seu
usuário precisa estar no grupo `dialout`:
```bash
sudo usermod -aG dialout $USER   # depois faça logout/login
```

Vale a mesma exigência do `esp32_simulator.py`: o `--device` precisa já
existir cadastrado na tabela `devices`, vinculado a uma `Machine` com
**sessão ativa** — sem isso os eventos chegam mas são descartados em
silêncio.

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
