<template>
  <div class="min-h-screen bg-[#070a0e] text-white flex flex-col justify-center items-center p-4 sm:p-8 select-none font-sans">
    <!-- Main Totem Outer Frame with Green Border -->
    <div class="w-full max-w-5xl bg-[#0d121c] border-2 border-emerald-500/60 rounded-3xl p-6 lg:p-8 space-y-6 shadow-[0_0_30px_rgba(34,197,94,0.15)] relative">

      <!-- ── HEADER ── -->
      <header class="flex items-center justify-between pb-2">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-black uppercase tracking-wider text-white">PRODUÇÃO</h1>
            <p class="text-xs text-slate-400 font-semibold">
              Estação de trabalho <span class="text-emerald-400 font-extrabold font-mono">{{ currentMachineDisplayName }}</span>
            </p>
          </div>
        </div>

        <!-- Clock & Logout Widget -->
        <div class="flex items-center gap-2">
          <button 
            @click="handleLogout"
            class="bg-slate-900 hover:bg-red-500/20 border border-slate-800 hover:border-red-500/40 text-slate-300 hover:text-red-400 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            title="Sair da Conta / Reconfigurar Modo">
            🚪 <span class="hidden sm:inline">Sair / Trocar Modo</span>
          </button>

          <div class="bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl text-white font-mono text-sm flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {{ currentTime }}
          </div>
        </div>
      </header>

      <!-- Loading Machines -->
      <div v-if="store.loading.machines" class="text-center py-12">
        <div class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs text-slate-400 mt-3 uppercase">Carregando dados da API...</p>
      </div>

      <!-- Error from API -->
      <div v-else-if="store.errors.machines" class="bg-red-500/10 border-2 border-red-500/60 p-4 rounded-2xl text-red-300 text-sm font-bold flex items-center gap-3">
        <span class="text-2xl">⚠️</span>
        <span>Servidor Indisponível: {{ store.errors.machines }}</span>
      </div>

      <!-- Dados necessários para iniciar: máquina, produto, lote e operador. -->
      <!-- Se o supervisor já definiu a próxima produção (PATCH /machines/:id/planned-production) -->
      <!-- ou a meta do dia (GET /metas/maquina/:id) com produto, isso vem pronto — só falta o resto. -->
      <section v-else-if="!store.activeSession" class="bg-[#121824] border border-slate-800 rounded-2xl p-6 space-y-5">
        <div>
          <h2 class="text-sm font-bold uppercase tracking-wide">Nova produção</h2>
          <p class="text-xs text-slate-400 mt-1">
            {{ plannedProductId
              ? 'Próxima produção definida pelo supervisor — confira e informe o que faltar.'
              : metaDefiniuProduto
                ? 'Produto definido pela meta do dia — informe lote e operador.'
                : 'A meta do dia é opcional e não bloqueia o início.' }}
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label class="text-xs font-semibold text-slate-300 space-y-2">
            <span>Produto</span>
            <template v-if="produtoAutoPreenchido">
              <div class="w-full bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-3 text-sm text-emerald-400 font-semibold flex items-center justify-between gap-2">
                <span class="truncate">{{ produtoSugeridoNome || '—' }}</span>
                <button type="button" @click="destravarProduto" class="text-[10px] text-slate-400 hover:text-white uppercase shrink-0">Trocar</button>
              </div>
            </template>
            <select v-else v-model="selectedProductId" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white">
              <option value="" disabled>Selecione um produto</option>
              <option v-for="product in store.products" :key="product.id" :value="product.id">{{ product.name }}</option>
            </select>
          </label>
          <label class="text-xs font-semibold text-slate-300 space-y-2">
            <span>Lote</span>
            <template v-if="loteAutoPreenchido">
              <div class="w-full bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-3 text-sm text-emerald-400 font-semibold flex items-center justify-between gap-2">
                <span class="truncate">{{ plannedLotCode }}</span>
                <button type="button" @click="destravarLote" class="text-[10px] text-slate-400 hover:text-white uppercase shrink-0">Trocar</button>
              </div>
            </template>
            <input v-else v-model.trim="lotCode" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white" placeholder="Código do lote" maxlength="120">
          </label>
          <label class="text-xs font-semibold text-slate-300 space-y-2">
            <span>Operador</span>
            <input v-model.trim="operatorName" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white" placeholder="Nome do operador" maxlength="160">
          </label>
        </div>
        <div class="border-t border-slate-800 pt-4 text-sm">
          <span class="text-slate-400">Meta do dia: </span>
          <span class="font-semibold" :class="activeTarget ? 'text-emerald-400' : 'text-slate-300'">{{ activeTarget ? `${activeTarget.quantity} unidades` : 'Sem meta definida' }}</span>
        </div>
      </section>

      <!-- ── SECTION 1: UNIDADES PRODUZIDAS & STATUS DA LINHA ── -->
      <div v-if="store.activeSession" class="bg-[#121824] border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div class="flex-1 space-y-1">
          <span class="text-sm font-semibold text-slate-300 font-mono tracking-wide block">Unidades Produzidas</span>
          <div class="text-6xl font-black font-mono text-emerald-400 tracking-wider">
            {{ productionCount }}
          </div>
        </div>

        <div class="w-full sm:w-auto sm:border-l border-slate-700 sm:pl-8 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m-8-10l8 4m-8-4v10l8 4m0-10L4 7" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-slate-400 font-semibold block uppercase">Status da linha</span>
            <span class="text-lg font-bold text-emerald-400">Iniciada</span>
          </div>
        </div>
      </div>

      <!-- ── SECTION 2: PROGRESSO DA META ── -->
      <div v-if="store.activeSession" class="bg-[#121824] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-400 flex items-center justify-center">🎯</div>
            <span class="text-sm font-mono font-semibold text-white tracking-wide">progresso da meta</span>
          </div>
          <div class="flex items-baseline gap-4 font-mono text-sm">
            <span v-if="activeTarget" :class="metaBatida ? 'text-amber-400' : 'text-emerald-400'">
              {{ productionCount }} / {{ activeTarget.quantity }}
              <span v-if="metaBatida" class="ml-1">✅ META BATIDA</span>
            </span>
            <span v-else class="text-white font-bold text-sm text-slate-400">SEM META DEFINIDA</span>
          </div>
        </div>

        <!-- Progress Bar Capsule — a largura satura em 100% (não tem como uma
             div passar disso), mas o número acima (produção/meta) continua
             subindo de verdade. Vira âmbar quando bate a meta.
             Texto de dentro é só a % (curto de propósito): "26/2000" já
             aparece no cabeçalho acima — com produção/meta ali dentro
             também, um progresso baixo (ex.: 1%) deixava a cápsula mais
             estreita que o texto, cortando ele pela metade. -->
        <div v-if="activeTarget" class="w-full bg-[#0b0f17] border border-slate-800 rounded-full h-5 p-1 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500 flex items-center justify-end px-2 min-w-[2.5rem]"
            :class="metaBatida ? 'bg-amber-400' : 'bg-emerald-400'"
            :style="{ width: `${targetProgressBarWidth}%` }"
          >
            <span class="text-[10px] font-black text-slate-950 leading-none whitespace-nowrap">
              {{ targetProgressRaw }}%
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Atualização em tempo real</span>
        </div>
      </div>

      <!-- ── SECTION 3: LOTE & INFORMAÇÕES DA SESSÃO ── -->
      <div v-if="store.activeSession" class="bg-[#121824] border border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">📈</div>
          <div>
            <span class="text-xs text-slate-400 font-semibold block">Produto</span>
            <span class="text-sm font-mono font-bold text-emerald-400">{{ store.activeSession.product?.name || '—' }}</span>
          </div>
        </div>

        <div
          @click="isLotModalOpen = true"
          class="flex items-center gap-4 md:border-l border-slate-700 md:pl-6 cursor-pointer group hover:bg-slate-800/40 p-2 rounded-xl transition-all border border-transparent hover:border-emerald-500/30"
          title="Clique para alterar o Lote"
        >
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">🏷️</div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400 font-semibold block">LOTE</span>
              <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold uppercase tracking-wider group-hover:bg-emerald-500/20 transition-colors">ALTERAR ✏️</span>
            </div>
            <span class="text-sm font-mono font-bold text-emerald-400 group-hover:text-emerald-300">{{ store.activeSession.lot?.code || '—' }}</span>
          </div>
        </div>

        <div class="flex items-center gap-4 md:border-l border-slate-700 md:pl-6">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">👷</div>
          <div>
            <span class="text-xs text-slate-400 font-semibold block">Operador</span>
            <span class="text-sm font-mono font-bold text-emerald-400">{{ store.activeSession.operator?.name || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- ── POSSÍVEL PARADA DETECTADA AUTOMATICAMENTE — sem evento de
           produção há tempo demais (ver PossibleStopDetectorService).
           Nunca coexiste com "parada em andamento" abaixo: o detector não
           cria isso se já existe uma parada real aberta. ── -->
      <div v-if="possibleStopPendente" class="bg-orange-500/10 border-2 border-orange-500/50 rounded-2xl p-6 space-y-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-orange-500/10 border-2 border-orange-500 text-orange-400 flex items-center justify-center text-2xl shrink-0">⚠️</div>
          <div>
            <p class="text-orange-400 font-black text-sm uppercase tracking-wider">Possível parada detectada</p>
            <p class="text-white text-sm mt-0.5">Sem produção detectada há {{ Math.round(possibleStopPendente.duration_seconds / 60) }} min. É uma parada de verdade?</p>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <select v-model="possibleStopReasonId" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white">
            <option value="" disabled>Selecione o motivo...</option>
            <option v-for="reason in store.stopReasons" :key="reason.id" :value="reason.id">{{ reason.label }}</option>
          </select>
          <button
            @click="handleConfirmarPossibleStop"
            :disabled="!possibleStopReasonId"
            class="px-6 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 shrink-0"
          >
            Confirmar parada
          </button>
          <button
            @click="handleDescartarPossibleStop"
            class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 shrink-0"
          >
            Não é parada
          </button>
        </div>
      </div>

      <!-- ── PARADA EM ANDAMENTO — motivos que não encerram a sessão (Pausa,
           Limpeza, Falta de material) ficam aqui até o operador retomar. ── -->
      <div v-if="openStop" class="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-500/10 border-2 border-amber-500 text-amber-400 flex items-center justify-center text-2xl shrink-0">⏸️</div>
          <div>
            <p class="text-amber-400 font-black text-sm uppercase tracking-wider">Parada em andamento</p>
            <p class="text-white text-sm mt-0.5">{{ openStop.reason?.label || 'Motivo não informado' }}</p>
          </div>
        </div>
        <button
          @click="handleResume"
          class="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 shrink-0"
        >
          ▶ Retomar Produção
        </button>
      </div>

      <!-- Session Action Error -->
      <div v-if="sessionError" class="bg-red-500/10 border border-red-500/40 p-3 rounded-xl text-red-400 text-xs font-semibold">
        {{ sessionError }}
      </div>

      <!-- ── SECTION 4: BOTÕES INICIAR | AJUDA | PARAR ── -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <!-- Botão verde: INICIAR -->
        <button
          @click="handleStart"
          :disabled="store.loading.session || !!store.activeSession"
          class="py-4 bg-[#056e29] hover:bg-[#068532] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/30 transition-all active:scale-95 border border-emerald-500/40"
        >
          <svg v-if="store.loading.session" class="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" viewBox="0 0 24 24"></svg>
          <svg v-else class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          {{ store.loading.session ? 'AGUARDE...' : store.activeSession ? 'EM SESSÃO' : 'INICIAR' }}
        </button>

        <!-- Botão escuro: AJUDA (desabilitado se já tem parada em andamento) -->
        <button
          @click="isHelpModalOpen = true"
          :disabled="!!openStop"
          class="py-4 bg-[#121824] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-3 border border-slate-700 transition-all active:scale-95"
        >
          <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          AJUDA / PARADA
          <svg class="w-4 h-4 text-slate-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Botão vermelho: PARAR -->
        <button
          @click="handleStop"
          :disabled="store.loading.session || !store.activeSession"
          class="py-4 bg-[#8b0000] hover:bg-[#a80000] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-red-900/30 transition-all active:scale-95 border border-red-500/40"
        >
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ENCERRAR
        </button>
      </div>

    </div>

    <!-- Modal de Ajuda com Motivos de Parada da API GET /motivos-parada -->
    <div v-if="isHelpModalOpen" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="dark-panel w-full max-w-lg p-6 space-y-6 border border-emerald-500/40">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 class="text-base font-bold text-white uppercase flex items-center gap-2">
            <span>❓</span> MOTIVOS DE PARADA & SOLICITAÇÃO DE AJUDA
          </h3>
          <button @click="isHelpModalOpen = false" class="text-slate-400 hover:text-white text-xl">&times;</button>
        </div>

        <p class="text-xs text-slate-300">Selecione o motivo da parada cadastrado no sistema (fonte: API):</p>

        <!-- Loading stop reasons -->
        <div v-if="store.loading.stopReasons" class="py-4 text-center">
          <div class="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>

        <!-- Stop reasons from GET /motivos-parada -->
        <div v-else class="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
          <div v-if="!store.stopReasons.length" class="text-xs text-slate-400 text-center py-4">
            Nenhum motivo cadastrado. Verifique conexão com a API.
          </div>
          <button
            v-for="reason in store.stopReasons"
            :key="reason.id"
            @click="selectStopReason(reason)"
            class="w-full p-3 bg-slate-900/90 hover:bg-emerald-500/20 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-left flex justify-between items-center transition-all group"
          >
            <div class="flex items-center gap-3">
              <span class="px-2 py-1 rounded bg-slate-800 text-amber-400 font-mono text-xs font-bold">{{ reason.code }}</span>
              <span class="text-sm font-semibold text-white group-hover:text-emerald-400">{{ reason.label || reason.description || reason.name }}</span>
            </div>
            <span class="text-[10px] text-slate-500 uppercase">{{ reason.planned ? 'Programada' : 'Não Programada' }}</span>
          </button>
        </div>

        <div class="flex justify-end pt-2">
          <button @click="isHelpModalOpen = false" class="px-6 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-lg uppercase">FECHAR</button>
        </div>
      </div>
    </div>

    <!-- Modal Alteração de Lote no Totem -->
    <LotEditModal
      :is-open="isLotModalOpen"
      :lot-code="store.activeSession?.lot?.code || ''"
      :station-code="currentMachineDisplayName"
      @close="isLotModalOpen = false"
      @save="handleSaveLot"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProductionStore } from '../../stores/productionStore';
import { useAuth } from '../../composables/useAuth';
import LotEditModal from '../../components/LotEditModal.vue';

const route = useRoute();
const router = useRouter();
const store = useProductionStore();
const { clearSession } = useAuth();

const handleLogout = () => {
  clearSession();
  localStorage.removeItem('gp_mobile_configured');
  localStorage.removeItem('gp_pwa_remember');
  localStorage.removeItem('gp_pwa_default_mode');
  router.push('/supervisor/login');
};

const currentTime = ref('');
const isHelpModalOpen = ref(false);
const isLotModalOpen = ref(false);
const sessionError = ref('');
const selectedProductId = ref('');
const lotCode = ref('');
const operatorName = ref('');

let clockInterval = null;

const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString();
};

