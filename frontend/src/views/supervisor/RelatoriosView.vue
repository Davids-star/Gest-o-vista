<template>
  <div class="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans flex select-none">
    <AppSidebar />

    <main class="flex-1 p-4 pt-[calc(4rem+env(safe-area-inset-top))] md:p-6 md:pt-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-slate-900">RELATÓRIOS</h1>
          <p class="text-sm text-slate-500 mt-1">Produção, paradas e comparativo entre máquinas — por dia, semana ou mês.</p>
        </div>

        <button
          @click="exportar"
          :disabled="!dadosDoTabAtivo || carregandoAtual"
          class="shrink-0 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-all flex items-center gap-2">
          <span>📊</span> Exportar Excel
        </button>
      </div>

      <!-- Abas Dia / Semana / Mês -->
      <div class="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 self-start w-fit">
        <button
          v-for="opcao in ['dia', 'semana', 'mes']"
          :key="opcao"
          @click="tabAtivo = opcao"
          class="px-5 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-all"
          :class="tabAtivo === opcao ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40' : 'text-slate-500 hover:text-slate-900'">
          {{ opcao === 'dia' ? 'Dia' : opcao === 'semana' ? 'Semana' : 'Mês' }}
        </button>
      </div>

      <!-- ── DIA ─────────────────────────────────────────────────────── -->
      <section v-if="tabAtivo === 'dia'" class="dark-panel p-4 sm:p-6 space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-end gap-3">
          <div class="flex-1 min-w-[160px]">
            <label class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Dia</label>
            <input
              v-model="diaData"
              type="date"
              :max="hojeIso"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none" />
          </div>

          <div class="flex-1 min-w-[160px]">
            <label class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Turno</label>
            <select
              v-model="diaTurnoId"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none">
              <option value="">Todos os turnos</option>
              <option v-for="turno in store.shifts" :key="turno.id" :value="turno.id">{{ turno.name }}</option>
            </select>
          </div>

          <div class="flex-1 min-w-[160px]">
            <label class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Máquina</label>
            <select
              v-model="diaMachineId"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none">
              <option value="">Todas as máquinas</option>
              <option v-for="m in store.machines" :key="m.id" :value="m.id">{{ m.name || m.code }}</option>
            </select>
          </div>

          <button
            @click="consultarDia"
            :disabled="!diaData"
            class="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl uppercase tracking-wider transition-all">
            Consultar →
          </button>
        </div>

        <div v-if="store.errors.apontamento" class="text-center py-12 space-y-3">
          <p class="text-red-600 text-sm font-semibold">Não foi possível carregar o resumo.</p>
          <button @click="consultarDia" class="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl uppercase transition-all">Tentar novamente</button>
        </div>
        <DailyReportPanel v-else :apontamento="store.apontamento" :loading="store.loading.apontamento" />
      </section>

      <!-- ── SEMANA / MÊS ────────────────────────────────────────────── -->
      <section v-else class="dark-panel p-4 sm:p-6 space-y-5">
        <PeriodReportPanel
          :periodo="tabAtivo"
          :data="tabAtivo === 'semana' ? store.apontamentoSemanal : store.apontamentoMensal"
          :loading="tabAtivo === 'semana' ? store.loading.apontamentoSemanal : store.loading.apontamentoMensal"
          :error="tabAtivo === 'semana' ? store.errors.apontamentoSemanal : store.errors.apontamentoMensal"
          :shifts="store.shifts"
          :machines="store.machines"
          @consultar="(filtros) => consultarPeriodo(tabAtivo, filtros)"
        />
      </section>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useProductionStore } from '../../stores/productionStore';
import AppSidebar from '../../components/AppSidebar.vue';
import DailyReportPanel from '../../components/DailyReportPanel.vue';
import PeriodReportPanel from '../../components/PeriodReportPanel.vue';
import { exportarApontamentoExcel } from '../../utils/exportarApontamentoExcel';

const store = useProductionStore();

const hojeIso = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

const tabAtivo = ref('dia'); // 'dia' | 'semana' | 'mes'

const diaData = ref(hojeIso.value);
const diaTurnoId = ref('');
const diaMachineId = ref('');

const consultarDia = () => {
  if (!diaData.value) return;
  store.fetchApontamento({ date: diaData.value, shift_id: diaTurnoId.value || undefined, machine_id: diaMachineId.value || undefined });
};

const consultarPeriodo = (periodo, filtros) => {
  if (periodo === 'semana') store.fetchApontamentoSemanal(filtros);
  else store.fetchApontamentoMensal(filtros);
};

// Ao trocar de aba pela primeira vez, já carrega o período atual (semana/mês
// de hoje) sem esperar o usuário clicar "Consultar" — sem isso, a aba
// aparecia vazia ("Nenhum dado encontrado") mesmo quando existia produção
// real no período, só porque ninguém tinha buscado ainda.
watch(tabAtivo, (novo) => {
  if (novo === 'semana' && !store.apontamentoSemanal) store.fetchApontamentoSemanal({});
  if (novo === 'mes' && !store.apontamentoMensal) {
    const agora = new Date();
    store.fetchApontamentoMensal({ year: agora.getFullYear(), month: agora.getMonth() + 1 });
  }
});

onMounted(async () => {
  await Promise.allSettled([
    store.fetchShifts(),
    store.machines.length ? Promise.resolve() : store.fetchMachines(),
  ]);
  consultarDia();
});

const carregandoAtual = computed(() => {
  if (tabAtivo.value === 'dia') return store.loading.apontamento;
  if (tabAtivo.value === 'semana') return store.loading.apontamentoSemanal;
  return store.loading.apontamentoMensal;
});

const dadosDoTabAtivo = computed(() => {
  if (tabAtivo.value === 'dia') return store.apontamento;
  if (tabAtivo.value === 'semana') return store.apontamentoSemanal;
  return store.apontamentoMensal;
});

const exportar = async () => {
  if (!dadosDoTabAtivo.value) return;
  const rotulo = tabAtivo.value === 'dia'
    ? diaData.value
    : tabAtivo.value === 'semana'
      ? `${dadosDoTabAtivo.value.periodo?.inicio}_a_${dadosDoTabAtivo.value.periodo?.fim}`
      : `${dadosDoTabAtivo.value.periodo?.inicio?.slice(0, 7) || ''}`;
  await exportarApontamentoExcel({
    periodo: tabAtivo.value,
    dados: dadosDoTabAtivo.value,
    machines: store.machines,
    rotulo,
  });
};
</script>
