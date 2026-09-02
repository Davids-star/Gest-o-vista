<template>
  <div class="min-h-screen bg-[#0b0f17] text-white font-sans flex select-none">
    <AppSidebar />

    <main class="flex-1 p-4 pt-[calc(4rem+env(safe-area-inset-top))] md:p-6 md:pt-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white">
            APONTAMENTO <span class="text-sm font-normal text-emerald-400">por estação</span>
          </h1>
          <p class="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-1">
            Selecione uma máquina para acompanhar sua produção e ocorrências em tempo real
          </p>
        </div>

        <div class="flex items-center gap-3 self-start sm:self-auto">
          <!-- Data do Turno Atual -->
          <div class="bg-[#121824] border border-slate-800 px-3.5 py-2 rounded-xl text-emerald-400 font-mono text-xs font-bold flex items-center gap-2">
            <span>📅</span> HOJE ({{ dataAtualFormatada }})
          </div>

          <!-- Relógio ao Vivo -->
          <div class="bg-[#121824] border border-slate-800 px-4 py-2 rounded-xl text-slate-300 font-mono text-sm flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {{ currentTime }}
          </div>
        </div>
      </div>

      <!-- SELETOR DE MÁQUINA (ESTAÇÃO DE TRABALHO) -->
      <section class="mb-6">
        <h2 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center justify-between">
          <span class="flex items-center gap-2"><span>🏭</span> ESTAÇÕES DA FÁBRICA</span>
          <span class="text-[10px] text-slate-500 font-normal">Clique na máquina para alternar a visão</span>
        </h2>

        <div v-if="store.loading.machines" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div v-for="i in 4" :key="i" class="dark-panel p-4 animate-pulse h-20"></div>
        </div>

        <div v-else-if="!store.machines.length" class="dark-panel p-6 text-center text-slate-400">
          Nenhuma máquina cadastrada no sistema.
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div
            v-for="st in store.machines"
            :key="st.id"
            @click="store.selectStation(st.id)"
            class="p-4 rounded-xl cursor-pointer transition-all duration-200 border"
            :class="st.id === store.selectedStationId
              ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'"
          >
            <div class="flex items-center justify-between gap-2 mb-1">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="w-8 h-8 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-extrabold text-xs shrink-0">
                  {{ getMachineNumber(st) }}
                </span>
                <div class="min-w-0">
                  <p class="text-xs font-extrabold uppercase tracking-wider text-white truncate">
                    {{ getMachineDisplayName(st) }}
                  </p>
                  <p class="text-[10px] text-slate-400 truncate">{{ st.name || st.location || 'Chão de Fábrica' }}</p>
                </div>
              </div>
            </div>

            <div class="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
              <span 
                class="inline-flex items-center gap-1 font-bold uppercase"
                :class="isMachineOperating(st.id) ? 'text-emerald-400' : 'text-slate-400'">
                <span class="w-1.5 h-1.5 rounded-full" :class="isMachineOperating(st.id) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'"></span>
                {{ isMachineOperating(st.id) ? 'EM PRODUÇÃO' : 'PARADA' }}
              </span>
              <span class="text-slate-500 font-mono">
                {{ st.id === store.selectedStationId ? '● Selecionada' : 'Clique' }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- SEM MÁQUINA SELECIONADA -->
      <div v-if="!selectedMachine && store.machines.length" class="dark-panel p-8 text-center text-slate-400">
        Selecione uma máquina acima para ver seu apontamento em tempo real.
      </div>

      <!-- PAINEL PRINCIPAL DE APONTAMENTO DA MÁQUINA SELECIONADA -->
      <template v-if="selectedMachine">
        
        <!-- CABEÇALHO DA MÁQUINA SELECIONADA -->
        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-black text-lg">
              {{ getMachineNumber(selectedMachine) }}
            </div>
            <div>
              <h2 class="text-lg font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                {{ getMachineDisplayName(selectedMachine) }}
                <span class="text-xs text-slate-400 font-normal">({{ selectedMachine.name || selectedMachine.code }})</span>
              </h2>
              <p class="text-xs text-slate-400">
                Acompanhando produção exclusiva de <strong class="text-white">{{ getMachineDisplayName(selectedMachine) }}</strong> no dia de hoje
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold border uppercase"
                  :class="selectedSession ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'">
              {{ selectedSession ? '● Sessão Ativa' : '○ Sem Sessão Ativa' }}
            </span>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════════
             4 INDICADORES CHAVE EXCLUSIVOS DA MÁQUINA SELECIONADA
             ══════════════════════════════════════════════════════════════ -->
        <section class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          
          <!-- 1. PRODUÇÃO FEITA NESTA MÁQUINA -->
          <div class="dark-panel p-5 space-y-2 border-emerald-500/30">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">📦 Produção Feita</span>
              <span class="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">Esta Máquina</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-3xl md:text-4xl font-black text-emerald-400">
                {{ selectedProduction.toLocaleString('pt-BR') }}
              </span>
              <span class="text-xs text-slate-400">unidades hoje</span>
            </div>
          </div>

          <!-- 2. TEMPO PRODUZIDO NESTA MÁQUINA -->
          <div class="dark-panel p-5 space-y-2 border-blue-500/30">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">🟢 Tempo Produzido</span>
              <span class="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-bold uppercase">Tempo Útil</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-3xl md:text-4xl font-black text-blue-400">
                {{ tempoProduzidoFormatado }}
              </span>
            </div>
          </div>

          <!-- 3. TEMPO PARADO NESTA MÁQUINA -->
          <div class="dark-panel p-5 space-y-2 border-red-500/30">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">🔴 Tempo Parado</span>
              <span class="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold uppercase">Em Parada</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-3xl md:text-4xl font-black text-red-400">
                {{ tempoParadoFormatado }}
              </span>
            </div>
          </div>

        </section>

        <!-- SEÇÃO: CONTROLE DE SESSÃO & REGISTRO DE PARADAS DA MÁQUINA -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- CARD CONTROLE REMOTO DA SESSÃO -->
          <div class="dark-panel p-6 space-y-5">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 class="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <span>⚙️</span> SESSÃO DA {{ getMachineDisplayName(selectedMachine).toUpperCase() }}
              </h3>
              <span
                class="text-xs font-bold uppercase px-2.5 py-1 rounded border"
                :class="selectedSession ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : 'text-slate-400 border-slate-700 bg-slate-800'"
              >
                {{ selectedSession ? '● EM OPERAÇÃO' : '○ PARADO' }}
              </span>
            </div>

            <!-- Dados da Sessão Ativa -->
            <div v-if="selectedSession" class="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2.5 text-xs">
              <div class="flex justify-between items-center">
                <span class="text-slate-400">Estação Selecionada:</span>
                <span class="font-bold text-emerald-400 font-mono">{{ getMachineDisplayName(selectedMachine) }}</span>
              </div>
              <div class="flex justify-between items-center" v-if="selectedSession.product?.name">
                <span class="text-slate-400">Produto em Fabricação:</span>
                <span class="font-bold text-white">{{ selectedSession.product.name }}</span>
              </div>
              <div class="flex justify-between items-center" v-if="selectedSession.lot?.code">
                <span class="text-slate-400">Lote Ativo:</span>
                <span class="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{{ selectedSession.lot.code }}</span>
              </div>
              <div class="flex justify-between items-center" v-if="selectedSession.operator?.name">
                <span class="text-slate-400">Operador:</span>
                <span class="font-semibold text-white">{{ selectedSession.operator.name }}</span>
              </div>
              <div class="flex justify-between items-center" v-if="selectedSession.started_at">
                <span class="text-slate-400">Início da Operação:</span>
                <span class="font-mono text-slate-300">{{ formatHora(selectedSession.started_at) }}</span>
              </div>
            </div>

            <div v-else class="bg-slate-900/40 rounded-xl p-4 border border-slate-800 text-xs text-slate-400 space-y-2">
              <p>Nenhuma sessão ativa para <strong>{{ getMachineDisplayName(selectedMachine) }}</strong> no momento.</p>
              <p class="text-[11px] text-slate-500">Clique em <strong class="text-emerald-400">INICIAR SESSÃO</strong> para disparar o apontamento desta máquina.</p>
            </div>

            <!-- Botões de Ação da Sessão -->
            <div class="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                @click="handleRemoteStart"
                :disabled="store.loading.session || !!selectedSession"
                class="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl uppercase text-xs tracking-wider flex items-center justify-center gap-2 border border-emerald-400/40 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                <span v-if="store.loading.session" class="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                ▶ INICIAR SESSÃO
              </button>

              <button
                @click="handleRemoteStop"
                :disabled="store.loading.session || !selectedSession"
                class="flex-1 py-3.5 bg-red-600/90 hover:bg-red-500 disabled:opacity-40 text-white font-extrabold rounded-xl uppercase text-xs tracking-wider flex items-center justify-center gap-2 border border-red-500/40 transition-all active:scale-95"
              >
                ⏹ ENCERRAR SESSÃO
              </button>
            </div>
          </div>

          <!-- CARD REGISTRO DE PARADAS DA MÁQUINA SELECIONADA -->
          <div class="dark-panel p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 class="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <span>🛑</span> PARADAS DA {{ getMachineDisplayName(selectedMachine).toUpperCase() }} (HOJE)
              </h3>

              <button
                @click="isStopModalOpen = true"
                class="px-3 py-1.5 bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <span>+</span> Nova Parada
              </button>
            </div>

            <!-- Lista Limpa de Paradas de Hoje para a Máquina Selecionada -->
            <div class="overflow-x-auto min-h-[140px]">
              <div v-if="!paradasHoje.length" class="text-slate-500 text-xs text-center py-8 bg-slate-900/40 rounded-xl border border-slate-800/60">
                Nenhuma parada registrada hoje para a {{ getMachineDisplayName(selectedMachine) }}.
              </div>

              <table v-else class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th class="pb-2">Horário</th>
                    <th class="pb-2">Motivo da Parada</th>
                    <th class="pb-2 text-right">Duração</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 font-mono">
                  <tr v-for="stop in paradasHoje" :key="stop.id" class="hover:bg-slate-800/30">
                    <td class="py-2.5 text-slate-300">
                      {{ formatHora(stop.started_at || stop.inicio) }} → {{ stop.ended_at ? formatHora(stop.ended_at) : 'Em aberto' }}
                    </td>
                    <td class="py-2.5 font-sans">
                      <span class="font-semibold text-amber-400">{{ stop.reason?.label || stop.motivoParada?.label || 'Não especificado' }}</span>
                    </td>
                    <td class="py-2.5 text-right font-bold text-white">
                      {{ formatDuracao(stop.duration_seconds) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </template>

    </main>

    <!-- Modal Nova Parada -->
    <StopModal
      :is-open="isStopModalOpen"
      @close="isStopModalOpen = false"
      @save="handleSaveStop"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useProductionStore } from '../../stores/productionStore';
import AppSidebar from '../../components/AppSidebar.vue';
import StopModal from '../../components/StopModal.vue';

const route = useRoute();
const store = useProductionStore();

const isStopModalOpen = ref(false);
const currentTime = ref('');
let clockInterval = null;
let pollInterval = null;

const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString('pt-BR');
};

const dataAtualFormatada = computed(() => {
  return new Date().toLocaleDateString('pt-BR');
});

const hojeStr = computed(() => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date());
});

