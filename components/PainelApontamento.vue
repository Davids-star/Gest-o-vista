<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ==========================================
// MOCK DATA & STATE (INTEGRAÇÃO FUTURA)
// ==========================================
// Lista de 4 Estações / Operadores
const stations = ref([
  { id: 1, operator: 'OPERADOR 01', station: 'ESTAÇÃO 1', status: 'ONLINE', isSelected: true },
  { id: 2, operator: 'OPERADOR 02', station: 'ESTAÇÃO 2', status: 'ONLINE', isSelected: false },
  { id: 3, operator: 'OPERADOR 03', station: 'ESTAÇÃO 3', status: 'ONLINE', isSelected: false },
  { id: 4, operator: 'OPERADOR 04', station: 'ESTAÇÃO 4', status: 'ONLINE', isSelected: false },
])

const selectedStationId = ref(1)

const selectStation = (id) => {
  selectedStationId.value = id
  stations.value.forEach(s => s.isSelected = (s.id === id))
  // TODO: Buscar dados da estação selecionada via API GET /supervisor/estacao/:id
}

// Dados do Lote (Mock por estação)
const loteData = computed(() => {
  return {
    producao: 'Engrenagem Industrial X-200',
    lote: `G022${selectedStationId.value}B`,
    operador: `Carlos Silva ${selectedStationId.value}`,
    turno: 'Turno 1 - Manhã',
    meta: '500 un',
    prioridade: 'ALTA'
  }
})

// Registro de Paradas (Mock)
const paradasList = ref([
  { inicio: '08:45', fim: '09:05', duracao: '00:20:00', codigo: 'P-01', motivo: 'Ajuste de Ferramental' },
  { inicio: '10:15', fim: '10:30', duracao: '00:15:00', codigo: 'P-03', motivo: 'Falta de Matéria-Prima' },
  { inicio: '11:50', fim: '12:00', duracao: '00:10:00', codigo: 'P-02', motivo: 'Inspeção de Qualidade' }
])

// Produção em Tempo Real
const producaoReal = ref({
  atuais: 260,
  meta: 500,
  porcentagem: 52
})

// Mini-cards de Indicadores
const indicadores = ref([
  { label: 'Eficiência Atual', value: '87%', color: 'text-[#22ff88]' },
  { label: 'Velocidade', value: '4.2 un/min', color: 'text-white' },
  { label: 'Tempo Produzindo', value: '04:12:30', color: 'text-white' },
  { label: 'Tempo parado', value: '00:35:10', color: 'text-[#dc2626]' }, // Vermelho
  { label: 'Parada', value: '3 contagem', color: 'text-amber-400' },
  { label: 'Qualidade OEE', value: '98.5%', color: 'text-[#22ff88]' }
])

// Controladores do Modal de Nova Parada
const showModalParada = ref(false)
const novaParadaForm = ref({
  inicio: '13:00',
  fim: '13:15',
  codigo: 'P-04',
  motivo: 'Manutenção Preventiva'
})

const addParada = () => {
  paradasList.value.unshift({
    inicio: novaParadaForm.value.inicio,
    fim: novaParadaForm.value.fim,
    duracao: '00:15:00',
    codigo: novaParadaForm.value.codigo,
    motivo: novaParadaForm.value.motivo
  })
  showModalParada.value = false
  // TODO: POST /supervisor/paradas
}

// Data e Hora do cabeçalho
const currentTime = ref('08:20:00')
const currentDate = ref('16/07/2026')

let clockInterval = null

onMounted(() => {
  const updateTime = () => {
    const now = new Date()
    currentTime.value = now.toTimeString().split(' ')[0]
  }
  updateTime()
  clockInterval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(clockInterval)
})

const emit = defineEmits(['navigate'])
</script>

