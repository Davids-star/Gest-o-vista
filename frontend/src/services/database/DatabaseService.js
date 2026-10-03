/**
 * Armazenamento local do app: fila de eventos de produção e referência do sensor.
 *
 * Funciona na PWA (IndexedDB do navegador) e na WebView do APK. Quando o plugin
 * SQLite for adicionado ao APK, basta um novo driver com a mesma interface
 * (put/get/getAll/getByStatus/delete) — o restante do app não muda.
 *
 * Stores:
 * - events: todo evento gerado no aparelho, com status 'pending' | 'synced' | 'rejected'.
 *   Eventos sincronizados NÃO são apagados (histórico/auditoria).
 * - meta:   estado do sensor (lastTotal, epoch, deviceId) e configurações locais.
 */

const DB_NAME = 'gp_local';
const DB_VERSION = 1;

/** Driver IndexedDB (navegador / WebView). */
export function createIndexedDbDriver(indexedDB = globalThis.indexedDB) {
  let dbPromise = null;

  const open = () => {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('events')) {
            const events = db.createObjectStore('events', { keyPath: 'event_uid' });
            events.createIndex('status', 'status');
          }
          if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  };

  const run = async (store, mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  };

  return {
    put: (store, record) => run(store, 'readwrite', (s) => s.put(record)),
    get: (store, key) => run(store, 'readonly', (s) => s.get(key)),
    getAll: (store) => run(store, 'readonly', (s) => s.getAll()),
    getByStatus: (store, status) => run(store, 'readonly', (s) => s.index('status').getAll(status)),
    delete: (store, key) => run(store, 'readwrite', (s) => s.delete(key)),
  };
}

/** Driver em memória (testes e modo sem IndexedDB). */
export function createMemoryDriver() {
  const stores = { events: new Map(), meta: new Map() };
  const keyOf = (store, record) => (store === 'events' ? record.event_uid : record.key);
  return {
    async put(store, record) { stores[store].set(keyOf(store, record), structuredClone(record)); },
    async get(store, key) { return structuredClone(stores[store].get(key) ?? null) ?? undefined; },
    async getAll(store) { return [...stores[store].values()].map((r) => structuredClone(r)); },
    async getByStatus(store, status) {
      return [...stores[store].values()].filter((r) => r.status === status).map((r) => structuredClone(r));
    },
    async delete(store, key) { stores[store].delete(key); },
  };
}

export class DatabaseService {
  constructor(driver) {
    this.driver = driver;
  }

  /** Grava um evento novo como pendente. Se o uid já existe, não sobrescreve. */
  async enqueueEvent(evento, now = new Date()) {
    const existing = await this.driver.get('events', evento.event_uid);
    if (existing) return existing;
    const record = {
      ...evento,
      status: 'pending',
      attempts: 0,
      last_error: null,
      created_at: now.toISOString(),
      synced_at: null,
    };
    await this.driver.put('events', record);
    return record;
  }

  async pendingEvents() {
    const rows = await this.driver.getByStatus('events', 'pending');
    return rows.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  }

  async countByStatus(status) {
    return (await this.driver.getByStatus('events', status)).length;
  }

  async markSynced(eventUid, now = new Date()) {
    const row = await this.driver.get('events', eventUid);
    if (!row) return;
    await this.driver.put('events', { ...row, status: 'synced', last_error: null, synced_at: now.toISOString() });
  }

  async markAttempt(eventUid, error) {
    const row = await this.driver.get('events', eventUid);
    if (!row) return;
    await this.driver.put('events', { ...row, attempts: row.attempts + 1, last_error: String(error) });
  }

  async markRejected(eventUid, error) {
    const row = await this.driver.get('events', eventUid);
    if (!row) return;
    await this.driver.put('events', { ...row, status: 'rejected', last_error: String(error), attempts: row.attempts + 1 });
  }

  /** Cache de catálogo (estações, sessões, produtos...) para uso sem internet. */
  async getCache(name) {
    const row = await this.driver.get('meta', `cache:${name}`);
    return row ? row.value : null;
  }

  async setCache(name, value) {
    await this.driver.put('meta', { key: `cache:${name}`, value });
  }

  async getSensorState() {
    const row = await this.driver.get('meta', 'sensor');
    return row ? row.value : null;
  }

  async saveSensorState(value) {
    await this.driver.put('meta', { key: 'sensor', value });
  }
}
