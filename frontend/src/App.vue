<script setup>
import PwaInstallBanner from './components/PwaInstallBanner.vue';
import ConnectionStatusBanner from './components/ConnectionStatusBanner.vue';
</script>

<template>
  <ConnectionStatusBanner />
  <RouterView />
  <PwaInstallBanner />
</template>
