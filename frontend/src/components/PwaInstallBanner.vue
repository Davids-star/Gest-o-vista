<template>
  <!-- Exibido apenas no celular, fora do modo PWA standalone e se a escolha ainda não foi feita -->
  <Transition name="fade">
    <div 
      v-if="showChoiceModal && !isStandalone" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans"
    >
      <div class="bg-[#121824] border border-emerald-500/40 w-full max-w-md rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl shadow-emerald-950/80 text-white relative overflow-hidden">
        
        <!-- Efeito de brilho de fundo -->
        <div class="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Cabeçalho -->
        <div class="text-center space-y-2">
          <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-2xl mx-auto shadow-inner">
            📲
          </div>
          <h2 class="text-lg font-extrabold tracking-wide uppercase text-white">Como deseja acessar?</h2>
          <p class="text-xs text-slate-300">Escolha a melhor opção para utilizar o sistema no celular:</p>
        </div>

        <!-- SELEÇÃO DE DUAS OPÇÕES CLARAS -->
        <div class="space-y-3.5">
          
          <!-- OPÇÃO 1: BAIXAR PWA -->
          <button 
            @click="handleChoosePwa"
            class="w-full p-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-lg shadow-emerald-600/20 border border-emerald-400/40 transition-all active:scale-95 group">
            <div class="flex items-center gap-3 text-left">
              <span class="text-xl">📲</span>
              <div>
                <p class="font-extrabold text-slate-950 text-sm">Baixar App (PWA)</p>
                <p class="text-[11px] text-slate-900 font-medium">Instalar aplicativo na tela inicial do celular</p>
              </div>
            </div>
            <span class="text-slate-950 text-lg font-bold group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <!-- OPÇÃO 2: CONTINUAR NA VERSÃO WEB -->
          <button 
            @click="handleChooseWeb"
            class="w-full p-4 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-between border border-slate-700/80 transition-all active:scale-95 group">
            <div class="flex items-center gap-3 text-left">
              <span class="text-xl">🌐</span>
              <div>
                <p class="font-bold text-white text-sm">Continuar no Navegador Web</p>
                <p class="text-[11px] text-slate-400 font-normal">Usar direto no Chrome, Safari ou Firefox</p>
              </div>
            </div>
            <span class="text-slate-400 text-lg group-hover:translate-x-1 transition-transform">→</span>
          </button>

        </div>

        <!-- MODAL INTERNO COM GUIA PASSO A PASSO (SE O NAVEGADOR BLOQUEAR O POPUP DIRETO VIA HTTP/IP) -->
        <div v-if="showInstructions" class="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div class="flex justify-between items-center border-b border-slate-800 pb-2">
            <span class="font-bold text-emerald-400 uppercase text-[11px]">Como adicionar na Tela Inicial</span>
            <button @click="showInstructions = false" class="text-slate-400 hover:text-white">&times;</button>
          </div>

          <div class="flex border-b border-slate-800 pb-2 gap-2">
            <button 
              @click="activeTab = 'android'"
              class="flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-all"
              :class="activeTab === 'android' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400'">
              🤖 Android (Chrome)
            </button>
            <button 
              @click="activeTab = 'ios'"
              class="flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-all"
              :class="activeTab === 'ios' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400'">
              🍎 iPhone (Safari)
            </button>
          </div>

          <div v-if="activeTab === 'android'" class="text-[11px] text-slate-300 space-y-1.5">
            <p>1. Abra os <strong class="text-emerald-400">3 pontinhos (⋮)</strong> do Chrome.</p>
            <p>2. Clique em <strong class="text-white">"Adicionar à tela inicial"</strong> ou <strong class="text-white">"Instalar aplicativo"</strong>.</p>
            <p>3. Confirme em <strong>Adicionar</strong>.</p>
          </div>

          <div v-if="activeTab === 'ios'" class="text-[11px] text-slate-300 space-y-1.5">
            <p>1. Toque em <strong class="text-emerald-400">Compartilhar ( ⎋ / ↑ )</strong> no Safari.</p>
            <p>2. Escolha <strong class="text-white">"Adicionar à Tela de Início"</strong>.</p>
            <p>3. Toque em <strong class="text-emerald-400">Adicionar</strong>.</p>
          </div>

          <button 
            @click="handleChooseWeb" 
            class="w-full py-2 bg-emerald-500 text-slate-950 font-black text-[11px] uppercase rounded-xl">
            Pronto! Entrar no Sistema
          </button>
        </div>

        <p class="text-[10px] text-slate-500 text-center">
          Esta escolha será salva e este aviso não aparecerá novamente.
        </p>

      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const showChoiceModal = ref(false);
const deferredPrompt = ref(null);
const showInstructions = ref(false);
const activeTab = ref('android');

const isStandalone = computed(() => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
});

const isMobile = computed(() => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || /iphone|ipad|ipod|android/i.test(navigator.userAgent);
});

onMounted(() => {
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
    activeTab.value = 'ios';
  }

  // Verifica se a escolha ("Baixar PWA" ou "Continuar na Web") já foi feita 1 vez
  const choiceMade = localStorage.getItem('gp_pwa_choice_made') === 'true';

  // Aparece APENAS 1 VEZ no celular caso não esteja em standalone e ainda não tenha escolhido
  if (isMobile.value && !isStandalone.value && !choiceMade) {
    showChoiceModal.value = true;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    if (isMobile.value && !isStandalone.value && !choiceMade) {
      showChoiceModal.value = true;
    }
  });
});

const handleChoosePwa = async () => {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    if (outcome === 'accepted') {
      saveChoice();
    } else {
      showInstructions.value = true;
    }
    deferredPrompt.value = null;
  } else {
    // Se o navegador não disparou prompt automático (ex: acesso por IP sem HTTPS), mostra passo a passo
    showInstructions.value = true;
  }
};

const handleChooseWeb = () => {
  saveChoice();
};

const saveChoice = () => {
  showChoiceModal.value = false;
  showInstructions.value = false;
  localStorage.setItem('gp_pwa_choice_made', 'true');
};
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
