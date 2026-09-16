// pwaManifest.js — troca o <link rel="manifest"> em runtime.
//
// O app inteiro é uma SPA só (um index.html, hash router), mas na prática
// são dois "aplicativos" instaláveis diferentes: o Totem (tablet fixo no
// chão de fábrica, abre direto na tela de produção, tela cheia) e o app do
// celular/supervisor (manifest.webmanifest padrão, gerado pelo
// vite-plugin-pwa em vite.config.js). Sem isso, instalar o PWA a partir da
// tela do Totem gerava um ícone que, ao abrir, caía na rota "/" (redireciona
// pro login do supervisor) — o operador tinha que navegar até o Totem toda
// vez, mesmo já tendo "instalado o Totem".
//
// `manifest-totem.webmanifest` (pasta public/) tem `id` e `start_url`
// próprios, então o Android/Chrome o trata como um app instalável distinto
// do principal — dá pra ter os dois ícones (Totem e GP Mobile) instalados
// ao mesmo tempo no mesmo tablet/celular, se for o caso.
const MANIFEST_TOTEM = '/manifest-totem.webmanifest';
let manifestPadrao = null;

export function ajustarManifestPwa(hash) {
  if (typeof document === 'undefined') return;
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return;

  if (manifestPadrao === null) {
    manifestPadrao = link.getAttribute('href');
  }

  const ehTotem = /^#\/totem(\/|$)/.test(hash || '');
  const alvo = ehTotem ? MANIFEST_TOTEM : manifestPadrao;
  if (link.getAttribute('href') !== alvo) {
    link.setAttribute('href', alvo);
  }
}
