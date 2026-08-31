/**
 * realtime.js — Cliente WebSocket do GP Frontend V2
 *
 * REGRA: este canal NUNCA carrega estado sozinho. Cada evento recebido do
 * NestJS só dispara um refetch real via api.js/productionStore (a mesma
 * função já usada pelo polling) — ele nunca escreve dados fabricados no
 * Pinia. Se o socket cair, o polling de fallback do productionStore
 * continua garantindo sincronização (mais lenta, porém real).
 */
import { ref } from 'vue';
import { io } from 'socket.io-client';
import { BASE_URL, getToken } from './api';

let socket = null;

// Estado reativo do socket — antes só existia isRealtimeConnected() (uma
// função síncrona, precisava ser chamada em polling pra ser útil). Nenhuma
// tela usava isso pra avisar o usuário quando a conexão cai — em wifi de
// chão de fábrica/celular isso acontece o tempo todo, e a única pista que
// existia era o dado parar de mudar na tela, sem nenhum aviso visual (ver
// ConnectionStatusBanner.vue, que consome isso).
export const realtimeConnected = ref(false);
// Diferencia "nunca tentou conectar" (tela de login, sem polling ainda) de
// "tentou e caiu" — sem isso, ConnectionStatusBanner acusaria "reconectando"
// em qualquer tela que ainda não chamou startPolling().
export const realtimeAttempted = ref(false);

/**
 * Conecta ao gateway de tempo real autenticado (o backend usa o
 * company_id do próprio JWT para isolar os eventos por empresa).
 * @param {Record<string, (payload: any) => void>} handlers - mapa evento → callback
 */
export function connectRealtime(handlers = {}) {
  // Sem token (Totem/TV sem login) o backend ainda aceita a conexão —
  // ver RealtimeGateway.handleConnection, que cai pro fallback de empresa
  // padrão. `auth: {}` é enviado nesse caso, não `undefined` — socket.io
  // manda `auth` como está, mas alguns proxies removem headers vazios.
  const token = getToken();

  // Evita conexões duplicadas ao trocar de tela
  if (socket) {
    disconnectRealtime();
  }

  realtimeAttempted.value = true;

  socket = io(BASE_URL, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => { realtimeConnected.value = true; });
  socket.on('disconnect', () => { realtimeConnected.value = false; });

  for (const [event, handler] of Object.entries(handlers)) {
    socket.on(event, handler);
  }

  return socket;
}

export function disconnectRealtime() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  realtimeConnected.value = false;
  realtimeAttempted.value = false;
}

export function isRealtimeConnected() {
  return Boolean(socket?.connected);
}
