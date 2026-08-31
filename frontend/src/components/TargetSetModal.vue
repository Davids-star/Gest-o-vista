<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="dark-panel w-full max-w-lg p-6 space-y-6 border border-emerald-500/40 shadow-2xl">
      <div class="flex justify-between items-center border-b border-slate-800 pb-3">
        <h3 class="text-base font-bold text-white uppercase flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-emerald-400"></span>
          DEFINIR METAS & CONFIGURAÇÃO — {{ machineName }}
        </h3>
        <button @click="$emit('close')" class="text-slate-400 hover:text-white text-xl">&times;</button>
      </div>

      <div class="space-y-4">
        <!-- Meta Mensal Input -->
        <div>
          <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Meta Mensal (Unidades)</label>
          <input
            v-model.number="targetMonthly"
            type="number"
            min="100"
            step="500"
            class="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-lg rounded-lg p-3 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <!-- Calculated Weekly & Daily Targets -->
        <div class="grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div>
            <span class="text-[11px] text-slate-400 font-semibold block uppercase">Meta Semanal (Calculada)</span>
            <span class="text-base font-mono font-bold text-white">{{ calculatedWeekly }} un/semana</span>
          </div>

          <div>
            <span class="text-[11px] text-slate-400 font-semibold block uppercase">Meta Diária (Calculada)</span>
            <span class="text-base font-mono font-bold text-emerald-400">{{ calculatedDaily }} un/dia</span>
          </div>
        </div>

        <div>
          <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Produto a Produzir</label>
          <input
            v-model="product"
            type="text"
            placeholder="Ex: Bolacha, Chocolate..."
            class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-emerald-500 focus:outline-none font-semibold"
          />
        </div>

        <div>
          <label class="block text-xs uppercase text-slate-400 font-semibold mb-1">Código do Lote</label>
          <input
            v-model="lot"
            type="text"
            placeholder="Ex: G0227B"
            class="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold rounded-lg p-3 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button
          @click="$emit('close')"
          class="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700 uppercase"
        >
          CANCELAR
        </button>
        <button
          @click="handleSave"
          class="px-6 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-emerald-400 shadow-md shadow-emerald-500/20 uppercase"
        >
          SALVAR CONFIGURAÇÃO DE META
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  stationId: String,
  machineName: String,
  initialTargetMonthly: Number,
  initialProduct: String,
  initialLot: String,
});

const emit = defineEmits(['close', 'save']);

const targetMonthly = ref(10000);
const product = ref('');
const lot = ref('');

const calculatedWeekly = computed(() => Math.round((targetMonthly.value || 0) / 4));
const calculatedDaily = computed(() => Math.round((targetMonthly.value || 0) / 20));

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      targetMonthly.value = props.initialTargetMonthly || 10000;
      product.value = props.initialProduct || 'Bolacha';
      lot.value = props.initialLot || 'G0227B';
    }
  },
);

const handleSave = () => {
  emit('save', {
    targetMonthly: targetMonthly.value,
    product: product.value,
    lot: lot.value,
  });
  emit('close');
};
</script>
