<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ==========================================
// MOCK DATA & STATE (INTEGRAÇÃO FUTURA)
// ==========================================
// TODO: buscar dados iniciais da estação via API GET /producao/estacao/01
const stationId = ref('01')
const unitsProduced = ref(184)
const targetUnits = ref(300)
const statusLinha = ref('Operacional') // 'Iniciada', 'Operacional', 'Parada'
const lotCode = ref('G0227B')
const avgHora = ref('30 min')
const isProducing = ref(true)

// Relógio do cabeçalho
const currentTime = ref('08:00:00')

// Cronômetro de tempo de produção (em segundos)
const productionSeconds = ref(14520) // ex: 04:02:00
let timerInterval = null

const formattedProductionTime = computed(() => {
  const h = Math.floor(productionSeconds.value / 3600).toString().padStart(2, '0')
  const m = Math.floor((productionSeconds.value % 3600) / 60).toString().padStart(2, '0')
  const s = (productionSeconds.value % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
})

const progressPercentage = computed(() => {
  if (!targetUnits.value) return 0
  const pct = Math.round((unitsProduced.value / targetUnits.value) * 100)
  return Math.min(pct, 100)
})

// Menu Dropdown de Ajuda / Motivos de Parada
const showHelpDropdown = ref(false)
const predefinedHelpReasons = [
  'Falta de Material',
  'Manutenção Preventiva',
  'Falha de Equipamento / Quebra',
  'Troca de Ferramental',
  'Ajuste de Qualidade / Setup',
  'Pausa Operacional'
]

// Ações dos botões
const startProduction = () => {
  isProducing.value = true
  statusLinha.value = 'Operacional'
  showHelpDropdown.value = false
  // TODO: POST /producao/estacao/01/iniciar
}

const stopProduction = () => {
  isProducing.value = false
  statusLinha.value = 'Parada'
  showHelpDropdown.value = false
  // TODO: POST /producao/estacao/01/parar
}

const selectHelpReason = (reason) => {
  showHelpDropdown.value = false
  alert(`Solicitação de ajuda enviada: "${reason}"`)
  // TODO: POST /producao/estacao/01/ajuda { motivo: reason }
}

const incrementUnit = () => {
  unitsProduced.value++
  // TODO: POST /producao/estacao/01/incrementar
}

// Atualização de relógio e cronômetro
const updateClock = () => {
  const now = new Date()
  currentTime.value = now.toTimeString().split(' ')[0]
}

onMounted(() => {
  updateClock()
  const clockInterval = setInterval(updateClock, 1000)
  
  timerInterval = setInterval(() => {
    if (isProducing.value) {
      productionSeconds.value++
    }
  }, 1000)

  onUnmounted(() => {
    clearInterval(clockInterval)
    clearInterval(timerInterval)
  })
})
</script>

<template>
  <div class="min-h-screen bg-[#0a0e0d] p-4 sm:p-6 text-white font-sans flex flex-col select-none">
    
    <!-- CARD ÚNICO OCUPANDO QUASE TODA A TELA -->
    <div class="card-tech-l flex-1 bg-[#11161a] border-2 border-[#22ff88] shadow-[0_0_25px_rgba(34,255,136,0.15)] rounded-xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
      
      <!-- ================= CABEÇALHO DO CARD ================= -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1f2937]">
        
        <!-- Esquerda: Título + Estação -->
        <div class="flex items-center gap-4">
          <!-- Ícone Monitor / Estação -->
          <div class="w-12 h-12 rounded-lg border border-[#22ff88]/50 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center shadow-[0_0_10px_rgba(34,255,136,0.2)]">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>

          <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              PRODUÇÃO
            </h1>
            <p class="text-sm font-semibold text-gray-400">
              Estação de trabalho <span class="text-[#22ff88] font-bold text-base font-mono">0{{ stationId }}</span>
            </p>
          </div>
        </div>

        <!-- Direita: Relógio digital em tempo real -->
        <div class="flex items-center gap-2 bg-[#0a0e0d] border border-[#1f2937] px-5 py-2.5 rounded-lg shadow-inner">
          <svg class="w-5 h-5 text-[#22ff88]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span class="font-mono text-xl font-bold tracking-wider text-white">
            {{ currentTime }}
          </span>
        </div>

      </div>

      <!-- ================= BLOCO PRINCIPAL: UNIDADES PRODUZIDAS & STATUS ================= -->
      <div class="my-auto py-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        
        <!-- Esquerda: Número Gigante de Unidades (2 Colunas no grid) -->
        <div class="lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span class="text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-400 block mb-2">
              UNIDADES PRODUZIDAS
            </span>
            <div class="flex items-baseline gap-4">
              <span 
                @click="incrementUnit"
                title="Clique para simular incremento de unidade"
                class="font-mono text-7xl sm:text-8xl lg:text-9xl font-black text-[#22ff88] leading-none drop-shadow-[0_0_20px_rgba(34,255,136,0.4)] cursor-pointer hover:scale-105 transition-transform"
              >
                {{ unitsProduced }}
              </span>
              <span class="text-gray-500 font-mono text-xl uppercase">UNID</span>
            </div>
          </div>

          <!-- Linha divisória vertical (visível apenas em telas maiores) -->
          <div class="hidden sm:block h-28 w-[1px] bg-[#1f2937]"></div>

          <!-- Status da linha à direita -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded border border-[#22ff88]/40 bg-[#22ff88]/10 flex items-center justify-center text-[#22ff88]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span class="text-xs font-bold uppercase tracking-widest text-gray-400">
                STATUS DA LINHA
              </span>
            </div>

            <div class="flex items-center gap-3">
              <span 
                class="w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]"
                :class="isProducing ? 'bg-[#22ff88] text-[#22ff88] animate-pulse' : 'bg-[#dc2626] text-[#dc2626]'"
              ></span>
              <span 
                class="font-mono text-2xl font-bold uppercase"
                :class="isProducing ? 'text-[#22ff88]' : 'text-[#dc2626]'"
              >
                {{ statusLinha }}
              </span>
            </div>
          </div>
        </div>

        <!-- Direita: Card Resumo Secundário ou Destaque -->
        <div class="bg-[#0a0e0d] border border-[#1f2937] rounded-xl p-5 flex flex-col gap-3">
          <div class="text-xs text-gray-400 uppercase tracking-widest font-semibold">
            Eficiência da Estação
          </div>
          <div class="text-3xl font-mono font-bold text-white flex items-center justify-between">
            <span>88.5%</span>
            <span class="text-xs font-sans text-[#22ff88] bg-[#22ff88]/10 border border-[#22ff88]/30 px-2 py-1 rounded">▲ High</span>
          </div>
          <p class="text-xs text-gray-500">
            Desempenho mantido acima da média estipulada para o turno.
          </p>
        </div>

      </div>

      <!-- ================= BLOCO PROGRESSO DA META ================= -->
      <div class="bg-[#0a0e0d] border border-[#1f2937] rounded-xl p-5 mb-6">
        
        <!-- Header do Progresso -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <!-- Ícone de Alvo -->
            <div class="w-7 h-7 rounded border border-[#22ff88]/40 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-300">
              PROGRESSO DA META
            </span>
          </div>

          <span class="text-sm font-mono font-bold text-gray-300">
            <span class="text-[#22ff88]">{{ unitsProduced }}</span> / {{ targetUnits }} unidades
          </span>
        </div>

        <!-- Barra de Progresso Horizontal -->
        <div class="relative w-full h-5 bg-gray-900 rounded-full overflow-hidden border border-gray-800 mb-2">
          <div 
            class="h-full bg-gradient-to-r from-[#1ce075] to-[#22ff88] shadow-[0_0_12px_#22ff88] transition-all duration-500"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>

        <!-- Informações abaixo da barra -->
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 text-gray-400">
            <span class="w-2.5 h-2.5 rounded-full bg-[#22ff88] animate-pulse shadow-[0_0_8px_#22ff88]"></span>
            <span class="font-medium text-gray-300">Atualização em tempo real</span>
          </div>

          <span class="font-mono text-sm font-bold text-[#22ff88]">
            {{ progressPercentage }}%
          </span>
        </div>

      </div>

      <!-- ================= FAIXA INFERIOR COM 3 BLOCOS ================= -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#1f2937] pt-6 mb-6">
        
        <!-- Bloco 1: Média / Hora -->
        <div class="flex items-center gap-4 bg-[#0a0e0d]/50 p-3 rounded-lg border border-[#1f2937]">
          <div class="w-10 h-10 rounded border border-[#22ff88]/30 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              MÉDIA / HORA
            </span>
            <span class="font-mono text-lg font-bold text-white">
              {{ avgHora }}
            </span>
          </div>
        </div>

        <!-- Bloco 2: LOTE -->
        <div class="flex items-center gap-4 bg-[#0a0e0d]/50 p-3 rounded-lg border border-[#1f2937]">
          <div class="w-10 h-10 rounded border border-[#22ff88]/30 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              LOTE
            </span>
            <span class="font-mono text-xl font-bold text-[#22ff88]">
              {{ lotCode }}
            </span>
          </div>
        </div>

        <!-- Bloco 3: Tempo de produção -->
        <div class="flex items-center gap-4 bg-[#0a0e0d]/50 p-3 rounded-lg border border-[#1f2937]">
          <div class="w-10 h-10 rounded border border-[#22ff88]/30 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              TEMPO DE PRODUÇÃO
            </span>
            <span class="font-mono text-xl font-bold text-white">
              {{ formattedProductionTime }}
            </span>
          </div>
        </div>

      </div>

      <!-- ================= RODAPÉ COM 3 BOTÕES ================= -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        
        <!-- Botão INICIAR (Verde, à esquerda) -->
        <button 
          @click="startProduction"
          class="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-[#22ff88] hover:bg-[#1ce075] border border-[#22ff88] text-black font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(34,255,136,0.3)]"
        >
          <span class="text-base">▶</span>
          <span>INICIAR</span>
        </button>

        <!-- Botão AJUDA ⌄ (Cinza, centro — Dropdown de motivos) -->
        <div class="relative w-full sm:w-auto">
          <button 
            @click="showHelpDropdown = !showHelpDropdown"
            class="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow"
          >
            <span>❓ AJUDA</span>
            <span class="text-xs transition-transform duration-200" :class="{ 'rotate-180': showHelpDropdown }">⌄</span>
          </button>

          <!-- Dropdown Menu de Motivos de Parada -->
          <div 
            v-if="showHelpDropdown"
            class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-[#11161a] border border-[#1f2937] rounded-xl shadow-2xl overflow-hidden z-50 py-2"
          >
            <div class="px-4 py-2 text-xs font-bold text-gray-400 border-b border-[#1f2937] uppercase tracking-wider">
              MOTIVOS DE SOLICITAÇÃO / PARADA
            </div>
            <button 
              v-for="reason in predefinedHelpReasons"
              :key="reason"
              @click="selectHelpReason(reason)"
              class="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-[#22ff88]/10 hover:text-[#22ff88] transition-colors flex items-center gap-2 border-b border-[#1f2937]/50 last:border-0"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-[#22ff88]"></span>
              <span>{{ reason }}</span>
            </button>
          </div>
        </div>

        <!-- Botão PARAR (Vermelho, à direita) -->
        <button 
          @click="stopProduction"
          class="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-[#dc2626] hover:bg-red-700 border border-red-600 text-white font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
        >
          <span class="text-base">⏸</span>
          <span>PARAR</span>
        </button>

      </div>

    </div>

  </div>
</template>
