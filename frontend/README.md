# GP Frontend

PWA em Vue 3 + Pinia — a interface do sistema GP. Um único app cobre três jeitos
de usar, escolhidos por rota (não por build separado):

- **Totem** (`/totem/*`) — tela do operador de chão de fábrica: inicia/encerra
  sessão de produção, mostra contador de unidades e progresso da meta em tempo
  real, registra paradas.
- **Supervisor** (`/dashboard`, `/metas`, `/estacoes`, `/apontamento`, `/alertas`,
  `/lotes`) — dashboards, cadastro de metas, monitoramento das máquinas,
  apontamento por dia/turno.
- **Painel TV** (`/tv`) — visão contínua tipo Andon, pra telão de fábrica.

Um seletor (`/mobile`) ajuda a escolher/instalar o modo certo quando o app é
aberto num celular. Visão geral do projeto todo: [`../README.md`](../README.md).

## Stack

Vue 3 (`<script setup>`) · Vite · Pinia · Vue Router (hash mode) · Tailwind ·
Socket.IO client · `vite-plugin-pwa` (Service Worker com auto-update).

## Como rodar

```bash
npm install
npm run dev      # http://localhost:5173 — host:true já expõe na rede local
                  # (testar no celular: <ip-da-máquina>:5173)
npm run build     # gera dist/ com o Service Worker/manifest do PWA
npm run preview   # serve o build de produção localmente
```

Precisa da API rodando (ver [`../api/README.md`](../api/README.md)).

### Configuração por ambiente

Toda a configuração fica no **`.env` da raiz do projeto** (modelo: `.env.example`).
O Vite lê dele (`envDir: '..'`); só as variáveis `VITE_*` vão para o bundle, então
nunca colocar segredo ali. Para gerar o APK apontando para outra API, sobrescreva
na linha de comando (tem prioridade sobre o `.env`):

```bash
# APK na rede da fábrica (IP do PC que roda a API):
VITE_API_URL=http://192.168.18.82:3000 npx vite build --mode android && npx cap sync android
# APK com cabo USB (adb reverse tcp:3000 tcp:3000):
VITE_API_URL=http://localhost:3000 npx vite build && npx cap sync android
```

### Origens de contagem

Cada máquina recebe contagem de **uma** origem por vez (evite ligar o cabo e o
Bluetooth para a mesma máquina — as duas contariam):

- **Cabo:** sensor ligado ao PC → `simulator/serve.py` → MQTT → API (`source: sensor`).
- **Bluetooth (APK):** HC-06 ligado ao tablet → `services/bluetooth/` → `services/production/ProductionService.js` → fila local (`services/database/`, IndexedDB) → `services/sync/SyncService.js` → `POST /production-events` (`source: bluetooth`). Não passa pelo MQTT.

Fluxo do Bluetooth no app:

```
HC-06 → CordovaBluetoothSerialGateway → ProductionService → DatabaseService (fila)
                                                              ↓
                                         SyncService → eventsApi (api.js) → API
```

Na PWA/navegador o gateway é `MockBluetoothGateway` (nenhuma contagem é lida do
hardware; a contagem continua vindo da API). Testes: `npm test` (Node, sem navegador).

## Estrutura (`frontend/src/*`)

| Pasta/arquivo | Responsabilidade |
|---|---|
| `views/totem/` | Telas do operador: login por PIN, tela de produção (contador + meta + paradas). |
| `views/supervisor/` | Dashboards, Metas, Estações, Apontamento, Alertas, Detalhe de lote, login do supervisor. |
| `views/mobile/` | Seletor de modo/estação ao abrir pelo celular. |
| `views/TvView.vue` | Painel de TV (Andon). |
| `components/` | Componentes reutilizáveis: sidebar, modais (parada, lote, meta, produção planejada), gráficos, banner de instalação PWA, indicador de conexão. |
| `stores/productionStore.js` | Único Pinia store da aplicação — todo o estado vem da API (nunca é banco de dados); mantém tudo fresco via polling (6s) + WebSocket. |
| `config/env.js` | Configuração por ambiente (API, modo do sensor, sync). |
| `services/api.js` | Cliente HTTP da API (fetch + token JWT) — é o `ApiService`. |
| `services/bluetooth/` | Gateway do sensor: contrato, `MockBluetoothGateway` (PWA) e `CordovaBluetoothSerialGateway` (APK, HC-06). |
| `services/production/` | `ProductionService` (interpreta `COUNT:n`, gera `event_uid`) e `ProductionPipeline` (liga as peças). |
| `services/database/` | `DatabaseService`: fila e histórico local de eventos (IndexedDB). |
| `services/sync/` | `SyncService`: envia pendentes à API, sem duplicar, e tenta de novo sem rede. |
| `stores/integrationStore.js` | Estado do sensor e da sincronização mostrado no Totem (🟢/🔴). |
| `services/realtime.js` | Cliente WebSocket (Socket.IO) — cada evento recebido só dispara um refetch real via `api.js`, nunca escreve dado fabricado no store. |
| `composables/useAuth.js` | Sessão do usuário logado (token, role) — singleton reativo persistido em `localStorage`. |
| `composables/useConnectionStatus.js` | Estado online/offline/instável exibido pelo `ConnectionStatusBanner`. |
| `router/index.js` | Rotas + guard de autenticação/role (hash mode: `/#/...`). |

## PWA / Service Worker

O Service Worker e o `manifest.webmanifest` são gerados pelo `vite-plugin-pwa`
(configurado em `vite.config.js`), tanto no build (`npm run build`) quanto no
`npm run dev` (`devOptions.enabled: true`, pra poder testar instalação/offline
direto do celular durante o desenvolvimento). `registerType: 'autoUpdate'` faz
uma aba/PWA já aberta recarregar sozinha quando sai uma versão nova — não precisa
mais lembrar de invalidar cache manualmente a cada deploy.
