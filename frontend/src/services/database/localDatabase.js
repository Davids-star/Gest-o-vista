/**
 * Banco local único do aparelho (fila de eventos + cache de catálogo + estado do sensor).
 * APK: SQLite (arquivo do aparelho). PWA/navegador: IndexedDB.
 * Aberto uma vez por sessão do app; quem precisa usa getLocalDatabase().
 */
import { DatabaseService, createIndexedDbDriver } from './DatabaseService.js';
import { createSqliteDriver } from './SqliteDriver.js';
import { isNativeApp } from '../../config/platform.js';

let instance = null;

export function getLocalDatabase() {
  if (!instance) instance = openLocalDatabase();
  return instance;
}

async function openLocalDatabase() {
  if (!isNativeApp()) return new DatabaseService(createIndexedDbDriver());
  const { createCapacitorSqliteAdapter } = await import('./capacitorSqliteAdapter.js');
  return new DatabaseService(await createSqliteDriver(await createCapacitorSqliteAdapter()));
}
