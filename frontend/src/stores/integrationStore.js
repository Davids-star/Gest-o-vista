/**
 * Estado do caminho do sensor no aparelho (Bluetooth/fila/sincronização).
 * Preenchido só por services/production/ProductionPipeline.js — a interface
 * apenas lê. Não é banco de dados: a fonte da verdade continua na API.
 */
import { defineStore } from 'pinia';

export const useIntegrationStore = defineStore('integration', {
  state: () => ({
    sensorKind: null,        // 'cordova' | 'multi' | 'mock' | null (ainda não iniciou)
    sensorStatus: 'disconnected', // disconnected | connecting | connected | reconnecting | simulated
    sensorDetail: null,
    sensorLink: null,        // caminho que está valendo: 'usb' | 'bluetooth' | null
    sensorLinks: {},         // estado de cada um: { usb: 'connected', bluetooth: 'reconnecting' }
    lastLine: null,          // última linha crua recebida do HC-06 (diagnóstico)
    lastLineAt: null,
    sync: { pending: 0, rejected: 0, lastSyncAt: null, lastError: null },
  }),
  actions: {
    applyStatus(patch) {
      if ('sensorKind' in patch) this.sensorKind = patch.sensorKind;
      if ('sensorStatus' in patch) this.sensorStatus = patch.sensorStatus;
      if ('sensorDetail' in patch) this.sensorDetail = patch.sensorDetail;
      if ('sensorLink' in patch) { this.sensorLink = patch.sensorLink; this.sensorLinks = patch.sensorLinks || {}; }
      if ('lastLine' in patch) { this.lastLine = patch.lastLine; this.lastLineAt = patch.lastLineAt; }
      if ('sync' in patch) this.sync = { ...this.sync, ...patch.sync };
    },
  },
});
