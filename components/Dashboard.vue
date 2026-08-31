<script setup>
import { ref, computed } from 'vue'

// Importações do Chart.js e vue-chartjs
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

// ==========================================
// MOCK DATA & STATE (INTEGRAÇÃO FUTURA)
// ==========================================
// TODO: buscar métricas gerais do dashboard via API GET /admin/dashboard/estats

const selectedShift = ref('Manhã')
const selectedStationId = ref(1)

// 4 Estações de Trabalho (Estação 3 em atenção/âmbar)
const stations = ref([
  { id: 1, operator: 'OPERADOR 01', station: 'ESTAÇÃO 01', status: 'ONLINE', isSelected: true, borderClass: 'border-2 border-[#22ff88] shadow-[0_0_15px_rgba(34,255,136,0.25)] card-tech-l' },
  { id: 2, operator: 'OPERADOR 02', station: 'ESTAÇÃO 02', status: 'ONLINE', isSelected: false, borderClass: 'border-[#1f2937]' },
  { id: 3, operator: 'OPERADOR 03', station: 'ESTAÇÃO 03', status: 'ATENÇÃO', isSelected: false, borderClass: 'border-2 border-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.25)]' }, // Borda Laranja / Âmbar
  { id: 4, operator: 'OPERADOR 04', station: 'ESTAÇÃO 04', status: 'ONLINE', isSelected: false, borderClass: 'border-[#1f2937]' },
])

const selectStation = (id) => {
  selectedStationId.value = id
  stations.value.forEach(s => {
    s.isSelected = (s.id === id)
  })
  // TODO: GET /admin/dashboard/estacao/:id
}

const currentStationLabel = computed(() => {
  const st = stations.value.find(s => s.id === selectedStationId.value)
  return st ? `${st.operator} - ${st.station}` : 'OPERADOR 01 - ESTAÇÃO 01'
})

// 4 Mini-cards de indicadores em linha
const miniCards = ref([
  {
    title: 'Produção Atual',
    number: '450',
    unit: 'unidades',
    subtext: 'de 900',
    numberColor: 'text-[#22ff88]'
  },
  {
    title: 'Eficiência',
    number: '88%',
    unit: '',
    subtext: 'tempo de produtividade: 04:05:22',
    numberColor: 'text-[#22ff88]'
  },
  {
    title: 'Metas Batidas',
    number: '92%',
    unit: '',
    subtext: 'de 100',
    numberColor: 'text-[#22ff88]'
  },
  {
    title: 'Tempo Parado',
    number: '00:42:15',
    unit: '',
    subtext: 'tempo total parado',
    numberColor: 'text-[#dc2626]' // Vermelho de perigo
  }
])

// ================= GRÁFICO DE BARRAS: Produção Hora a Hora =================
const barChartData = ref({
  labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
  datasets: [
    {
      label: 'Produção (unidades)',
      backgroundColor: '#22ff88',
      hoverBackgroundColor: '#1ce075',
      borderRadius: 4,
      data: [350, 420, 580, 640, 710, 520, 680, 750, 810, 890, 850]
    }
  ]
})

const barChartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#11161a',
      titleColor: '#22ff88',
      bodyColor: '#ffffff',
      borderColor: '#1f2937',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      grid: { color: '#1f2937' },
      ticks: { color: '#9ca3af', font: { family: 'monospace' } }
    },
    y: {
      min: 0,
      max: 900,
      grid: { color: '#1f2937' },
      ticks: { color: '#9ca3af', font: { family: 'monospace' }, stepSize: 150 }
    }
  }
})

// ================= GRÁFICO DE ROSCA (DONUT): Distribuição do Tempo =================
const doughnutChartData = ref({
  labels: ['Produzindo', 'Trocas', 'Paradas', 'Manutenção', 'Outros'],
  datasets: [
    {
      backgroundColor: ['#22ff88', '#facc15', '#dc2626', '#3b82f6', '#6b7280'],
      borderWidth: 2,
      borderColor: '#11161a',
      data: [120, 20, 15, 15, 10]
    }
  ]
})

const doughnutChartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#11161a',
      titleColor: '#22ff88',
      bodyColor: '#ffffff',
      borderColor: '#1f2937',
      borderWidth: 1
    }
  }
})

// Legenda lateral manual para o gráfico de rosca
const doughnutLegend = [
  { label: 'Produzindo', color: 'bg-[#22ff88]', value: '120 min' },
  { label: 'Trocas', color: 'bg-[#facc15]', value: '20 min' },
  { label: 'Paradas', color: 'bg-[#dc2626]', value: '15 min' },
  { label: 'Manutenção', color: 'bg-[#3b82f6]', value: '15 min' },
  { label: 'Outros', color: 'bg-[#6b7280]', value: '10 min' }
]