<template>
  <div class="min-h-screen bg-[#0a0e0d] text-white font-sans flex select-none">
    
    <!-- ================= SIDEBAR FIXA À ESQUERDA ================= -->
    <aside class="w-64 bg-[#0d1117] border-r border-[#1f2937] flex flex-col justify-between hidden md:flex shrink-0">
      
      <div>
        <!-- Logo / Identificação da Sidebar -->
        <div class="p-6 border-b border-[#1f2937] flex items-center gap-3">
          <div class="w-9 h-9 rounded border border-[#22ff88]/50 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center font-bold">
            ⚡
          </div>
          <div>
            <div class="text-xs font-bold text-[#22ff88] tracking-widest uppercase">ADMIN</div>
            <div class="text-sm font-extrabold text-white tracking-wider uppercase">Painel Supervisor</div>
          </div>
        </div>

        <!-- Links de Navegação -->
        <nav class="p-4 space-y-2">
          <button 
            @click="emit('navigate', 'dashboard')"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all uppercase tracking-wider"
          >
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
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

          <!-- ITEM ATIVO: APONTAMENTO -->
          <button class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-extrabold text-[#22ff88] bg-[#22ff88]/10 border border-[#22ff88]/40 shadow-[0_0_10px_rgba(34,255,136,0.15)] uppercase tracking-wider">
            <svg class="w-5 h-5 text-[#22ff88]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Apontamento</span>
          </button>
        </nav>
      </div>

      <!-- Botão Sair Fixo no Rodapé -->
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
      
      <!-- TOPO DO CONTEÚDO -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl sm:text-4xl font-extrabold uppercase tracking-wider text-white">
            SUPERVISOR
          </h1>
          <p class="text-sm font-semibold text-gray-400 uppercase tracking-widest">
            de produção
          </p>
        </div>

        <!-- Badge com Relógio + Data -->
        <div class="flex items-center gap-3 bg-[#11161a] border border-[#1f2937] rounded-lg px-4 py-2 text-sm shadow">
          <svg class="w-4 h-4 text-[#22ff88]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span class="font-mono text-[#22ff88] font-bold">{{ currentTime }}</span>
          <span class="text-gray-600">|</span>
          <span class="font-mono text-gray-300 font-medium">{{ currentDate }}</span>
        </div>
      </div>

      <!-- SELETOR DE ESTAÇÃO (4 Cards lado a lado) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div 
          v-for="st in stations" 
          :key="st.id"
          @click="selectStation(st.id)"
          class="cursor-pointer transition-all duration-200 rounded-xl p-4 border bg-[#11161a] relative flex flex-col justify-between"
          :class="[
            st.isSelected 
              ? 'border-2 border-[#22ff88] shadow-[0_0_15px_rgba(34,255,136,0.25)] card-tech-l' 
              : 'border-[#1f2937] hover:border-gray-600'
          ]"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-white">
              {{ st.operator }}
            </span>
            <span class="bg-[#22ff88]/10 text-[#22ff88] border border-[#22ff88]/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
              {{ st.status }}
            </span>
          </div>

          <div class="text-sm font-semibold text-gray-400">
            {{ st.station }}
          </div>
        </div>
      </div>

      <!-- DUAS COLUNAS PRINCIPAIS (LINHA SUPERIOR) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        <!-- Esquerda: CARD "DADOS DO LOTE" -->
        <div class="card-tech-l bg-[#11161a] border border-[#1f2937] rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-[#1f2937]">
            <div class="w-7 h-7 rounded border border-[#22ff88]/40 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
              📋
            </div>
            <h2 class="text-sm font-bold uppercase tracking-widest text-white">
              DADOS DO LOTE
            </h2>
          </div>

          <!-- Grid 2x3 de campos somente-leitura estilo input -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Produção</label>
              <div class="bg-[#0a0e0d] border border-[#1f2937] rounded-lg px-3 py-2 text-xs font-mono text-white truncate">
                {{ loteData.producao }}
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lote</label>
              <div class="bg-[#0a0e0d] border border-[#1f2937] rounded-lg px-3 py-2 text-xs font-mono text-[#22ff88] font-bold">
                {{ loteData.lote }}
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Operador</label>
              <div class="bg-[#0a0e0d] border border-[#1f2937] rounded-lg px-3 py-2 text-xs font-mono text-white truncate">
                {{ loteData.operador }}
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Turno</label>
              <div class="bg-[#0a0e0d] border border-[#1f2937] rounded-lg px-3 py-2 text-xs font-mono text-white">
                {{ loteData.turno }}
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Meta de produção</label>
              <div class="bg-[#0a0e0d] border border-[#1f2937] rounded-lg px-3 py-2 text-xs font-mono text-white font-bold">
                {{ loteData.meta }}
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Prioridade</label>
              <div class="bg-[#0a0e0d] border border-[#1f2937] rounded-lg px-3 py-2 text-xs font-mono text-amber-400 font-bold flex items-center gap-1">
                <span>🔥</span>
                <span>{{ loteData.prioridade }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Direita: CARD "REGISTRO DE PARADAS" -->
        <div class="card-tech-l bg-[#11161a] border border-[#1f2937] rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-[#1f2937]">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded border border-[#22ff88]/40 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
                ⏱
              </div>
              <h2 class="text-sm font-bold uppercase tracking-widest text-white">
                REGISTRO DE PARADAS
              </h2>
            </div>

            <button 
              @click="showModalParada = true"
              class="bg-[#22ff88] hover:bg-[#1ce075] text-black text-xs font-extrabold px-3 py-1.5 rounded uppercase tracking-wider transition-all shadow active:scale-95"
            >
              + Nova Parada
            </button>
          </div>

          <!-- Tabela de Paradas -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[#1f2937] text-gray-400 uppercase tracking-wider">
                  <th class="pb-2">Início</th>
                  <th class="pb-2">Fim</th>
                  <th class="pb-2">Duração</th>
                  <th class="pb-2">Código</th>
                  <th class="pb-2">Motivo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1f2937]/50 font-mono text-gray-200">
                <tr v-for="(p, idx) in paradasList" :key="idx" class="hover:bg-[#0a0e0d]/50">
                  <td class="py-2.5 text-gray-300">{{ p.inicio }}</td>
                  <td class="py-2.5 text-gray-300">{{ p.fim }}</td>
                  <td class="py-2.5 text-[#dc2626] font-bold">{{ p.duracao }}</td>
                  <td class="py-2.5 text-amber-400 font-bold">{{ p.codigo }}</td>
                  <td class="py-2.5 text-gray-300 font-sans truncate max-w-[140px]">{{ p.motivo }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- ABAIXO, MAIS DUAS COLUNAS (LINHA INFERIOR) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Esquerda: CARD "PRODUÇÃO EM TEMPO REAL" -->
        <div class="card-tech-l bg-[#11161a] border border-[#1f2937] rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-[#1f2937]">
            <div class="w-7 h-7 rounded border border-[#22ff88]/40 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
              📊
            </div>
            <h2 class="text-sm font-bold uppercase tracking-widest text-white">
              PRODUÇÃO EM TEMPO REAL
            </h2>
          </div>

          <div class="flex flex-col gap-4">
            <div class="flex items-baseline justify-between">
              <div>
                <span class="font-mono text-4xl sm:text-5xl font-black text-[#22ff88] tracking-tight">
                  {{ producaoReal.atuais }}/{{ producaoReal.meta }}
                </span>
                <span class="block text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Unidades produzidas
                </span>
              </div>

              <span class="font-mono text-2xl font-bold text-[#22ff88]">
                {{ producaoReal.porcentagem }}%
              </span>
            </div>

            <!-- Barra de Progresso -->
            <div class="w-full bg-[#0a0e0d] h-4 rounded-full border border-[#1f2937] overflow-hidden">
              <div 
                class="bg-gradient-to-r from-[#1ce075] to-[#22ff88] h-full shadow-[0_0_10px_#22ff88]"
                :style="{ width: `${producaoReal.porcentagem}%` }"
              ></div>
            </div>

            <div class="text-xs text-gray-400 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[#22ff88] animate-pulse"></span>
              <span>{{ producaoReal.porcentagem }}% da meta atingida</span>
            </div>
          </div>
        </div>

        <!-- Direita: CARD "INDICADORES" (Grid 2x3 Mini-Cards) -->
        <div class="card-tech-l bg-[#11161a] border border-[#1f2937] rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-[#1f2937]">
            <div class="w-7 h-7 rounded border border-[#22ff88]/40 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
              🎯
            </div>
            <h2 class="text-sm font-bold uppercase tracking-widest text-white">
              INDICADORES
            </h2>
          </div>

          <!-- Grid 2x3 de Mini-Cards Menores -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div 
              v-for="(ind, i) in indicadores" 
              :key="i"
              class="bg-[#0a0e0d] border border-[#1f2937] rounded-lg p-3 flex flex-col justify-between"
            >
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate mb-1">
                {{ ind.label }}
              </span>
              <span class="font-mono text-base font-bold" :class="ind.color">
                {{ ind.value }}
              </span>
            </div>
          </div>
        </div>

      </div>

    </main>

    <!-- ================= MODAL NOVA PARADA ================= -->
    <div v-if="showModalParada" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="card-tech-l bg-[#11161a] border border-[#1f2937] rounded-xl p-6 max-w-md w-full shadow-2xl">
        <h3 class="text-lg font-bold text-white uppercase tracking-wider mb-4 border-b border-[#1f2937] pb-2">
          + Nova Parada de Produção
        </h3>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block text-gray-400 mb-1 font-bold">HORÁRIO INÍCIO</label>
            <input v-model="novaParadaForm.inicio" type="text" class="w-full bg-[#0a0e0d] border border-[#1f2937] rounded p-2 text-white font-mono" />
          </div>
          <div>
            <label class="block text-gray-400 mb-1 font-bold">HORÁRIO FIM</label>
            <input v-model="novaParadaForm.fim" type="text" class="w-full bg-[#0a0e0d] border border-[#1f2937] rounded p-2 text-white font-mono" />
          </div>
          <div>
            <label class="block text-gray-400 mb-1 font-bold">CÓDIGO DA PARADA</label>
            <input v-model="novaParadaForm.codigo" type="text" class="w-full bg-[#0a0e0d] border border-[#1f2937] rounded p-2 text-white font-mono" />
          </div>
          <div>
            <label class="block text-gray-400 mb-1 font-bold">MOTIVO</label>
            <input v-model="novaParadaForm.motivo" type="text" class="w-full bg-[#0a0e0d] border border-[#1f2937] rounded p-2 text-white font-mono" />
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button @click="showModalParada = false" class="px-4 py-2 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold uppercase text-xs">
            Cancelar
          </button>
          <button @click="addParada" class="px-4 py-2 rounded bg-[#22ff88] text-black font-bold uppercase text-xs hover:bg-[#1ce075]">
            Salvar Registro
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
