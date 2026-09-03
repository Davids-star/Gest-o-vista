<template>
  <div class="min-h-screen bg-[#070a0f] text-white p-8 select-none flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <h1 class="text-4xl font-black uppercase tracking-widest text-white leading-none">Monitoramento</h1>
          <p class="text-sm text-slate-400 mt-1">de produção</p>
        </div>
      </div>

      <div class="flex items-center gap-3 font-mono">
        <div class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="text-right">
          <div class="text-2xl font-extrabold text-white leading-none">{{ currentTime }}</div>
          <div class="text-xs text-slate-500 uppercase tracking-widest mt-1">{{ currentDate }}</div>
        </div>
      </div>
    </header>

    <!-- KPIs gerais — dados reais (nada fixo) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
      <div class="dark-panel border-2 border-emerald-500/40 p-5 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Operacionais</p>
          <p class="text-4xl font-black text-emerald-400 font-mono leading-tight">{{ kpis.operacionais }}</p>
          <p class="text-[11px] text-slate-500 uppercase tracking-wider">{{ kpis.totalAtivas }} estações ativas</p>
        </div>
      </div>

      <div class="dark-panel border-2 border-red-500/50 p-5 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
          <!-- Triângulo de alerta (Heroicons exclamation-triangle) — antes
               estava com dois ícones diferentes sobrepostos (círculo +
               triângulo), por isso ficava borrado/quebrado. -->
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Alertas</p>
          <p class="text-4xl font-black font-mono leading-tight text-red-400">{{ kpis.alertas }}</p>
          <p class="text-[11px] text-slate-500 uppercase tracking-wider">{{ kpis.alertas > 0 ? 'em aberto' : 'nenhum alerta' }}</p>
        </div>
      </div>

      <div class="dark-panel border-2 border-amber-500/50 p-5 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L1.5 3l1.5-1.5L7.5 4.5v1.409l4.26 4.26" />
          </svg>
        </div>
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Manutenção</p>
          <p class="text-4xl font-black font-mono leading-tight text-amber-400">{{ kpis.manutencao }}</p>
          <p class="text-[11px] text-slate-500 uppercase tracking-wider">{{ kpis.manutencao > 0 ? 'em manutenção' : 'nenhuma parada' }}</p>
        </div>
      </div>
    </div>

    <!-- Grid de estações -->
    <main class="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
      <div
        v-for="st in stations"
        :key="st.id"
        class="dark-panel p-6 border-2 space-y-5"
        :class="st.cardBorderClass"
      >
        <!-- Cabeçalho do card -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span class="w-12 h-12 rounded-xl border-2 flex items-center justify-center font-mono font-extrabold text-lg shrink-0" :class="st.badgeClass">
              {{ st.displayCode.padStart(2, '0') }}
            </span>
            <h2 class="text-xl font-black uppercase text-white tracking-wide">Estação {{ st.displayCode.padStart(2, '0') }}</h2>
          </div>

          <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border" :class="st.pillClass">
            <span class="w-2 h-2 rounded-full" :class="st.dotClass" />
            {{ st.statusLabel }}
          </span>
        </div>

        <!-- Produto / Lote / Operador -->
        <div class="grid grid-cols-3 gap-3 text-xs border-t border-b border-slate-800/80 py-3">
          <div>
            <span class="text-slate-500 block uppercase font-bold tracking-wide">Produto</span>
            <span class="font-bold text-white">{{ st.product }}</span>
          </div>
          <div>
            <span class="text-slate-500 block uppercase font-bold tracking-wide">Lote</span>
            <span class="font-mono font-bold text-emerald-400">{{ st.lot }}</span>
          </div>
          <div>
            <span class="text-slate-500 block uppercase font-bold tracking-wide">Operador</span>
            <span class="font-bold text-white truncate block">{{ st.operator }}</span>
          </div>
        </div>

        <!-- Motivo da parada, se houver — cor segue o mesmo nível do pill
             (vermelho = parada grave, laranja = atenção/planejada). -->
        <div
          v-if="st.statusType.startsWith('stopped')"
          class="rounded-xl p-3 text-xs flex justify-between items-center border"
          :class="st.statusType === 'stopped' ? 'bg-red-500/10 border-red-500/40' : 'bg-amber-500/10 border-amber-500/40'"
        >
          <span class="font-bold uppercase" :class="st.statusType === 'stopped' ? 'text-red-300' : 'text-amber-300'">⏸ {{ st.openStopReason }}</span>
          <span v-if="st.openStopDuration" class="font-mono text-white px-2 py-0.5 rounded border" :class="st.statusType === 'stopped' ? 'bg-red-950 border-red-800' : 'bg-amber-950 border-amber-800'">{{ st.openStopDuration }}</span>
        </div>

        <!-- Produção atual × Meta -->
        <div class="grid grid-cols-2 gap-6">
          <div>
            <span class="text-xs text-slate-400 uppercase tracking-wider">produção atual</span>
            <p class="text-3xl font-black text-white font-mono mt-0.5">{{ st.currentProduction.toLocaleString('pt-BR') }}</p>
            <span class="text-[11px] text-slate-500 uppercase tracking-wider">unidades</span>
          </div>
          <div>
            <span class="text-xs text-slate-400 uppercase tracking-wider">meta</span>
            <p class="text-3xl font-black font-mono mt-0.5" :class="st.metaBatida ? 'text-amber-400' : 'text-emerald-400'">
              {{ st.targetProduction === null ? '—' : st.targetProduction.toLocaleString('pt-BR') }}
            </p>
            <span class="text-[11px] text-slate-500 uppercase tracking-wider">{{ st.targetProduction === null ? 'sem meta definida' : 'unidades' }}</span>
          </div>
        </div>

        <!-- Progresso da meta — x/x e % ficam no cabeçalho, FORA da barra
             (dentro dela, com progresso baixo, o texto ficava mais largo
             que a cápsula e cortava — mesmo ajuste já feito no Totem). -->
        <div v-if="st.targetProduction !== null" class="space-y-2">
          <div class="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>{{ st.metaBatida ? '✅ Meta Batida' : 'Progresso da meta' }}</span>
            <span class="font-mono text-sm" :class="st.metaBatida ? 'text-amber-400' : 'text-emerald-400'">
              {{ st.currentProduction.toLocaleString('pt-BR') }}/{{ st.targetProduction.toLocaleString('pt-BR') }} · {{ st.progress }}%
            </span>
          </div>
          <div class="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="st.metaBatida ? 'bg-amber-400' : 'bg-emerald-400'"
              :style="{ width: st.progressBarWidth + '%' }"
            />
          </div>
          <p class="text-[11px] text-slate-500 text-right">
            {{ st.metaBatida
              ? `Superou a meta em ${(st.currentProduction - st.targetProduction).toLocaleString('pt-BR')} un.`
              : `Faltam ${st.remaining.toLocaleString('pt-BR')} un. (${st.remainingPercent}% restante)` }}
          </p>
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
const currentDate = ref('');
let clockInterval = null;

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('pt-BR');
  currentDate.value = now.toLocaleDateString('pt-BR');
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

    // 1. Desativada
    if (machine.active === false) {
      return {
        ...machine,
        displayCode,
        operator: '—',
        product: '—',
        lot: '—',
        currentProduction: 0,
        targetProduction: null,
        progress: 0,
        statusType: 'disabled',
        statusLabel: 'Desativada',
        cardBorderClass: 'border-slate-800',
        badgeClass: 'border-slate-700 bg-slate-900 text-slate-500',
        pillClass: 'border-slate-700 bg-slate-900 text-slate-500',
        dotClass: 'bg-slate-600',
      };
    }

    // 2. Parada aberta?
    const openStop = store.stops.find((s) => s.machine_id === machine.id && !s.ended_at);

    // 3. Sessão ativa?
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
    const remaining = targetProduction !== null ? Math.max(0, targetProduction - currentProduction) : null;
    const remainingPercent = targetProduction !== null ? Math.max(0, 100 - progressRaw) : null;

    let statusType = 'waiting';
    let statusLabel = 'Aguardando';
    let cardBorderClass = 'border-amber-500/40';
    let badgeClass = 'border-amber-500/50 bg-amber-500/10 text-amber-400';
    let pillClass = 'border-amber-500/40 bg-amber-500/10 text-amber-400';
    let dotClass = 'bg-amber-400';

    if (openStop) {
      // Gestão à vista: nem toda parada é uma emergência.
      // - reason.planned (Fim de turno, Pausa, Troca de produto, Outros):
      //   evento esperado, não é alerta — mesmo campo que já existe no
      //   schema pra decidir se cria Alert (ver ParadasRegistrosService).
      // - Manutenção / Falta de material: precisa de atenção, mas não é
      //   uma parada "grave" de equipamento — fica laranja, não vermelho.
      // - o resto (ex.: Problema no equipamento): parada de verdade,
      //   vermelho.
      const motivoLabel = (openStop.reason?.label || '').toLowerCase();
      const isAtencao = motivoLabel.includes('manuten') || motivoLabel.includes('falta de material');

      if (openStop.reason?.planned) {
        statusType = 'stopped-planned';
        statusLabel = openStop.reason?.label || 'Parada Planejada';
        cardBorderClass = 'border-amber-500/40';
        badgeClass = 'border-amber-500/50 bg-amber-500/10 text-amber-400';
        pillClass = 'border-amber-500/40 bg-amber-500/10 text-amber-400';
        dotClass = 'bg-amber-400';
      } else if (isAtencao) {
        statusType = 'stopped-atencao';
        statusLabel = 'Atenção';
        cardBorderClass = 'border-amber-500/50';
        badgeClass = 'border-amber-500/50 bg-amber-500/10 text-amber-400';
        pillClass = 'border-amber-500/50 bg-amber-500/10 text-amber-400';
        dotClass = 'bg-amber-400 animate-pulse';
      } else {
        statusType = 'stopped';
        statusLabel = 'Parada';
        cardBorderClass = 'border-red-500/50';
        badgeClass = 'border-red-500/50 bg-red-500/10 text-red-400';
        pillClass = 'border-red-500/50 bg-red-500/10 text-red-400';
        dotClass = 'bg-red-400 animate-pulse';
      }
    } else if (session) {
      statusType = 'running';
      statusLabel = 'Operacional';
      cardBorderClass = 'border-emerald-500/50';
      badgeClass = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
      pillClass = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
      dotClass = 'bg-emerald-400 animate-pulse';
    }

    return {
      ...machine,
      displayCode,
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
      remaining,
      remainingPercent,
      statusType,
      statusLabel,
      cardBorderClass,
      badgeClass,
      pillClass,
      dotClass,
    };
  });
});

