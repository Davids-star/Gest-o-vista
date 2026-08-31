<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { user, clearSession } = useAuth()

const props = defineProps({
  // Passa 'dashboard' | 'operadores' | 'metas' | 'alertas' | 'apontamento' para destacar o item ativo
  activeItem: { type: String, default: '' },
})

// Usa o nome do usuário logado; fallback para a prop legada ou 'ADMIN'
const userName = computed(() => user.value?.name?.toUpperCase() ?? 'ADMIN')
const userRole = computed(() => {
  if (user.value?.role === 'chef') return 'Chef de Produção'
  if (user.value?.role === 'supervisor') return 'Painel do supervisor'
  return 'Painel do supervisor'
})

// Estado do menu retrátil (mobile)
const mobileOpen = ref(false)
const toggleMobile = () => (mobileOpen.value = !mobileOpen.value)
const closeMobile = () => (mobileOpen.value = false)

const navItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    route: '/dashboard',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
           </svg>`,
  },
  {
    key: 'operadores',
    label: 'Operadores',
    route: '/estacoes',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
           </svg>`,
  },
  {
    key: 'metas',
    label: 'Metas',
    route: '/metas',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
           </svg>`,
  },
  {
    key: 'alertas',
    label: 'Alertas',
    route: '/alertas',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
           </svg>`,
  },
  {
    key: 'apontamento',
    label: 'Apontamento',
    route: '/apontamento/01',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
           </svg>`,
  },
]

const logout = () => {
  clearSession()
  router.push('/supervisor/login')
}
</script>

<template>
  <!-- ─── BOTÃO HAMBURGUER MOBILE ─────────────────────────────── -->
  <button
    id="sidebar-toggle"
    @click="toggleMobile"
    class="fixed top-4 left-4 z-50 md:hidden bg-[#11161a] border border-[#1f2937] rounded-lg p-2 text-[#22ff88] shadow-lg"
    aria-label="Abrir menu"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  </button>

  <!-- ─── OVERLAY MOBILE ────────────────────────────────────────── -->
  <Transition name="fade">
    <div
      v-if="mobileOpen"
      @click="closeMobile"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
    />
  </Transition>

  <!-- ─── SIDEBAR ─────────────────────────────────────────────── -->
  <aside
    class="fixed top-0 left-0 h-full w-64 bg-[#0d1117] border-r border-[#1f2937] flex flex-col justify-between z-50 transition-transform duration-300 ease-in-out"
    :class="mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
  >
    <!-- Topo: Logo / Identificação -->
    <div>
      <div class="p-5 border-b border-[#1f2937] flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg border border-[#22ff88]/50 bg-[#22ff88]/10 text-[#22ff88] flex items-center justify-center font-bold shrink-0">
          ⚡
        </div>
        <div class="overflow-hidden">
          <div class="text-xs font-bold text-[#22ff88] tracking-widest uppercase truncate">{{ userName }}</div>
          <div class="text-xs font-semibold text-gray-400 tracking-wider truncate">{{ userRole }}</div>
        </div>
      </div>

      <!-- Itens de Navegação -->
      <nav class="p-3 space-y-1 mt-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.key"
          :to="item.route"
          @click="closeMobile"
          custom
          v-slot="{ navigate }"
        >
          <button
            @click="navigate"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all duration-150"
            :class="
              activeItem === item.key
                ? 'bg-[#22ff88] text-black shadow-[0_0_15px_rgba(34,255,136,0.25)] font-extrabold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            "
          >
            <span v-html="item.icon" class="shrink-0" />
            <span>{{ item.label }}</span>
          </button>
        </RouterLink>
      </nav>
    </div>

    <!-- Rodapé: Sair -->
    <div class="p-3 border-t border-[#1f2937]">
      <button
        @click="logout"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-800/40 transition-all uppercase tracking-wider"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>Sair</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
