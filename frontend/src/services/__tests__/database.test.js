import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService, createMemoryDriver } from '../database/DatabaseService.js';

const evento = (uid, extra = {}) => ({ event_uid: uid, session_id: 's1', machine_id: 'm1', quantity: 1, occurred_at: '2026-10-03T12:00:00Z', source: 'bluetooth', ...extra });

test('enqueueEvent grava como pendente e não duplica o mesmo uid', async () => {
  const db = new DatabaseService(createMemoryDriver());
  await db.enqueueEvent(evento('A:0:1'));
  await db.enqueueEvent(evento('A:0:1'));
  const pend = await db.pendingEvents();
  assert.equal(pend.length, 1);
  assert.equal(pend[0].status, 'pending');
});

test('markSynced mantém o registro como histórico e tira da fila', async () => {
  const db = new DatabaseService(createMemoryDriver());
  await db.enqueueEvent(evento('A:0:1'));
  await db.markSynced('A:0:1');
  assert.equal((await db.pendingEvents()).length, 0);
  assert.equal(await db.countByStatus('synced'), 1);
});

test('markAttempt conta tentativas e guarda o último erro', async () => {
  const db = new DatabaseService(createMemoryDriver());
  await db.enqueueEvent(evento('A:0:1'));
  await db.markAttempt('A:0:1', 'Failed to fetch');
  await db.markAttempt('A:0:1', 'Failed to fetch');
  const [row] = await db.pendingEvents();
  assert.equal(row.attempts, 2);
  assert.equal(row.last_error, 'Failed to fetch');
});

test('estado do sensor persiste entre instâncias do serviço (mesmo driver)', async () => {
  const driver = createMemoryDriver();
  await new DatabaseService(driver).saveSensorState({ lastTotal: 42, epoch: 1 });
  assert.deepEqual(await new DatabaseService(driver).getSensorState(), { lastTotal: 42, epoch: 1 });
});

test('cache de catálogo: grava e lê, e sobrevive a reabertura', async () => {
  const driver = createMemoryDriver();
  await new DatabaseService(driver).setCache('machines', [{ id: 'm1', code: 'MQ-01' }]);
  assert.deepEqual(await new DatabaseService(driver).getCache('machines'), [{ id: 'm1', code: 'MQ-01' }]);
  assert.equal(await new DatabaseService(driver).getCache('inexistente'), null);
});
