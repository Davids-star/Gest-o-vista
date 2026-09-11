<template>
  <Transition name="toast-pop">
    <div
      v-if="visible"
      class="fixed top-[calc(4rem+0.5rem+env(safe-area-inset-top,0px))] right-4 md:top-4 z-[70] flex items-center gap-3 dark-panel border-red-200 bg-white px-4 py-3 pr-3 max-w-xs cursor-pointer select-none"
      role="status"
      @click="irParaAlertas"
    >
      <div class="w-9 h-9 rounded-full bg-red-500 text-white font-black text-sm flex items-center justify-center shrink-0">
        {{ count }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold text-slate-900 leading-tight">
          {{ count > 1 ? `${count} novos alertas` : 'Novo alerta' }}
        </p>
        <p class="text-xs text-slate-500 leading-tight mt-0.5">Toque para ver a Central de Alertas</p>
      </div>
      <button
        @click.stop="dispensar"
        class="shrink-0 w-6 h-6 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center text-lg leading-none"
        aria-label="Dispensar"
      >
        &times;
      </button>
    </div>
  </Transition>
</template>

<script setup>
// Popup global de novo(s) alerta(s) — aparece em qualquer tela quando a
// contagem de alertas em aberto (store.alerts, atualizada pelo polling/WS
// do productionStore) SOBE em relação ao valor anterior. Não dispara no
// primeiro carregamento da store (senão "poparia" toda vez que alguém abre
// o sistema com alertas já pendentes de antes).
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useProductionStore } from '../stores/productionStore';

const store = useProductionStore();
const router = useRouter();

const visible = ref(false);
const count = ref(0);
let baseline = null; // null = ainda não sabemos o valor inicial
let hideTimer = null;

watch(
  () => store.alerts.length,
  (atual) => {
    if (baseline === null) {
      baseline = atual; // primeira leitura: só define o ponto de partida
      return;
    }
    if (atual > baseline) {
      count.value = atual;
      mostrar();
    }
    baseline = atual;
  },
);

function mostrar() {
  visible.value = true;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { visible.value = false; }, 7000);
}

function dispensar() {
  visible.value = false;
  clearTimeout(hideTimer);
}

function irParaAlertas() {
  visible.value = false;
  clearTimeout(hideTimer);
  router.push('/alertas');
}
</script>

<style scoped>
.toast-pop-enter-active { transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease; }
.toast-pop-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.toast-pop-enter-from { transform: translateY(-12px) scale(0.95); opacity: 0; }
.toast-pop-leave-to { transform: translateY(-8px) scale(0.97); opacity: 0; }
</style>
