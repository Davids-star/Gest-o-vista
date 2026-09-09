<script setup>
import PwaInstallBanner from './components/PwaInstallBanner.vue';
import ConnectionStatusBanner from './components/ConnectionStatusBanner.vue';
import AlertToast from './components/AlertToast.vue';
</script>

<template>
  <ConnectionStatusBanner />
  <RouterView />
  <PwaInstallBanner />
  <AlertToast />
</template>
