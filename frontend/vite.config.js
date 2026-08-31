import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      // Substitui o sw.js escrito à mão (public/sw.js, removido): esse
      // arquivo só pré-cacheava '/', '/index.html' e os ícones — nunca os
      // JS/CSS reais do build (nomes com hash, diferentes a cada deploy),
      // então o primeiro acesso offline a uma versão nunca aberta antes
      // ficava sem nada pra servir. O plugin gera o precache manifest a
      // partir do próprio output do build, sempre completo e correto.
      registerType: 'autoUpdate',
      injectRegister: false, // registro manual em src/main.js
      devOptions: {
        // Mantém o SW ativo também em `npm run dev` — é assim que o time
        // testa o PWA no celular pela rede local (ver comentário em
        // `server` abaixo), não só depois de um build de produção.
        enabled: true,
        type: 'module',
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons.svg'],
      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'GP Industrial Mobile - Sistema de Gestão de Produção',
        short_name: 'GP Mobile',
        description: 'Sistema PWA para monitoramento industrial, totens operacionais de fábrica, apontamentos e dashboards no celular.',
        lang: 'pt-BR',
        start_url: '/#/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0b0f17',
        theme_color: '#10b981',
        categories: ['industrial', 'productivity', 'utilities'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
        shortcuts: [
          {
            name: 'Seleção Mobile / Modo',
            short_name: 'Seletor',
            description: 'Escolher modo de operação ou estação no celular',
            url: '/#/mobile',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Totem do Operador',
            short_name: 'Totem',
            description: 'Entrar no totem de chão de fábrica',
            url: '/#/totem/login',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Dashboard Supervisor',
            short_name: 'Dashboard',
            description: 'Visualizar métricas e alertas de produção',
            url: '/#/dashboard',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
    }),
  ],
  server: {
    host: true, // Ou '0.0.0.0' para permitir acesso pela rede local (ex: celular)
    port: 5173,
  },
})