onMounted(async () => {
  updateTime();
  clockInterval = setInterval(updateTime, 1000);

  // 1. Carregar máquinas da API
  if (!store.machines.length) {
    await store.fetchMachines();
  }

  // 2. Selecionar estação via route param ou primeira disponível
  const estacaoId = route.params.estacaoId;
  if (estacaoId) {
    store.selectStation(estacaoId);
  }

  // 3. Carregar motivos de parada da API GET /motivos-parada
  if (!store.stopReasons.length) {
    await store.fetchStopReasons();
  }

  if (!store.products.length) await store.fetchProducts();
  await store.fetchMetas(currentMachine.value?.id);
  await store.fetchSessions();
  await store.fetchStops(currentMachine.value?.id);
  // store.activeSession agora é um getter derivado de store.sessions +
  // store.selectedMachine — reativo sozinho, nunca mais precisa de
  // atribuição manual aqui (isso era o motivo de só atualizar com F5).
  if (store.activeSession) await store.fetchProductionTotals(store.activeSession.id);
  await store.fetchPossibleStops({ status: 'pending' });
  store.startPolling(6000);
});

onBeforeUnmount(() => {
  if (clockInterval) clearInterval(clockInterval);
  // _pollTimer/socket são globais no store (Pinia é singleton) — sem isso,
  // sair desta tela (troca de modo, logout) deixava o polling desta tela
  // rodando sozinho pra sempre; se outra tela encerrasse esse polling
  // global no meio do caminho (ela fecha o que não foi ela quem abriu),
  // ninguém mais reabria, e contador/meta travavam até dar F5.
  store.stopPolling();
});

