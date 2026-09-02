<template>
  <div class="min-h-screen bg-[#0b0f17] text-white font-sans flex select-none">
    <AppSidebar />

    <main class="flex-1 p-4 pt-[calc(4rem+env(safe-area-inset-top))] md:p-6 md:pt-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white">CENTRAL DE ALERTAS</h1>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
            Notificações e ocorrências em tempo real
          </p>
        </div>
        <div class="flex items-center gap-3 self-start sm:self-auto">
          <button
            @click="store.fetchAlerts()"
            :disabled="store.loading.alerts"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg uppercase transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <svg class="w-3.5 h-3.5" :class="store.loading.alerts ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            ATUALIZAR
          </button>
        </div>
      </div>

      <!-- Possíveis paradas pendentes (GET /possible-stops?status=pending) —
           detectadas automaticamente (sem produção há tempo demais), mas
           ainda sem decisão de alguém: confirmar como parada real ou
           descartar como falso alarme. Mesma decisão que já existia só no
           Totem — agora visível aqui também (inclusive no celular).
           Chain própria (v-if isolado), independente do bloco de alertas
           reais abaixo. -->
      <div v-if="store.possibleStops.length" class="space-y-4 mb-6 md:mb-8">
        <p class="text-xs text-amber-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
          ⚠️ {{ store.possibleStops.length }} possível{{ store.possibleStops.length > 1 ? 'is' : '' }} parada{{ store.possibleStops.length > 1 ? 's' : '' }} — aguardando confirmação
        </p>

        <div
          v-for="p in store.possibleStops"
          :key="p.id"
          class="dark-panel p-4 sm:p-6 border-2 border-orange-500/50 bg-orange-500/5 space-y-4"
        >
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-orange-500/10 border-2 border-orange-500 text-orange-400 flex items-center justify-center text-lg shrink-0">⚠️</div>
            <div>
              <p class="text-orange-400 font-black text-sm uppercase tracking-wider">
                {{ p.machine?.name || p.machine?.code || 'Máquina' }}
              </p>
              <p class="text-white text-sm mt-0.5">
                Sem produção detectada há {{ Math.round(p.duration_seconds / 60) }} min. É uma parada de verdade?
              </p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
            <select
              v-model="reasonByPossibleStop[p.id]"
              class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="" disabled>Selecione o motivo...</option>
              <option v-for="reason in store.stopReasons" :key="reason.id" :value="reason.id">{{ reason.label }}</option>
            </select>
            <button
              @click="handleConfirmarPossivel(p.id)"
              :disabled="!reasonByPossibleStop[p.id] || p._resolving"
              class="px-6 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 shrink-0"
            >
              Confirmar parada
            </button>
            <button
              @click="handleDescartarPossivel(p.id)"
              :disabled="p._resolving"
              class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm uppercase tracking-wider rounded-xl transition-all active:scale-95 shrink-0 disabled:opacity-40"
            >
              Não é parada
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading.alerts" class="dark-panel p-10 text-center">
        <div class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-slate-400 text-sm">Buscando alertas da API...</p>
      </div>

      <!-- Erro de conexão -->
      <div v-else-if="store.errors.alerts" class="dark-panel p-6 border border-red-500/30 text-center">
        <p class="text-red-400 font-semibold">⚠ Erro ao buscar alertas: {{ store.errors.alerts }}</p>
        <p class="text-slate-500 text-xs mt-1">Verifique se o backend está rodando na porta 3000</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!store.alerts.length" class="dark-panel p-12 text-center space-y-3">
        <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p class="text-emerald-400 font-bold text-lg">Nenhum alerta em aberto</p>
        <p class="text-slate-400 text-sm">Sistema operando normalmente.</p>
        <p class="text-slate-500 text-xs">Fonte: <code class="text-emerald-400">GET /alertas/abertos</code></p>
      </div>

      <!-- Alertas reais (GET /alertas/abertos) -->
      <div v-else class="space-y-4">
        <p class="text-xs text-slate-500 uppercase tracking-wider font-semibold">
          {{ store.alerts.length }} alerta{{ store.alerts.length > 1 ? 's' : '' }} em aberto
        </p>

        <div
          v-for="alert in store.alerts"
          :key="alert.id"
          class="dark-panel p-4 sm:p-6 border-l-4 transition-all"
          :class="alert.severity === 'critical' || alert.severity === 'high'
            ? 'border-l-red-500'
            : 'border-l-amber-500'"
        >
          <div class="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div class="space-y-1.5 flex-1">
              <div class="flex flex-wrap items-center gap-3">
                <span
                  class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
                  :class="alert.severity === 'critical' || alert.severity === 'high'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'"
                >
                  {{ alert.severity || 'alerta' }}
                </span>
                <span class="text-sm font-bold text-white uppercase">
                  {{ alert.machine?.name || alert.machine?.code || 'Máquina' }}
                </span>
                <span class="text-xs font-mono text-slate-400">
                  {{ formatDateTime(alert.created_at) }}
                </span>
              </div>
              <p class="text-sm text-slate-300 font-medium">{{ alert.message || alert.descricao }}</p>
            </div>

            <!-- PATCH /alertas/:id/visto -->
            <button
              @click="handleAcknowledge(alert.id)"
              :disabled="alert._acknowledging || alert.status === 'acknowledged'"
              class="shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-40"
              :class="alert.status === 'acknowledged'
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'"
            >
              <span v-if="alert._acknowledging">...</span>
              <span v-else-if="alert.status === 'acknowledged'">✓ Visto</span>
              <span v-else>RECONHECER</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue';