// ================= TABELA: Apontamentos e Eventos de Hoje =================
const eventosHoje = ref([
  { hora: '08:15', evento: 'Início de Produção', cod: 'E-01', descricao: 'Lote G0227B iniciado com sucesso', tempo: '00:00', operador: 'Carlos Silva' },
  { hora: '09:30', evento: 'Parada Solicitada', cod: 'P-02', descricao: 'Ajuste de molde e setup de lâmina', tempo: '00:15', operador: 'Carlos Silva' },
  { hora: '11:00', evento: 'Troca de Ferramenta', cod: 'T-01', descricao: 'Troca preventiva de broca #4', tempo: '00:20', operador: 'Carlos Silva' },
  { hora: '14:20', evento: 'Alerta de Qualidade', cod: 'A-05', descricao: 'Desvio de tolerância na peça #142', tempo: '00:05', operador: 'Carlos Silva' }
])

// ================= GRÁFICO COMPARATIVO DAS 4 ESTAÇÕES =================
const stationsBarData = ref({
  labels: ['ESTAÇÃO 01', 'ESTAÇÃO 02', 'ESTAÇÃO 03', 'ESTAÇÃO 04'],
  datasets: [
    {
      label: 'Eficiência (%)',
      backgroundColor: ['#22ff88', '#22ff88', '#f59e0b', '#22ff88'],
      borderRadius: 4,
      data: [88, 92, 65, 85]
    }
  ]
})

const stationsBarOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    x: {
      grid: { color: '#1f2937' },
      ticks: { color: '#9ca3af', font: { size: 10 } }
    },
    y: {
      min: 0,
      max: 100,
      grid: { color: '#1f2937' },
      ticks: { color: '#9ca3af', callback: (v) => `${v}%` }
    }
  }
})

