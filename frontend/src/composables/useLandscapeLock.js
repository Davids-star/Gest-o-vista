// useLandscapeLock.js — trava a orientação da tela em paisagem no Totem.
//
// screen.orientation.lock() só funciona em contexto fullscreen (a Fullscreen
// API, ou um PWA instalado com display:'fullscreen'/'standalone' — já é o
// caso aqui, ver vite.config.js). Numa aba comum de navegador (Chrome
// desktop testando, iOS Safari, qualquer aba não-fullscreen) ele lança
// NotSupportedError — por isso o try/catch silencioso: não é bug, é só
// esse aparelho/contexto não suportar o lock, sem quebrar a tela por isso.
export function travarPaisagem() {
  if (typeof screen === 'undefined' || !screen.orientation?.lock) return;
  screen.orientation.lock('landscape').catch(() => {
    // Sem suporte (navegador comum, iOS) — a tela continua funcionando
    // normal, só sem forçar a rotação.
  });
}
