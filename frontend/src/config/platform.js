/**
 * Ambiente de execução: APK (Capacitor) ou navegador/PWA.
 * Não importa nada do Capacitor no topo: o módulo também roda no Node (testes).
 */
export function isNativeApp() {
  return typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
}

/**
 * No Android o plugin Cordova (window.bluetoothSerial) só existe depois do
 * evento 'deviceready'. Espera no máximo `timeoutMs`; no navegador não espera.
 */
export function waitForNativeReady(timeoutMs = 5000) {
  if (!isNativeApp() || window.cordova) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); document.removeEventListener('deviceready', done); resolve(); };
    const timer = setTimeout(done, timeoutMs);
    document.addEventListener('deviceready', done, { once: true });
  });
}
