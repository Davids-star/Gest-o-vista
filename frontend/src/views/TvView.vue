<template>
  <div class="min-h-screen bg-[#070a0f] text-white p-8 select-none flex flex-col justify-between">
    <!-- Header TV -->
    <header class="flex items-center justify-between border-b border-slate-800 pb-6">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center font-bold text-2xl">
          ⚙️
        </div>
        <div>
          <h1 class="text-3xl font-black uppercase tracking-widest text-emerald-400">PAINEL INDUSTRIAL DE PRODUÇÃO</h1>
          <p class="text-sm font-bold text-slate-400 uppercase tracking-wider">Monitoramento em Tempo Real - Chão de Fábrica</p>
        </div>
      </div>

      <div class="text-right font-mono">
        <div class="text-3xl font-extrabold text-white">{{ currentTime }}</div>
        <div class="text-xs text-slate-400 uppercase tracking-widest">Atualização Contínua</div>
      </div>
    </header>

    <!-- Machines Grid (Big Cards for TV) -->
    <main class="grid grid-cols-1 md:grid-cols-2 gap-8 my-8 flex-1">
      <div
        v-for="st in stations"
        :key="st.id"
        class="dark-panel p-8 space-y-6 border-2 flex flex-col justify-between"
        :class="st.statusColorClass"
      >
        <!-- Card Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div class="flex items-center gap-4">
            <span class="w-14 h-14 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400 font-mono font-extrabold text-3xl flex items-center justify-center">
              {{ st.displayCode }}
            </span>
            <div>
              <h2 class="text-2xl font-black uppercase text-white">{{ st.displayName }}</h2>
              <p class="text-sm text-slate-400 font-semibold">Operador: <span class="text-white">{{ st.operator }}</span></p>
            </div>
          </div>

          <span class="px-4 py-1.5 rounded-xl font-black font-mono text-sm tracking-wider border shadow-md" :class="st.statusColorClass">
            {{ st.statusBadge }}
          </span>
        </div>

        <!-- Stop info banner if stopped -->
        <div v-if="st.statusType === 'stopped'" class="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-xs space-y-1">
          <div class="flex justify-between items-center text-red-300 font-bold uppercase">
            <span>Motivo da Parada: {{ st.openStopReason }}</span>
            <span v-if="st.openStopDuration" class="font-mono text-white bg-red-950 px-2 py-0.5 rounded border border-red-800">⏱ {{ st.openStopDuration }}</span>
          </div>
        </div>

        <!-- Middle Info Grid -->
        <div class="grid grid-cols-2 gap-6 text-base">
          <div>
            <span class="text-xs text-slate-400 block uppercase font-bold">PRODUTO</span>
            <span class="font-bold text-white text-lg">{{ st.product }}</span>
          </div>

          <div>
            <span class="text-xs text-slate-400 block uppercase font-bold">LOTE</span>
            <span class="font-mono font-bold text-emerald-400 text-lg">{{ st.lot }}</span>
          </div>
        </div>

        <!-- Production KPI -->
        <div class="space-y-3 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
          <div class="flex items-baseline justify-between">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">PRODUÇÃO / META</span>
            <span class="text-3xl font-black font-mono text-emerald-400">{{ st.currentProduction }} / {{ st.targetProduction === null ? 'Sem meta definida' : `${st.targetProduction} un.` }}</span>
          </div>

          <!-- Large Progress Bar — largura satura em 100%, mas o % mostrado
               (dentro da barra e no texto abaixo) continua subindo de verdade
               quando a meta é batida, não trava.
               Texto de dentro é só a % (curto de propósito): "PRODUÇÃO/META"
               já aparece acima — com produção/meta ali dentro também, um
               progresso baixo deixava a cápsula mais estreita que o texto,
               cortando ele pela metade (mesmo ajuste do Totem). -->
          <div v-if="st.targetProduction !== null" class="w-full bg-slate-950 rounded-full h-5 p-1 border border-slate-800 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 flex items-center justify-end px-2 min-w-[2.5rem]"
              :class="st.metaBatida ? 'bg-amber-400' : 'bg-emerald-400'"
              :style="{ width: st.progressBarWidth + '%' }"
            >
              <span class="text-[10px] font-black text-slate-950 leading-none whitespace-nowrap">
                {{ st.progress }}%
              </span>
            </div>
          </div>

          <div class="flex justify-between items-center text-xs font-bold text-slate-400 pt-1">
            <span>{{ st.targetProduction === null ? 'META' : (st.metaBatida ? '✅ META BATIDA' : 'PERCENTUAL ATINGIDO') }}</span>
            <span class="font-mono text-base" :class="st.metaBatida ? 'text-amber-400' : 'text-emerald-400'">{{ st.targetProduction === null ? 'Sem meta definida' : `${st.progress}%` }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useProductionStore } from '../stores/productionStore';

