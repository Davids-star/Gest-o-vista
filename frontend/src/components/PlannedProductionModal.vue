<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
    <div class="dark-panel w-full max-w-lg p-5 sm:p-6 space-y-4 sm:space-y-5 border border-emerald-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center border-b border-slate-800 pb-3">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
          PRÓXIMA PRODUÇÃO — {{ stationCode }}
        </h3>
        <button @click="$emit('close')" class="text-slate-400 hover:text-white text-xl">&times;</button>
      </div>

      <p class="text-xs text-slate-400">
        Define o que essa máquina vai produzir assim que uma nova sessão for iniciada no Totem —
        fica valendo até você trocar. Só é possível enquanto a máquina não tem sessão ativa.
      </p>

      <div class="space-y-4">
        <div>
          <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Produto</label>
          <select
            v-model="productId"
            class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-emerald-500 focus:outline-none text-sm"
          >
            <option value="">Sem produto definido</option>
            <option v-for="product in store.products" :key="product.id" :value="product.id">{{ product.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Lote</label>
          <input
            v-model.trim="lotCode"
            class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-emerald-500 focus:outline-none text-sm"
            placeholder="Código do lote (opcional)"
            maxlength="120"
          >
        </div>

        <p v-if="errorMsg" class="text-xs text-red-400 font-semibold">⚠ {{ errorMsg }}</p>
      </div>

      <div class="flex justify-between gap-3 pt-2">
        <button
          @click="handleClear"
          :disabled="saving"
          class="px-4 py-2.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold hover:bg-slate-700 uppercase disabled:opacity-40"
        >
          LIMPAR
        </button>
        <div class="flex gap-3">
          <button
            @click="$emit('close')"
            class="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 uppercase"
          >
            CANCELAR
          </button>
          <button
            @click="handleSave"
            :disabled="saving"
            class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase shadow-md shadow-emerald-600/20 disabled:opacity-40"
          >
            {{ saving ? 'SALVANDO...' : 'SALVAR' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useProductionStore } from '../stores/productionStore';

const props = defineProps({
  isOpen: Boolean,
  stationCode: String,
  machineId: String,
  initialProductId: { type: String, default: '' },
  initialLotCode: { type: String, default: '' },
});
const emit = defineEmits(['close', 'saved']);
const store = useProductionStore();

const productId = ref('');
const lotCode = ref('');
const saving = ref(false);
const errorMsg = ref('');

watch(() => props.isOpen, (open) => {
  if (open) {
    productId.value = props.initialProductId || '';
    lotCode.value = props.initialLotCode || '';
    errorMsg.value = '';
    if (!store.products.length) store.fetchProducts();
  }
});

const save = async (payload) => {
  errorMsg.value = '';
  saving.value = true;
  try {
    await store.setPlannedProduction(props.machineId, payload);
    emit('saved');
    emit('close');
  } catch (err) {
    errorMsg.value = err.message || 'Erro ao salvar próxima produção';
  } finally {
    saving.value = false;
  }
};

const handleSave = () => save({
  product_id: productId.value || null,
  lot_code: lotCode.value || null,
});

const handleClear = () => save({ product_id: null, lot_code: null });
</script>