// WATCHER FUNDAMENTAL: Quando o usuário clica em qualquer máquina, recarrega o apontamento daquela máquina imediatamente!
watch(() => store.selectedStationId, async (newStationId) => {
  if (newStationId) {
    await carregarApontamentoHoje();
    await store.fetchStops(newStationId);
  }
});

onMounted(async () => {
  updateTime();
  clockInterval = setInterval(updateTime, 1000);

  await Promise.all([
    store.fetchMachines(),
    store.fetchSessions(),
    store.fetchProductionTotals(),
    store.fetchStopReasons(),
  ]);

  if (route.params.estacaoId) {
    const found = store.machines.find(m => m.id === route.params.estacaoId || m.code === route.params.estacaoId);
    if (found) store.selectStation(found.id);
  }

  if (store.selectedStationId) {
    await store.fetchStops(store.selectedStationId);
  }

  await carregarApontamentoHoje();

  pollInterval = setInterval(async () => {
    await carregarApontamentoHoje();
  }, 15000);
});

onBeforeUnmount(() => {
  if (clockInterval) clearInterval(clockInterval);
  if (pollInterval) clearInterval(pollInterval);
});

const carregarApontamentoHoje = async () => {
  await store.fetchApontamento({
    date: hojeStr.value,
    machine_id: store.selectedStationId || undefined,
  });
};

