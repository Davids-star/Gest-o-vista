import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'
import router from './router'
import { ajustarManifestPwa } from './pwaManifest'

// Troca o manifest ANTES de qualquer coisa, ainda no boot: se o Totem já
// carrega direto em '#/totem/...' (ícone instalado, ou bookmark), precisa
// estar certo antes do Chrome avaliar se o app é instalável — trocar só
// depois, via router, pode chegar tarde pra essa primeira avaliação.
ajustarManifestPwa(window.location.hash)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// registerType: 'autoUpdate' (vite.config.js) já recarrega a página sozinho
// quando um Service Worker novo assume — sem isso, uma aba/PWA já aberta
// (Totem 24h, app instalado no celular) ficava rodando o JS antigo depois
// de um deploy, até o usuário fechar e abrir de novo por conta própria.
registerSW({ immediate: true })