const currentMachine = computed(() => store.selectedMachine);
const currentMachineDisplayName = computed(() => {
  if (!currentMachine.value) return '—';
  const idx = store.machines.findIndex((m) => m.id === currentMachine.value.id);
  const num = (currentMachine.value.code && parseInt(currentMachine.value.code, 10) < 100)
    ? parseInt(currentMachine.value.code, 10)
    : (idx >= 0 ? idx + 1 : 1);
  return `Máquina ${num}`;
});

const handleSaveLot = async (newLotCode) => {
  if (!currentMachine.value || !newLotCode?.trim()) return;
  sessionError.value = '';
  try {
    await store.changeLot({
      machine_id: currentMachine.value.id,
      lot_code: newLotCode.trim().toUpperCase(),
    });
    await store.fetchSessions();
    isLotModalOpen.value = false;
  } catch (err) {
    sessionError.value = err.message || 'Erro ao alterar lote.';
  }
};

// ── Próxima produção definida pelo supervisor (PATCH /machines/:id/planned-production) ──
// Fonte com prioridade máxima: é uma intenção explícita pra ESSA produção,
// mais específica que a meta (que só carrega produto, não lote).
const plannedProductId = computed(() => currentMachine.value?.planned_product_id || null);
const plannedLotCode = computed(() => currentMachine.value?.planned_lot_code || null);

