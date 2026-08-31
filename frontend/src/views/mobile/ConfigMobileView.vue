<template>
  <div class="min-h-screen gp-bg gp-text flex flex-col p-4 sm:p-6 select-none font-sans transition-colors">
    <!-- Header -->
    <header class="w-full max-w-lg mx-auto pt-2 pb-4 flex items-center gap-3 border-b gp-border">
      <button
        @click="router.back()"
        aria-label="Voltar"
        class="w-9 h-9 rounded-full border gp-border flex items-center justify-center gp-text-muted hover:text-emerald-400 hover:border-emerald-500/40 transition-colors shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div>
        <h1 class="text-base font-extrabold tracking-wide gp-text leading-tight">Configurações</h1>
        <p class="text-[11px] text-emerald-400 font-semibold tracking-wider uppercase">GP Mobile</p>
      </div>
    </header>

    <main class="w-full max-w-lg mx-auto py-6 space-y-6 flex-1">

      <!-- QUEM ESTÁ USANDO -->
      <section class="rounded-2xl gp-surface border gp-border p-5 space-y-4">
        <h2 class="text-xs font-bold gp-text-muted uppercase tracking-wider">Quem está usando</h2>

        <div v-if="isLoggedIn" class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-lg shrink-0">
            {{ initials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold gp-text truncate">{{ user?.name || user?.email || 'Usuário' }}</p>
            <span class="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              {{ roleLabel }}
            </span>
          </div>
        </div>
        <p v-else class="text-sm gp-text-muted">Nenhuma conta logada no momento.</p>

        <button
          v-if="isLoggedIn"
          @click="handleLogout"
          class="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-bold rounded-xl uppercase transition-all">
          Sair da Conta 🚪
        </button>
        <button
          v-else
          @click="router.push('/supervisor/login')"
          class="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl uppercase tracking-wider transition-all">
          Entrar
        </button>
      </section>

      <!-- TEMA -->
      <section class="rounded-2xl gp-surface border gp-border p-5 space-y-4">
        <h2 class="text-xs font-bold gp-text-muted uppercase tracking-wider">Aparência</h2>
        <p class="text-xs gp-text-muted -mt-2">
          Vale para estas telas de celular. O restante do sistema (dashboard, totem, TV) continua escuro por enquanto.
        </p>

        <div class="grid grid-cols-2 gap-3">
          <button
            @click="setTheme('dark')"
            class="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all"
            :class="theme === 'dark' ? 'border-emerald-500 bg-emerald-500/10' : 'gp-border hover:border-emerald-500/30'">
            <svg class="w-5 h-5" :class="theme === 'dark' ? 'text-emerald-400' : 'gp-text-muted'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span class="text-xs font-bold" :class="theme === 'dark' ? 'text-emerald-400' : 'gp-text'">Escuro</span>
          </button>

          <button
            @click="setTheme('light')"
            class="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all"
            :class="theme === 'light' ? 'border-emerald-500 bg-emerald-500/10' : 'gp-border hover:border-emerald-500/30'">
            <svg class="w-5 h-5" :class="theme === 'light' ? 'text-emerald-400' : 'gp-text-muted'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span class="text-xs font-bold" :class="theme === 'light' ? 'text-emerald-400' : 'gp-text'">Claro</span>
          </button>
        </div>
      </section>

      <!-- INSTALAR PWA -->
      <section class="rounded-2xl gp-surface border gp-border p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold gp-text-muted uppercase tracking-wider">Instalação</h2>
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
               :class="isStandalone ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'">
            <span class="w-2 h-2 rounded-full" :class="isStandalone ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"></span>
            {{ isStandalone ? 'PWA Instalado' : 'Versão Web' }}
          </div>
        </div>

        <p v-if="isStandalone" class="text-sm gp-text-muted">
          Você já está usando o app instalado na tela inicial. 👍
        </p>

        <template v-else>
          <p class="text-xs gp-text-muted">
            Adicione o GP Mobile à tela inicial do celular para abrir em tela cheia, como um app normal.
          </p>

          <button
            v-if="canInstallDirectly"
            @click="installNow"
            class="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
            📲 Baixar / Instalar Agora
          </button>

          <div class="bg-[var(--gp-code-bg)] border gp-border rounded-xl p-3.5 space-y-3 text-xs">
            <div class="flex border-b gp-border pb-2 gap-2">
              <button
                @click="installTab = 'android'"
                class="flex-1 py-1.5 rounded-lg text-[11px] font-extrabold uppercase transition-all"
                :class="installTab === 'android' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'gp-text-muted hover:text-emerald-400'">
                🤖 Android
              </button>
              <button
                @click="installTab = 'ios'"
                class="flex-1 py-1.5 rounded-lg text-[11px] font-extrabold uppercase transition-all"
                :class="installTab === 'ios' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'gp-text-muted hover:text-emerald-400'">
                🍎 iPhone
              </button>
            </div>

            <ol v-if="installTab === 'android'" class="list-decimal list-inside space-y-1.5 text-[11px] gp-text-muted">
              <li>Toque nos <strong class="text-emerald-400">3 pontinhos (⋮)</strong> no Chrome.</li>
              <li>Toque em <strong class="gp-text font-bold">"Adicionar à tela inicial"</strong>.</li>
              <li>Confirme em <strong>Adicionar</strong>.</li>
            </ol>
            <ol v-else class="list-decimal list-inside space-y-1.5 text-[11px] gp-text-muted">
              <li>Toque em <strong class="text-emerald-400">Compartilhar ( ⎋ / ↑ )</strong> no Safari.</li>
              <li>Selecione <strong class="gp-text font-bold">"Adicionar à Tela de Início"</strong>.</li>
              <li>Toque em <strong class="text-emerald-400 font-bold">Adicionar</strong>.</li>
            </ol>
          </div>
        </template>
      </section>

    </main>

    <footer class="w-full max-w-lg mx-auto pt-4 text-center border-t gp-border">
      <p class="text-[11px] gp-text-muted">GP Industrial System © 2026 • PWA Enabled</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../../composables/useAuth';
import { useTheme } from '../../composables/useTheme';
import { usePwaInstall } from '../../composables/usePwaInstall';

const router = useRouter();
const { isLoggedIn, user, role, clearSession } = useAuth();
const { theme, setTheme } = useTheme();
const { isStandalone, isIos, canInstallDirectly, promptInstall } = usePwaInstall();

const installTab = ref('android');

onMounted(() => {
  if (isIos.value) installTab.value = 'ios';
});

const roleLabels = {
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  operador: 'Operador',
};
const roleLabel = computed(() => roleLabels[role.value] || 'Usuário');

const initials = computed(() => {
  const source = user?.value?.name || user?.value?.email || '?';
  return source
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
});

const handleLogout = () => {
  clearSession();
  router.push('/supervisor/login');
};

const installNow = async () => {
  await promptInstall();
};
</script>
