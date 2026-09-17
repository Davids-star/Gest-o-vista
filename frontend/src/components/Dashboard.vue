<template>
  <div class="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans flex select-none">
    <AppSidebar />

    <main class="flex-1 p-4 pt-[calc(4rem+env(safe-area-inset-top))] md:p-6 md:pt-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
      
      <!-- Header do Dashboard -->
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-slate-900">DASHBOARD INDUSTRIAL</h1>
      </div>

      <!-- KPI Cards Globais — nenhum número aqui embaixo depende de
           `store.loading.*` pra decidir o que mostrar (nem um "—" no
           lugar do valor). `alerts`/`metas` são rebuscados a cada 6s pelo
           polling global (App.vue): `loading.alerts`/`loading.metas`
           viram `true` por um instante em TODO ciclo, não só na carga
           inicial — um `v-if`/ternário em cima disso fazia o número
           piscar pra "—" e voltar sozinho, sem nenhum dado ter mudado de
           verdade. Como os arrays já nascem vazios (nunca `null`), usar
           `.length` direto é sempre seguro — na pior hipótese mostra 0
           por um instante na primeiríssima carga, nunca mais pisca depois. -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Produção de Hoje -->
        <div class="dark-panel p-5 space-y-2 border-emerald-500/30">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">PRODUÇÃO HOJE</span>
            <span class="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
              AO VIVO
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-black text-emerald-600">
              {{ (hojeApontamento?.resumo?.producao || 0).toLocaleString('pt-BR') }}
            </span>
            <span class="text-xs text-slate-500">peças</span>
          </div>
        </div>

        <!-- Máquinas em Operação -->
        <div class="dark-panel p-5 space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">MÁQUINAS CADASTRADAS</span>
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-black text-slate-900">
              {{ store.machines.length }}
            </span>
            <span class="text-xs text-slate-500">estações ativas</span>
          </div>
        </div>

        <!-- Alertas & Defeitos -->
        <div class="dark-panel p-5 space-y-2" :class="store.alerts.length > 0 ? 'border-red-500/40' : ''">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">ALERTAS / OCORRÊNCIAS</span>
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-black" :class="store.alerts.length > 0 ? 'text-red-600' : 'text-emerald-600'">
              {{ store.alerts.length }}
            </span>
            <span class="text-xs text-slate-500">
              {{ store.alerts.length > 0 ? 'requerem atenção' : 'operação normal' }}
            </span>
          </div>
        </div>

        <!-- Metas Ativas -->
        <div class="dark-panel p-5 space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500">METAS CADASTRADAS</span>
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-black text-amber-600">
              {{ store.metas.length }}
            </span>
            <span class="text-xs text-slate-500">planos de meta</span>
          </div>
        </div>

      </div>

      <!-- Painel de Máquinas Cadastradas — clique numa pra ver o detalhe
           dela E filtrar "Produção por Hora" só por essa máquina. -->
      <div class="dark-panel p-6">
        <h3 class="text-xs font-bold uppercase tracking-widest text-slate-900 mb-4 border-b border-slate-200 pb-3 flex items-center gap-2">
          <span class="text-emerald-600">🏭</span> ESTAÇÕES DA FÁBRICA
        </h3>

        <div v-if="store.loading.machines" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="h-20 bg-slate-100 rounded-xl animate-pulse"></div>
        </div>

        <div v-else-if="!store.machines.length" class="text-center py-6 text-slate-500 text-sm">
          Nenhuma máquina cadastrada no sistema.
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="m in store.machines"
            :key="m.id"
            @click="toggleSelecaoMaquina(m.id)"
            class="p-4 rounded-xl cursor-pointer transition-all border"
            :class="store.selectedStationId === m.id
              ? 'bg-emerald-500/10 border-emerald-500 shadow-lg'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'"
          >
            <div class="flex items-center gap-3 mb-2">
              <span class="w-9 h-9 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-mono font-extrabold text-sm">
                {{ getMachineNumber(m) }}
              </span>
              <div class="min-w-0">
                <p class="text-xs font-extrabold uppercase tracking-wider text-slate-900 truncate">
                  Máquina {{ getMachineNumber(m) }}
                </p>
              </div>
            </div>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold uppercase"
              :class="m.active !== false ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600' : 'border-slate-400 bg-slate-100 text-slate-500'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="m.active !== false ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'"/>
              {{ m.active !== false ? 'OPERANDO' : 'INATIVO' }}
            </span>
          </div>
        </div>

        <!-- Detalhe da máquina selecionada (produção/paradas de hoje) -->
        <div v-if="maquinaSelecionada" class="mt-5 pt-5 border-t border-slate-200 space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-emerald-600">
              Máquina {{ getMachineNumber(maquinaSelecionada) }} — {{ maquinaSelecionada.name || maquinaSelecionada.code }}
            </h4>
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border"
              :class="sessaoAtivaSelecionada ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-slate-100 border-slate-300 text-slate-500'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="sessaoAtivaSelecionada ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'" />
              {{ sessaoAtivaSelecionada ? 'EM PRODUÇÃO' : 'SEM SESSÃO ATIVA' }}
            </span>
          </div>

          <div v-if="sessaoAtivaSelecionada" class="grid grid-cols-3 gap-3 text-xs">
            <div><span class="text-slate-500 block">Produto</span><span class="font-bold text-slate-900">{{ sessaoAtivaSelecionada.product?.name || '—' }}</span></div>
            <div><span class="text-slate-500 block">Lote</span><span class="font-bold text-slate-900">{{ sessaoAtivaSelecionada.lot?.code || '—' }}</span></div>
            <div><span class="text-slate-500 block">Operador</span><span class="font-bold text-slate-900">{{ sessaoAtivaSelecionada.operator?.name || '—' }}</span></div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="dark-panel p-3 space-y-0.5">
              <span class="text-[10px] font-bold uppercase text-slate-500">Produção Hoje</span>
              <p class="font-mono text-lg font-black text-emerald-600">{{ resumoMaquinaSelecionada.producao.toLocaleString('pt-BR') }}</p>
            </div>
            <div class="dark-panel p-3 space-y-0.5">
              <span class="text-[10px] font-bold uppercase text-slate-500">T. Produzido</span>
              <p class="font-mono text-lg font-black text-slate-900">{{ formatDuracao(resumoMaquinaSelecionada.tempo_produzido_segundos) }}</p>
            </div>
            <div class="dark-panel p-3 space-y-0.5">
              <span class="text-[10px] font-bold uppercase text-slate-500">T. Parado</span>
              <p class="font-mono text-lg font-black text-red-600">{{ formatDuracao(resumoMaquinaSelecionada.tempo_parado_segundos) }}</p>
            </div>
            <div class="dark-panel p-3 space-y-0.5">
              <span class="text-[10px] font-bold uppercase text-slate-500">Paradas</span>
              <p class="font-mono text-lg font-black text-amber-600">{{ resumoMaquinaSelecionada.paradas }}</p>
            </div>
          </div>

          <!-- Quando a máquina encerrou uma produção e iniciou outra no
               mesmo dia, mostra cada uma separada (não só o total somado) —
               pedido explícito do usuário. Some sozinho com sessão única. -->
          <div v-if="sessoesMaquinaSelecionadaHoje.length > 1" class="pt-1 space-y-1.5">
            <span class="text-[10px] font-bold uppercase text-slate-500 block">Produções de Hoje ({{ sessoesMaquinaSelecionadaHoje.length }})</span>
            <div
              v-for="(s, idx) in sessoesMaquinaSelecionadaHoje"
              :key="s.id"
              class="flex items-center justify-between text-xs bg-white border border-slate-200 rounded-lg px-3 py-2"
            >
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-bold text-[10px] flex items-center justify-center shrink-0">{{ idx + 1 }}</span>
                <span class="font-mono text-slate-500">{{ formatHoraCurta(s.started_at) }} → {{ s.ended_at ? formatHoraCurta(s.ended_at) : 'Em aberto' }}</span>
              </div>
              <span class="font-mono font-bold text-emerald-600">{{ (s.producao || 0).toLocaleString('pt-BR') }} un.</span>
            </div>
            <div class="flex items-center justify-between text-xs px-3 pt-1 border-t border-slate-200">
              <span class="font-bold text-slate-700 uppercase text-[10px]">Total</span>
              <span class="font-mono font-black text-slate-900">{{ resumoMaquinaSelecionada.producao.toLocaleString('pt-BR') }} un.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════
           CTA pra página de Relatórios — antes essa área tinha as abas
           Diário/Resumo Mensal do Apontamento embutidas aqui; migraram pra
           /relatorios (dia/semana/mês, comparativo por máquina, paradas e
           exportação Excel), deixando o Dashboard mais enxuto.
           ══════════════════════════════════════════════════════════════ -->
      <router-link
        to="/relatorios"
        class="dark-panel p-5 flex items-center justify-between gap-4 hover:border-emerald-500/40 transition-all group"
      >
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            📊
          </div>
          <div>
            <h3 class="text-sm font-extrabold uppercase tracking-wider text-slate-900">Relatórios Detalhados</h3>
            <p class="text-xs text-slate-500 mt-0.5">Produção, paradas e comparativo entre máquinas por dia, semana ou mês — com exportação para Excel</p>
          </div>
        </div>
        <span class="text-emerald-600 text-lg font-bold shrink-0 group-hover:translate-x-1 transition-transform">→</span>
      </router-link>

      <!-- ══════════════════════════════════════════════════════════════
           PRODUÇÃO POR HORA (hoje) — respeita a máquina selecionada acima;
           sem seleção, mostra a fábrica inteira.
           DISTRIBUIÇÃO DO TEMPO ainda não foi conectada — adiado (ver plano).
           ══════════════════════════════════════════════════════════════ -->
      <div class="dark-panel p-4">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Produção por Hora (Hoje)
          <span class="text-emerald-600 normal-case font-normal">— {{ maquinaSelecionada ? `Máquina ${getMachineNumber(maquinaSelecionada)}` : 'Todas as Máquinas' }}</span>
        </h4>
        <HourlyProductionChart :data="producaoPorHoraChart" />
      </div>

      <!-- Resumo das 4 máquinas — produção e paradas de hoje, lado a lado.
           Fica logo acima de OCORRÊNCIAS & ALERTAS (pedido do usuário). -->
      <div v-if="store.machines.length" class="dark-panel p-4 sm:p-6">
        <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-3">Resumo das Máquinas (Hoje)</h4>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="m in store.machines"
            :key="'resumo-' + m.id"
            class="dark-panel p-3 space-y-1 cursor-pointer transition-all"
            :class="store.selectedStationId === m.id ? 'border-emerald-500/50' : ''"
            @click="toggleSelecaoMaquina(m.id)"
          >
            <p class="text-[10px] font-bold uppercase text-slate-500">Máquina {{ getMachineNumber(m) }}</p>
            <p class="font-mono text-base font-black text-emerald-600">
              {{ (resumoPorMaquina[m.id]?.producao || 0).toLocaleString('pt-BR') }} <span class="text-[10px] text-slate-500 font-normal">un.</span>
            </p>
            <p class="text-[10px] text-slate-500">{{ resumoPorMaquina[m.id]?.paradas || 0 }} parada{{ (resumoPorMaquina[m.id]?.paradas || 0) !== 1 ? 's' : '' }}</p>
          </div>
        </div>
      </div>

      <!-- Alertas & Ocorrências (GET /alertas/abertos) -->
      <div class="dark-panel p-6">
        <h3 class="text-xs font-bold uppercase tracking-widest text-slate-900 mb-4 border-b border-slate-200 pb-3 flex items-center gap-2">
          <span class="text-red-600">🚨</span> OCORRÊNCIAS & ALERTAS EM ABERTO
        </h3>

        <!-- `&& !store.alerts.length`: sem isso, a lista inteira (que já
             tem alertas de verdade) sumia e virava esse texto por um
             instante a CADA ciclo do polling de 6s — só mostra a
             mensagem de carregamento na primeira busca, nunca mais depois. -->
        <div v-if="store.loading.alerts && !store.alerts.length" class="text-slate-500 text-sm">Carregando alertas...</div>

        <div v-else-if="!store.alerts.length" class="flex items-center gap-3 py-4">
          <div class="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 font-bold">
            ✓
          </div>
          <div>
            <p class="text-emerald-600 font-bold text-sm">Nenhum alerta pendente</p>
            <p class="text-slate-500 text-xs">Fábrica operando sem interrupções críticas</p>
          </div>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="alert in store.alerts"
            :key="alert.id"
            class="flex items-start justify-between gap-4 p-4 rounded-xl border bg-white border-red-500/30"
          >
            <div class="flex items-start gap-3">
              <span class="mt-0.5 text-base">🔴</span>
              <div>
                <p class="text-sm font-semibold text-slate-900">{{ alert.message || alert.descricao }}</p>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ alert.machine?.name || alert.maquina?.nome || 'Máquina' }}
                  — {{ formatDateTime(alert.created_at || alert.criado_em) }}
                </p>
              </div>
            </div>
            <button
              @click="acknowledgeAlert(alert.id)"
              class="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg uppercase transition-all"
            >
              Reconhecer
            </button>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useProductionStore } from '../stores/productionStore';