// ── Meta do dia definida pelo supervisor para esta máquina (GET /metas/maquina/:id) ──
// Não depende do produto selecionado (evita o "ovo e a galinha" de precisar
// escolher o produto pra descobrir a meta que deveria escolher o produto).
const todaysMetaForMachine = computed(() => {
  if (!currentMachine.value) return null;
  const today = new Date().toISOString().slice(0, 10);
  return store.metas.find((meta) =>
    meta.machine_id === currentMachine.value.id
    && meta.quantity > 0
    && meta.period_start <= today
    && meta.period_end >= today,
  ) || null;
});

// Produto sugerido: próxima produção manda mais que a meta do dia.
const produtoSugeridoId = computed(() => plannedProductId.value || todaysMetaForMachine.value?.product_id || null);
const produtoSugeridoNome = computed(() => {
  const id = produtoSugeridoId.value;
  if (!id) return '';
  return store.products.find((p) => p.id === id)?.name
    || todaysMetaForMachine.value?.product?.name
    || '';
});

// Se existe produto/lote sugerido, o Totem preenche sozinho — o operador só
// digita o que falta e o nome. "Trocar" reabre a escolha manual de cada campo.
const produtoDestravadoManualmente = ref(false);
const loteDestravadoManualmente = ref(false);
const produtoAutoPreenchido = computed(() =>
  Boolean(produtoSugeridoId.value) && !produtoDestravadoManualmente.value,
);
const loteAutoPreenchido = computed(() =>
  Boolean(plannedLotCode.value) && !loteDestravadoManualmente.value,
);
// Mantido pelo nome antigo só pro texto de apoio saber se veio da meta especificamente
const metaDefiniuProduto = computed(() => produtoAutoPreenchido.value && !plannedProductId.value);

