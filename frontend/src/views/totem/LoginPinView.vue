<template>
  <div class="min-h-screen bg-[#0b0f17] text-white flex flex-col items-center justify-center p-6 select-none">
    <div class="dark-panel w-full max-w-md p-8 space-y-8 text-center border border-emerald-500/30">
      <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <div>
        <h1 class="text-2xl font-extrabold uppercase tracking-wider text-white">TOTEM OPERACIONAL</h1>
        <p class="text-xs text-slate-400 tracking-wide mt-1">Selecione a estação e informe seu nome</p>
      </div>

      <!-- Loading máquinas -->
      <div v-if="store.loading.machines" class="py-4">
        <div class="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs text-slate-400 mt-2">Carregando estações da API...</p>
      </div>

      <!-- Sem máquinas cadastradas -->
      <div v-else-if="!store.machines.length" class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <p class="text-amber-400 text-sm font-semibold">Nenhuma estação disponível.</p>
        <p class="text-xs text-slate-400 mt-1">Aguardando cadastro via supervisor.</p>
      </div>

      <!-- Formulário de entrada -->
      <div v-else class="space-y-4 text-left">
        <div>
          <label class="block text-xs uppercase font-bold text-slate-400 mb-2">Selecione a Estação *</label>
          <select
            v-model="selectedStationId"
            class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 focus:border-emerald-500 focus:outline-none text-sm font-semibold"
          >
            <option value="" disabled>Selecione...</option>
            <option v-for="m in store.machines" :key="m.id" :value="m.id">
              Máquina {{ getMachineNumber(m) }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs uppercase font-bold text-slate-400 mb-2">Nome do Operador *</label>
          <input
            v-model="operatorName"
            type="text"
            placeholder="Digite seu nome..."
            @keyup.enter="handleEnter"
            class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-4 text-base focus:border-emerald-500 focus:outline-none text-center font-bold"
          />
        </div>

        <p v-if="errorMsg" class="text-red-400 text-xs font-semibold text-center">⚠ {{ errorMsg }}</p>

        <button
          @click="handleEnter"
          :disabled="!selectedStationId || !operatorName.trim()"
          class="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl uppercase tracking-wider text-base shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-95"
        >
          INICIAR TURNO →
        </button>

        <div class="pt-2 text-center">
          <router-link to="/mobile" class="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 font-medium">
            📱 Voltar ao Seletor Mobile / Instalar PWA
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProductionStore } from '../../stores/productionStore';

const router = useRouter();
const store = useProductionStore();

// Número de exibição da máquina — extrai o dígito do code (ex.: "MQ-02" → 2).
// parseInt(m.code, 10) sozinho sempre dava NaN (code começa com letra
// "MQ-"), então nunca usava o código real, só a posição no array —
// "Máquina 2" podia mostrar uma máquina de teste qualquer, não a MQ-02.
const getMachineNumber = (m) => {
  const idx = store.machines.findIndex((item) => item.id === m.id);
  const match = m.code?.match(/\d+/);
  return match ? parseInt(match[0], 10) : (idx >= 0 ? idx + 1 : 1);
};

const selectedStationId = ref('');
const operatorName = ref('');
const errorMsg = ref('');

onMounted(async () => {
  // Carrega máquinas reais: GET /machines → PostgreSQL
  if (!store.machines.length) {
    await store.fetchMachines();
  }
  // Pré-seleciona a primeira disponível
  if (store.machines.length && !selectedStationId.value) {
    selectedStationId.value = store.machines[0].id;
  }
});

const handleEnter = () => {
  errorMsg.value = '';
  if (!selectedStationId.value) {
    errorMsg.value = 'Selecione uma estação.';
    return;
  }
  if (!operatorName.value.trim()) {
    errorMsg.value = 'Informe o nome do operador.';
    return;
  }

  // Seleciona estação na store para que ProducaoView use a máquina correta
  store.selectStation(selectedStationId.value);

  // Navega para tela de produção do Totem
  // (a sessão real será iniciada via botão INICIAR em ProducaoView → POST /totem/sessions)
  router.push(`/totem/producao/${selectedStationId.value}`);
};
</script>
