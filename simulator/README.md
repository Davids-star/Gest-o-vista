# 🤖 Simulador ESP32 (MQTT) — Sistema GP

Este simulador simula o envio de pulsos de contagem de produção de um sensor óptico acoplado a uma máquina física via MQTT.

## 🚀 Como Executar

1. **Instalar dependências (opcional):**
   ```bash
   pip install -r requirements.txt
   ```

2. **Executar o simulador:**
   ```bash
   python3 esp32_simulator.py
   ```

   Ou com argumentos customizados:
   ```bash
   python3 esp32_simulator.py --device ESP32-MQ-01-SENSOR-01 --interval 2
   ```

## 🛰️ Tópico e Payload
- **Tópico MQTT:** `gp/{DEVICE_ID}/production`
- **Payload:**
  ```json
  {
    "event_uid": "ESP32-001-000001",
    "quantity": 1,
    "occurred_at": "2026-08-30T15:00:00.000Z"
  }
  ```
