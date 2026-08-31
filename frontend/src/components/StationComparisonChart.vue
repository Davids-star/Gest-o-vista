<template>
  <div ref="chartRef" class="w-full h-48"></div>
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
  const stations = safeData.map((item) => item.name || '');
  const efficiencies = safeData.map((item) => item.efficiency || 0);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#ffffff' },
      formatter: '{b}: {c}%',
    },
    grid: {
      left: '10%',
      right: '4%',
      bottom: '15%',
      top: '10%',
    },
    xAxis: {
      type: 'category',
      data: stations,
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: 'Eficiência',
        type: 'bar',
        barWidth: '40%',
        data: efficiencies,
        itemStyle: {
          color: '#22c55e',
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
