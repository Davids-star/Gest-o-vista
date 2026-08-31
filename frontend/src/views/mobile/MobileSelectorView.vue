<template>
  <div class="min-h-screen gp-bg gp-text flex flex-col justify-between p-4 sm:p-6 select-none font-sans transition-colors">
    <!-- Header com Branding PWA -->
    <header class="w-full max-w-lg mx-auto pt-2 pb-4 flex items-center justify-between border-b gp-border">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-[1px] shadow-lg shadow-emerald-500/20">
          <div class="w-full h-full gp-bg rounded-[11px] flex items-center justify-center text-emerald-400 font-black text-sm">
            GP
          </div>
        </div>
        <div>
          <h1 class="text-base font-extrabold tracking-wide gp-text leading-tight">GP INDUSTRIAL</h1>
          <p class="text-[11px] text-emerald-400 font-semibold tracking-wider uppercase">Configuração Inicial Mobile</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Badge de Status PWA -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
             :class="isStandalone ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'">
          <span class="w-2 h-2 rounded-full" :class="isStandalone ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"></span>
          {{ isStandalone ? 'PWA Instalado' : 'Versão Web' }}
        </div>

        <!-- Acesso às Configurações (tema, conta, instalação) -->
        <button
          @click="router.push('/mobile/config')"
          aria-label="Configurações"
          class="w-8 h-8 rounded-full border gp-border flex items-center justify-center gp-text-muted hover:text-emerald-400 hover:border-emerald-500/40 transition-colors shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Conteúdo Principal -->
    <main class="w-full max-w-lg mx-auto py-6 space-y-6 flex-1 flex flex-col justify-center">

      <!-- BANNER DE INSTALAÇÃO DO PWA NA TELA INICIAL DO CELULAR -->
      <section v-if="!isStandalone && showInstallBanner"
               class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--gp-banner-from)] via-[var(--gp-surface)] to-[var(--gp-surface)] border border-emerald-500/40 p-5 shadow-2xl space-y-4">
        <div class="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-start gap-3.5">
          <div class="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18l-6-6h4V4h4v8h4l-6 6zM4 20h16" />
            </svg>
          </div>

          <div class="flex-1 space-y-1">
            <h2 class="text-sm font-bold gp-text uppercase tracking-wider">Como Baixar / Instalar no Celular</h2>
            <p class="text-xs gp-text-muted leading-relaxed">
              Adicione o GP Mobile como aplicativo para abrir em tela cheia direto da tela inicial.
            </p>
          </div>
        </div>

        <!-- Botão Direto (se o navegador suportar o evento automático) -->
        <div v-if="canInstallDirectly">
          <button
            @click="installPwa"
            class="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
            📲 Baixar / Instalar Agora
          </button>
        </div>

        <!-- Passo a Passo Manual (Android Chrome vs iPhone Safari) -->
        <div class="bg-[var(--gp-code-bg)] border gp-border rounded-xl p-3.5 space-y-3 text-xs">

          <!-- Abas Android / iPhone -->
          <div class="flex border-b gp-border pb-2 gap-2">
            <button
              @click="installTab = 'android'"
              class="flex-1 py-1.5 rounded-lg text-[11px] font-extrabold uppercase transition-all"
              :class="installTab === 'android' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'gp-text-muted hover:text-emerald-400'">
              🤖 Android (Chrome)
            </button>
            <button
              @click="installTab = 'ios'"
              class="flex-1 py-1.5 rounded-lg text-[11px] font-extrabold uppercase transition-all"
              :class="installTab === 'ios' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'gp-text-muted hover:text-emerald-400'">
              🍎 iPhone (Safari)
            </button>
          </div>

          <!-- Instruções Android -->
          <div v-if="installTab === 'android'" class="space-y-2 gp-text-muted">
            <ol class="list-decimal list-inside space-y-1.5 text-[11px]">
              <li>No Chrome do celular, toque nos <strong class="text-emerald-400">3 pontinhos (⋮)</strong> no canto superior direito.</li>
              <li>Procure e toque em <strong class="gp-text font-bold gp-surface-2 px-1.5 py-0.5 rounded border gp-border">"Adicionar à tela inicial"</strong> ou <strong class="gp-text font-bold gp-surface-2 px-1.5 py-0.5 rounded border gp-border">"Instalar aplicativo"</strong>.</li>
              <li>Confirme clicando em <strong>Adicionar</strong>.</li>
            </ol>
          </div>

          <!-- Instruções iPhone -->
          <div v-if="installTab === 'ios'" class="space-y-2 gp-text-muted">
            <ol class="list-decimal list-inside space-y-1.5 text-[11px]">
              <li>No Safari do iPhone, toque no ícone de <strong class="text-emerald-400">Compartilhar ( ⎋ / ↑ )</strong> no rodapé.</li>
              <li>Role para baixo e selecione <strong class="gp-text font-bold gp-surface-2 px-1.5 py-0.5 rounded border gp-border">"Adicionar à Tela de Início"</strong>.</li>
              <li>Toque em <strong class="text-emerald-400 font-bold">Adicionar</strong> no canto superior.</li>
            </ol>
          </div>

        </div>
      </section>

      <!-- TÍTULO DA SELEÇÃO DE MODO -->
      <div class="text-center space-y-1">
        <h2 class="text-xl font-extrabold gp-text tracking-wide">Escolha sua função no celular</h2>
        <p class="text-xs gp-text-muted">Selecione como deseja utilizar a aplicação:</p>
      </div>

      <!-- SELEÇÃO DE PERFIL / MODO -->
      <div class="grid grid-cols-1 gap-4">

        <!-- OPÇÃO 1: TOTEM OPERACIONAL DE MÁQUINA -->
        <div
          @click="selectMode('totem')"
          class="group relative overflow-hidden rounded-2xl gp-surface border gp-border hover:border-emerald-500/50 p-5 transition-all cursor-pointer hover:shadow-xl hover:shadow-emerald-500/10 active:scale-[0.98]">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 class="text-base font-bold gp-text group-hover:text-emerald-400 transition-colors">Totem do Operador</h3>
                <p class="text-xs gp-text-muted">Apontamento de produção & paradas por máquina</p>
              </div>
            </div>
            <div class="w-8 h-8 rounded-full bg-[var(--gp-border)] group-hover:bg-emerald-500 group-hover:text-slate-950 flex items-center justify-center gp-text-muted transition-colors">
              →
            </div>
          </div>

          <!-- SELETOR RÁPIDO DE ESTAÇÃO DENTRO DO MODO TOTEM -->
          <div v-if="activeMode === 'totem'" class="mt-4 pt-4 border-t gp-border space-y-3" @click.stop>
            <label class="block text-xs uppercase font-bold gp-text-muted">Selecione a Estação da Fábrica *</label>
            <select
              v-model="selectedStationId"
              class="w-full bg-[var(--gp-code-bg)] border gp-border gp-text rounded-xl p-3 text-sm font-semibold focus:border-emerald-500 focus:outline-none">
              <option value="" disabled>Selecione uma estação...</option>
              <option v-for="(m, idx) in store.machines" :key="m.id" :value="m.id">
                Máquina {{ (m.code && parseInt(m.code, 10) < 100) ? parseInt(m.code, 10) : (idx + 1) }} — {{ m.name || 'Estação' }}
              </option>
            </select>

            <button
              @click="confirmTotemStation"
              :disabled="!selectedStationId"
              class="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 transition-all shadow-md">
              Abrir Operação da Máquina →
            </button>
          </div>
        </div>

        <!-- OPÇÃO 2: DASHBOARD SUPERVISOR -->
        <div
          @click="selectMode('supervisor')"
          class="group relative overflow-hidden rounded-2xl gp-surface border gp-border hover:border-blue-500/50 p-5 transition-all cursor-pointer hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.98]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-slate-950 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 class="text-base font-bold gp-text group-hover:text-blue-400 transition-colors">Supervisor / Gestão</h3>
                <p class="text-xs gp-text-muted">Dashboards, OEE, alertas e auditoria em tempo real</p>
              </div>
            </div>
            <div class="w-8 h-8 rounded-full bg-[var(--gp-border)] group-hover:bg-blue-500 group-hover:text-slate-950 flex items-center justify-center gp-text-muted transition-colors">
              →
            </div>
          </div>
        </div>

        <!-- OPÇÃO 3: PAINEL TV / MONITORAMENTO -->
        <div
          @click="selectMode('tv')"
          class="group relative overflow-hidden rounded-2xl gp-surface border gp-border hover:border-purple-500/50 p-5 transition-all cursor-pointer hover:shadow-xl hover:shadow-purple-500/10 active:scale-[0.98]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-slate-950 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 class="text-base font-bold gp-text group-hover:text-purple-400 transition-colors">Painel TV ANDON</h3>
                <p class="text-xs gp-text-muted">Visão geral contínua para telas e displays da fábrica</p>
              </div>
            </div>
            <div class="w-8 h-8 rounded-full bg-[var(--gp-border)] group-hover:bg-purple-500 group-hover:text-slate-950 flex items-center justify-center gp-text-muted transition-colors">
              →
            </div>
          </div>
        </div>

      </div>

      <!-- PAINEL DE DESLOGIN SE HOUVER CONTA LOGADA -->
      <div v-if="isLoggedIn" class="pt-4 border-t gp-border flex items-center justify-between gp-surface-2 p-4 rounded-xl">
        <div>
          <p class="text-xs gp-text-muted">Conta atual:</p>
          <p class="text-sm font-bold text-emerald-400">{{ user?.name || user?.email || 'Usuário' }}</p>
        </div>
        <button
          @click="handleLogout"
          class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-bold rounded-xl uppercase transition-all">
          Sair da Conta 🚪
        </button>
      </div>

    </main>

    <!-- Footer -->
    <footer class="w-full max-w-lg mx-auto pt-4 text-center border-t gp-border">
      <p class="text-[11px] gp-text-muted">GP Industrial System © 2026 • PWA Enabled</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProductionStore } from '../../stores/productionStore';
