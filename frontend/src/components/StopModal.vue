<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
    <div class="dark-panel w-full max-w-lg p-5 sm:p-6 space-y-4 sm:space-y-5 border border-red-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center border-b border-slate-800 pb-3">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-red-500"></span>
          REGISTRAR NOVA PARADA
        </h3>
        <button @click="$emit('close')" class="text-slate-400 hover:text-white text-xl">&times;</button>
      </div>

      <!-- Loading motivos -->
      <div v-if="store.loading.stopReasons" class="text-slate-400 text-sm text-center py-4">
        Carregando motivos de parada...
      </div>

      <!-- Sem motivos cadastrados -->
      <div v-else-if="!store.stopReasons.length" class="text-center py-4 space-y-2">
        <p class="text-slate-400 text-sm">Nenhum motivo de parada cadastrado.</p>
        <p class="text-xs text-slate-500">Cadastre motivos via <code class="text-emerald-400">POST /motivos-parada</code></p>
      </div>

      <!-- Formulário com dados reais -->
      <div v-else class="space-y-4">
        <div>
          <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Motivo da Parada *</label>
          <select
            v-model="selectedReasonId"
            class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-emerald-500 focus:outline-none text-sm"
          >
            <option value="" disabled>Selecione um motivo...</option>
            <option v-for="reason in store.stopReasons" :key="reason.id" :value="reason.id">
              {{ reason.label || reason.name }}
              <template v-if="reason.code"> — {{ reason.code }}</template>
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Observação / Detalhes</label>
          <textarea
            v-model="obs"
            rows="3"
            placeholder="Descreva o ocorrido..."
            class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-emerald-500 focus:outline-none text-sm resize-none"
          ></textarea>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-2">
        <button
          @click="$emit('close')"
          class="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 uppercase"
        >
          CANCELAR
        </button>
        <button
          v-if="store.stopReasons.length"
          @click="handleSave"
          :disabled="!selectedReasonId"
          class="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs uppercase shadow-md shadow-red-600/20 disabled:opacity-40"
        >
          CONFIRMAR PARADA
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useProductionStore } from '../stores/productionStore';

defineProps({ isOpen: Boolean });
const emit = defineEmits(['close', 'save']);
const store = useProductionStore();

const selectedReasonId = ref('');
const obs = ref('');

// Carrega motivos reais da API ao abrir
watch(
  () => store.stopReasons.length,
  (len) => { if (!len) store.fetchStopReasons(); },
  { immediate: true }
);

const handleSave = () => {
  const reasonObj = store.stopReasons.find((r) => r.id === selectedReasonId.value);
  emit('save', {
    reason_id: selectedReasonId.value,
    observation: obs.value,
  });
  selectedReasonId.value = '';
  obs.value = '';
};
</script>
