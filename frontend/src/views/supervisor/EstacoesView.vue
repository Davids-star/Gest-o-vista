<template>
  <div class="min-h-screen bg-[#0b0f17] text-white font-sans flex select-none">
    <AppSidebar />

    <main class="flex-1 p-4 pt-[calc(4rem+env(safe-area-inset-top))] md:p-6 md:pt-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white">MONITORAMENTO</h1>
        </div>
        <div class="flex items-center gap-2 bg-[#121824] border border-[#1e293b] px-4 py-2 rounded-xl text-slate-300 font-mono text-sm self-start sm:self-auto">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/>
          </svg>
          {{ currentTime }}
        </div>
      </div>

      <!-- KPI Summary -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div class="dark-panel p-4 flex items-center justify-between">
          <div>
            <span class="block text-xs font-bold uppercase tracking-widest text-emerald-400">EM PRODUÇÃO</span>
            <span class="block text-[10px] text-slate-500 uppercase">Sessões ativas</span>
          </div>
          <span class="font-mono text-3xl font-black text-emerald-400">{{ kpiSummary.producao }}</span>
        </div>
        <div class="dark-panel p-4 flex items-center justify-between border-red-500/30">
          <div>
            <span class="block text-xs font-bold uppercase tracking-widest text-red-400">PARADA</span>
            <span class="block text-[10px] text-slate-500 uppercase">Paradas em aberto</span>
          </div>
          <span class="font-mono text-3xl font-black text-red-400">{{ kpiSummary.parada }}</span>
        </div>
        <div class="dark-panel p-4 flex items-center justify-between border-amber-500/30">
          <div>
            <span class="block text-xs font-bold uppercase tracking-widest text-amber-400">OBSERVAÇÃO</span>
            <span class="block text-[10px] text-slate-500 uppercase">Sem sessão ou inativas</span>
          </div>
          <span class="font-mono text-3xl font-black text-amber-400">{{ kpiSummary.observacao }}</span>
        </div>
        <div class="dark-panel p-4 flex items-center justify-between border-emerald-500/30">
          <div>
            <span class="block text-xs font-bold uppercase tracking-widest text-emerald-400">MÁQUINAS FUNCIONANDO</span>
            <span class="block text-[10px] text-slate-500 uppercase">Em operação normal</span>
          </div>
          <span class="font-mono text-3xl font-black text-emerald-400">{{ kpiSummary.producao }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <template v-if="store.loading.machines">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div v-for="i in 4" :key="i" class="dark-panel p-6 animate-pulse space-y-4">
            <div class="h-10 bg-slate-800 rounded-xl w-1/3"></div>
            <div class="h-4 bg-slate-800 rounded w-2/3"></div>
            <div class="h-3 bg-slate-800 rounded w-full"></div>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div
        v-else-if="!store.machines.length"
        class="dark-panel p-12 text-center"
      >
        <div class="text-4xl mb-4">🏭</div>
        <p class="text-slate-300 font-bold text-lg">Nenhuma máquina cadastrada</p>
        <p class="text-slate-400 text-sm mt-2">
          Cadastre máquinas via API <code class="text-emerald-400">POST /machines</code> para visualizá-las aqui.
        </p>
        <p v-if="store.errors.machines" class="text-red-400 text-xs mt-3">
          ⚠ {{ store.errors.machines }}
        </p>
      </div>

      <!-- Máquinas Grid (dados reais da API GET /machines) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div
        v-for="(machine, idx) in stationCards"
          :key="machine.id"
          @click="goToApontamento(machine.id)"
          class="dark-panel p-6 cursor-pointer transition-all duration-200 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)] space-y-4"
          :class="machine.statusClass"
        >
          <!-- Header do Card -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-extrabold text-lg">
                {{ machine.displayNumber }}
              </span>
              <div>
                <p class="text-base font-extrabold uppercase tracking-wide text-white">{{ machine.displayName }}</p>
                <p class="text-xs text-slate-400">{{ machine.location || machine.description || 'Chão de Fábrica' }}</p>
              </div>
            </div>
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded border text-[11px] font-bold uppercase tracking-wider"
              :class="machine.badgeClass"
            >
              <span class="w-1.5 h-1.5 rounded-full animate-pulse"
                :class="machine.dotClass"
              />
              {{ machine.statusLabel }}
            </span>
          </div>

          <!-- Produção e estado calculados dos registros reais -->
          <div class="bg-slate-900/60 rounded-xl p-4 border border-slate-800 space-y-2">
            <div class="flex justify-between items-baseline text-xs text-slate-400 uppercase font-bold">
              <span>Produção registrada</span>
              <span class="text-slate-500 normal-case font-normal">{{ machine.hasSession ? 'Sessão ativa' : 'Sem sessão ativa' }}</span>
            </div>
            <div class="text-slate-500 text-sm font-mono">
              {{ machine.production }} unidades
            </div>
          </div>

          <!-- Seta -->
          <div class="flex justify-end text-xs text-slate-500 hover:text-emerald-400 transition-colors uppercase tracking-wider font-semibold">
            Apontamento → →
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProductionStore } from '../../stores/productionStore';
import AppSidebar from '../../components/AppSidebar.vue';

