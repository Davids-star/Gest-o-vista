<template>
  <Transition name="slide-down">
    <div
      v-if="status === 'offline'"
      class="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider select-none bg-red-500/90 text-white"
      style="padding-top: calc(0.375rem + env(safe-area-inset-top, 0px));"
      role="status"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
      Sem conexão com a internet — exibindo últimos dados
    </div>
  </Transition>
</template>

<script setup>
// Banner global e discreto: só aparece quando falta rede. O aviso "Reconectando
// ao servidor…" (WebSocket caído) foi removido a pedido: com a API local o socket
// cai e volta o tempo todo e o aviso só atrapalhava o Totem. Fica no topo pra
// não competir com o conteúdo do Totem/TV/Dashboard, e não bloqueia clique
// em nada embaixo.
import { useConnectionStatus } from '../composables/useConnectionStatus';

const { status } = useConnectionStatus();
</script>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: transform 0.25s ease, opacity 0.25s ease; }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-100%); opacity: 0; }
</style>