import { useAuth } from '../../composables/useAuth';
import { usePwaInstall } from '../../composables/usePwaInstall';

const router = useRouter();
const store = useProductionStore();
const { isLoggedIn, user, clearSession } = useAuth();
const { isStandalone, isIos, canInstallDirectly, promptInstall } = usePwaInstall();

const activeMode = ref('');
const selectedStationId = ref('');
const showInstallBanner = ref(true);
const installTab = ref('android');

onMounted(async () => {
  if (isIos.value) installTab.value = 'ios';

  if (!store.machines.length) {
    await store.fetchMachines();
  }
});

const selectMode = (mode) => {
  if (activeMode.value === mode && mode !== 'totem') {
    navigateMode(mode);
    return;
  }
  activeMode.value = mode;

  if (mode === 'totem') {
    if (store.machines.length && !selectedStationId.value) {
      selectedStationId.value = store.machines[0].id;
    }
  } else {
    navigateMode(mode);
  }
};

const confirmTotemStation = () => {
  if (!selectedStationId.value) return;
  store.selectStation(selectedStationId.value);

  localStorage.setItem('gp_mobile_configured', 'true');
  localStorage.setItem('gp_pwa_remember', 'true');
  localStorage.setItem('gp_pwa_default_mode', 'totem');
  localStorage.setItem('gp_pwa_default_station', selectedStationId.value);

  router.push(`/totem/producao/${selectedStationId.value}`);
};

const navigateMode = (mode) => {
  localStorage.setItem('gp_mobile_configured', 'true');
  localStorage.setItem('gp_pwa_remember', 'true');
  localStorage.setItem('gp_pwa_default_mode', mode);

  if (mode === 'totem') {
    const savedStation = localStorage.getItem('gp_pwa_default_station');
    if (savedStation) {
      router.push(`/totem/producao/${savedStation}`);
    } else {
      router.push('/totem/login');
    }
  } else if (mode === 'supervisor') {
    router.push('/dashboard');
  } else if (mode === 'tv') {
    router.push('/tv');
  }
};

const handleLogout = () => {
  clearSession();
  router.push('/supervisor/login');
};

const installPwa = async () => {
  const outcome = await promptInstall();
  if (outcome === 'accepted') {
    showInstallBanner.value = false;
  }
};
</script>