// KPIs do topo — tudo derivado de dado real já carregado (nenhum número fixo).
const kpis = computed(() => ({
  totalAtivas: store.machines.filter((m) => m.active !== false).length,
  operacionais: stations.value.filter((s) => s.statusType === 'running').length,
  // GET /alertas/abertos (status='open' estrito) some da lista assim que
  // ALGUÉM reconhece o alerta — mas "reconhecido" só significa "alguém
  // viu", não "resolvido"; e resolver um alerta hoje não acontece nunca
  // sozinho quando a parada é fechada (conferido no banco: parada fechada
  // não muda o status do alerta). Contar por status do alerta então
  // acumula pra sempre. O que a TV precisa é "quantas máquinas estão
  // paradas AGORA" — mesmo critério já usado no pill vermelho "PARADA"
  // de cada card, sem precisar buscar alertas de novo.
  // Só o nível vermelho conta como alerta — laranja (atenção/planejada)
  // não é emergência, não deve inflar esse número.
  alertas: stations.value.filter((s) => s.statusType === 'stopped').length,
  // "Manutenção" = nível laranja (Manutenção ou Falta de material —
  // "soa como manutenção"), o mesmo critério do pill/banner do card.
  manutencao: stations.value.filter((s) => s.statusType === 'stopped-atencao').length,
}));

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
