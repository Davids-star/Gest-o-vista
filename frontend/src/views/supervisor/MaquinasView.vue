<template>
  <div class="min-h-screen bg-[#f1f5f9] dark:bg-[#070a0e] text-slate-900 dark:text-white font-sans flex select-none">
    <AppSidebar />

    <main class="flex-1 p-4 pt-[calc(4rem+env(safe-area-inset-top))] md:p-6 md:pt-6 lg:p-8 overflow-y-auto max-w-5xl mx-auto w-full space-y-6">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider">MÁQUINAS</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Cadastre as máquinas da fábrica e defina o nome de cada uma.</p>
      </div>

      <!-- Cadastro -->
      <section class="dark-panel p-4 sm:p-6 space-y-4">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Nova máquina</h2>
        <div class="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-3 items-end">
          <div>
            <label class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Código</label>
            <input v-model="novo.code" maxlength="50" placeholder="MQ-05"
              class="w-full bg-slate-50 dark:bg-[#070a0e] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Nome</label>
            <input v-model="novo.name" maxlength="255" placeholder="Forno Contínuo 2"
              class="w-full bg-slate-50 dark:bg-[#070a0e] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm" />
          </div>
          <button @click="cadastrar" :disabled="salvando || !novo.code.trim() || !novo.name.trim()"
            class="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl uppercase tracking-wider">
            Cadastrar
          </button>
        </div>
        <p v-if="mensagem" :class="mensagemOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'" class="text-sm font-semibold">{{ mensagem }}</p>
      </section>

      <!-- Lista -->
      <section class="dark-panel p-4 sm:p-6 space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Máquinas cadastradas</h2>
        <p v-if="!maquinas.length" class="text-sm text-slate-500">Nenhuma máquina cadastrada ainda.</p>

        <div v-for="m in maquinas" :key="m.id" class="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-slate-200 dark:border-slate-800 pt-3">
          <span class="font-mono text-xs font-bold text-slate-500 w-28 shrink-0">{{ m.code }}</span>

          <template v-if="editandoId === m.id">
            <input v-model="editandoNome" maxlength="255"
              class="flex-1 bg-slate-50 dark:bg-[#070a0e] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm" />
            <button @click="salvarNome(m)" class="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl uppercase">Salvar</button>
            <button @click="editandoId = null" class="px-4 py-2 text-xs text-slate-500 uppercase">Cancelar</button>
          </template>
          <template v-else>
            <span class="flex-1 font-semibold">{{ m.name }}</span>
            <span class="text-xs px-2 py-1 rounded-lg" :class="m.active ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/15 text-slate-500'">
              {{ m.active ? 'Ativa' : 'Inativa' }}
            </span>
            <button @click="iniciarEdicao(m)" class="px-4 py-2 text-xs font-bold uppercase text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl">Renomear</button>
            <button @click="alternarAtiva(m)" class="px-4 py-2 text-xs font-bold uppercase text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl">
              {{ m.active ? 'Desativar' : 'Ativar' }}
            </button>
          </template>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AppSidebar from '../../components/AppSidebar.vue';
import { machinesApi } from '../../services/api';

const maquinas = ref([]);
const novo = ref({ code: '', name: '' });
const salvando = ref(false);
const mensagem = ref('');
const mensagemOk = ref(false);
const editandoId = ref(null);
const editandoNome = ref('');

const avisar = (texto, ok) => {
  mensagem.value = texto;
  mensagemOk.value = ok;
};

const carregar = async () => {
  const lista = await machinesApi.list();
  maquinas.value = Array.isArray(lista) ? [...lista].sort((a, b) => a.code.localeCompare(b.code)) : [];
};

const cadastrar = async () => {
  salvando.value = true;
  try {
    await machinesApi.create({ code: novo.value.code.trim(), name: novo.value.name.trim() });
    novo.value = { code: '', name: '' };
    avisar('Máquina cadastrada.', true);
    await carregar();
  } catch (err) {
    avisar(err.message || 'Não foi possível cadastrar a máquina.', false);
  } finally {
    salvando.value = false;
  }
};

const iniciarEdicao = (m) => {
  editandoId.value = m.id;
  editandoNome.value = m.name;
};

const salvarNome = async (m) => {
  const nome = editandoNome.value.trim();
  if (!nome) return;
  try {
    await machinesApi.update(m.id, { name: nome });
    editandoId.value = null;
    avisar('Nome atualizado.', true);
    await carregar();
  } catch (err) {
    avisar(err.message || 'Não foi possível salvar o nome.', false);
  }
};

const alternarAtiva = async (m) => {
  try {
    await machinesApi.update(m.id, { active: !m.active });
    await carregar();
  } catch (err) {
    avisar(err.message || 'Não foi possível alterar a máquina.', false);
  }
};

onMounted(carregar);
</script>
