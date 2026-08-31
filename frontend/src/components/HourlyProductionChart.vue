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
  const hours = safeData.map((item) => item.hour || '');
  const amounts = safeData.map((item) => item.amount || 0);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#ffffff' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: hours,
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#475569' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#94a3b8' },
    },
    series: [
      {
        name: 'Produção',
        type: 'bar',
        barWidth: '50%',
        data: amounts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#22c55e' },
            { offset: 1, color: '#15803d' },
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
