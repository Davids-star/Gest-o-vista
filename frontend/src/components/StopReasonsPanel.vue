<template>
  <section id="paradas" class="dark-panel p-4 sm:p-6 space-y-4">
    <div>
      <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Motivos de parada</h2>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Os motivos cadastrados aqui aparecem para o operador no Totem ao registrar uma parada.</p>
    </div>

    <!-- Cadastro -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[140px_1fr_150px_1fr] gap-3 items-end">
      <div>
        <label :class="ROTULO">Código</label>
        <input v-model="novo.code" maxlength="100" placeholder="LIMPEZA" :class="CAMPO+' font-mono uppercase'" />
      </div>
      <div>
        <label :class="ROTULO">Nome da parada</label>
        <input v-model="novo.label" maxlength="255" placeholder="Limpeza da máquina" :class="CAMPO" />
      </div>
      <div>
        <label :class="ROTULO">Prioridade</label>
        <select v-model="novo.default_priority" :class="CAMPO">
          <option v-for="p in PRIORIDADES" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </div>
      <div>
        <label :class="ROTULO">Ao encerrar a parada</label>
        <select v-model="novo.session_action" :class="CAMPO">
          <option v-for="a in ACOES" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-4">
      <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input v-model="novo.planned" type="checkbox" class="w-4 h-4 accent-emerald-500" />
        Parada planejada (não conta como falha)
      </label>
      <button @click="cadastrar" :disabled="salvando || !podeCadastrar"
        class="ml-auto px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl uppercase tracking-wider">
        Adicionar parada
      </button>
    </div>
    <p v-if="mensagem" :class="mensagemOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'" class="text-sm font-semibold">{{ mensagem }}</p>

    <!-- Paradas padrão da fábrica: cadastra só as que ainda não existem -->
    <div class="flex flex-wrap items-center gap-3 border-t border-slate-200 dark:border-slate-800 pt-3">
      <button @click="cadastrarPadrao" :disabled="salvando || !faltamPadrao"
        class="px-4 py-2 text-xs font-bold uppercase text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed">
        Cadastrar paradas padrão
      </button>
      <span class="text-xs text-slate-500">{{ faltamPadrao ? `Faltam ${faltamPadrao} de ${PADRAO.length}: Pausa, Limpeza, Manutenção, Falta de material, Problema no equipamento, Troca de produto, Fim de turno, Outros.` : 'Todas as paradas padrão já estão cadastradas.' }}</span>
    </div>

    <!-- Lista -->
    <p v-if="!motivos.length" class="text-sm text-slate-500">Nenhum motivo de parada cadastrado ainda.</p>
    <div v-for="m in motivos" :key="m.id" class="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-slate-200 dark:border-slate-800 pt-3">
      <span class="font-mono text-xs font-bold text-slate-500 sm:w-32 shrink-0 truncate" :title="m.code">{{ m.code }}</span>

      <template v-if="editandoId === m.id">
        <input v-model="editandoNome" maxlength="255" :class="CAMPO+' flex-1'" />
        <button @click="salvarNome(m)" class="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl uppercase">Salvar</button>
        <button @click="editandoId = null" class="px-4 py-2 text-xs text-slate-500 uppercase">Cancelar</button>
      </template>
      <template v-else>
        <span class="flex-1 font-semibold">{{ m.label }}</span>
        <span class="text-[11px] px-2 py-1 rounded-lg bg-slate-500/15 text-slate-600 dark:text-slate-300">{{ rotuloPrioridade(m.default_priority) }}</span>
        <span v-if="m.planned" class="text-[11px] px-2 py-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">Planejada</span>
        <span class="text-xs px-2 py-1 rounded-lg" :class="m.active ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/15 text-slate-500'">
          {{ m.active ? 'Ativa' : 'Inativa' }}
        </span>
        <button @click="iniciarEdicao(m)" class="px-4 py-2 text-xs font-bold uppercase text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl">Renomear</button>
        <button @click="alternarAtivo(m)" class="px-4 py-2 text-xs font-bold uppercase text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl">
          {{ m.active ? 'Desativar' : 'Ativar' }}
        </button>
      </template>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { stopReasonsApi } from '../services/api';

