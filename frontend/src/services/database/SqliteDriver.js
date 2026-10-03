/**
 * Driver SQLite da fila local (APK). Mesma interface do driver IndexedDB
 * (put/get/getAll/getByStatus/delete), então o DatabaseService não muda.
 *
 * O SQL fica aqui; quem fala com o banco é um `adapter` com dois métodos:
 *   run(sql, params)   → executa escrita
 *   query(sql, params) → retorna array de linhas (objetos)
 * No APK o adapter usa @capacitor-community/sqlite (capacitorSqliteAdapter.js);
 * nos testes usa node:sqlite. Assim o SQL é testado sem celular.
 *
 * Tabelas:
 *   events(event_uid PK, status, created_at, payload JSON)
 *   meta(key PK, value JSON)
 */

export const SQLITE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS events (
     event_uid TEXT PRIMARY KEY,
     status TEXT NOT NULL,
     created_at TEXT NOT NULL,
     payload TEXT NOT NULL
   )`,
  'CREATE INDEX IF NOT EXISTS idx_events_status ON events(status, created_at)',
  `CREATE TABLE IF NOT EXISTS meta (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   )`,
];

export async function createSqliteDriver(adapter) {
  for (const statement of SQLITE_SCHEMA) await adapter.run(statement, []);

  const parse = (row) => (row ? JSON.parse(row.payload) : undefined);

  return {
    async put(store, record) {
      if (store === 'events') {
        await adapter.run(
          'INSERT OR REPLACE INTO events (event_uid, status, created_at, payload) VALUES (?, ?, ?, ?)',
          [record.event_uid, record.status, record.created_at || '', JSON.stringify(record)],
        );
      } else {
        await adapter.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [record.key, JSON.stringify(record.value)]);
      }
    },
    async get(store, key) {
      if (store === 'events') {
        const rows = await adapter.query('SELECT payload FROM events WHERE event_uid = ?', [key]);
        return parse(rows[0]);
      }
      const rows = await adapter.query('SELECT value FROM meta WHERE key = ?', [key]);
      return rows[0] ? { key, value: JSON.parse(rows[0].value) } : undefined;
    },
    async getAll(store) {
      if (store !== 'events') throw new Error('getAll só para events');
      const rows = await adapter.query('SELECT payload FROM events', []);
      return rows.map(parse);
    },
    async getByStatus(store, status) {
      const rows = await adapter.query('SELECT payload FROM events WHERE status = ? ORDER BY created_at', [status]);
      return rows.map(parse);
    },
    async delete(store, key) {
      if (store === 'events') await adapter.run('DELETE FROM events WHERE event_uid = ?', [key]);
      else await adapter.run('DELETE FROM meta WHERE key = ?', [key]);
    },
  };
}