const store = useProductionStore();
const currentTime = ref('');
let clockInterval = null;

const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString('pt-BR');
};

const formatTimeAgo = (startedAt) => {
  if (!startedAt) return '';
  const seconds = Math.floor((new Date() - new Date(startedAt)) / 1000);
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m ${seconds % 60}s`;
};

const stations = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  return store.machines.map((machine, index) => {
    // parseInt(machine.code, 10) sozinho sempre dava NaN (code começa com
    // letra "MQ-") — extrai o dígito de dentro do code em vez disso.
    const codeMatch = machine.code?.match(/\d+/);
    const parsedNum = codeMatch ? parseInt(codeMatch[0], 10) : (index + 1);
    const displayCode = String(parsedNum);
    const displayName = `Máquina ${displayCode}`;

    // 1. Ver se está desativada
    if (machine.active === false) {
      return {
        ...machine,
        displayCode,
        displayName,
        operator: '—',
        product: '—',
        lot: '—',
        currentProduction: 0,
        targetProduction: null,
        progress: 0,
        statusType: 'disabled',
        statusBadge: '⚪ DESATIVADA',
        statusColorClass: 'border-slate-800 bg-slate-900/40 text-slate-500',
      };
    }

    // 2. Ver se há parada aberta para esta máquina
    const openStop = store.stops.find((s) => s.machine_id === machine.id && !s.ended_at);

    // 3. Ver se há sessão ativa
    const session = store.sessions.find((item) => item.machine_id === machine.id && item.status === 'active');
    const target = store.metas.find(
      (item) => item.machine_id === machine.id
        && (!item.product_id || item.product_id === session?.product_id)
        && item.quantity > 0 && item.period_start <= today && item.period_end >= today,
    );

    // Soma real via SQL (store.productionTotals) — NUNCA somar todayEvents
    // no cliente (é paginado, trava assim que a sessão passa de ~100 eventos).
    const currentProduction = session ? (store.productionTotals[session.id] ?? 0) : 0;
    const targetProduction = target?.quantity ?? null;
    const progressRaw = targetProduction ? Math.round((currentProduction / targetProduction) * 100) : 0;
    const metaBatida = targetProduction !== null && currentProduction >= targetProduction;

    let statusType = 'waiting';
    let statusBadge = '🟡 AGUARDANDO';
    let statusColorClass = 'border-amber-500/30 bg-amber-500/10 text-amber-400';

    if (openStop) {
      statusType = 'stopped';
      statusBadge = '🔴 PARADA';
      statusColorClass = 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse';
    } else if (session) {
      statusType = 'running';
      statusBadge = '🟢 FUNCIONANDO';
      statusColorClass = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
    }

    return {
      ...machine,
      displayCode,
      displayName,
      operator: session?.operator?.name || '—',
      product: session?.product?.name || '—',
      lot: session?.lot?.code || '—',
      openStopReason: openStop?.reason?.label || openStop?.observation || 'Parada sem motivo especificado',
      openStopDuration: openStop ? formatTimeAgo(openStop.started_at) : null,
      currentProduction,
      targetProduction,
      progress: progressRaw,
      progressBarWidth: Math.min(100, progressRaw),
      metaBatida,
      statusType,
      statusBadge,
      statusColorClass,
    };
  });
});

onMounted(async () => {
  updateTime();
  clockInterval = setInterval(updateTime, 1000);
  await Promise.all([
    store.fetchMachines(),
    store.fetchSessions(),
    store.fetchStops(),
    store.fetchMetas(),
    store.fetchProductionTotals(),
  ]);
  store.startPolling(6000);
});

onBeforeUnmount(() => {
  if (clockInterval) clearInterval(clockInterval);
  store.stopPolling();
});
</script>
