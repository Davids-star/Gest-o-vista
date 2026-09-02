<template>
  <div class="min-h-screen bg-[#0b0f17] text-white flex select-none">
    <AppSidebar />

    <main class="flex-1 p-4 pt-[calc(4rem+env(safe-area-inset-top))] md:p-6 md:pt-6 lg:p-8 overflow-y-auto flex flex-col items-center justify-center">
      <div class="w-full max-w-lg dark-panel p-8 space-y-6 border border-emerald-500/30">

        <!-- Header -->
        <div class="flex items-center gap-4 border-b border-slate-800 pb-4">
          <div class="w-10 h-10 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.15)]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-extrabold uppercase tracking-widest text-white">LOTE</h1>
            <p class="text-sm text-slate-400">
              Estação
              <span class="text-emerald-400 font-bold font-mono text-base">{{ currentMachineDisplayName }}</span>
            </p>
          </div>
          <div class="ml-auto font-mono text-emerald-400 font-bold text-sm bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            {{ currentTime }}
          </div>
        </div>

        <!-- Loading -->
        <div v-if="store.loading.machines" class="text-center py-8">
          <div class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-slate-400 text-sm">Carregando dados da estação...</p>
        </div>

        <!-- Lote Ativo (da sessão ou da store) -->
        <template v-else>
          <section class="bg-slate-900/60 rounded-xl p-4 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-xs font-bold uppercase tracking-widest text-slate-300">Definir lote sem iniciar produção</h2>
              <button @click="showLotForm = !showLotForm" class="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-bold">{{ showLotForm ? 'FECHAR' : 'NOVO LOTE' }}</button>
            </div>
            <div v-if="showLotForm" class="grid gap-3">
              <select v-model="lotForm.machine_id" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm">
                <option value="" disabled>Escolha a máquina</option>
                <option v-for="machine in store.machines" :key="machine.id" :value="machine.id">Máquina {{ getMachineNumber(machine) }}</option>
              </select>
              <select v-model="lotForm.product_id" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm">
                <option value="" disabled>Escolha o produto</option>
                <option v-for="product in store.products" :key="product.id" :value="product.id">{{ product.name }}</option>
              </select>
              <div class="flex gap-2">
                <input v-model.trim="lotForm.code" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-3 text-sm" placeholder="Código do lote">
                <button @click="createLot" :disabled="creatingLot" class="px-4 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs disabled:opacity-50">{{ creatingLot ? 'SALVANDO' : 'SALVAR' }}</button>
              </div>
              <p v-if="lotCreateError" class="text-xs text-red-400">{{ lotCreateError }}</p>
            </div>
          </section>
          <div>
            <label class="block text-xs uppercase text-slate-400 font-bold mb-2 flex items-center gap-2">
              <span>📦</span> Código do Lote
            </label>

            <!-- Visualização -->
            <div v-if="!isEditing" class="bg-[#0a0e0d] border border-emerald-500/30 rounded-xl px-6 py-5 flex items-center justify-center">
              <span class="font-mono text-5xl font-black text-emerald-400 tracking-widest drop-shadow-[0_0_16px_rgba(34,255,136,0.4)]">
                {{ activeLotCode || '—' }}
              </span>
            </div>

            <!-- Edição -->
            <div v-else>
              <input
                v-model="loteEditValue"
                autofocus
                @keyup.enter="saveLote"
                @keyup.escape="cancelEdit"
                placeholder="Ex: LOT-2024-001"
                class="w-full font-mono text-3xl font-black text-emerald-400 tracking-widest text-center bg-[#0a0e0d] border-2 border-emerald-500 focus:shadow-[0_0_14px_rgba(34,255,136,0.35)] rounded-xl px-6 py-5 outline-none transition-all uppercase"
              />
              <p class="text-center text-xs text-slate-500 mt-2">Enter para salvar · Esc para cancelar</p>
            </div>
          </div>

          <!-- Info da sessão ativa -->
          <div v-if="selectedSession" class="bg-slate-900/60 rounded-xl p-4 border border-slate-800 text-xs space-y-1.5">
            <p class="text-slate-400 font-semibold uppercase tracking-wider">Sessão Ativa</p>
            <div class="flex justify-between">
              <span class="text-slate-400">Máquina</span>
              <span class="font-semibold text-emerald-400">{{ currentMachineDisplayName }}</span>
            </div>
            <div class="flex justify-between" v-if="selectedSession.operator?.name">
              <span class="text-slate-400">Operador</span>
              <span class="text-white font-semibold">{{ selectedSession.operator.name }}</span>
            </div>
          </div>

          <div v-else class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-400 font-semibold">
            ⏳ Nenhuma sessão ativa nesta estação.
            Inicie via Apontamento do supervisor.
          </div>

          <!-- Erro ao salvar -->
          <p v-if="saveError" class="text-red-400 text-xs font-semibold">⚠ {{ saveError }}</p>

          <!-- Botões modo visualização -->
          <div v-if="!isEditing" class="flex gap-3">
            <button
              @click="startEdit"
              :disabled="!selectedSession"
              class="flex-1 py-3 rounded-xl border font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              :class="selectedSession
                ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              EDITAR LOTE
            </button>
            <button
              @click="goBack"
              class="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              VOLTAR
            </button>
          </div>

          <!-- Botões modo edição -->
          <Transition name="edit-actions">
            <div v-if="isEditing" class="flex gap-3">
              <button
                @click="cancelEdit"
                class="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98]"
              >
                CANCELAR
              </button>
              <button
                @click="saveLote"
                :disabled="saving"
                class="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 border border-emerald-500 text-slate-950 font-extrabold text-sm uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(34,255,136,0.3)] active:scale-[0.98] disabled:opacity-50"
              >
                {{ saving ? 'SALVANDO...' : 'SALVAR' }}
              </button>
            </div>
          </Transition>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useProductionStore } from '../../stores/productionStore';
