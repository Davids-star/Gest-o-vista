<template>
  <div class="min-h-screen bg-[#0b0f17] text-white font-sans flex select-none">
    <AppSidebar />

    <main class="flex-1 p-4 pt-[calc(4rem+env(safe-area-inset-top))] md:p-6 md:pt-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white">METAS DE PRODUÇÃO</h1>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
            Metas salvas no banco — clique em uma máquina para definir ou editar
          </p>
        </div>

        <button
          v-if="isSupervisor"
          @click="openNewMetaModal()"
          class="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 self-start sm:self-auto"
        >
          + NOVA META
        </button>
      </div>

      <!-- Loading -->
      <div v-if="store.loading.metas" class="space-y-4">
        <div v-for="i in 3" :key="i" class="dark-panel p-6 animate-pulse">
          <div class="h-4 bg-slate-800 rounded w-1/4 mb-3"></div>
          <div class="h-3 bg-slate-800 rounded w-1/2"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!store.metas.length" class="dark-panel p-8 sm:p-12 text-center space-y-4">
        <div class="text-4xl">🎯</div>
        <p class="text-slate-300 font-bold text-lg">Nenhuma meta cadastrada ainda</p>
        <p class="text-slate-400 text-sm max-w-md mx-auto">
          Clique em <strong class="text-emerald-400">+ NOVA META</strong> para criar a primeira meta de produção.
          As metas são salvas no banco e calculadas automaticamente para semanal e diária.
        </p>
      </div>

      <!-- Metas da API (GET /metas) -->
      <div v-else class="space-y-4 md:space-y-6">
        <div
          v-for="meta in store.metas"
          :key="meta.id"
          class="dark-panel p-4 sm:p-6 space-y-4 transition-all"
          :class="isSupervisor ? 'hover:border-emerald-500/50 cursor-pointer' : ''"
          @click="isSupervisor && openEditMetaModal(meta)"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3 sm:gap-4">
              <span class="w-10 h-10 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-extrabold text-base shrink-0">
                {{ getMachineNumber(meta.machine_id) }}
              </span>
              <div>
                <h3 class="text-base font-extrabold uppercase tracking-wider text-white flex flex-wrap items-center gap-2 sm:gap-3">
                  Máquina {{ getMachineNumber(meta.machine_id) }}
                  <span v-if="meta.product" class="text-xs font-mono font-normal text-slate-400">
                    ({{ meta.product.name }})
                  </span>
                </h3>
                <span class="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  {{ meta.period_type === 'monthly' ? 'META MENSAL' : meta.period_type === 'weekly' ? 'META SEMANAL' : 'META DIÁRIA' }}
                  — {{ formatDate(meta.period_start) }} até {{ formatDate(meta.period_end) }}
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between sm:justify-end gap-4">
              <div class="flex items-baseline gap-2">
                <span class="text-xl sm:text-2xl font-black font-mono text-emerald-400">{{ meta.quantity.toLocaleString('pt-BR') }}</span>
                <span class="text-xs font-bold text-slate-400 uppercase">unidades</span>
              </div>
              <button
                v-if="isSupervisor"
                @click.stop="openEditMetaModal(meta)"
                class="px-3 sm:px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 font-bold rounded-lg text-xs uppercase tracking-wider transition-all"
              >
                EDITAR ✏️
              </button>
            </div>
          </div>

          <!-- Desdobramento calculado -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <div>
              <span class="text-slate-400 block">Mensal:</span>
              <span class="font-mono font-bold text-white">
                {{ meta.period_type === 'monthly' ? meta.quantity.toLocaleString('pt-BR') : Math.round(meta.quantity * 4).toLocaleString('pt-BR') }} un.
              </span>
            </div>
            <div>
              <span class="text-slate-400 block">Semanal (calc.):</span>
              <span class="font-mono font-bold text-white">
                {{ meta.period_type === 'monthly' ? Math.round(meta.quantity / 4).toLocaleString('pt-BR') : meta.quantity.toLocaleString('pt-BR') }} un.
              </span>
            </div>
            <div>
              <span class="text-slate-400 block">Diária (calc.):</span>
              <span class="font-mono font-bold text-emerald-400">
                {{ meta.period_type === 'monthly' ? Math.round(meta.quantity / 20).toLocaleString('pt-BR') : Math.round(meta.quantity / 5).toLocaleString('pt-BR') }} un.
              </span>
            </div>
          </div>

          <!-- Nota sobre progresso real -->
          <p class="text-[10px] text-slate-500 uppercase tracking-wider">
            ⏳ O progresso será exibido conforme os eventos de produção forem registrados.
          </p>
        </div>
      </div>
    </main>

    <!-- Modal Nova/Editar Meta -->
    <div
      v-if="isMetaModalOpen"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div class="dark-panel w-full max-w-lg p-5 sm:p-6 space-y-4 sm:space-y-5 border border-emerald-500/40 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 class="text-base font-bold text-white uppercase flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-emerald-400"></span>
            {{ editingMeta ? 'EDITAR META' : 'NOVA META DE PRODUÇÃO' }}
          </h3>
          <button @click="isMetaModalOpen = false" class="text-slate-400 hover:text-white text-xl">&times;</button>
        </div>

        <div class="space-y-4">
          <!-- Máquina -->
          <div>
            <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Máquina *</label>
            <select
              v-model="metaForm.machine_id"
              class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="" disabled>Selecione uma máquina...</option>
              <option v-for="(m, idx) in store.machines" :key="m.id" :value="m.id">
                Máquina {{ (m.code && parseInt(m.code, 10) < 100) ? parseInt(m.code, 10) : (idx + 1) }}
              </option>
            </select>
          </div>

          <!-- Produto (opcional) -->
          <div>
            <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Produto (opcional)</label>
            <select
              v-model="metaForm.product_id"
              class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Nenhum produto específico</option>
              <option v-for="p in store.products" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.sku || p.code || '—' }})
              </option>
            </select>
          </div>

          <!-- Tipo de período -->
          <div>
            <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Tipo de Meta *</label>
            <select
              v-model="metaForm.period_type"
              class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="daily">Diária</option>
            </select>
          </div>

          <!-- Quantidade -->
          <div>
            <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Quantidade (Unidades) *</label>
            <input
              v-model.number="metaForm.quantity"
              type="number"
              min="1"
              step="100"
              class="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-lg rounded-lg p-3 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <!-- Período Início e Fim -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Data Início *</label>
              <input
                v-model="metaForm.period_start"
                type="text"
                inputmode="numeric"
                placeholder="AAAA-MM-DD"
                maxlength="10"
                class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Data Fim *</label>
              <input
                v-model="metaForm.period_end"
                type="text"
                inputmode="numeric"
                placeholder="AAAA-MM-DD"
                maxlength="10"
                class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <!-- Desdobramento calculado em tempo real -->
          <div v-if="metaForm.quantity && metaForm.period_type === 'monthly'" class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span class="text-slate-400 block">Semanal calculado:</span>
              <span class="font-mono font-bold text-white">{{ Math.round(metaForm.quantity / 4).toLocaleString('pt-BR') }} un.</span>
            </div>
            <div>
              <span class="text-slate-400 block">Diária calculada:</span>
              <span class="font-mono font-bold text-emerald-400">{{ Math.round(metaForm.quantity / 20).toLocaleString('pt-BR') }} un.</span>
            </div>
          </div>

          <!-- Erro -->
          <div v-if="metaError" class="text-red-400 text-xs font-semibold">⚠ {{ metaError }}</div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            @click="isMetaModalOpen = false"
            class="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 uppercase"
          >
            CANCELAR
          </button>
          <button
            @click="handleSaveMeta"
            :disabled="savingMeta"
            class="px-6 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-emerald-400 shadow-md shadow-emerald-500/20 uppercase disabled:opacity-50"
          >
            {{ savingMeta ? 'SALVANDO...' : (editingMeta ? 'ATUALIZAR META' : 'SALVAR META') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { useProductionStore } from '../../stores/productionStore';
import { useAuth } from '../../composables/useAuth';
import AppSidebar from '../../components/AppSidebar.vue';

const store = useProductionStore();
const { isSupervisor, user } = useAuth();

const isMetaModalOpen = ref(false);
const editingMeta = ref(null);
const savingMeta = ref(false);
const metaError = ref('');

// Sem valores fictícios: quantidade e máquina começam vazias — quem digita
// o número real é o supervisor, o sistema não sugere um valor de exemplo.
const metaForm = reactive({
  machine_id: '',
  product_id: '',
  period_type: 'monthly',
  period_start: new Date().toISOString().slice(0, 10),
  period_end: '',
  quantity: null,
});

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const getMachineNumber = (machineId) => {
  const idx = store.machines.findIndex((m) => m.id === machineId);
  if (idx < 0) return '—';
  const m = store.machines[idx];
  return (m.code && parseInt(m.code, 10) < 100) ? parseInt(m.code, 10) : (idx + 1);
};

onMounted(async () => {
  await Promise.allSettled([
    store.fetchMetas(),
    store.fetchMachines(),
    store.fetchProducts(),
  ]);
  // Sem isso, a lista de metas só se atualizava com F5 — outra tela editando
  // uma meta (ou fechando a sessão de polling global ao navegar) nunca
  // chegava aqui. Mesmo padrão de Dashboard/EstacoesView/TvView.
  store.startPolling(6000);
});

onBeforeUnmount(() => {
  store.stopPolling();
});

const openNewMetaModal = () => {
  editingMeta.value = null;
  metaError.value = '';
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  Object.assign(metaForm, {
    // Sem pré-seleção de máquina nem quantidade de exemplo — o supervisor
    // escolhe e digita os valores reais (nada fictício é salvo por engano).
    machine_id: '',
    product_id: '',
    period_type: 'monthly',
    period_start: startDate,
    period_end: endDate,
    quantity: null,
  });
  isMetaModalOpen.value = true;
};

const openEditMetaModal = (meta) => {
  editingMeta.value = meta;
  metaError.value = '';
  Object.assign(metaForm, {
    machine_id: meta.machine_id,
    product_id: meta.product_id || '',
    period_type: meta.period_type,
    period_start: meta.period_start,
    period_end: meta.period_end,
    quantity: meta.quantity,
  });
  isMetaModalOpen.value = true;
};

// Salva meta → POST /metas ou PATCH /metas/:id → PostgreSQL
const handleSaveMeta = async () => {
  metaError.value = '';
  if (!metaForm.machine_id) { metaError.value = 'Selecione uma máquina.'; return; }
  if (!metaForm.quantity || metaForm.quantity < 1) { metaError.value = 'Quantidade inválida.'; return; }
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDate.test(metaForm.period_start) || Number.isNaN(Date.parse(`${metaForm.period_start}T00:00:00`))) {
    metaError.value = 'Informe a data de início no formato AAAA-MM-DD.'; return;
  }
  if (!isoDate.test(metaForm.period_end) || Number.isNaN(Date.parse(`${metaForm.period_end}T00:00:00`))) {
    metaError.value = 'Informe a data de fim no formato AAAA-MM-DD.'; return;
  }
  if (metaForm.period_end < metaForm.period_start) { metaError.value = 'A data final não pode ser anterior à inicial.'; return; }

  savingMeta.value = true;
  try {
    const payload = {
      machine_id: metaForm.machine_id,
      // null (não undefined!) — undefined some no JSON.stringify e o PATCH
      // nunca chega a limpar um product_id que já existia na meta.
      product_id: metaForm.product_id || null,
      period_type: metaForm.period_type,
      period_start: metaForm.period_start,
      period_end: metaForm.period_end,
      quantity: metaForm.quantity,
      // company_id e created_by vêm do contexto do JWT no backend
      company_id: user.value?.company_id,
      created_by: user.value?.id,
    };

    if (editingMeta.value) {
      await store.updateMeta(editingMeta.value.id, payload);
    } else {
      await store.createMeta(payload);
    }
    isMetaModalOpen.value = false;
  } catch (err) {
    metaError.value = err.message || 'Erro ao salvar meta. Verifique os dados.';
  } finally {
    savingMeta.value = false;
  }
};
</script>
