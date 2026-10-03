import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createSqliteDriver } from '../database/SqliteDriver.js';
import { DatabaseService } from '../database/DatabaseService.js';

// Adaptador de teste sobre o SQLite real (mesmo SQL que vai para o APK).
function nodeAdapter(file) {
  const db = new DatabaseSync(file);
  return {
    run: async (sql, params) => { db.prepare(sql).run(...params); },
    query: async (sql, params) => db.prepare(sql).all(...params),
  };
}

const evento = (uid, extra = {}) => ({ event_uid: uid, session_id: 's1', machine_id: 'm1', quantity: 1, occurred_at: '2026-10-03T12:00:00Z', source: 'bluetooth', ...extra });

test('SQLite: eventos persistem em arquivo e sobrevivem a reabertura (reinício do app)', async () => {
  const file = `${process.env.TMPDIR || '/tmp'}/gp-sqlite-${process.pid}-${Date.now()}.db`;
  const first = new DatabaseService(await createSqliteDriver(nodeAdapter(file)));
  await first.enqueueEvent(evento('A:s1:0:1'));
  await first.enqueueEvent(evento('A:s1:0:2'));
  await first.markSynced('A:s1:0:1');
  await first.saveSensorState({ lastTotal: 2, epoch: 0 });

  // "reinicia o app": nova conexão ao mesmo arquivo
  const second = new DatabaseService(await createSqliteDriver(nodeAdapter(file)));
  assert.equal((await second.pendingEvents()).length, 1);
  assert.equal(await second.countByStatus('synced'), 1);
  assert.deepEqual(await second.getSensorState(), { lastTotal: 2, epoch: 0 });
});

test('SQLite: enqueue não sobrescreve uid existente; markRejected guarda motivo', async () => {
  const db = new DatabaseService(await createSqliteDriver(nodeAdapter(':memory:')));
  await db.enqueueEvent(evento('B:1'));
  await db.enqueueEvent(evento('B:1', { quantity: 9 }));
  const [row] = await db.pendingEvents();
  assert.equal(row.quantity, 1);
  await db.markRejected('B:1', 'sessão encerrada');
  assert.equal(await db.countByStatus('rejected'), 1);
});