import AppSidebar from '../../components/AppSidebar.vue';

const router = useRouter();
const route = useRoute();
const store = useProductionStore();

const estacaoId = computed(() => route.params.estacaoId || '');

// Relógio
const currentTime = ref('');
let clockInterval = null;
onMounted(async () => {
  const tick = () => { currentTime.value = new Date().toLocaleTimeString('pt-BR'); };
  tick();
  clockInterval = setInterval(tick, 1000);

  // Carrega máquinas para mostrar o nome real: GET /machines
  if (!store.machines.length) await store.fetchMachines();
  await Promise.all([store.fetchProducts(), store.fetchLots(), store.fetchSessions()]);

  // Seleciona máquina pelo param da rota
  if (estacaoId.value) {
    const found = store.machines.find((m) => m.id === estacaoId.value || m.code === estacaoId.value);
    if (found) store.selectStation(found.id);
  }
});
onUnmounted(() => clearInterval(clockInterval));

const currentMachine = computed(() => store.selectedMachine);
// Número de exibição da máquina — extrai o dígito do code (ex.: "MQ-02" → 2).
// parseInt(code, 10) sozinho sempre dava NaN (code começa com letra "MQ-").
const getMachineNumber = (m) => {
  const idx = store.machines.findIndex((item) => item.id === m.id);
  const match = m.code?.match(/\d+/);
  return match ? parseInt(match[0], 10) : (idx >= 0 ? idx + 1 : 1);
};
const currentMachineDisplayName = computed(() => {
  if (!currentMachine.value) return '—';
  return `Máquina ${getMachineNumber(currentMachine.value)}`;
});
const showLotForm = ref(false);
const creatingLot = ref(false);
const lotCreateError = ref('');
const lotForm = reactive({ machine_id: '', product_id: '', code: '' });

// Sessão ativa real da máquina selecionada (derivada de GET /production-sessions,
// não de store.activeSession — que só é preenchido pelo fluxo do Totem)
const selectedSession = computed(() => store.sessions.find(
  (session) => session.machine_id === currentMachine.value?.id && session.status === 'active',
) || null);

// Lote ativo: vem da sessão ativa (API) ou placeholder
const activeLotCode = computed(() => selectedSession.value?.lot?.code || null);

// Modo edição
const isEditing = ref(false);
const loteEditValue = ref('');
const saving = ref(false);
const saveError = ref('');

const startEdit = () => {
  saveError.value = '';
  loteEditValue.value = activeLotCode.value || '';
  isEditing.value = true;
};

const cancelEdit = () => { isEditing.value = false; };

// PATCH /totem/sessions/current/lot → PostgreSQL
const saveLote = async () => {
  if (!loteEditValue.value.trim()) return;
  if (!currentMachine.value) return;

  saving.value = true;
  saveError.value = '';
  try {
    await store.changeLot({
      machine_id: currentMachine.value.id,
      lot_code: loteEditValue.value.trim().toUpperCase(),
    });
    await store.fetchSessions();
    isEditing.value = false;
  } catch (err) {
    saveError.value = err.message || 'Erro ao salvar lote.';
  } finally {
    saving.value = false;
  }
};

const goBack = () => router.back();

const createLot = async () => {
  lotCreateError.value = '';
  if (!lotForm.machine_id || !lotForm.product_id || !lotForm.code) {
    lotCreateError.value = 'Escolha máquina e produto e informe o código do lote.';
    return;
  }
  creatingLot.value = true;
  try {
    await store.createLot({ ...lotForm, code: lotForm.code.toUpperCase() });
    store.selectStation(lotForm.machine_id);
    lotForm.code = '';
    showLotForm.value = false;
  } catch (err) {
    lotCreateError.value = err.message || 'Não foi possível salvar o lote.';
  } finally {
    creatingLot.value = false;
  }
};
</script>

<style scoped>
.edit-actions-enter-active, .edit-actions-leave-active { transition: opacity 0.15s, transform 0.15s; }
.edit-actions-enter-from, .edit-actions-leave-to { opacity: 0; transform: translateY(8px); }
</style>