import { useProductionStore } from '../../stores/productionStore';
import AppSidebar from '../../components/AppSidebar.vue';

const store = useProductionStore();

// Motivo selecionado por possível parada (várias podem estar pendentes ao
// mesmo tempo, em máquinas diferentes — cada uma com seu próprio select).
const reasonByPossibleStop = reactive({});

const formatDateTime = (dt) => {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString('pt-BR', { timeStyle: 'short', dateStyle: 'short' });
  } catch {
    return String(dt);
  }
};

onMounted(() => {
  store.fetchAlerts();
  store.fetchPossibleStops({ status: 'pending' });
  if (!store.stopReasons.length) store.fetchStopReasons();
});

// PATCH /alertas/:id/visto → PostgreSQL
const handleAcknowledge = async (alertId) => {
  const alert = store.alerts.find((a) => a.id === alertId);
  if (alert) alert._acknowledging = true;
  try {
    await store.acknowledgeAlert(alertId);
    // acknowledgeAlert já remove da lista local após confirmação da API
  } catch (err) {
    // Reativa o botão sem bloquear a UI com alert() nativo
    if (alert) alert._acknowledging = false;
    console.warn('[AlertasView] Erro ao reconhecer alerta:', err.message);
  }
};

// PATCH /possible-stops/:id/confirmar → vira parada real (ver
// PossibleStopsService.confirmar no backend)
const handleConfirmarPossivel = async (id) => {
  const reasonId = reasonByPossibleStop[id];
  if (!reasonId) return;
  const item = store.possibleStops.find((p) => p.id === id);
  if (item) item._resolving = true;
  try {
    await store.confirmarPossibleStop(id, { reason_id: reasonId });
    delete reasonByPossibleStop[id];
    // store.confirmarPossibleStop já remove da lista local após sucesso
  } catch (err) {
    if (item) item._resolving = false;
    console.warn('[AlertasView] Erro ao confirmar possível parada:', err.message);
  }
};

// PATCH /possible-stops/:id/descartar → marca como falso alarme
const handleDescartarPossivel = async (id) => {
  const item = store.possibleStops.find((p) => p.id === id);
  if (item) item._resolving = true;
  try {
    await store.descartarPossibleStop(id);
    delete reasonByPossibleStop[id];
  } catch (err) {
    if (item) item._resolving = false;
    console.warn('[AlertasView] Erro ao descartar possível parada:', err.message);
  }
};
</script>
