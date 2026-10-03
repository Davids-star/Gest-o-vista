<template>
  <div class="overflow-x-auto">
    <table class="w-full text-[11px] font-mono border-collapse">
      <thead>
        <tr>
          <th class="sticky left-0 bg-white dark:bg-[#121824] text-left pb-2 pr-3 text-slate-500 dark:text-slate-400 uppercase text-[9px] font-sans font-bold whitespace-nowrap">
            Máquina
          </th>
          <th
            v-for="col in columns"
            :key="col.key"
            class="text-right pb-2 px-2 text-slate-500 dark:text-slate-400 uppercase text-[9px] font-sans font-bold whitespace-nowrap"
          >
            {{ col.label }}
          </th>
          <th class="text-right pb-2 pl-2 text-slate-700 dark:text-slate-300 uppercase text-[9px] font-sans font-black whitespace-nowrap">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length">
          <td :colspan="columns.length + 2" class="text-center py-6 text-slate-400 font-sans">
            Nenhum dado para este período.
          </td>
        </tr>
        <tr v-for="row in rows" :key="row.label" class="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
          <td class="sticky left-0 bg-white dark:bg-[#121824] py-1.5 pr-3 font-sans font-bold text-slate-900 dark:text-white whitespace-nowrap">
            {{ row.label }}
          </td>
          <td
            v-for="col in columns"
            :key="col.key"
            class="text-right py-1.5 px-2"
            :class="(row.cells[col.key] || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-300 dark:text-slate-600'"
          >
            {{ (row.cells[col.key] || 0).toLocaleString('pt-BR') }}
          </td>
          <td class="text-right py-1.5 pl-2 font-bold text-slate-900 dark:text-white">
            {{ rowTotal(row).toLocaleString('pt-BR') }}
          </td>
        </tr>
      </tbody>
      <tfoot v-if="rows.length > 1">
        <tr class="border-t-2 border-slate-200 dark:border-slate-800">
          <td class="sticky left-0 bg-white dark:bg-[#121824] py-1.5 pr-3 font-sans font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">Total</td>
          <td v-for="col in columns" :key="col.key" class="text-right py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">
            {{ columnTotal(col.key).toLocaleString('pt-BR') }}
          </td>
          <td class="text-right py-1.5 pl-2 font-black text-slate-900 dark:text-white">
            {{ grandTotal.toLocaleString('pt-BR') }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup>
// Tabela comparativa por máquina — usada tanto hora×máquina (Dia) quanto
// dia×máquina (Semana/Mês); só troca o que é passado em `columns`/`rows`.
// HTML puro (não gráfico) porque o pedido explícito foi "tabela".
import { computed } from 'vue';

const props = defineProps({
  columns: { type: Array, default: () => [] }, // [{ key, label }]
  rows: { type: Array, default: () => [] }, // [{ label, cells: { [key]: valor } }]
});

const rowTotal = (row) => props.columns.reduce((a, c) => a + (row.cells[c.key] || 0), 0);
const columnTotal = (key) => props.rows.reduce((a, r) => a + (r.cells[key] || 0), 0);
const grandTotal = computed(() => props.rows.reduce((a, r) => a + rowTotal(r), 0));
</script>
