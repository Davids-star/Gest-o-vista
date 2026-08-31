/**
 * useConnectionStatus.js — GP Frontend V2
 *
 * Junta dois sinais que hoje não apareciam em lugar nenhum da UI:
 * - navigator.onLine: o celular/totem perdeu a rede.
 * - realtimeConnected (services/realtime.js): o WebSocket caiu, mesmo com
 *   rede — ex.: backend reiniciando, wifi cheio de perda de pacote.
 *
 * O app já tem um fallback real (polling a cada 6s, ver productionStore),
 * então nada trava por isso — só que sem esse aviso o usuário não tem como
 * saber que o número na tela pode estar desatualizado. Especialmente
 * relevante em PWA instalado (Totem, celular do supervisor no chão de
 * fábrica): a tela some do olhar da equipe de TI e ninguém percebe o wifi
 * caindo por trás.
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { realtimeConnected, realtimeAttempted } from '../services/realtime';

const isBrowserOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
let browserListenersAttached = false;

function attachBrowserListenersOnce() {
  if (browserListenersAttached || typeof window === 'undefined') return;
  browserListenersAttached = true;
  window.addEventListener('online', () => { isBrowserOnline.value = true; });
  window.addEventListener('offline', () => { isBrowserOnline.value = false; });
}

export function useConnectionStatus() {
  attachBrowserListenersOnce();

  // Evita "piscar" o aviso durante uma reconexão normal do socket.io (que
  // já tenta sozinho, ver reconnectionDelay em realtime.js) — só mostra
  // "reconectando" se isso persistir por mais de alguns segundos.
  const showReconnecting = ref(false);
  let reconnectingTimer = null;

  const evaluate = () => {
    clearTimeout(reconnectingTimer);
    // Só entra em "reconectando" se alguma tela já chamou startPolling()
    // (Totem, TV, Dashboard...) — telas de login nunca abrem o socket, então
    // "não conectado" ali é o estado normal, não uma queda de conexão.
    if (isBrowserOnline.value && realtimeAttempted.value && !realtimeConnected.value) {
      reconnectingTimer = setTimeout(() => { showReconnecting.value = true; }, 4000);
    } else {
      showReconnecting.value = false;
    }
  };

  const stopWatch = watch([isBrowserOnline, realtimeConnected, realtimeAttempted], evaluate, { immediate: true });

  onMounted(evaluate);
  onUnmounted(() => {
    clearTimeout(reconnectingTimer);
    stopWatch();
  });

  const status = computed(() => {
    if (!isBrowserOnline.value) return 'offline';
    if (showReconnecting.value) return 'reconnecting';
    return 'online';
  });

  return { status, isBrowserOnline, realtimeConnected };
}
