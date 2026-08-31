/**
 * usePwaInstall.js — GP Frontend V2
 *
 * Extraído do MobileSelectorView pra ser reaproveitado também na tela de
 * Configurações (mobile). O evento 'beforeinstallprompt' só dispara uma vez
 * por carregamento de página e só pode ser "guardado" por quem escutou
 * primeiro — por isso o listener é anexado uma única vez a nível de módulo,
 * igual ao padrão usado em useAuth/useConnectionStatus.
 */
import { ref, computed } from 'vue';

const deferredPrompt = ref(null);
const installed = ref(false);
let attached = false;

function attachOnce() {
  if (attached || typeof window === 'undefined') return;
  attached = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
  });

  window.addEventListener('appinstalled', () => {
    installed.value = true;
    deferredPrompt.value = null;
  });
}

export function usePwaInstall() {
  attachOnce();

  const isStandalone = computed(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  });

  const isIos = computed(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua);
  });

  // Instalável "com um toque": Chrome/Edge/Android expõem o prompt nativo.
  // Safari/iOS nunca dispara beforeinstallprompt — só o passo a passo manual.
  const canInstallDirectly = computed(() => !!deferredPrompt.value);

  const promptInstall = async () => {
    if (!deferredPrompt.value) return null;
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    if (outcome === 'accepted') installed.value = true;
    deferredPrompt.value = null;
    return outcome;
  };

  return {
    isStandalone,
    isIos,
    canInstallDirectly,
    installed,
    promptInstall,
  };
}