const router = useRouter();
const store = useProductionStore();

// ── Relógio ──────────────────────────────────────────────────────────
const currentTime = ref('');
const currentDate = ref('');
let clockInterval = null;

const updateClock = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('pt-BR');
  currentDate.value = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
};

onMounted(async () => {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
  await Promise.all([store.fetchMachines(), store.fetchSessions(), store.fetchStops(), store.fetchProductionTotals()]);
  store.startPolling(6000);
});

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
  store.stopPolling();
});

// ── KPIs derivados dos dados reais ───────────────────────────────────
const stationCards = computed(() => store.machines.map((machine, index) => {
  const session = store.sessions.find((item) => item.machine_id === machine.id && item.status === 'active');
  const openStop = store.stops.find((stop) => stop.machine_id === machine.id && !stop.ended_at);
  const planned = Boolean(openStop?.reason?.planned || openStop?.motivoParada?.planned);
  // Soma real via SQL (store.productionTotals) — NUNCA somar todayEvents no
  // cliente (é paginado, trava assim que a sessão passa de ~100 eventos).
  const production = session ? (store.productionTotals[session.id] ?? 0) : 0;
  const state = openStop ? (planned ? 'planned' : 'stopped') : session ? 'running' : 'observation';
  const style = {
    running: ['border-emerald-500/30', 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400', 'bg-emerald-400', 'EM PRODUÇÃO'],
    stopped: ['border-red-500/30', 'border-red-500/40 bg-red-500/10 text-red-400', 'bg-red-400', 'PARADA'],
    planned: ['border-blue-500/30', 'border-blue-500/40 bg-blue-500/10 text-blue-400', 'bg-blue-400', 'PARADA PLANEJADA'],
    observation: ['border-amber-500/30', 'border-amber-500/40 bg-amber-500/10 text-amber-400', 'bg-amber-400', machine.active === false ? 'INATIVA' : 'OBSERVAÇÃO'],
  }[state];

  // Extrai o número de dentro do code (ex.: "MQ-02" → 2). parseInt(code, 10)
  // sozinho sempre dava NaN (code começa com letra "MQ-").
  const codeMatch = machine.code?.match(/\d+/);
  const parsedNum = codeMatch ? parseInt(codeMatch[0], 10) : (index + 1);
  const displayNumber = String(parsedNum);
  const displayName = `Máquina ${displayNumber}`;

  return {
    ...machine,
    displayNumber,
    displayName,
    hasSession: Boolean(session),
    production,
    state,
    statusClass: style[0],
    badgeClass: style[1],
    dotClass: style[2],
    statusLabel: style[3],
  };
}));
const kpiSummary = computed(() => ({
  producao: stationCards.value.filter((item) => item.state === 'running').length,
  parada: stationCards.value.filter((item) => item.state === 'stopped').length,
  planejada: stationCards.value.filter((item) => item.state === 'planned').length,
  observacao: stationCards.value.filter((item) => item.state === 'observation').length,
}));

const goToApontamento = (machineId) => {
  store.selectStation(machineId);
  router.push(`/apontamento/${machineId}`);
};
</script>
