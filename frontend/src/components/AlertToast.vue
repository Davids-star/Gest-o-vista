<template>
  <Transition name="toast-pop">
    <div
      v-if="visible"
      class="fixed top-[calc(4rem+0.5rem+env(safe-area-inset-top,0px))] right-4 md:top-4 z-[70] flex items-start gap-3 dark-panel border-red-200 bg-white px-4 py-3 pr-3 max-w-sm cursor-pointer select-none"
      role="status"
      @click="irParaAlertas"
    >
      <div class="w-9 h-9 rounded-full bg-red-500 text-white font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
        {{ novosAlertas.length }}
      </div>
      <div class="flex-1 min-w-0">
        <template v-if="novosAlertas.length === 1">
          <p class="text-sm font-bold text-slate-900 leading-tight">
            {{ nomeMaquina(novosAlertas[0]) }}
          </p>
          <p class="text-xs text-slate-600 leading-snug mt-0.5">{{ novosAlertas[0].message || novosAlertas[0].descricao || 'Novo alerta' }}</p>
        </template>
        <template v-else>
          <p class="text-sm font-bold text-slate-900 leading-tight">{{ novosAlertas.length }} novos alertas</p>
          <p class="text-xs text-slate-600 leading-snug mt-0.5 truncate">
            {{ novosAlertas.map(nomeMaquina).join(', ') }}
          </p>
        </template>
        <p class="text-[11px] text-slate-400 leading-tight mt-1">Toque para ver a Central de Alertas</p>
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
// Popup global de novo(s) alerta(s) — aparece em qualquer tela quando um
// alerta novo chega em store.alerts (atualizado pelo WebSocket em tempo
// real, com o polling do productionStore como rede de segurança). Mostra
// a máquina e o motivo de cada alerta novo, não só uma contagem — pra dar
// pra saber o que aconteceu sem precisar nem abrir a Central de Alertas.
//
// Compara por ID (não só o total mudar de tamanho): assim, se um alerta
// novo chegar no mesmo instante em que outro é resolvido, o total pode
// ficar igual mas o alerta novo ainda aparece — comparar só o length
// deixaria passar esse caso batido.
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useProductionStore } from '../stores/productionStore';

const store = useProductionStore();
const router = useRouter();

const visible = ref(false);
const novosAlertas = ref([]);
let idsConhecidos = null; // null = ainda não sabemos o estado inicial
let hideTimer = null;

const nomeMaquina = (alert) => alert.machine?.name || alert.machine?.code || alert.maquina?.nome || 'Máquina';

watch(
  () => store.alerts,
  (atuais) => {
    const idsAtuais = new Set(atuais.map((a) => a.id));

    if (idsConhecidos === null) {
      idsConhecidos = idsAtuais; // primeira leitura: só define o ponto de partida
      return;
    }

    const chegaram = atuais.filter((a) => !idsConhecidos.has(a.id));
    idsConhecidos = idsAtuais;

    if (chegaram.length) {
      novosAlertas.value = chegaram;
      mostrar();
    }
  },
  { deep: true },
);

function mostrar() {
  visible.value = true;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { visible.value = false; }, 8000);
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
