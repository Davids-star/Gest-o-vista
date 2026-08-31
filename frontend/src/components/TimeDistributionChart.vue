<template>
  <div ref="chartRef" class="w-full h-64"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
});

const chartRef = ref(null);
let chartInstance = null;

const initChart = () => {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value, 'dark');
  updateChart();
};

const updateChart = () => {
  if (!chartInstance) return;

  const safeData = Array.isArray(props.data) ? props.data : [];
  const pieData = safeData.map((item) => ({
    name: `${item.name || 'Outros'} ${item.value || 0}%`,
    value: item.value || 0,
    itemStyle: { color: item.color || '#3b82f6' },
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#ffffff' },
      formatter: '{b}: {c}%',
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#94a3b8', fontSize: 12 },
    },
    series: [
      {
        name: 'Distribuição do Tempo',
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
        },
        data: pieData,
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