// Um único watcher combinado evita corrida entre "trocou de máquina" e
// "sugestão mudou": ao trocar de máquina, destrava tudo e limpa antes de
// aplicar as sugestões da máquina nova (se houver).
watch(
  () => [currentMachine.value?.id, produtoSugeridoId.value, plannedLotCode.value],
  ([machineId, produtoId, lote], previous) => {
    const prevMachineId = previous?.[0];
    if (machineId !== prevMachineId) {
      produtoDestravadoManualmente.value = false;
      loteDestravadoManualmente.value = false;
      selectedProductId.value = '';
      lotCode.value = '';
    }
    if (produtoId && !produtoDestravadoManualmente.value) {
      selectedProductId.value = produtoId;
    }
    if (lote && !loteDestravadoManualmente.value) {
      lotCode.value = lote;
    }
  },
  { immediate: true },
);

const destravarProduto = () => {
  produtoDestravadoManualmente.value = true;
};

const destravarLote = () => {
  loteDestravadoManualmente.value = true;
};

// Meta usada pra exibir progresso (diferente de todaysMetaForMachine: aqui já
// filtramos pelo produto certo). ANTES isso pegava "a primeira meta da
// máquina" (todaysMetaForMachine) e só DEPOIS checava o produto — se a
// máquina tivesse mais de uma meta (ex.: uma pro Chocolate, outra pra
// Bolacha), podia pegar a errada primeiro e descartar mesmo quando existia
// uma meta certa mais adiante na lista. Mesma lógica do TvView.vue.
const activeTarget = computed(() => {
  if (!currentMachine.value) return null;
  const today = new Date().toISOString().slice(0, 10);
  const produtoAlvo = store.activeSession?.product_id || selectedProductId.value || null;
  return store.metas.find((meta) =>
    meta.machine_id === currentMachine.value.id
    && meta.quantity > 0
    && meta.period_start <= today
    && meta.period_end >= today
    // Meta sem produto definido vale pra qualquer produto; com produto
    // definido, só conta se for exatamente o que está em produção/selecionado.
    && (!meta.product_id || meta.product_id === produtoAlvo),
  ) || null;
});

