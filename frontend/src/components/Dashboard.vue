<template>
  <div class="min-h-screen bg-[#0b0f17] text-white font-sans flex select-none">
    <AppSidebar />

    <main class="flex-1 p-4 pt-[calc(4rem+env(safe-area-inset-top))] md:p-6 md:pt-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
      
      <!-- Header do Dashboard -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white">DASHBOARD INDUSTRIAL</h1>
        </div>
        <div class="flex items-center gap-2 bg-[#121824] border border-[#1e293b] px-4 py-2 rounded-xl text-slate-300 font-mono text-sm self-start sm:self-auto">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          {{ liveTime }}
        </div>
      </div>

      <!-- KPI Cards Globais -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Produção de Hoje -->
        <div class="dark-panel p-5 space-y-2 border-emerald-500/30">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">PRODUÇÃO HOJE</span>
            <span class="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
              AO VIVO
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-black text-emerald-400">
              {{ (hojeApontamento?.resumo?.producao || 0).toLocaleString('pt-BR') }}
            </span>
            <span class="text-xs text-slate-400">peças</span>
          </div>
        </div>

        <!-- Máquinas em Operação -->
        <div class="dark-panel p-5 space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">MÁQUINAS CADASTRADAS</span>
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-black text-white">
              {{ store.loading.machines ? '—' : store.machines.length }}
            </span>
            <span class="text-xs text-slate-400">estações ativas</span>
          </div>
        </div>

        <!-- Alertas & Defeitos -->
        <div class="dark-panel p-5 space-y-2" :class="store.alerts.length > 0 ? 'border-red-500/40' : ''">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">ALERTAS / OCORRÊNCIAS</span>
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-black" :class="store.alerts.length > 0 ? 'text-red-400' : 'text-emerald-400'">
              {{ store.loading.alerts ? '—' : store.alerts.length }}
            </span>
            <span class="text-xs text-slate-400">
              {{ store.alerts.length > 0 ? 'requerem atenção' : 'operação normal' }}
            </span>
          </div>
        </div>

        <!-- Metas Ativas -->
        <div class="dark-panel p-5 space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">METAS CADASTRADAS</span>
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-black text-amber-400">
              {{ store.loading.metas ? '—' : store.metas.length }}
            </span>
            <span class="text-xs text-slate-400">planos de meta</span>
          </div>
        </div>

      </div>

      <!-- Painel de Máquinas Cadastradas — clique numa pra ver o detalhe
           dela E filtrar "Produção por Hora" só por essa máquina. -->
      <div class="dark-panel p-6">
        <h3 class="text-xs font-bold uppercase tracking-widest text-white mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
          <span class="text-emerald-400">🏭</span> ESTAÇÕES DA FÁBRICA
        </h3>

        <div v-if="store.loading.machines" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="h-20 bg-slate-800 rounded-xl animate-pulse"></div>
        </div>

        <div v-else-if="!store.machines.length" class="text-center py-6 text-slate-400 text-sm">
          Nenhuma máquina cadastrada no sistema.
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="m in store.machines"
            :key="m.id"
            @click="toggleSelecaoMaquina(m.id)"
            class="p-4 rounded-xl cursor-pointer transition-all border"
            :class="store.selectedStationId === m.id
              ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'"
          >
            <div class="flex items-center gap-3 mb-2">
              <span class="w-9 h-9 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-extrabold text-sm">
                {{ getMachineNumber(m) }}
              </span>
              <div class="min-w-0">
                <p class="text-xs font-extrabold uppercase tracking-wider text-white truncate">
                  Máquina {{ getMachineNumber(m) }}
                </p>
              </div>
            </div>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase"
              :class="m.active !== false ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-slate-600 bg-slate-800 text-slate-400'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="m.active !== false ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'"/>
              {{ m.active !== false ? 'OPERANDO' : 'INATIVO' }}
            </span>
          </div>
        </div>

        <!-- Detalhe da máquina selecionada (produção/paradas de hoje) -->
        <div v-if="maquinaSelecionada" class="mt-5 pt-5 border-t border-slate-800 space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              Máquina {{ getMachineNumber(maquinaSelecionada) }} — {{ maquinaSelecionada.name || maquinaSelecionada.code }}
            </h4>
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border"
              :class="sessaoAtivaSelecionada ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="sessaoAtivaSelecionada ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'" />
              {{ sessaoAtivaSelecionada ? 'EM PRODUÇÃO' : 'SEM SESSÃO ATIVA' }}
            </span>
          </div>

          <div v-if="sessaoAtivaSelecionada" class="grid grid-cols-3 gap-3 text-xs">
            <div><span class="text-slate-400 block">Produto</span><span class="font-bold text-white">{{ sessaoAtivaSelecionada.product?.name || '—' }}</span></div>
            <div><span class="text-slate-400 block">Lote</span><span class="font-bold text-white">{{ sessaoAtivaSelecionada.lot?.code || '—' }}</span></div>
            <div><span class="text-slate-400 block">Operador</span><span class="font-bold text-white">{{ sessaoAtivaSelecionada.operator?.name || '—' }}</span></div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="dark-panel p-3 space-y-0.5">
              <span class="text-[10px] font-bold uppercase text-slate-400">Produção Hoje</span>
              <p class="font-mono text-lg font-black text-emerald-400">{{ resumoMaquinaSelecionada.producao.toLocaleString('pt-BR') }}</p>
            </div>
            <div class="dark-panel p-3 space-y-0.5">
              <span class="text-[10px] font-bold uppercase text-slate-400">T. Produzido</span>
              <p class="font-mono text-lg font-black text-white">{{ formatDuracao(resumoMaquinaSelecionada.tempo_produzido_segundos) }}</p>
            </div>
            <div class="dark-panel p-3 space-y-0.5">
              <span class="text-[10px] font-bold uppercase text-slate-400">T. Parado</span>
              <p class="font-mono text-lg font-black text-red-400">{{ formatDuracao(resumoMaquinaSelecionada.tempo_parado_segundos) }}</p>
            </div>
            <div class="dark-panel p-3 space-y-0.5">
              <span class="text-[10px] font-bold uppercase text-slate-400">Paradas</span>
              <p class="font-mono text-lg font-black text-amber-400">{{ resumoMaquinaSelecionada.paradas }}</p>
            </div>
          </div>
        </div>

        <!-- Resumo das 4 máquinas — produção e paradas de hoje, lado a lado -->
        <div v-if="store.machines.length" class="mt-5 pt-5 border-t border-slate-800">
          <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3">Resumo das Máquinas (Hoje)</h4>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div
              v-for="m in store.machines"
              :key="'resumo-' + m.id"
              class="dark-panel p-3 space-y-1 cursor-pointer transition-all"
              :class="store.selectedStationId === m.id ? 'border-emerald-500/50' : ''"
              @click="toggleSelecaoMaquina(m.id)"
            >
              <p class="text-[10px] font-bold uppercase text-slate-400">Máquina {{ getMachineNumber(m) }}</p>
              <p class="font-mono text-base font-black text-emerald-400">
                {{ (resumoPorMaquina[m.id]?.producao || 0).toLocaleString('pt-BR') }} <span class="text-[10px] text-slate-400 font-normal">un.</span>
              </p>
              <p class="text-[10px] text-slate-400">{{ resumoPorMaquina[m.id]?.paradas || 0 }} parada{{ (resumoPorMaquina[m.id]?.paradas || 0) !== 1 ? 's' : '' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════
           APONTAMENTO — o usuário escolhe: consulta pontual de Um Dia, ou
           o Resumo Mensal (produção, tempo, paradas e gráficos do mês).
           ══════════════════════════════════════════════════════════════ -->
      <section class="dark-panel p-4 sm:p-6 space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <span class="text-emerald-400">📅</span> APONTAMENTO
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">
              {{ apontamentoTab === 'diario'
                ? 'Escolha o dia e o turno para ver produção, sessões e paradas daquele período'
                : 'Produção, tempo produzido/parado e paradas do mês inteiro — dados reais do banco' }}
            </p>
          </div>

          <div class="flex gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 self-start sm:self-auto">
            <button
              @click="apontamentoTab = 'diario'"
              class="px-4 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-all"
              :class="apontamentoTab === 'diario' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-white'">
              Diário
            </button>
            <button
              @click="apontamentoTab = 'mensal'"
              class="px-4 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-all"
              :class="apontamentoTab === 'mensal' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-white'">
              Resumo Mensal
            </button>
          </div>
        </div>

        <!-- ── Diário ─────────────────────────────────────────────── -->
        <div v-if="apontamentoTab === 'diario'" class="flex flex-col sm:flex-row sm:items-end gap-3">
          <div class="flex-1 min-w-[160px]">
            <label class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Dia</label>
            <input
              v-model="consultaData"
              type="date"
              :max="hojeIso"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          </div>

          <div class="flex-1 min-w-[160px]">
            <label class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Turno</label>
            <select
              v-model="consultaTurnoId"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none">
              <option value="">Todos os turnos</option>
              <option v-for="turno in store.shifts" :key="turno.id" :value="turno.id">
                {{ turno.name }}<template v-if="turno.start_time && turno.end_time"> ({{ turno.start_time.slice(0, 5) }}–{{ turno.end_time.slice(0, 5) }})</template>
              </option>
            </select>
          </div>

          <button
            @click="consultarDia"
            :disabled="!consultaData"
            class="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl uppercase tracking-wider transition-all">
            Consultar →
          </button>
        </div>

        <!-- ── Resumo Mensal ──────────────────────────────────────── -->
        <MonthlySummaryPanel
          v-else
          :data="store.apontamentoMensal"
          :loading="store.loading.apontamentoMensal"
          :error="store.errors.apontamentoMensal"
          :shifts="store.shifts"
          :machines="store.machines"
          @consultar="consultarMes"
        />
      </section>

      <!-- ══════════════════════════════════════════════════════════════
           PRODUÇÃO POR HORA (hoje) — respeita a máquina selecionada acima;
           sem seleção, mostra a fábrica inteira.
           DISTRIBUIÇÃO DO TEMPO ainda não foi conectada — adiado (ver plano).
           ══════════════════════════════════════════════════════════════ -->
      <div class="dark-panel p-4">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
          Produção por Hora (Hoje)
          <span class="text-emerald-400 normal-case font-normal">— {{ maquinaSelecionada ? `Máquina ${getMachineNumber(maquinaSelecionada)}` : 'Todas as Máquinas' }}</span>
        </h4>
        <HourlyProductionChart :data="producaoPorHoraChart" />
      </div>

      <!-- Alertas & Ocorrências (GET /alertas/abertos) -->
      <div class="dark-panel p-6">
        <h3 class="text-xs font-bold uppercase tracking-widest text-white mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
          <span class="text-red-400">🚨</span> OCORRÊNCIAS & ALERTAS EM ABERTO
        </h3>

        <div v-if="store.loading.alerts" class="text-slate-400 text-sm">Carregando alertas...</div>

        <div v-else-if="!store.alerts.length" class="flex items-center gap-3 py-4">
          <div class="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            ✓
          </div>
          <div>
            <p class="text-emerald-400 font-bold text-sm">Nenhum alerta pendente</p>
            <p class="text-slate-500 text-xs">Fábrica operando sem interrupções críticas</p>
          </div>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="alert in store.alerts"
            :key="alert.id"
            class="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-900/80 border-red-500/30"
          >
            <div class="flex items-start gap-3">
              <span class="mt-0.5 text-base">🔴</span>
              <div>
                <p class="text-sm font-semibold text-white">{{ alert.message || alert.descricao }}</p>
                <p class="text-xs text-slate-400 mt-0.5">
                  {{ alert.machine?.name || alert.maquina?.nome || 'Máquina' }}
                  — {{ formatDateTime(alert.created_at || alert.criado_em) }}
                </p>
              </div>
            </div>
            <button
              @click="acknowledgeAlert(alert.id)"
              class="shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg uppercase transition-all"
            >
              Reconhecer
            </button>
          </div>
        </div>
      </div>

    </main>

    <!-- Modal de Detalhamento da Consulta (Dia + Turno) -->
    <DayDetailsModal
      :is-open="isDayModalOpen"
      :date="selectedModalDate"
      :shift-label="selectedModalTurnoLabel"
      :apontamento="selectedDayApontamento"
      :loading="modalLoading"
      @close="isDayModalOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useProductionStore } from '../stores/productionStore';
import { apontamentoApi } from '../services/api';
import AppSidebar from './AppSidebar.vue';
import DayDetailsModal from './DayDetailsModal.vue';
import MonthlySummaryPanel from './MonthlySummaryPanel.vue';
import HourlyProductionChart from './HourlyProductionChart.vue';

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

// Máquina escolhida no painel "ESTAÇÕES DA FÁBRICA" (store.selectedStationId,
// setado por store.selectStation ao clicar num card).
const maquinaSelecionada = computed(() =>
  store.machines.find((m) => m.id === store.selectedStationId) || null,
);

// Sessão ativa da máquina selecionada, se houver (mesmo padrão do
// ApontamentoView: procura em store.sessions, não depende de nenhuma
// chamada nova — store.sessions já é mantido fresco pelo polling).
const sessaoAtivaSelecionada = computed(() => {
  if (!maquinaSelecionada.value) return null;
  return store.sessions.find((s) => s.machine_id === maquinaSelecionada.value.id && s.status === 'active') || null;
});

// Agrega produção/tempo/paradas de HOJE por máquina, a partir de
// hojeApontamento.sessoes (já vem com machine + producao + tempo + paradas
// por sessão — GET /apontamento, já buscado a cada 6s pro card "Produção
// Hoje" acima). Uma máquina pode ter mais de uma sessão no dia (ex.:
// encerrou e começou outra) — soma tudo.
const resumoPorMaquina = computed(() => {
  const acc = {};
  for (const sessao of hojeApontamento.value?.sessoes || []) {
    const id = sessao.machine?.id;
    if (!id) continue;
    const atual = acc[id] || { producao: 0, tempo_produzido_segundos: 0, tempo_parado_segundos: 0, paradas: 0 };
    atual.producao += sessao.producao || 0;
    atual.tempo_produzido_segundos += sessao.tempo_produzido_segundos || 0;
    atual.tempo_parado_segundos += sessao.tempo_parado_segundos || 0;
    atual.paradas += sessao.paradas?.length || 0;
    acc[id] = atual;
  }
  return acc;
});

const resumoMaquinaSelecionada = computed(() =>
  resumoPorMaquina.value[maquinaSelecionada.value?.id] || { producao: 0, tempo_produzido_segundos: 0, tempo_parado_segundos: 0, paradas: 0 },
);

// Clicar na já selecionada desmarca (volta pra "todas as máquinas" na
// Produção por Hora) — clicar em outra troca a seleção.
const toggleSelecaoMaquina = (machineId) => {
  store.selectStation(store.selectedStationId === machineId ? null : machineId);
};

const liveTime = ref(new Date().toLocaleTimeString('pt-BR'));
let timer = null;

// Data de hoje em formato ISO (YYYY-MM-DD) — usada como valor inicial e
// como limite máximo do seletor de data (não faz sentido consultar o futuro).
const hojeIso = computed(() => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

// Aba ativa do bloco de Apontamento: consulta pontual de um dia, ou o
// Resumo Mensal — só um dos dois fica visível por vez.
const apontamentoTab = ref('diario');

// Seletores da consulta (dia + turno)
const consultaData = ref(hojeIso.value);
const consultaTurnoId = ref('');

const isDayModalOpen = ref(false);
const selectedModalDate = ref('');
const selectedModalTurnoLabel = ref('');
const selectedDayApontamento = ref(null);
const modalLoading = ref(false);
const hojeApontamento = ref(null);

const formatDuracao = (segundos) => {
  const s = Math.max(0, Math.round(segundos || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
};

const formatDateTime = (dt) => {
  if (!dt) return '—';
  try { return new Date(dt).toLocaleString('pt-BR', { timeStyle: 'short', dateStyle: 'short' }); }
  catch { return String(dt); }
};

const abrirDetalhesDia = async (dataStr, turnoId = '') => {
  selectedModalDate.value = dataStr;
  selectedModalTurnoLabel.value = turnoId
    ? store.shifts.find((t) => t.id === turnoId)?.name || ''
    : '';
  isDayModalOpen.value = true;
  modalLoading.value = true;
  selectedDayApontamento.value = null;

  try {
    const data = await apontamentoApi.obter({ date: dataStr, shift_id: turnoId || undefined });
    selectedDayApontamento.value = data;
  } catch (err) {
    console.warn('[Dashboard] Erro ao buscar apontamentos da data:', dataStr, err.message);
  } finally {
    modalLoading.value = false;
  }
};

// Ação do botão "Consultar" — abre o detalhamento do dia + turno escolhidos
const consultarDia = () => {
  if (!consultaData.value) return;
  abrirDetalhesDia(consultaData.value, consultaTurnoId.value);
};

const carregarProducaoHoje = async () => {
  try {
    hojeApontamento.value = await apontamentoApi.obter({ date: hojeIso.value });
  } catch (e) {
    console.warn('[Dashboard] Erro ao carregar resumo de hoje:', e);
  }
};

// Mesma consulta de "hoje", mas filtrada por máquina — só busca quando uma
// estação está selecionada (GET /apontamento já aceita machine_id). O card
// "Produção Hoje" e "Resumo das Máquinas" continuam usando hojeApontamento
// (sem filtro, precisam de todas as máquinas de uma vez); só a "Produção
// por Hora" troca pra esse resultado filtrado quando há seleção.
const hojeApontamentoMaquina = ref(null);
const carregarProducaoHojeMaquina = async () => {
  if (!store.selectedStationId) {
    hojeApontamentoMaquina.value = null;
    return;
  }
  try {
    hojeApontamentoMaquina.value = await apontamentoApi.obter({ date: hojeIso.value, machine_id: store.selectedStationId });
  } catch (e) {
    console.warn('[Dashboard] Erro ao carregar resumo de hoje da máquina:', e);
  }
};
watch(() => store.selectedStationId, carregarProducaoHojeMaquina);

// "Produção por Hora" — HourlyProductionChart.vue espera {hour, amount};
// o backend devolve {hora, quantidade} (mesma convenção do resto da API).
// Sem máquina selecionada, mostra a fábrica inteira (hojeApontamento);
// com uma selecionada, troca pro resultado filtrado só dela.
const producaoPorHoraChart = computed(() => {
  const fonte = store.selectedStationId ? hojeApontamentoMaquina.value : hojeApontamento.value;
  return (fonte?.producao_por_hora || []).map((h) => ({ hour: h.hora, amount: h.quantidade }));
});

const consultarMes = (filtros) => {
  store.fetchApontamentoMensal(filtros);
};

const acknowledgeAlert = async (alertId) => {
  try {
    await store.acknowledgeAlert(alertId);
  } catch (err) {
    console.warn('[Dashboard] Erro ao marcar alerta como visto:', err.message);
  }
};

let producaoHojeTimer = null;

onMounted(async () => {
  timer = setInterval(() => {
    liveTime.value = new Date().toLocaleTimeString('pt-BR');
  }, 1000);

  const agora = new Date();
  await Promise.allSettled([
    store.bootstrap(),
    store.fetchShifts(),
    carregarProducaoHoje(),
    store.fetchApontamentoMensal({ year: agora.getFullYear(), month: agora.getMonth() + 1 }),
  ]);
  store.startPolling(6000);

  // O card "PRODUÇÃO HOJE" (badge AO VIVO) vem de /apontamento, que não faz
  // parte do polling/websocket do store (isso só cobre machines/sessions/
  // stops/alerts/metas/productionTotals) — sem isso, ficava com o número do
  // carregamento inicial pra sempre, precisando de F5 pra ver produção nova.
  producaoHojeTimer = setInterval(() => {
    carregarProducaoHoje();
    carregarProducaoHojeMaquina();
  }, 6000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (producaoHojeTimer) clearInterval(producaoHojeTimer);
  store.stopPolling();
});
</script>
