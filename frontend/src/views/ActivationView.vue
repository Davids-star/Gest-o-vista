<template>
  <div class="min-h-dvh w-screen bg-[#070a0e] text-white flex items-center justify-center p-4 font-sans">
    <div class="w-full max-w-md bg-[#0d121c] border-2 border-emerald-500/50 rounded-2xl p-6 space-y-5">
      <div class="text-center space-y-1">
        <h1 class="text-xl font-black uppercase tracking-wider">Ativar este aparelho</h1>
        <p class="text-xs text-slate-400">Digite o código de pareamento e escolha em qual sensor este aparelho vai ficar.</p>
      </div>

      <!-- Passo 1: código -->
      <form v-if="etapa === 'codigo'" class="space-y-3" @submit.prevent="conferirCodigo">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Código de pareamento</label>
          <input v-model="codigo" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="64"
            placeholder="Ex.: fabrica-2026"
            class="w-full bg-[#070a0e] border border-slate-700 rounded-xl px-3 py-3 text-base font-mono text-center focus:border-emerald-500 focus:outline-none" />
        </div>
        <button type="submit" :disabled="carregando || codigo.trim().length < 4"
          class="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl text-sm uppercase tracking-wider">
          {{ carregando ? 'Conferindo...' : 'Continuar' }}
        </button>
      </form>

      <!-- Passo 2: sensor (máquina) -->
      <form v-else class="space-y-3" @submit.prevent="ativar">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Sensor / máquina deste aparelho</label>
          <select v-model="maquinaId"
            class="w-full bg-[#070a0e] border border-slate-700 rounded-xl px-3 py-3 text-base font-semibold focus:border-emerald-500 focus:outline-none">
            <option value="" disabled>Selecione...</option>
            <option v-for="m in maquinas" :key="m.id" :value="m.id">{{ m.code }} — {{ m.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nome do aparelho (opcional)</label>
          <input v-model="nome" type="text" maxlength="60" placeholder="Ex.: Tablet do forno"
            class="w-full bg-[#070a0e] border border-slate-700 rounded-xl px-3 py-3 text-base focus:border-emerald-500 focus:outline-none" />
        </div>
        <button type="submit" :disabled="carregando || !maquinaId"
          class="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl text-sm uppercase tracking-wider">
          {{ carregando ? 'Ativando...' : 'Ativar aparelho' }}
        </button>
        <button type="button" class="w-full text-xs text-slate-400 underline" @click="voltar">Usar outro código</button>
      </form>

      <p v-if="erro" class="text-sm font-semibold text-red-400 text-center">{{ erro }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { pareamentoApi } from '../services/api';
import { saveDevice } from '../services/deviceCredentials';
import { useProductionStore } from '../stores/productionStore';

const router = useRouter();
const store = useProductionStore();

const etapa = ref('codigo');
const codigo = ref('');
const maquinas = ref([]);
const maquinaId = ref('');
const nome = ref('');
const carregando = ref(false);
const erro = ref('');

const mensagem = (err) => {
  if (err?.status === 403) return err.message || 'Código inválido.';
  if (err?.status === 429) return 'Muitas tentativas. Espere um minuto e tente de novo.';
  return err?.message === 'Failed to fetch' ? 'Sem conexão com o servidor. Confira a internet.' : (err?.message || 'Não foi possível continuar.');
};

const conferirCodigo = async () => {
  carregando.value = true;
  erro.value = '';
  try {
    maquinas.value = await pareamentoApi.maquinas(codigo.value.trim());
    if (!maquinas.value.length) throw new Error('Nenhuma máquina cadastrada para ativar.');
    maquinaId.value = maquinas.value.length === 1 ? maquinas.value[0].id : '';
    etapa.value = 'maquina';
  } catch (err) {
    erro.value = mensagem(err);
  } finally {
    carregando.value = false;
  }
};

const ativar = async () => {
  carregando.value = true;
  erro.value = '';
  try {
    const r = await pareamentoApi.parear(codigo.value.trim(), maquinaId.value, nome.value.trim());
    saveDevice({ id: r.identifier, token: r.token, machineId: r.machine.id, machineCode: r.machine.code, machineName: r.machine.name });
    store.selectStation(r.machine.id);
    router.replace('/totem/login');
  } catch (err) {
    erro.value = mensagem(err);
  } finally {
    carregando.value = false;
  }
};

const voltar = () => {
  etapa.value = 'codigo';
  erro.value = '';
};
</script>