// REATIVO: vem de store.productionTotals (soma real via SQL, sem paginação —
// ver EventsService.totaisPorSessao), mantido fresco pelo polling e pelo
// WebSocket. ANTES somava store.todayEvents no cliente, que é uma lista
// paginada (limit=100) — travava em ~100 assim que a sessão passava disso.
const productionCount = computed(() => {
  if (!store.activeSession) return 0;
  return store.productionTotals[store.activeSession.id] ?? 0;
});

// Percentual REAL (sem capar em 100) — o contador de produção nunca travou
// (é soma direta dos eventos), só o percentual/barra ficavam presos em 100%
// quando a meta era batida. Agora o número continua subindo normalmente;
// só a LARGURA da barra (obrigatoriamente ≤ 100% de um elemento) satura,
// com um estado visual diferente pra deixar claro que passou da meta.
const targetProgressRaw = computed(() => activeTarget.value
  ? Math.round((productionCount.value / activeTarget.value.quantity) * 100)
  : 0);
const targetProgressBarWidth = computed(() => Math.min(100, targetProgressRaw.value));
const metaBatida = computed(() =>
  Boolean(activeTarget.value) && productionCount.value >= activeTarget.value.quantity);

// ── Parada em andamento (Ajuda/Parada) ─────────────────────────────
// Só algumas paradas (session_action = 'end_session', o padrão) encerram a
// sessão na hora. As outras (Pausa, Limpeza, Falta de material) deixam a
// sessão aberta e ficam "em andamento" até o operador clicar em Retomar.
const openStop = computed(() => store.stops.find(
  (s) => s.machine_id === currentMachine.value?.id && !s.ended_at,
) || null);

// ── Possível parada detectada automaticamente (sem evento de produção há
// tempo demais) — ver PossibleStopDetectorService no backend. O operador
// confirma (vira parada real, com motivo) ou descarta (falso alarme, ex.:
// setup manual que não gera evento).
const possibleStopPendente = computed(() => store.possibleStops.find(
  (p) => p.machine_id === currentMachine.value?.id,
) || null);
const possibleStopReasonId = ref('');

const handleConfirmarPossibleStop = async () => {
  const pendente = possibleStopPendente.value;
  if (!pendente || !possibleStopReasonId.value) return;
  try {
    await store.confirmarPossibleStop(pendente.id, { reason_id: possibleStopReasonId.value });
    possibleStopReasonId.value = '';
    await store.fetchStops(currentMachine.value?.id);
  } catch (err) {
    sessionError.value = err.message || 'Erro ao confirmar parada';
  }
};
const handleDescartarPossibleStop = async () => {
  const pendente = possibleStopPendente.value;
  if (!pendente) return;
  try {
    await store.descartarPossibleStop(pendente.id);
  } catch (err) {
    sessionError.value = err.message || 'Erro ao descartar possível parada';
  }
};