const selectedMachine = computed(() => store.selectedMachine);

const isMachineOperating = (machineId) => {
  return store.sessions.some(s => s.machine_id === machineId && s.status === 'active');
};

// Número de exibição da máquina — extrai o dígito do code (ex.: "MQ-02" → 2).
// parseInt(m.code, 10) sozinho sempre dava NaN (code começa com letra
// "MQ-"), então nunca usava o código real, só a posição no array —
// "Máquina 2" podia mostrar uma máquina de teste qualquer, não a MQ-02.
const getMachineNumber = (m) => {
  if (!m) return '—';
  const idx = store.machines.findIndex((item) => item.id === m.id);
  const match = m.code?.match(/\d+/);
  return match ? parseInt(match[0], 10) : (idx >= 0 ? idx + 1 : 1);
};

const getMachineDisplayName = (m) => `Máquina ${getMachineNumber(m)}`;

const selectedSession = computed(() => {
  if (!selectedMachine.value) return null;
  return store.sessions.find(s => s.machine_id === selectedMachine.value.id && s.status === 'active') || null;
});

const selectedProduction = computed(() => {
  return store.apontamento?.resumo?.producao ?? 0;
});

const tempoProduzidoFormatado = computed(() => {
  const seg = store.apontamento?.resumo?.tempo_produzido_segundos ?? 0;
  return formatDuracao(seg);
});

