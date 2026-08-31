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

Precisa da API rodando (ver [`../api/README.md`](../api/README.md)). Por padrão
o frontend assume a API em `http://<mesmo host>:3000` — pra apontar pra outro
endereço, defina `VITE_API_URL` (ex.: arquivo `.env.local`).

## Estrutura (`frontend/src/*`)

| Pasta/arquivo | Responsabilidade |
|---|---|
| `views/totem/` | Telas do operador: login por PIN, tela de produção (contador + meta + paradas). |
| `views/supervisor/` | Dashboards, Metas, Estações, Apontamento, Alertas, Detalhe de lote, login do supervisor. |
| `views/mobile/` | Seletor de modo/estação ao abrir pelo celular. |
| `views/TvView.vue` | Painel de TV (Andon). |
| `components/` | Componentes reutilizáveis: sidebar, modais (parada, lote, meta, produção planejada), gráficos, banner de instalação PWA, indicador de conexão. |
| `stores/productionStore.js` | Único Pinia store da aplicação — todo o estado vem da API (nunca é banco de dados); mantém tudo fresco via polling (6s) + WebSocket. |
| `services/api.js` | Cliente HTTP da API (fetch + token JWT). |
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