const ROTULO = 'text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1.5';
const CAMPO = 'w-full bg-slate-50 dark:bg-[#070a0e] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm';

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];
const ACOES = [
  { value: 'end_session', label: 'Encerra a produção' },
  { value: 'ask_to_resume', label: 'Pergunta se continua' },
  { value: 'keep_running', label: 'Mantém a produção' },
];

// Mesmas paradas do banco de referência (seed): o que cada uma faz com a produção ao encerrar.
const PADRAO = [
  { code: 'PAUSA', label: 'Pausa', default_priority: 'baixa', planned: true, session_action: 'ask_to_resume' },
  { code: 'LIMPEZA', label: 'Limpeza', default_priority: 'baixa', planned: false, session_action: 'ask_to_resume' },
  { code: 'MANUTENCAO', label: 'Manutenção', default_priority: 'media', planned: false, session_action: 'ask_to_resume' },
  { code: 'MATERIAL', label: 'Falta de material', default_priority: 'alta', planned: false, session_action: 'ask_to_resume' },
  { code: 'EQUIPAMENTO', label: 'Problema no equipamento', default_priority: 'alta', planned: false, session_action: 'ask_to_resume' },
  { code: 'TROCA_PRODUTO', label: 'Troca de produto', default_priority: 'media', planned: true, session_action: 'end_session' },
  { code: 'FIM_TURNO', label: 'Fim de turno', default_priority: 'baixa', planned: true, session_action: 'end_session' },
  { code: 'OUTROS', label: 'Outros', default_priority: 'media', planned: true, session_action: 'ask_to_resume' },
];

const motivos = ref([]);
const novo = ref({ code: '', label: '', default_priority: 'media', session_action: 'end_session', planned: false });
const salvando = ref(false);
const mensagem = ref('');
const mensagemOk = ref(false);
const editandoId = ref(null);
const editandoNome = ref('');

const podeCadastrar = computed(() => /^[A-Za-z0-9_-]+$/.test(novo.value.code.trim()) && novo.value.label.trim());
const padraoQueFalta = computed(() => PADRAO.filter((p) => !motivos.value.some((m) => m.code === p.code)));
const faltamPadrao = computed(() => padraoQueFalta.value.length);
const rotuloPrioridade = (v) => PRIORIDADES.find((p) => p.value === v)?.label || v;

const avisar = (texto, ok) => {
  mensagem.value = texto;
  mensagemOk.value = ok;
};

const carregar = async () => {
  const lista = await stopReasonsApi.list();
  motivos.value = Array.isArray(lista) ? [...lista].sort((a, b) => a.label.localeCompare(b.label)) : [];
};

const cadastrar = async () => {
  salvando.value = true;
  try {
    await stopReasonsApi.create({
      code: novo.value.code.trim().toUpperCase(),
      label: novo.value.label.trim(),
      default_priority: novo.value.default_priority,
      session_action: novo.value.session_action,
      planned: novo.value.planned,
    });
    novo.value = { code: '', label: '', default_priority: 'media', session_action: 'end_session', planned: false };
    avisar('Parada adicionada.', true);
    await carregar();
  } catch (err) {
    avisar(err.message || 'Não foi possível adicionar a parada.', false);
  } finally {
    salvando.value = false;
  }
};

const cadastrarPadrao = async () => {
  salvando.value = true;
  let criadas = 0;
  try {
    for (const p of padraoQueFalta.value) {
      await stopReasonsApi.create(p);
      criadas += 1;
    }
    avisar(`${criadas} paradas padrão cadastradas.`, true);
  } catch (err) {
    avisar(`${criadas} cadastradas; parou em erro: ${err.message || 'falha ao cadastrar'}`, false);
  } finally {
    await carregar();
    salvando.value = false;
  }
};

const iniciarEdicao = (m) => {
  editandoId.value = m.id;
  editandoNome.value = m.label;
};

const salvarNome = async (m) => {
  const nome = editandoNome.value.trim();
  if (!nome) return;
  try {
    await stopReasonsApi.update(m.id, { label: nome });
    editandoId.value = null;
    avisar('Nome atualizado.', true);
    await carregar();
  } catch (err) {
    avisar(err.message || 'Não foi possível salvar o nome.', false);
  }
};

const alternarAtivo = async (m) => {
  try {
    await stopReasonsApi.update(m.id, { active: !m.active });
    await carregar();
  } catch (err) {
    avisar(err.message || 'Não foi possível alterar a parada.', false);
  }
};

onMounted(carregar);
</script>