// Tabela Comparativa de Estações
const comparativoEstacoes = ref([
  { estacao: 'Estação 01', producao: '450 un', meta: '500 un', eficiencia: '88%', status: 'Ativo', statusColor: 'bg-[#22ff88]/10 text-[#22ff88] border-[#22ff88]/30' },
  { estacao: 'Estação 02', producao: '480 un', meta: '500 un', eficiencia: '92%', status: 'Ativo', statusColor: 'bg-[#22ff88]/10 text-[#22ff88] border-[#22ff88]/30' },
  { estacao: 'Estação 03', producao: '290 un', meta: '500 un', eficiencia: '65%', status: 'Atenção', statusColor: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30' },
  { estacao: 'Estação 04', producao: '425 un', meta: '500 un', eficiencia: '85%', status: 'Ativo', statusColor: 'bg-[#22ff88]/10 text-[#22ff88] border-[#22ff88]/30' }
])

const emit = defineEmits(['navigate'])

const exportData = () => {
  alert('Exportando dados da produção em formato CSV/PDF...')
  // TODO: GET /admin/dashboard/exportar
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0e0d] text-white font-sans flex select-none">
    
    <!-- ================= SIDEBAR FIXA À ESQUERDA ================= -->
    <aside class="w-64 bg-[#0d1117] border-r border-[#1f2937] flex flex-col justify-between hidden md:flex shrink-0">
      <div>
        <div class="p-6 border-b border-[#1f2937] flex items-center gap-3">
          <div class="w-9 h-9 rounded border border-[#22ff88]/50 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center font-bold">
            ⚡
          </div>
          <div>
            <div class="text-xs font-bold text-[#22ff88] tracking-widest uppercase">ADMIN</div>
            <div class="text-sm font-extrabold text-white tracking-wider uppercase">Painel Supervisor</div>
          </div>
        </div>

        <nav class="p-4 space-y-2">
          <!-- ITEM ATIVO: DASHBOARD -->
          <button class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-extrabold text-[#22ff88] bg-[#22ff88]/10 border border-[#22ff88]/40 shadow-[0_0_10px_rgba(34,255,136,0.15)] uppercase tracking-wider">
            <svg class="w-5 h-5 text-[#22ff88]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </button>

          <button class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all uppercase tracking-wider">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Operadores</span>
          </button>

          <button class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all uppercase tracking-wider">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="6"></circle>
              <circle cx="12" cy="12" r="2"></circle>
            </svg>
            <span>Metas</span>
          </button>

          <button class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all uppercase tracking-wider">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span>Alertas</span>
          </button>
        </nav>
      </div>

      <div class="p-4 border-t border-[#1f2937]">
        <button 
          @click="emit('navigate', 'login')"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-800/40 transition-all uppercase tracking-wider"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sair</span>
        </button>
      </div>
    </aside>

    <!-- ================= CONTEÚDO PRINCIPAL ================= -->
    <main class="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      
      <!-- TOPO DA TELA: TÍTULO & CONTROLES -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl sm:text-4xl font-extrabold uppercase tracking-wider text-white">
            DASHBOARD
          </h1>
          <p class="text-sm font-semibold text-gray-400 uppercase tracking-widest">
            Visão Geral Industrial & Indicadores
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Seletor de Turno -->
          <div class="flex items-center gap-2 bg-[#11161a] border border-[#1f2937] px-3 py-2 rounded-lg text-xs font-bold text-gray-300">
            <span>Turno:</span>
            <select v-model="selectedShift" class="bg-transparent text-[#22ff88] font-mono focus:outline-none cursor-pointer">
              <option value="Manhã" class="bg-[#11161a] text-white">Manhã</option>
              <option value="Tarde" class="bg-[#11161a] text-white">Tarde</option>
              <option value="Noite" class="bg-[#11161a] text-white">Noite</option>
            </select>
          </div>

          <!-- Botão Exportar -->
          <button 
            @click="exportData"
            class="bg-transparent border border-[#22ff88] text-[#22ff88] hover:bg-[#22ff88]/10 text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wider transition-all shadow flex items-center gap-2 active:scale-95"
          >
            <span>📥</span>
            <span>Exportar</span>
          </button>
        </div>
      </div>

      <!-- SELETOR DE ESTAÇÃO (4 Cards - Estação 03 com Borda Âmbar/Laranja) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div 
          v-for="st in stations" 
          :key="st.id"
          @click="selectStation(st.id)"
          class="cursor-pointer transition-all duration-200 rounded-xl p-4 bg-[#11161a] relative flex flex-col justify-between"
          :class="[
            st.isSelected ? 'border-2 border-[#22ff88] shadow-[0_0_15px_rgba(34,255,136,0.25)] card-tech-l' : st.borderClass
          ]"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-white">
              {{ st.operator }}
            </span>
            <span 
              class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
              :class="st.status === 'ONLINE' ? 'bg-[#22ff88]/10 text-[#22ff88] border-[#22ff88]/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'"
            >
              {{ st.status }}
            </span>
          </div>

          <div class="text-sm font-semibold text-gray-400">
            {{ st.station }}
          </div>
        </div>
      </div>

      <!-- BLOCO DO OPERADOR SELECIONADO -->
      <div class="mb-6">
        <h2 class="text-lg font-bold uppercase tracking-wider text-[#22ff88] flex items-center gap-2">
          <span>⚡</span>
          <span>{{ currentStationLabel }}</span>
        </h2>
      </div>

      <!-- 4 MINI-CARDS DE INDICADORES EM LINHA -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div 
          v-for="(card, idx) in miniCards" 
          :key="idx"
          class="card-tech-l bg-[#11161a] border border-[#1f2937] rounded-xl p-5 shadow-lg flex flex-col justify-between"
        >
          <span class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            {{ card.title }}
          </span>

          <div class="flex items-baseline gap-2 mb-1">
            <span class="font-mono text-3xl font-black" :class="card.numberColor">
              {{ card.number }}
            </span>
            <span v-if="card.unit" class="text-xs font-mono text-gray-400 uppercase">
              {{ card.unit }}
            </span>
          </div>

          <span class="text-xs text-gray-500 font-medium">
            {{ card.subtext }}
          </span>
        </div>
      </div>

      <!-- ================= ESTATÍSTICAS DAS MÁQUINAS (DUAS COLUNAS COM GRÁFICOS) ================= -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        <!-- Esquerda: Gráfico de BARRAS "Produção hora a hora" -->
        <div class="card-tech-l bg-[#11161a] border border-[#1f2937] rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-[#1f2937]">
            <div class="w-7 h-7 rounded border border-[#22ff88]/40 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
              📊
            </div>
            <h3 class="text-sm font-bold uppercase tracking-widest text-white">
              PRODUÇÃO HORA A HORA
            </h3>
          </div>

          <div class="h-64 relative">
            <Bar :data="barChartData" :options="barChartOptions" />
          </div>
        </div>

        <!-- Direita: Gráfico de ROSCA (DONUT) "Distribuição do tempo" -->
        <div class="card-tech-l bg-[#11161a] border border-[#1f2937] rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-[#1f2937]">
            <div class="w-7 h-7 rounded border border-[#22ff88]/40 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
              🍩
            </div>
            <h3 class="text-sm font-bold uppercase tracking-widest text-white">
              DISTRIBUIÇÃO DO TEMPO
            </h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            
            <!-- Gráfico Donut com Total no Centro -->
            <div class="h-56 relative flex items-center justify-center">
              <Doughnut :data="doughnutChartData" :options="doughnutChartOptions" />
              <!-- Texto no centro do gráfico de rosca -->
              <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span class="font-mono text-xl font-bold text-white">180 Total</span>
                <span class="text-[10px] text-gray-400 uppercase tracking-widest">MINUTOS</span>
              </div>
            </div>

            <!-- Legenda Lateral Colorida -->
            <div class="space-y-2 text-xs">
              <div 
                v-for="leg in doughnutLegend" 
                :key="leg.label"
                class="flex items-center justify-between bg-[#0a0e0d] border border-[#1f2937] px-3 py-2 rounded-lg"
              >
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full" :class="leg.color"></span>
                  <span class="font-semibold text-gray-300">{{ leg.label }}</span>
                </div>
                <span class="font-mono font-bold text-white">{{ leg.value }}</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- ================= TABELA: APONTAMENTOS E EVENTOS DE HOJE ================= -->
      <div class="card-tech-l bg-[#11161a] border border-[#1f2937] rounded-xl p-6 shadow-xl mb-8">
        <div class="flex items-center gap-2 mb-4 pb-3 border-b border-[#1f2937]">
          <div class="w-7 h-7 rounded border border-[#22ff88]/40 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
            📝
          </div>
          <h3 class="text-sm font-bold uppercase tracking-widest text-white">
            APONTAMENTOS E EVENTOS DE HOJE
          </h3>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-[#1f2937] text-gray-400 uppercase tracking-wider">
                <th class="pb-3">Hora</th>
                <th class="pb-3">Evento</th>
                <th class="pb-3">Cod</th>
                <th class="pb-3">Descrição</th>
                <th class="pb-3">Tempo</th>
                <th class="pb-3">Operador</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1f2937]/50 font-mono text-gray-200">
              <tr v-for="(ev, idx) in eventosHoje" :key="idx" class="hover:bg-[#0a0e0d]/50">
                <td class="py-3 text-gray-300 font-bold">{{ ev.hora }}</td>
                <td class="py-3 text-[#22ff88] font-bold font-sans">{{ ev.evento }}</td>
                <td class="py-3 text-amber-400 font-bold">{{ ev.cod }}</td>
                <td class="py-3 text-gray-300 font-sans max-w-xs truncate">{{ ev.descricao }}</td>
                <td class="py-3 text-white font-bold">{{ ev.tempo }}</td>
                <td class="py-3 text-gray-400 font-sans">{{ ev.operador }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ================= COMPARATIVO DAS 4 ESTAÇÕES (DUAS COLUNAS) ================= -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Esquerda: Gráfico de Barras Verticais Comparativo -->
        <div class="card-tech-l bg-[#11161a] border border-[#1f2937] rounded-xl p-6 shadow-xl">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-[#1f2937]">
            <div class="w-7 h-7 rounded border border-[#22ff88]/40 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
              📶
            </div>
            <h3 class="text-sm font-bold uppercase tracking-widest text-white">
              COMPARATIVO DAS 4 ESTAÇÕES (%)
            </h3>
          </div>

          <div class="h-60 relative">
            <Bar :data="stationsBarData" :options="stationsBarOptions" />
          </div>
        </div>

        <!-- Direita: Tabela Comparativa -->
        <div class="card-tech-l bg-[#11161a] border border-[#1f2937] rounded-xl p-6 shadow-xl">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-[#1f2937]">
            <div class="w-7 h-7 rounded border border-[#22ff88]/40 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
              📑
            </div>
            <h3 class="text-sm font-bold uppercase tracking-widest text-white">
              RESUMO DE DESEMPENHO
            </h3>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-[#1f2937] text-xs border-collapse">
              <thead>
                <tr class="border-b border-[#1f2937] text-gray-400 uppercase tracking-wider">
                  <th class="pb-2">Estações</th>
                  <th class="pb-2">Produção</th>
                  <th class="pb-2">Meta</th>
                  <th class="pb-2">Eficiência</th>
                  <th class="pb-2">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1f2937]/50 font-mono text-gray-200">
                <tr v-for="(row, idx) in comparativoEstacoes" :key="idx" class="hover:bg-[#0a0e0d]/50">
                  <td class="py-2.5 font-bold font-sans text-white">{{ row.estacao }}</td>
                  <td class="py-2.5 text-[#22ff88] font-bold">{{ row.producao }}</td>
                  <td class="py-2.5 text-gray-400">{{ row.meta }}</td>
                  <td class="py-2.5 font-bold text-white">{{ row.eficiencia }}</td>
                  <td class="py-2.5">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold border" :class="row.statusColor">
                      {{ row.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </main>

  </div>
</template>
