# GP — Sistema de Gestão de Produção Industrial

Sistema de acompanhamento de produção em chão de fábrica: cada máquina roda uma
**sessão de produção** (operador + produto + lote), os pulsos de um sensor
(hoje simulado, ESP32 real no futuro) contam unidades produzidas via MQTT, e um
app web (Totem no chão de fábrica, Dashboard do Supervisor, Painel de TV) mostra
tudo em tempo real.

## Como as peças se falam

```
 ESP32 (sensor)  ──MQTT──▶  Broker MQTT  ──MQTT──▶  API (NestJS)  ──SQL──▶  Postgres
 [simulator/]                [mqtt/]                 [api/]                [database/]
                                                          │
                                                          │ REST + WebSocket
                                                          ▼
                                                    Frontend (Vue PWA)
                                                        [frontend/]
                                              Totem · Supervisor · Painel TV
```

Hoje o sensor real ainda não existe — `simulator/esp32_simulator.py` publica no
MQTT como se fosse um ESP32 de verdade, pra API/Frontend já funcionarem de ponta
a ponta antes do hardware chegar.

## Pastas do projeto

| Pasta | O que é | Documentação |
|---|---|---|
| [`api/`](api/README.md) | Backend NestJS + TypeORM: regras de negócio, autenticação, WebSocket de tempo real, consumo do MQTT, tudo que fala com o Postgres. | [`api/README.md`](api/README.md) |
| [`frontend/`](frontend/README.md) | PWA em Vue 3 — as telas de Totem (operador), Supervisor (dashboards) e Painel de TV. | [`frontend/README.md`](frontend/README.md) |
| [`database/`](database/README.md) | Infra do Postgres (docker-compose, backup/restore) — **não** é código da aplicação, só o banco rodando. | [`database/README.md`](database/README.md) |
| [`mqtt/`](mqtt/config/mosquitto.conf) | Config do broker Mosquitto (`config/mosquitto.conf`) usado pelo `docker-compose` de `database/`. A API também sobe um broker embutido de fallback (`api/src/mqtt/`) pra funcionar sem o Mosquitto em dev. | — |
| [`simulator/`](simulator/README.md) | Simulador do sensor ESP32 em Python — publica eventos de produção no MQTT como se fosse o hardware real. | [`simulator/README.md`](simulator/README.md) |

Repositórios à parte (não fazem parte deste, cada um se versiona sozinho):
`.claude/`, `.agents/`, `.codex_home/`, `codex-plugin-antigravity/` — tooling dos
agentes/IDE usados no desenvolvimento, não é código do produto GP.

## Subindo tudo localmente (ordem recomendada)

1. **Banco** — `cd database && docker compose up -d` (sobe Postgres + Mosquitto).
   Detalhes de credenciais e migrations: [`database/README.md`](database/README.md).
2. **API** — `cd api && npm install && npm run start:dev` (porta 3000 por
   padrão). Detalhes: [`api/README.md`](api/README.md).
3. **Frontend** — `cd frontend && npm install && npm run dev` (porta 5173,
   acessível também pela rede local pra testar no celular). Detalhes:
   [`frontend/README.md`](frontend/README.md).
4. **Simulador (opcional)** — `cd simulator && python3 esp32_simulator.py` pra
   gerar produção de teste sem hardware. Detalhes:
   [`simulator/README.md`](simulator/README.md).
