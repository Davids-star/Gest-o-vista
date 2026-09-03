<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
    <div class="bg-[#121824] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
      
      <!-- Modal Header -->
      <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            📅
          </div>
          <div>
            <h2 class="text-lg font-extrabold text-white uppercase tracking-wider">
              Detalhamento de Apontamentos & Ocorrências
            </h2>
            <p class="text-xs text-emerald-400 font-semibold font-mono">
              {{ formattedDate }}
              <span v-if="shiftLabel" class="text-slate-400 font-sans"> · Turno: <span class="text-amber-400">{{ shiftLabel }}</span></span>
              <span v-else class="text-slate-500 font-sans"> · Todos os turnos</span>
            </p>
          </div>
        </div>

        <button 
          @click="$emit('close')"
          class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-lg">
          ✕
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="p-12 text-center text-slate-400 space-y-3 flex-1 flex flex-col items-center justify-center">
        <div class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs font-semibold uppercase tracking-wider">Carregando dados do dia...</p>
      </div>

      <!-- Content -->
      <div v-else-if="apontamento" class="p-6 overflow-y-auto space-y-6 flex-1">
        
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produção Feita</span>
            <p class="text-2xl font-black font-mono text-emerald-400">
              {{ (apontamento.resumo?.producao || 0).toLocaleString('pt-BR') }}
            </p>
            <span class="text-[10px] text-slate-500">unidades no dia</span>
          </div>

          <div class="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tempo Produzido</span>
            <p class="text-xl font-black font-mono text-emerald-400">
              {{ formatDuracao(apontamento.resumo?.tempo_produzido_segundos) }}
            </p>
            <span class="text-[10px] text-slate-500">tempo útil em operação</span>
          </div>

          <div class="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tempo Parado</span>
            <p class="text-xl font-black font-mono text-red-400">
              {{ formatDuracao(apontamento.resumo?.tempo_parado_segundos) }}
            </p>
            <span class="text-[10px] text-slate-500">paradas registradas</span>
          </div>

          <div class="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Paradas</span>
            <p class="text-2xl font-black font-mono text-amber-400">
              {{ apontamento.resumo?.paradas || 0 }}
            </p>
            <span class="text-[10px] text-slate-500">ocorrências no turno</span>
          </div>
        </div>

        <!-- Navegação por Abas -->
        <div class="flex border-b border-slate-800 gap-4 text-xs font-bold uppercase tracking-wider">
          <button 
            @click="activeTab = 'sessoes'"
            class="pb-3 border-b-2 transition-colors flex items-center gap-2"
            :class="activeTab === 'sessoes' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'">
            📋 Apontamentos de Produção ({{ apontamento.sessoes?.length || 0 }})
          </button>
          <button 
            @click="activeTab = 'paradas'"
            class="pb-3 border-b-2 transition-colors flex items-center gap-2"
            :class="activeTab === 'paradas' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'">
            🛑 Defeitos & Paradas ({{ apontamento.paradas?.length || 0 }})
          </button>
        </div>

        <!-- ABA 1: SESSÕES DE APONTAMENTO -->
        <div v-if="activeTab === 'sessoes'" class="space-y-3">
          <div v-if="!apontamento.sessoes || !apontamento.sessoes.length" class="text-center py-8 text-slate-500 text-sm bg-slate-900/40 rounded-xl border border-slate-800/60">
            Nenhum apontamento de produção registrado nesta data.
          </div>

          <div 
            v-for="s in apontamento.sessoes" 
            :key="s.id"
            class="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-colors">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold font-mono">
                  {{ s.machine?.code || 'MAQ' }}
                </span>
                <span class="text-sm font-bold text-white">{{ s.product?.name || 'Produto' }}</span>
                <span class="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  lote: {{ s.lot?.code || 'N/A' }}
                </span>
              </div>
              <div class="text-[11px] font-mono text-slate-400">
                ⏰ {{ formatHora(s.started_at) }} → {{ s.ended_at ? formatHora(s.ended_at) : 'Em aberto' }}
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span class="text-slate-500 block text-[10px] uppercase font-bold">Produção</span>
                <span class="font-mono font-bold text-emerald-400 text-base">{{ s.producao }} un</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[10px] uppercase font-bold">Tempo Produzido</span>
                <span class="font-mono font-bold text-emerald-400">{{ formatDuracao(s.tempo_produzido_segundos) }}</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[10px] uppercase font-bold">Tempo Parado</span>
                <span class="font-mono font-bold text-red-400">{{ formatDuracao(s.tempo_parado_segundos) }}</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[10px] uppercase font-bold">Operador</span>
                <span class="font-bold text-slate-200 truncate block">{{ s.operator?.name || '—' }}</span>
              </div>
            </div>

            <!-- Detalhamento hora a hora — produção, tempo produzido e
                 tempo parado de cada hora que a sessão esteve ativa (mesma
                 lógica de "tempo produzido = elapsed - paradas" de cima,
                 só fatiada por hora; ver ApontamentoService.calcularPorHora). -->
            <div v-if="s.por_hora?.length" class="pt-2 border-t border-slate-800/60">
              <button
                @click="toggleHoraAHora(s.id)"
                class="text-[11px] font-bold text-slate-400 hover:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 transition-colors">
                <span :class="horasExpandidas.has(s.id) ? 'rotate-90' : ''" class="transition-transform inline-block">▸</span>
                Ver hora a hora ({{ s.por_hora.length }}h)
              </button>

              <div v-if="horasExpandidas.has(s.id)" class="mt-2 overflow-x-auto">
                <table class="w-full text-[11px] font-mono">
                  <thead>
                    <tr class="text-slate-500 uppercase text-[9px] font-sans font-bold">
                      <th class="text-left pb-1 pr-3">Hora</th>
                      <th class="text-right pb-1 pr-3">Produção</th>
                      <th class="text-right pb-1 pr-3">T. Produzido</th>
                      <th class="text-right pb-1">T. Parado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="h in s.por_hora" :key="h.hora" class="border-t border-slate-800/60">
                      <td class="py-1 pr-3 text-slate-300">{{ h.hora }}h–{{ String((parseInt(h.hora, 10) + 1) % 24).padStart(2, '0') }}h</td>
                      <td class="py-1 pr-3 text-right text-emerald-400 font-bold">{{ h.producao.toLocaleString('pt-BR') }}</td>
                      <td class="py-1 pr-3 text-right text-slate-300">{{ formatDuracao(h.tempo_produzido_segundos) }}</td>
                      <td class="py-1 text-right" :class="h.tempo_parado_segundos > 0 ? 'text-red-400 font-bold' : 'text-slate-600'">{{ formatDuracao(h.tempo_parado_segundos) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- ABA 2: DEFEITOS & PARADAS -->
        <div v-if="activeTab === 'paradas'" class="space-y-3">
          <div v-if="!apontamento.paradas || !apontamento.paradas.length" class="text-center py-8 text-slate-500 text-sm bg-slate-900/40 rounded-xl border border-slate-800/60">
            Nenhuma parada ou defeito registrado nesta data.
          </div>

          <div 
            v-for="p in apontamento.paradas" 
            :key="p.id"
            class="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-slate-400 font-semibold">
                  {{ formatHora(p.started_at) }} → {{ p.ended_at ? formatHora(p.ended_at) : 'Em aberto' }}
                </span>
                <span class="font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                  {{ p.reason?.label || 'Motivo não informado' }}
                </span>
                <span v-if="p.reason?.planned === false" class="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/40 text-red-400 text-[9px] uppercase font-bold">
                  Não Planejada
                </span>
              </div>
              <p v-if="p.observation" class="text-slate-400 text-xs italic">
                "{{ p.observation }}"
              </p>
            </div>

            <div class="text-right">
              <span class="text-[10px] uppercase text-slate-500 block font-bold">Duração</span>
              <span class="font-mono font-bold text-white text-sm">{{ formatDuracao(p.duration_seconds) }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Empty State / Erro -->
      <div v-else class="p-8 text-center text-slate-400">
        Nenhum dado encontrado para a data selecionada.
      </div>

      <!-- Modal Footer -->
      <div class="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
        <button 
          @click="$emit('close')"
          class="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-all">
          Fechar
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  date: { type: String, default: '' },
  shiftLabel: { type: String, default: '' },
  apontamento: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

defineEmits(['close']);

const activeTab = ref('sessoes');

// Quais sessões estão com o detalhamento hora a hora aberto — reactive()
// pra Vue rastrear mutação de Set (ref() não dispara re-render em .add/.delete).
const horasExpandidas = reactive(new Set());
const toggleHoraAHora = (sessionId) => {
  if (horasExpandidas.has(sessionId)) horasExpandidas.delete(sessionId);
  else horasExpandidas.add(sessionId);
};

const formattedDate = computed(() => {
  if (!props.date) return '';
  try {
    const [year, month, day] = props.date.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return props.date;
  }
});

const formatDuracao = (segundos) => {
  const s = Math.max(0, Math.round(segundos || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
};

const formatHora = (dt) => {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(dt);
  }
};
</script>
