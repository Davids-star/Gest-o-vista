import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'
import router from './router'
import { isNativeApp } from './config/platform.js'
import { DEVICE_TOKEN } from './config/env.js'
import { useAuth } from './composables/useAuth'

// APK = Totem: entra já autenticado como dispositivo, sem tela de ativação.
if (isNativeApp() && DEVICE_TOKEN) {
  const { token, setSession } = useAuth()
  if (token.value !== DEVICE_TOKEN) {
    setSession({ name: 'Dispositivo (Totem)', role: 'operador' }, DEVICE_TOKEN)
  }
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// registerType: 'autoUpdate' (vite.config.js) já recarrega a página sozinho
// quando um Service Worker novo assume — sem isso, uma aba/PWA já aberta
// (Totem 24h, app instalado no celular) ficava rodando o JS antigo depois
// de um deploy, até o usuário fechar e abrir de novo por conta própria.
// No APK o app roda da própria pasta do build (sem servidor). Um service worker
// de build anterior fica preso no WebView e serve index.html antigo do cache,
// apontando para JS que não existe mais → tela em branco. Por isso no APK
// removemos qualquer SW/cache registrado. Na PWA o SW continua como antes.
if (isNativeApp()) {
  try {
    navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    caches?.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  } catch {
    /* WebView sem Service Worker: nada a limpar */
  }
} else {
  registerSW({ immediate: true });
}
