<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// ==========================================
// MOCK DATA & STATE (INTEGRAÇÃO FUTURA)
// ==========================================
const pin = ref('')
const maxPinLength = 4
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

const emit = defineEmits(['login-success'])

// Handler para clicar nos números do teclado
const addDigit = (digit) => {
  if (pin.value.length < maxPinLength) {
    pin.value += digit
    errorMessage.value = ''
    
    // Auto-envio ao completar 4 dígitos
    if (pin.value.length === maxPinLength) {
      submitPin()
    }
  }
}

// Handler para limpar o PIN
const clearPin = () => {
  pin.value = ''
  errorMessage.value = ''
  successMessage.value = ''
}

// Handler de envio / validação do PIN
const submitPin = async () => {
  if (pin.value.length < maxPinLength) {
    errorMessage.value = 'Por favor, digite todos os 4 dígitos.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  // TODO: Substituir este mock por chamada HTTP real:
  // try {
  //   const response = await fetch('/api/auth/login-pin', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ pin: pin.value })
  //   })
  //   const data = await response.json()
  //   if (response.ok) { emit('login-success', data) }
  // } catch (err) { ... }

  setTimeout(() => {
    isLoading.value = false
    if (pin.value === '1234' || pin.value.length === 4) {
      successMessage.value = 'PIN validado! Acessando sistema...'
      setTimeout(() => {
        emit('login-success', { pin: pin.value, operator: 'Operador 01' })
      }, 600)
    } else {
      errorMessage.value = 'PIN incorreto. Tente novamente.'
      pin.value = ''
    }
  }, 500)
}

// Suporte a teclado físico
const handleKeyDown = (e) => {
  if (e.key >= '0' && e.key <= '9') {
    addDigit(e.key)
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    clearPin()
  } else if (e.key === 'Enter') {
    submitPin()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="relative min-h-screen bg-[#0a0e0d] text-white flex items-center justify-center p-4 overflow-hidden select-none">
    
    <!-- Linhas decorativas de circuito nos cantos da tela -->
    <div class="absolute top-6 left-6 pointer-events-none opacity-40">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 20 H60 L80 40 V120" stroke="#22ff88" stroke-width="1.5" stroke-dasharray="4 4" />
        <circle cx="80" cy="120" r="3" fill="#22ff88" />
        <circle cx="0" cy="20" r="3" fill="#22ff88" />
      </svg>
    </div>
    
    <div class="absolute top-6 right-6 pointer-events-none opacity-40">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M120 20 H60 L40 40 V120" stroke="#22ff88" stroke-width="1.5" stroke-dasharray="4 4" />
        <circle cx="40" cy="120" r="3" fill="#22ff88" />
        <circle cx="120" cy="20" r="3" fill="#22ff88" />
      </svg>
    </div>

    <div class="absolute bottom-6 left-6 pointer-events-none opacity-40">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 100 H60 L80 80 V0" stroke="#22ff88" stroke-width="1.5" stroke-dasharray="4 4" />
        <circle cx="80" cy="0" r="3" fill="#22ff88" />
      </svg>
    </div>

    <div class="absolute bottom-6 right-6 pointer-events-none opacity-40">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M120 100 H60 L40 80 V0" stroke="#22ff88" stroke-width="1.5" stroke-dasharray="4 4" />
        <circle cx="40" cy="0" r="3" fill="#22ff88" />
      </svg>
    </div>

    <!-- Conteúdo principal centralizado -->
    <div class="w-full max-w-md flex flex-col items-center z-10">
      
      <!-- Cabeçalho / Branding -->
      <div class="flex flex-col items-center text-center mb-8">
        <!-- Ícone de Engrenagem em Hexágono Verde -->
        <div class="relative w-20 h-20 flex items-center justify-center mb-3">
          <svg class="absolute inset-0 w-full h-full text-[#22ff88] drop-shadow-[0_0_12px_rgba(34,255,136,0.5)]" viewBox="0 0 100 100" fill="none">
            <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" stroke="currentColor" stroke-width="3" fill="#11161a" />
          </svg>
          <!-- Ícone engrenagem -->
          <svg class="w-10 h-10 text-[#22ff88] animate-spin-slow z-10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <span class="text-xs font-bold text-[#22ff88] uppercase tracking-widest mb-1">
          SISTEMA DE
        </span>
        <h1 class="text-4xl font-extrabold text-white uppercase tracking-wider mb-2 drop-shadow-md">
          PRODUÇÃO
        </h1>

        <!-- Subtítulo com linhas horizontais ladeando -->
        <div class="flex items-center gap-3 w-full justify-center text-gray-400 text-sm tracking-widest uppercase">
          <span class="h-[1px] w-12 bg-gradient-to-r from-transparent to-gray-600"></span>
          <span>Controle de produção</span>
          <span class="h-[1px] w-12 bg-gradient-to-l from-transparent to-gray-600"></span>
        </div>
      </div>

      <!-- Card Central -->
      <div class="card-tech-l w-full bg-[#11161a] border border-[#1f2937] rounded-xl p-6 sm:p-8 shadow-2xl relative">
        
        <!-- Label PIN -->
        <div class="flex items-center justify-center gap-2 mb-6">
          <span class="text-lg">🔒</span>
          <span class="text-sm font-semibold tracking-widest text-gray-300 uppercase">
            DIGITE SEU PIN
          </span>
        </div>

        <!-- 4 Caixas de PIN -->
        <div class="flex justify-center gap-3 sm:gap-4 mb-8">
          <div 
            v-for="i in maxPinLength" 
            :key="i"
            class="w-14 h-16 sm:w-16 sm:h-16 rounded-lg border-2 bg-[#0a0e0d] flex items-center justify-center transition-all duration-200"
            :class="[
              pin.length >= i 
                ? 'border-[#22ff88] shadow-[0_0_12px_rgba(34,255,136,0.3)]' 
                : 'border-[#1f2937]'
            ]"
          >
            <!-- Indicador preenchido (ponto verde brilhante) -->
            <span 
              v-if="pin.length >= i"
              class="w-4 h-4 rounded-full bg-[#22ff88] shadow-[0_0_10px_#22ff88] animate-pulse"
            ></span>
          </div>
        </div>

        <!-- Mensagens de Erro / Sucesso -->
        <div v-if="errorMessage" class="mb-4 text-center text-xs font-semibold text-red-500 bg-red-950/40 border border-red-800/50 py-2 rounded">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="mb-4 text-center text-xs font-semibold text-[#22ff88] bg-[#22ff88]/10 border border-[#22ff88]/30 py-2 rounded">
          {{ successMessage }}
        </div>

        <!-- Teclado Numérico -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <button 
            v-for="n in 9" 
            :key="n"
            @click="addDigit(n.toString())"
            class="h-14 sm:h-16 rounded-lg bg-[#161c22] border border-[#22ff88]/30 hover:border-[#22ff88] hover:bg-[#22ff88]/10 active:scale-95 text-white font-mono text-2xl font-bold transition-all flex items-center justify-center shadow"
          >
            {{ n }}
          </button>
        </div>

        <!-- Última linha: Limpar, 0, Entrar -->
        <div class="grid grid-cols-3 gap-3">
          <button 
            @click="clearPin"
            class="h-14 sm:h-16 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-600 text-gray-300 hover:text-white font-bold text-sm tracking-wider uppercase transition-all flex items-center justify-center active:scale-95"
          >
            Limpar
          </button>
          
          <button 
            @click="addDigit('0')"
            class="h-14 sm:h-16 rounded-lg bg-[#161c22] border border-[#22ff88]/30 hover:border-[#22ff88] hover:bg-[#22ff88]/10 active:scale-95 text-white font-mono text-2xl font-bold transition-all flex items-center justify-center shadow"
          >
            0
          </button>

          <button 
            @click="submitPin"
            :disabled="isLoading"
            class="h-14 sm:h-16 rounded-lg bg-[#22ff88] hover:bg-[#1ce075] border border-[#22ff88] text-black font-extrabold text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-1 active:scale-95 shadow-[0_0_15px_rgba(34,255,136,0.3)] disabled:opacity-50"
          >
            <span>{{ isLoading ? 'Validando...' : 'Entrar' }}</span>
            <span v-if="!isLoading" class="text-base">→</span>
          </button>
        </div>

      </div>

      <!-- Rodapé discreto de suporte -->
      <div class="mt-6 text-center text-xs text-gray-500 tracking-wider">
        Pressione os números do teclado ou utilize a tela sensível ao toque
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin-slow {
  animation: spinSlow 20s linear infinite;
}
</style>