// ── INICIAR SESSÃO via POST /totem/sessions ────────────────────────
const handleStart = async () => {
  sessionError.value = '';

  if (!currentMachine.value) {
    sessionError.value = 'Nenhuma máquina selecionada.';
    return;
  }

  if (!store.products.length) {
    await store.fetchProducts();
  }

  if (!store.products.length) {
    sessionError.value = 'Nenhum produto cadastrado. Cadastre um produto antes de iniciar a produção.';
    return;
  }

  if (!selectedProductId.value || !lotCode.value || !operatorName.value) {
    sessionError.value = 'Informe produto, lote e operador para iniciar a produção.';
    return;
  }

  try {
    await store.startSession({
      machine_id: currentMachine.value.id,
      product_id: selectedProductId.value,
      lot_code: lotCode.value,
      operator_name: operatorName.value,
    });
    // productionCount é reativo — nada a fazer aqui, some sozinho a 0 até o
    // primeiro evento real chegar (sessão nova não tem eventos ainda).
  } catch (err) {
    sessionError.value = err.message || 'Erro ao iniciar sessão';
  }
};

// ── ENCERRAR SESSÃO via POST /totem/sessions/current/close ─────────
const handleStop = async () => {
  if (!currentMachine.value || !store.activeSession) return;

  try {
    await store.closeSession({ machine_id: currentMachine.value.id });
    // productionCount volta a 0 sozinho: o computed depende de store.activeSession
  } catch (err) {
    sessionError.value = err.message || 'Erro ao encerrar sessão';
  }
};

// ── SELECIONAR MOTIVO DE PARADA ────────────────────────────────────
// O que acontece com a sessão depois de registrar a parada depende do
// motivo (reason.session_action, configurado em /motivos-parada):
//   - end_session (padrão): encerra a sessão na hora, como sempre foi.
//   - keep_running (ex.: Pausa) / ask_to_resume (ex.: Limpeza, Falta de
//     material): a sessão continua ativa — vira uma "parada em andamento"
//     até o operador clicar em Retomar Produção.
const selectStopReason = async (reason) => {
  isHelpModalOpen.value = false;
  if (!currentMachine.value || !store.activeSession) return;

  try {
    await store.createStop({
      machine_id: currentMachine.value.id,
      reason_id: reason.id,
      observation: `Solicitação de ajuda / parada via Totem: ${reason.label || reason.description || reason.name || ''}`,
      session_id: store.activeSession.id,
    });
  } catch (err) {
    sessionError.value = err.message || 'Erro ao registrar parada';
    return;
  }

  if (reason.session_action === 'end_session' || !reason.session_action) {
    await handleStop();
  }
  // keep_running / ask_to_resume: nada mais a fazer agora — openStop já
  // reflete a parada aberta (via store.stops) e o botão Retomar aparece.
};

// ── RETOMAR PRODUÇÃO (fim da parada em andamento) ──────────────────
const handleResume = async () => {
  const stop = openStop.value;
  if (!stop) return;

  const acao = stop.reason?.session_action || 'end_session';
  let continuar = true;

  if (acao === 'ask_to_resume') {
    continuar = window.confirm(
      `Parada: ${stop.reason?.label || 'motivo não informado'}.\n\nDeseja continuar a produção de onde parou?`,
    );
  }

  try {
    await store.encerrarStop(stop.id);
  } catch (err) {
    sessionError.value = err.message || 'Erro ao encerrar a parada';
    return;
  }

  if (!continuar) {
    // Limpeza/Falta de material sem retomar o que tava rodando: encerra a
    // sessão de vez — próxima produção começa do zero, como antes.
    await handleStop();
  }
  // continuar = true (ou Pausa, que nem pergunta): a sessão nunca foi
  // tocada, então a produção já está "retomada" sozinha.
};
</script>
