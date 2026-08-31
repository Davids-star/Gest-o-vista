import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// registerType: 'autoUpdate' (vite.config.js) já recarrega a página sozinho
// quando um Service Worker novo assume — sem isso, uma aba/PWA já aberta
// (Totem 24h, app instalado no celular) ficava rodando o JS antigo depois
// de um deploy, até o usuário fechar e abrir de novo por conta própria.
registerSW({ immediate: true })
