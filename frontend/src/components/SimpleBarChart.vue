<template>
  <div ref="chartRef" class="w-full h-64"></div>
</template>

<script setup>
// Gráfico de barras genérico (nome × valor), eixo livre — diferente de
// StationComparisonChart.vue, que é fixo em 0-100% (eficiência), incompatível
// com contagens brutas de produção ou segundos parados. Usado no Resumo
// Mensal pra produção por dia/máquina/turno e tempo parado por máquina,
// só trocando os dados e a cor via prop. Mesmo esqueleto ECharts (dark
// theme, resize listener) de HourlyProductionChart.vue/TimeDistributionChart.vue.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import echarts from '../echarts-setup';

const props = defineProps({
  data: {
    type: Array, // [{ name: String, value: Number }]
    default: () => [],
  },
  colorFrom: { type: String, default: '#22c55e' },
  colorTo: { type: String, default: '#15803d' },
  unidade: { type: String, default: '' }, // sufixo no tooltip, ex.: "peças", "s"
});

const chartRef = ref(null);
let chartInstance = null;

const initChart = () => {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value);
  updateChart();
};

const updateChart = () => {
  if (!chartInstance) return;

  const safeData = Array.isArray(props.data) ? props.data : [];
  const nomes = safeData.map((item) => item.name || '');
  const valores = safeData.map((item) => item.value || 0);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      textStyle: { color: '#0f172a' },
      valueFormatter: (v) => `${Number(v).toLocaleString('pt-BR')}${props.unidade ? ' ' + props.unidade : ''}`,
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: nomes,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#64748b' },
    },
    series: [
      {
        type: 'bar',
        barWidth: '50%',
        data: valores,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: props.colorFrom },
            { offset: 1, color: props.colorTo },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  chartInstance.setOption(option);
};

onMounted(() => {
  initChart();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (chartInstance) chartInstance.dispose();
});

const handleResize = () => {
  if (chartInstance) chartInstance.resize();
};

watch(() => props.data, updateChart, { deep: true });
</script>