const tempoParadoFormatado = computed(() => {
  const seg = store.apontamento?.resumo?.tempo_parado_segundos ?? 0;
  return formatDuracao(seg);
});

const paradasHoje = computed(() => {
  return store.apontamento?.paradas || [];
});

const formatDuracao = (segundos) => {
  const s = Math.max(0, Math.round(segundos || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
};

const formatHora = (dt) => {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(dt);
  }
};

const handleRemoteStart = async () => {
  if (!selectedMachine.value) return;
  if (!store.products.length) await store.fetchProducts();
  const firstProduct = store.products[0];

  try {
    await store.startSession({
      machine_id: selectedMachine.value.id,
      product_id: selectedMachine.value.planned_product_id || firstProduct?.id,
      lot_code: selectedMachine.value.planned_lot_code || `LOT-${selectedMachine.value.code}-${new Date().toISOString().slice(0, 10)}`,
      operator_name: 'Supervisor',
    });
    await carregarApontamentoHoje();
  } catch (err) {
    console.warn('[ApontamentoView] Erro ao iniciar sessão:', err.message);
  }
};

const handleRemoteStop = async () => {
  if (!selectedMachine.value) return;
  try {
    await store.closeSession({ machine_id: selectedMachine.value.id });
    await carregarApontamentoHoje();
  } catch (err) {
    console.warn('[ApontamentoView] Erro ao encerrar sessão:', err.message);
  }
};

const handleSaveStop = async (stopData) => {
  if (!selectedMachine.value) return;
  try {
    await store.createStop({
      machine_id: selectedMachine.value.id,
      reason_id: stopData.reason_id,
      observation: stopData.observation || '',
      session_id: selectedSession.value?.id,
    });
    await carregarApontamentoHoje();
  } catch (err) {
    console.warn('[ApontamentoView] Erro ao criar parada:', err.message);
  }
  isStopModalOpen.value = false;
};
</script>
