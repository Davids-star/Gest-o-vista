<template>
  <div ref="chartRef" class="w-full" :style="{ height: containerHeight }"></div>
</template>

<script setup>
// Legenda vertical à direita (pensada pra tela larga) sobrepunha o gráfico
// em containers estreitos (celular, ou qualquer coluna menor). Decide o
// layout pela largura real do container (não do viewport — mais correto
// se um dia este gráfico ficar numa coluna estreita mesmo no desktop).
import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
});

const LARGURA_ESTREITA = 420;

const chartRef = ref(null);
const containerHeight = ref('16rem');
let chartInstance = null;

const initChart = () => {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value, 'dark');
  updateChart();
};

const updateChart = () => {
  if (!chartInstance || !chartRef.value) return;

  const safeData = Array.isArray(props.data) ? props.data : [];
  const pieData = safeData.map((item) => ({
    name: `${item.name || 'Outros'} ${item.value || 0}%`,
    value: item.value || 0,
    itemStyle: { color: item.color || '#3b82f6' },
  }));

  const estreito = chartRef.value.clientWidth < LARGURA_ESTREITA;
  const alturaMudou = containerHeight.value !== (estreito ? '22rem' : '16rem');
  containerHeight.value = estreito ? '22rem' : '16rem';
  // A mudança de altura só reflete no DOM no próximo tick — resize() antes
  // disso redimensiona o canvas pro tamanho antigo.
  if (alturaMudou) nextTick(() => chartInstance?.resize());

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#ffffff' },
      formatter: '{b}: {c}%',
    },
    legend: estreito
      ? {
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemGap: 10,
        textStyle: { color: '#94a3b8', fontSize: 11 },
      }
      : {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 12 },
      },
    series: [
      {
        name: 'Distribuição do Tempo',
        type: 'pie',
        radius: estreito ? ['38%', '62%'] : ['45%', '75%'],
        center: estreito ? ['50%', '38%'] : ['35%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
        },
        data: pieData,
      },
    ],
  };

  chartInstance.setOption(option, true);
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
  if (!chartInstance) return;
  updateChart(); // reavalia estreito/largo, não só redimensiona
  chartInstance.resize();
};

watch(() => props.data, updateChart, { deep: true });
</script>
