/**
 * Composição do caminho Bluetooth no aparelho (APK e, em modo mock, PWA):
 *
 *   gateway (HC-06) → ProductionService → DatabaseService (fila) → SyncService → API
 *
 * É o único lugar que monta essas peças. A tela do Totem só chama
 * `startSensorPipeline` e lê o status reportado — não conhece Bluetooth nem API.
 *
 * Caminho por cabo (PC + serve.py → MQTT → API) NÃO passa por aqui: é outra
 * origem de dados, escolhida por máquina (ver README do frontend).
 */
import { getGatewayInstance } from '../bluetooth/index.js';
import { ProductionService } from './ProductionService.js';
import { getLocalDatabase } from '../database/localDatabase.js';
import { waitForNativeReady } from '../../config/platform.js';
import { SyncService } from '../sync/SyncService.js';
import { eventsApi } from '../api.js';
import { SYNC_INTERVAL_MS } from '../../config/env.js';

let pipeline = null;

async function buildPipeline() {
  await waitForNativeReady();
  const gateway = getGatewayInstance();
  const db = await getLocalDatabase();
  const onlineEvents = typeof window === 'undefined' ? null : {
    subscribe(fn) {
      window.addEventListener('online', fn);
      return () => window.removeEventListener('online', fn);
    },
  };
  const sync = new SyncService({
    db,
    api: eventsApi,
    intervalMs: SYNC_INTERVAL_MS,
    onlineEvents,
    onChange: (snap) => report?.({ sync: snap }),
  });
  return { gateway, db, sync, service: null, machineId: null, started: false };
}

let report = null;

/**
 * Liga o sensor da estação. Idempotente: chamar de novo troca só a máquina.
 * @param {string} machineId
 * @param {() => ({session_id: string, machine_id: string} | null)} getActiveSession
 * @param {(patch: object) => void} onStatus  recebe { sensorKind, sensorStatus, sensorDetail, sync }
 */
export async function startSensorPipeline(machineId, getActiveSession, onStatus) {
  report = onStatus;
  if (!pipeline) pipeline = await buildPipeline();
  const p = pipeline;

  if (p.machineId !== machineId || !p.service) {
    p.machineId = machineId;
    p.service = new ProductionService({
      deviceId: `HC06-${machineId}`,
      getActiveSession,
      getState: () => p.db.getSensorState(),
      saveState: (state) => p.db.saveSensorState(state),
      saveEvent: async (evento) => {
        await p.db.enqueueEvent(evento);
        // Envia já (se houver rede) e atualiza as pendências exibidas no Totem.
        p.sync.flush();
      },
    });
    p.gateway.onLine((line) => p.service.handleLine(line));
    p.gateway.onStatus((status, detail) => report?.({ sensorStatus: status, sensorDetail: detail }));
  }

  report?.({ sensorKind: p.gateway.kind });
  if (!p.started) {
    p.started = true;
    p.sync.start();
    await p.gateway.connect();
  }
  return p;
}

/** Forçar uma sincronização agora (ex.: botão ou ao abrir a tela). */
export function flushSensorQueue() {
  return pipeline?.sync.flush();
}

/** Só para testes. */
export function resetSensorPipeline() {
  pipeline?.sync.stop();
  pipeline = null;
  report = null;
}
