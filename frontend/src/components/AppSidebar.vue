<template>
  <!-- Botão Hamburger Mobile Header -->
  <!-- pt- usa env(safe-area-inset-top) por cima do py-3 normal: no iPhone
       (notch/Dynamic Island, viewport-fit=cover no index.html) esse cabeçalho
       fixo em top-0 ficava colado no limite da tela, com o botão de menu
       quase embaixo da câmera — difícil ou impossível de tocar com precisão.
       Em aparelhos sem notch, env() resolve pra 0 e nada muda. -->
  <div
    class="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0e131f] border-b border-[#1e293b] px-4 pb-3 flex items-center justify-between shadow-md"
    style="padding-top: calc(0.75rem + env(safe-area-inset-top, 0px));"
  >
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
        ⚡
      </div>
      <span class="text-emerald-400 font-extrabold text-sm tracking-wider uppercase">
        {{ isAdmin ? 'ADMINISTRADOR' : 'SUPERVISOR' }}
      </span>
    </div>
    <button
      @click="mobileOpen = !mobileOpen"
      class="p-2 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 focus:outline-none"
      aria-label="Abrir Menu"
    >
      <svg v-if="!mobileOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <!-- Overlay Backdrop Mobile -->
  <Transition name="fade">
    <div
      v-if="mobileOpen"
      @click="mobileOpen = false"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
    />
  </Transition>

  <!-- Sidebar Container -->
  <aside
    class="fixed md:static top-0 left-0 bottom-0 z-50 w-64 bg-[#0e131f] border-r border-[#1e293b] flex flex-col justify-between p-4 min-h-screen transition-transform duration-300 ease-in-out shrink-0"
    :class="mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    style="padding-top: calc(1rem + env(safe-area-inset-top, 0px));"
  >
    <div>
      <!-- Brand Header (Desktop) -->
      <div class="mb-8 px-2 hidden md:block">
        <h2 class="text-emerald-400 font-extrabold text-lg tracking-wider uppercase">
          {{ isAdmin ? 'ADMINISTRADOR' : 'SUPERVISOR' }}
        </h2>
        <p class="text-xs text-slate-400 font-medium uppercase tracking-widest">
          {{ isAdmin ? 'Painel Executivo' : 'Painel de Produção' }}
        </p>
      </div>

      <!-- Brand Header (Mobile Drawer) -->
      <div class="mb-6 px-2 md:hidden flex justify-between items-center border-b border-slate-800 pb-3">
        <div>
          <h2 class="text-emerald-400 font-extrabold text-base tracking-wider uppercase">
            {{ isAdmin ? 'ADMINISTRADOR' : 'SUPERVISOR' }}
          </h2>
          <p class="text-[10px] text-slate-400 font-medium uppercase">
            {{ isAdmin ? 'Painel Executivo' : 'Painel de Produção' }}
          </p>
        </div>
        <button @click="mobileOpen = false" class="text-slate-400 hover:text-white p-1">
          &times;
        </button>
      </div>

      <!-- Navigation Links -->
      <nav class="space-y-2">
        <!-- Dashboard -->
        <router-link
          to="/dashboard"
          @click="mobileOpen = false"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
          :class="$route.path === '/dashboard' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          DASHBOARD
        </router-link>

        <!-- Estações / Monitoramento -->
        <router-link
          v-if="!isAdmin"
          to="/estacoes"
          @click="mobileOpen = false"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
          :class="$route.path === '/estacoes' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          ESTAÇÕES
        </router-link>

        <!-- Apontamento -->
        <router-link
          v-if="!isAdmin"
          to="/apontamento"
          @click="mobileOpen = false"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
          :class="$route.path.startsWith('/apontamento') ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          APONTAMENTO
        </router-link>

        <!-- Metas -->
        <router-link
          to="/metas"
          @click="mobileOpen = false"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
          :class="$route.path === '/metas' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          METAS
        </router-link>

        <!-- Alertas -->
        <router-link
          to="/alertas"
          @click="mobileOpen = false"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
          :class="$route.path === '/alertas' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          ALERTAS
        </router-link>

        <!-- Lotes -->
        <router-link
          v-if="!isAdmin"
          to="/lotes"
          @click="mobileOpen = false"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
          :class="$route.path.startsWith('/lotes') ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          LOTES
        </router-link>

        <!-- Configurações (conta, tema claro/escuro, instalar PWA) — só no menu mobile -->
        <router-link
          to="/mobile/config"
          @click="mobileOpen = false"
          class="md:hidden flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
          :class="$route.path === '/mobile/config' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          CONFIGURAÇÕES
        </router-link>

        <!-- Divisor -->
        <div class="border-t border-slate-800 my-1"></div>

        <!-- Painel TV -->
        <router-link
          to="/tv"
          @click="mobileOpen = false"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
          :class="$route.path === '/tv' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          PAINEL TV
        </router-link>

        <!-- Totem -->
        <router-link
          v-if="!isAdmin"
          to="/totem/login"
          @click="mobileOpen = false"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
          :class="$route.path.startsWith('/totem') ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          TOTEM
        </router-link>
      </nav>
    </div>

    <!-- Usuário Logado e Logout -->
    <div class="space-y-3 pt-4">
      <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-[11px]">
        <p class="text-slate-400 font-semibold uppercase tracking-wider">Logado como:</p>
        <p class="text-emerald-400 font-bold mt-0.5 truncate">{{ user?.name || user?.email || 'Usuário' }}</p>
        <p class="text-slate-500 uppercase">{{ role || '—' }}</p>
      </div>

      <button
        @click="handleLogout"
        class="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-800/50 border border-slate-700/50 hover:bg-red-500/10 hover:border-red-500/40 text-slate-300 hover:text-red-400 rounded-xl text-sm font-bold transition-all"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        SAIR DA CONTA
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { role, isAdmin, user, clearSession } = useAuth();
const mobileOpen = ref(false);

const handleLogout = () => {
  mobileOpen.value = false;
  clearSession();
  router.push('/supervisor/login');
};
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
