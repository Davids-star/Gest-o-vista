<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="dark-panel w-full max-w-xl p-8 space-y-8 border border-emerald-500/40 relative shadow-2xl">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 class="text-xs uppercase text-slate-400 font-semibold tracking-wider">LOTE</h3>
            <p class="text-base text-white font-bold">Estação de trabalho {{ stationCode }}</p>
          </div>
        </div>

        <div class="bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-800 text-slate-300 font-mono text-sm flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ currentTime }}
        </div>
      </div>

      <!-- Main Edit Box -->
      <div class="border border-slate-700/60 rounded-xl p-8 bg-slate-900/40 text-center space-y-6">
        <div v-if="!isEditing" class="text-4xl font-extrabold text-emerald-400 tracking-widest font-mono bg-slate-800/60 py-4 px-6 rounded-lg border border-emerald-500/20 inline-block w-full max-w-sm">
          {{ lotCode }}
        </div>
        <div v-else class="w-full max-w-sm mx-auto">
          <input
            v-model="editedLotCode"
            type="text"
            autofocus
            @keyup.enter="handleSave"
            placeholder="Digite o novo código do lote"
            class="w-full text-center text-3xl font-extrabold text-emerald-400 tracking-widest font-mono bg-slate-950 border-2 border-emerald-500 py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 uppercase"
          />
        </div>

        <div class="flex justify-center gap-4">
          <button
            v-if="!isEditing"
            @click="isEditing = true"
            class="px-8 py-2.5 bg-slate-200 hover:bg-white text-slate-900 font-bold rounded-lg uppercase tracking-wider text-sm transition-all shadow-md"
          >
            EDITAR
          </button>
          <button
            v-else
            @click="isEditing = false"
            class="px-8 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg uppercase tracking-wider text-sm transition-all"
          >
            CANCELAR
          </button>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-between pt-4">
        <button
          @click="$emit('close')"
          class="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg uppercase tracking-wider text-sm transition-all"
        >
          VOLTAR
        </button>

        <button
          @click="handleSave"
          class="px-10 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-lg uppercase tracking-wider text-sm shadow-lg shadow-emerald-500/20 transition-all"
        >
          SALVAR LOTE
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  lotCode: String,
  stationCode: String,
});

const emit = defineEmits(['close', 'save']);

const editedLotCode = ref('');
const isEditing = ref(true);
const currentTime = ref('');

let clockInterval = null;

const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString();
};

watch(
  () => [props.lotCode, props.isOpen],
  ([newLot, open]) => {
    if (open) {
      editedLotCode.value = newLot || '';
      isEditing.value = true;
    }
  },
  { immediate: true },
);

onMounted(() => {
  updateTime();
  clockInterval = setInterval(updateTime, 1000);
});

onBeforeUnmount(() => {
  if (clockInterval) clearInterval(clockInterval);
});

const handleSave = () => {
  emit('save', editedLotCode.value);
  isEditing.value = false;
  emit('close');
};
</script>
