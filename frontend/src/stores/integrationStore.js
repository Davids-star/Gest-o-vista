/**
 * Estado do caminho do sensor no aparelho (Bluetooth/fila/sincronização).
 * Preenchido só por services/production/ProductionPipeline.js — a interface
 * apenas lê. Não é banco de dados: a fonte da verdade continua na API.
 */
import { defineStore } from 'pinia';

export const useIntegrationStore = defineStore('integration', {
  state: () => ({
    sensorKind: null,        // 'cordova' | 'mock' | null (ainda não iniciou)
    sensorStatus: 'disconnected', // disconnected | connecting | connected | reconnecting | simulated
    sensorDetail: null,
    sync: { pending: 0, rejected: 0, lastSyncAt: null, lastError: null },
  }),
  actions: {
    applyStatus(patch) {
      if ('sensorKind' in patch) this.sensorKind = patch.sensorKind;
      if ('sensorStatus' in patch) this.sensorStatus = patch.sensorStatus;
      if ('sensorDetail' in patch) this.sensorDetail = patch.sensorDetail;
      if ('sync' in patch) this.sync = { ...this.sync, ...patch.sync };
    },
  },
});
