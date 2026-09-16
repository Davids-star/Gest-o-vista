<script setup>
import { onMounted, onUnmounted } from 'vue';
import PwaInstallBanner from './components/PwaInstallBanner.vue';
import ConnectionStatusBanner from './components/ConnectionStatusBanner.vue';
import AlertToast from './components/AlertToast.vue';
import { useProductionStore } from './stores/productionStore';

// WebSocket + polling de segurança ligam UMA vez pra vida inteira do app,
// não por tela. Antes, cada tela (Dashboard/Estações/Metas/Totem/TV) ligava
// e desligava sua própria conexão no mount/unmount — qualquer tela que não
// fizesse isso (Apontamento, Lote, a própria Central de Alertas, Mobile)
// ficava sem WebSocket nenhum rodando. Um alerta que chegasse enquanto o
// usuário estava numa dessas telas não aparecia em lugar nenhum, só quando
// ele entrasse numa tela que religasse o polling (ex.: a Central de
// Alertas, que já dá fetchAlerts() sozinha no mount) — daí a impressão de
// "só aparece quando entra em alertas".
const store = useProductionStore();

onMounted(async () => {
  // Busca os alertas já existentes ANTES de ligar o WebSocket — isso vira
  // o "ponto de partida" que o AlertToast usa pra saber o que é alerta
  // novo (ver AlertToast.vue). Sem isso, quem ficasse numa tela que nunca
  // buscava alertas sozinha (Apontamento, Lote, Totem, TV — só Dashboard e
  // a própria Central de Alertas faziam isso) tinha o PRIMEIRO alerta da
  // sessão absorvido como se já existisse: o próprio WebSocket que avisa
  // dele é o que dispara essa primeira busca, chega tarde demais pro
  // AlertToast, e o popup nunca aparece — só o contador do sininho na
  // barra lateral. Era exatamente essa a causa do "às vezes só aparece
  // quando entro em alertas": dependia de sorte, de qual tela buscava
  // alertas primeiro.
  await store.fetchAlerts();
  store.startPolling(6000);
});
onUnmounted(() => store.stopPolling());
</script>

<template>
  <ConnectionStatusBanner />
  <RouterView />
  <PwaInstallBanner />
  <AlertToast />
</template>
