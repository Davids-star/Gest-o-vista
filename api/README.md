# GP API

Backend do sistema GP — NestJS + TypeORM + Postgres. Concentra toda a regra de
negócio (sessões de produção, metas, paradas, alertas), autentica usuários e
dispositivos, ouve o MQTT do sensor/simulador e empurra tudo pro frontend em
tempo real via WebSocket. Visão geral do projeto todo: [`../README.md`](../README.md).

## Stack

NestJS 11 · TypeORM (Postgres) · Passport/JWT · Socket.IO (`@nestjs/websockets`)
· cliente MQTT próprio sobre `net` (sem dependência externa de broker).

## Como rodar

```bash
npm install
npm run start:dev        # porta 3000 por padrão (ver PORT no .env)
```

Precisa do Postgres de pé antes — ver [`../database/README.md`](../database/README.md)
(`cd ../database && docker compose up -d`).

### Variáveis de ambiente (`api/.env`)

| Variável | Pra que serve |
|---|---|
| `JWT_SECRET` | Chave de assinatura dos tokens de login (supervisor/admin) e de dispositivo (Totem/TV). |
| `PORT` | Porta HTTP/WebSocket da API (padrão 3000). |
| `MQTT_HOST`, `MQTT_PORT` | Onde está o broker MQTT (Mosquitto do `database/docker-compose.yml`, ou o broker embutido de fallback — ver seção MQTT abaixo). |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Conexão com o Postgres — **mesmos valores** de `database/.env` (é o mesmo banco). |

### Migrations

Schema não é auto-sincronizado (`synchronize: false`) — toda mudança de tabela é
uma migration revisável:

```bash
npm run migration:generate -- src/database/migrations/NomeDaMudanca
npm run migration:run
npm run migration:revert   # desfaz a última
```

Detalhe de cada tabela: [`../database/README.md`](../database/README.md).

> **`api/src/database/` não é a mesma coisa que a pasta `database/` da raiz.**
> Aqui dentro fica o código TypeORM (entidades, migrations, seed) que só faz
> sentido rodando junto com o NestJS. A pasta `database/` da raiz é só a infra
> do Postgres (docker-compose, backup/restore) — nenhuma das duas duplica a
> outra, cada uma cuida de uma metade do mesmo banco.

## Módulos (`api/src/*`)

| Módulo | Responsabilidade |
|---|---|
| `auth/` | Login de supervisor/admin (JWT) e autenticação de dispositivo (Totem/TV por token). |
| `usuarios/` | CRUD de usuários (operador/supervisor/administrador). |
| `maquinas/` | Cadastro de máquinas — código, nome, produto/lote planejado para a próxima produção. |
| `produtos/` | Cadastro de produtos que podem ser produzidos. |
| `lotes/` | Lotes de produção (empresa + produto, usados dentro de uma sessão). |
| `sessions/` | **Sessão de produção**: liga máquina → operador → produto → lote; inclui as rotas do Totem (`totem.controller.ts`) pra iniciar/trocar/encerrar sessão. |
| `events/` | Eventos de produção (incrementos reais de unidades) — fonte de verdade da contagem, alimentada hoje pelo simulador MQTT. |
| `producao-registros/` | Registros agregados de produção (consultas/relatórios sobre os eventos). |
| `apontamento/` | Endpoint consolidado (resumo + sessões + paradas de um dia/turno/máquina) usado pelo Dashboard do supervisor. |
| `apontamentos-hora/` | Produção agregada por hora (gráficos do dashboard). |
| `metas/` | Metas de produção por máquina/produto/período (`target_plans`). |
| `motivos-parada/` | Cadastro dos motivos de parada disponíveis (planejado ou não, encerra sessão ou não). |
| `paradas-registros/` | Paradas registradas (abertas/fechadas) — gera alerta quando o motivo não é planejado. |
| `possible-stops/` | Paradas *detectadas automaticamente* (sem evento de produção há tempo demais), aguardando o operador confirmar ou descartar — reservado pro sensor real. |
| `alertas/` | Alertas gerados a partir de paradas não planejadas. |
| `shifts/` | Turnos cadastrados da fábrica (cadastro fixo, só leitura pela API). |
| `estacoes/` | Visão agregada de estações/máquinas para o painel de monitoramento. |
| `devices/` | Dispositivos físicos por máquina (auth por `identifier`) — reservado para o ESP32 real. |
| `mqtt/` | Cliente MQTT (`simple-mqtt.client.ts`) que assina o tópico de produção do simulador/sensor, e um broker embutido de fallback (`simple-mqtt.broker.ts`) que só sobe se não achar um Mosquitto já rodando na porta configurada. |
| `realtime/` | Gateway WebSocket — avisa o frontend (Totem/TV/Dashboard) na hora que algo muda, sem esperar o próximo polling. |
| `database/` | Entidades TypeORM, migrations e script de seed (ver nota acima). |
| `common/` | Decorators (`@CurrentUser`, `@Public`, `@Roles`), guards de permissão e constantes compartilhadas (ex.: parâmetros de detecção de parada). |

## Testes

```bash
npm run test        # unit
npm run test:e2e    # end-to-end
npm run test:db     # smoke test manual do banco (ts-node, fora do Jest)
```
