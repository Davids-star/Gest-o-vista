# Banco de dados do GP

> Visão geral do projeto todo: [`../README.md`](../README.md).

Postgres **dedicado** ao sistema GP — container e volume próprios (`gp_postgres_db` /
`gp_postgres_data`), sem nenhuma relação com o Postgres do projeto "Batedor de Ponto"
(que antes hospedava o banco `sistema_producao` junto com bancos de outros projetos).

## Subir o banco

```bash
cd database
docker compose up -d
```

Credenciais e porta ficam em `.env` (não commitado — veja `.env.example` abaixo se precisar recriar).
A API (`api/`) lê esse mesmo `.env` para se conectar — ver `api/src/database/all-entities.ts`
e `api/src/app.module.ts`.

## Backup / restore

```bash
./backup.sh                                   # gera backups/sistema_producao_<data>.sql
./restore.sh backups/sistema_producao_XXX.sql # restaura (sobrescreve dados atuais)
```

## Migrations (TypeORM)

O schema **não** é mais sincronizado automaticamente (`synchronize: false`). Toda
alteração de tabela passa por uma migration revisável, rodada a partir de `api/`:

```bash
cd api
npm run migration:generate -- src/database/migrations/NomeDaMudanca
npm run migration:run
npm run migration:revert   # desfaz a última
```

## Tabelas e para que servem

| Tabela | Entidade | Serve para |
|---|---|---|
| `companies` | Company | Multiempresa — todo o resto pendura em `company_id` |
| `users` | User | Operador / Supervisor / Administrador |
| `machines` | Machine | Cadastro das máquinas (código, nome, `active`) |
| `devices` | Device | Dispositivo físico por máquina (auth por `identifier`) — reservado para o ESP32/MQTT futuro |
| `products` | Product | Produtos que podem ser produzidos |
| `lots` | Lot | Lotes (pertencem a uma empresa+produto, não a uma máquina — usados dentro de uma sessão) |
| `shifts` | Shift | Turnos |
| `production_sessions` | ProductionSession | **Sessão de produção**: liga machine → operator → product → lot, com `status` ACTIVE/CLOSED |
| `production_events` | ProductionEvent | Incrementos reais de produção dentro de uma sessão (fonte: manual hoje, ESP32/MQTT no futuro) |
| `production_corrections` | ProductionCorrection | Correções manuais sobre a produção contabilizada |
| `stop_reasons` | StopReason | Motivos de parada cadastrados (com `planned` e `default_priority`) — fonte real do totem/supervisor, nunca hardcoded no frontend |
| `possible_stops` | PossibleStop | Paradas *detectadas automaticamente* aguardando confirmação — reservado para o sensor futuro; hoje não tem nada escrevendo aqui |
| `stops` | Stop | Parada registrada (aberta/fechada), gera `alerts` quando o motivo não é planejado |
| `machine_states` | MachineState | Histórico de transição de estado da máquina — **tabela existe mas nada escreve nela hoje** (o estado atual é derivado no frontend combinando machines+sessions+stops); ver auditoria pendente no relatório final |
| `target_plans` | TargetPlan (alias `Meta`) | Meta por máquina/produto/período |
| `target_allocations` | TargetAllocation | Distribuição da meta por turno/dia dentro do período do `target_plan` |
| `alerts` | Alert | Alerta gerado a partir de uma parada não planejada (ou marcado manualmente) |
| `audit_logs` | AuditLog | Auditoria de ações sensíveis (ex.: troca de operador em sessão ativa) |

## Isolamento multiempresa

Toda tabela relevante carrega `company_id`. A regra do backend é: **nunca confiar em
`company_id` vindo do corpo da requisição** — sempre usar o `companyId` extraído do JWT
(`@CurrentUser()` → `common/decorators/current-user.decorator.ts`).
