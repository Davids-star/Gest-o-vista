<template>
  <div class="space-y-5">
    <!-- Filtros do período (título/subtítulo ficam em quem hospeda este painel) -->
    <div class="flex justify-end">
      <div class="flex flex-wrap items-end gap-3">
        <div v-if="periodo === 'semana'" class="min-w-[150px]">
          <label class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Um dia da semana</label>
          <input
            v-model="dataSelecionada"
            type="date"
            :max="hojeIso()"
            class="w-full bg-slate-50 dark:bg-[#070a0e] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
        </div>
        <div v-else class="min-w-[150px]">
          <label class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Mês</label>
          <input
            v-model="mesSelecionado"
            type="month"
            :max="mesAtualIso()"
            class="w-full bg-slate-50 dark:bg-[#070a0e] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none" />
        </div>

        <div class="min-w-[150px]">
          <label class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Turno</label>
          <select
            v-model="turnoSelecionado"
            class="w-full bg-slate-50 dark:bg-[#070a0e] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none">
            <option value="">Todos os turnos</option>
            <option v-for="turno in shifts" :key="turno.id" :value="turno.id">{{ turno.name }}</option>
          </select>
        </div>

        <div class="min-w-[150px]">
          <label class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Máquina</label>
          <select
            v-model="maquinaSelecionada"
            class="w-full bg-slate-50 dark:bg-[#070a0e] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none">
            <option value="">Todas as máquinas</option>
            <option v-for="m in machines" :key="m.id" :value="m.id">{{ m.name || m.code }}</option>
          </select>
        </div>

        <button
          @click="consultar"
          :disabled="periodo === 'semana' ? !dataSelecionada : !mesSelecionado"
          class="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl uppercase tracking-wider transition-all">
          Consultar →
        </button>
      </div>
    </div>

    <p v-if="periodo === 'semana' && data?.periodo" class="text-right text-xs text-slate-500 dark:text-slate-400 -mt-3">
      Semana de <span class="font-bold text-slate-700 dark:text-slate-300">{{ formatarDataBr(data.periodo.inicio) }}</span> a
      <span class="font-bold text-slate-700 dark:text-slate-300">{{ formatarDataBr(data.periodo.fim) }}</span>
    </p>

    <!-- Estados: loading / erro / vazio / conteúdo -->
    <div v-if="loading" class="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">Carregando resumo...</div>

    <div v-else-if="error" class="text-center py-12 space-y-3">
      <p class="text-red-600 dark:text-red-400 text-sm font-semibold">Não foi possível carregar o resumo.</p>
      <button
        @click="consultar"
        class="px-5 py-2 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl uppercase transition-all">
        Tentar novamente
      </button>
    </div>

    <div v-else-if="!data || !data.resumo?.sessoes" class="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
      Nenhum dado encontrado para este período.
    </div>

    <div v-else class="space-y-6">
      <!-- Indicadores -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="dark-panel p-4 space-y-1 border-emerald-500/30">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Produção Total</span>
          <p class="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">{{ data.resumo.producao.toLocaleString('pt-BR') }}</p>
        </div>
        <div class="dark-panel p-4 space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tempo Produzido</span>
          <p class="font-mono text-2xl font-black text-slate-900 dark:text-white">{{ formatDuracao(data.resumo.tempo_produzido_segundos) }}</p>
        </div>
        <div class="dark-panel p-4 space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tempo Parado</span>
          <p class="font-mono text-2xl font-black text-red-600 dark:text-red-400">{{ formatDuracao(data.resumo.tempo_parado_segundos) }}</p>
        </div>
        <div class="dark-panel p-4 space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paradas</span>
          <p class="font-mono text-2xl font-black text-amber-600 dark:text-amber-400">{{ data.resumo.paradas }}</p>
        </div>
        <div class="dark-panel p-4 space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sessões</span>
          <p class="font-mono text-xl font-bold text-slate-900 dark:text-white">{{ data.resumo.sessoes }}</p>
        </div>
        <div class="dark-panel p-4 space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Máquinas Utilizadas</span>
          <p class="font-mono text-xl font-bold text-slate-900 dark:text-white">{{ data.resumo.maquinas_utilizadas }}</p>
        </div>
        <div class="dark-panel p-4 space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Produtos</span>
          <p class="font-mono text-xl font-bold text-slate-900 dark:text-white">{{ data.resumo.produtos.length }}</p>
        </div>
        <div class="dark-panel p-4 space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lotes</span>
          <p class="font-mono text-xl font-bold text-slate-900 dark:text-white">{{ data.resumo.lotes }}</p>
        </div>
      </div>

      <!-- Comparativo com o período anterior -->
      <div v-if="comparativos.length" class="dark-panel p-4 space-y-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Comparativo com {{ periodo === 'semana' ? 'a semana anterior' : 'o mês anterior' }}
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div v-for="item in comparativos" :key="item.label" class="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ item.label }}</span>
            <p class="font-mono text-xl font-black text-slate-900 dark:text-white">{{ item.atualTexto }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">antes: {{ item.anteriorTexto }}</p>
            <p class="text-xs font-bold mt-1" :class="item.corVariacao">{{ item.variacaoTexto }}</p>
          </div>
        </div>
      </div>

      <!-- Motivo com mais parada no período -->
      <div v-if="motivoTop" class="dark-panel p-4 border-l-4 border-red-500">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Motivo com mais parada no período</span>
        <p class="text-xl font-black text-slate-900 dark:text-white mt-1">{{ motivoTop.label }}</p>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          {{ formatDuracao(motivoTop.segundos) }} parado — {{ motivoTop.percentual }}% do tempo parado total
        </p>
      </div>

      <!-- Tempo parado por dia -->
      <div class="dark-panel p-4">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">Tempo parado por dia</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="text-left text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th class="py-2 pr-3">Dia</th>
                <th class="py-2 pr-3 text-right">Produção</th>
                <th class="py-2 pr-3 text-right">T. Produzido</th>
                <th class="py-2 text-right">T. Parado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in diasTabela" :key="d.data" class="border-t border-slate-200 dark:border-slate-800">
                <td class="py-2 pr-3 font-mono text-slate-900 dark:text-white">{{ d.data }}</td>
                <td class="py-2 pr-3 text-right font-mono text-slate-900 dark:text-white">{{ d.producao.toLocaleString('pt-BR') }}</td>
                <td class="py-2 pr-3 text-right font-mono text-slate-900 dark:text-white">{{ formatDuracao(d.produzido) }}</td>
                <td class="py-2 text-right font-mono" :class="d.parado > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500'">{{ formatDuracao(d.parado) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tabela comparativa: produção por dia, lado a lado por máquina -->
      <div v-if="data.por_maquina_por_dia?.length > 1" class="dark-panel p-4">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
          Comparativo de Máquinas — Produção por Dia
        </h4>
        <MachineComparisonTable :columns="colunasDia" :rows="linhasDia" />
      </div>

      <!-- Gráficos -->
      <div class="grid lg:grid-cols-2 gap-6">
        <div class="dark-panel p-4">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Produção por Máquina</h4>
          <SimpleBarChart :data="producaoPorMaquinaChart" color-from="#3b82f6" color-to="#1d4ed8" unidade="peças" />
        </div>
        <div class="dark-panel p-4">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Produção por Turno</h4>
          <SimpleBarChart :data="producaoPorTurnoChart" color-from="#a78bfa" color-to="#6d28d9" unidade="peças" />
        </div>
      </div>

      <div v-if="paradasPorMotivoChart.length" class="dark-panel p-4">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Paradas por Motivo (% do tempo parado)</h4>
        <TimeDistributionChart :data="paradasPorMotivoChart" />
      </div>

      <!-- Resumo por máquina -->
      <div>
        <h4 class="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white mb-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          RESUMO DAS MÁQUINAS
        </h4>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="m in data.por_maquina" :key="m.machine_id" class="dark-panel p-4 space-y-2">
            <p class="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">Máquina {{ m.machine_code }}</p>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Produção</span><span class="text-right font-mono text-emerald-600 dark:text-emerald-400">{{ m.producao.toLocaleString('pt-BR') }}</span>
              <span>T. Produzido</span><span class="text-right font-mono text-slate-900 dark:text-white">{{ formatDuracao(m.tempo_produzido_segundos) }}</span>
              <span>T. Parado</span><span class="text-right font-mono text-red-600 dark:text-red-400">{{ formatDuracao(m.tempo_parado_segundos) }}</span>
              <span>Paradas</span><span class="text-right font-mono text-slate-900 dark:text-white">{{ m.paradas }}</span>
              <span>Sessões</span><span class="text-right font-mono text-slate-900 dark:text-white">{{ m.sessoes }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { formatDuracao, hojeIso } from '../composables/useFormatters';
import SimpleBarChart from './SimpleBarChart.vue';
import TimeDistributionChart from './TimeDistributionChart.vue';
import MachineComparisonTable from './MachineComparisonTable.vue';

const props = defineProps({
  data: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
  // Dados do período anterior (semana/mês passado) pro comparativo.
  anterior: { type: Object, default: null },
  shifts: { type: Array, default: () => [] },
  machines: { type: Array, default: () => [] },
  // 'semana' ou 'mes' — troca o seletor de período e como `consultar` monta
  // o filtro emitido (date vs year/month). O resto (indicadores, gráficos,
  // tabela comparativa) é idêntico pros dois: obterSemanal/obterMensal no
  // backend devolvem exatamente o mesmo formato de resposta.
  periodo: { type: String, default: 'mes' }, // 'semana' | 'mes'
});

const emit = defineEmits(['consultar']);

// Funções puras (não computed): um `computed(() => new Date()...)` sem
// nenhuma dependência reativa só calcula uma vez e fica travado pro resto
// da vida do componente — ver comentário de `hojeIso` em useFormatters.js.
const mesAtualIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const dataSelecionada = ref(hojeIso());
const mesSelecionado = ref(mesAtualIso());
const turnoSelecionado = ref('');
const maquinaSelecionada = ref('');

const consultar = () => {
  const filtrosComuns = {
    shift_id: turnoSelecionado.value || undefined,
    machine_id: maquinaSelecionada.value || undefined,
  };
  if (props.periodo === 'semana') {
    if (!dataSelecionada.value) return;
    emit('consultar', { date: dataSelecionada.value, ...filtrosComuns });
  } else {
    if (!mesSelecionado.value) return;
    const [year, month] = mesSelecionado.value.split('-').map(Number);
    emit('consultar', { year, month, ...filtrosComuns });
  }
};

const formatarDataBr = (dataIso) => {
  if (!dataIso) return '—';
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
};

// Comparativo: "menorMelhor" inverte a cor (ex.: mais tempo parado é ruim).
const comparar = (label, atual, anterior, menorMelhor, formatar) => {
  let variacaoTexto = 'sem base';
  let corVariacao = 'text-slate-500';
  if (anterior > 0) {
    const pct = Math.round(((atual - anterior) / anterior) * 1000) / 10;
    const subiu = pct > 0;
    variacaoTexto = `${subiu ? '▲' : pct < 0 ? '▼' : '='} ${Math.abs(pct)}%`;
    const bom = menorMelhor ? !subiu : subiu;
    if (pct !== 0) corVariacao = bom ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  } else if (atual > 0) {
    variacaoTexto = 'novo no período';
  }
  return { label, atualTexto: formatar(atual), anteriorTexto: formatar(anterior), variacaoTexto, corVariacao };
};

const comparativos = computed(() => {
  if (!props.anterior || !props.data) return [];
  const a = props.data.resumo;
  const b = props.anterior.resumo;
  return [
    comparar('Produção', a.producao, b.producao, false, (n) => (n || 0).toLocaleString('pt-BR')),
    comparar('Tempo parado', a.tempo_parado_segundos, b.tempo_parado_segundos, true, (n) => formatDuracao(n || 0)),
    comparar('Paradas', a.paradas, b.paradas, true, (n) => String(n || 0)),
  ];
});

// Motivo que mais parou a máquina no período (lista já vem ordenada por segundos).
const motivoTop = computed(() => {
  const motivos = props.data?.paradas_por_motivo || [];
  if (!motivos.length) return null;
  const total = motivos.reduce((acc, m) => acc + m.segundos, 0);
  const top = motivos[0];
  return { label: top.label, segundos: top.segundos, percentual: total ? Math.round((top.segundos / total) * 1000) / 10 : 0 };
});

// Tempo parado por dia do período (um dia sem parada aparece como 0).
const diasTabela = computed(() =>
  (props.data?.producao_por_dia || []).map((d) => ({
    data: formatarDataBr(d.data),
    producao: d.producao,
    produzido: d.tempo_produzido_segundos,
    parado: d.tempo_parado_segundos,
  })),
);

const producaoPorMaquinaChart = computed(() =>
  (props.data?.por_maquina || []).map((m) => ({ name: m.machine_code, value: m.producao })),
);

const producaoPorTurnoChart = computed(() =>
  (props.data?.por_turno || []).map((t) => ({ name: t.shift_name, value: t.producao })),
);

// Tabela comparativa: uma coluna por dia do período, uma linha por máquina.
const colunasDia = computed(() =>
  (props.data?.por_maquina_por_dia?.[0]?.por_dia || []).map((d) => ({ key: d.data, label: formatarDataBr(d.data) })),
);
const linhasDia = computed(() =>
  (props.data?.por_maquina_por_dia || []).map((m) => ({
    label: `Máquina ${m.machine_code}`,
    cells: Object.fromEntries(m.por_dia.map((d) => [d.data, d.producao])),
  })),
);

// Paleta cíclica pra n motivos — TimeDistributionChart espera `value` como
// percentual (0-100), por isso convertemos aqui a partir dos segundos reais.
const PALETA_MOTIVOS = ['#f87171', '#fb923c', '#facc15', '#a78bfa', '#38bdf8', '#4ade80', '#f472b6', '#94a3b8'];
const paradasPorMotivoChart = computed(() => {
  const motivos = props.data?.paradas_por_motivo || [];
  const totalSegundos = motivos.reduce((a, m) => a + m.segundos, 0);
  if (!totalSegundos) return [];
  return motivos.map((m, idx) => ({
    name: m.label,
    value: Math.round((m.segundos / totalSegundos) * 1000) / 10, // 1 casa decimal
    color: PALETA_MOTIVOS[idx % PALETA_MOTIVOS.length],
  }));
});
</script>