import { apontamentoApi } from '../services/api';
import { formatDuracao as formatDuracaoBase, hojeIso } from '../composables/useFormatters';
import AppSidebar from './AppSidebar.vue';
import HourlyProductionChart from './HourlyProductionChart.vue';
import { getMachineNumber as getMachineNumberBase } from '../composables/useMachineDisplay';

const store = useProductionStore();

const getMachineNumber = (m) => getMachineNumberBase(store.machines, m);

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

const hojeApontamento = ref(null);

const formatDuracao = (segundos) => formatDuracaoBase(segundos, { compact: true });

const formatDateTime = (dt) => {
  if (!dt) return '—';
  try { return new Date(dt).toLocaleString('pt-BR', { timeStyle: 'short', dateStyle: 'short' }); }
  catch { return String(dt); }
};

const formatHoraCurta = (dt) => {
  if (!dt) return '—';
  try { return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return String(dt); }
};

// Sessões de hoje da máquina selecionada, na ordem em que aconteceram — pra
// mostrar "1ª produção / 2ª produção" separadas quando a máquina encerrou
// uma sessão e começou outra no mesmo dia (antes só aparecia o total somado).
const sessoesMaquinaSelecionadaHoje = computed(() => {
  if (!maquinaSelecionada.value) return [];
  return (hojeApontamento.value?.sessoes || []).filter((s) => s.machine?.id === maquinaSelecionada.value.id);
});

const carregarProducaoHoje = async () => {
  try {
    hojeApontamento.value = await apontamentoApi.obter({ date: hojeIso() });
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
    hojeApontamentoMaquina.value = await apontamentoApi.obter({ date: hojeIso(), machine_id: store.selectedStationId });
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

const acknowledgeAlert = async (alertId) => {
  try {
    await store.acknowledgeAlert(alertId);
  } catch (err) {
    console.warn('[Dashboard] Erro ao marcar alerta como visto:', err.message);
  }
};

let producaoHojeTimer = null;

onMounted(async () => {
  await Promise.allSettled([
    store.bootstrap(),
    store.fetchShifts(),
    carregarProducaoHoje(),
  ]);
  // WebSocket + polling de segurança agora ligam uma vez só em App.vue
  // (vida inteira do app), não aqui — ver comentário lá.

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
  if (producaoHojeTimer) clearInterval(producaoHojeTimer);
});
</script>
