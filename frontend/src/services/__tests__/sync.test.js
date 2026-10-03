import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService, createMemoryDriver } from '../database/DatabaseService.js';
import { SyncService } from '../sync/SyncService.js';

const evento = (uid) => ({ event_uid: uid, session_id: 's1', machine_id: 'm1', quantity: 1, occurred_at: '2026-10-03T12:00:00Z', source: 'bluetooth' });

const httpError = (status, message = `HTTP ${status}`) => Object.assign(new Error(message), { status });

async function setup(apiCreate) {
  const db = new DatabaseService(createMemoryDriver());
  const sent = [];
  const api = { create: async (payload) => { sent.push(payload.event_uid); return apiCreate(payload); } };
  const sync = new SyncService({ db, api });
  return { db, sync, sent };
}

test('envia pendentes e marca como sincronizados, sem apagar', async () => {
  const { db, sync, sent } = await setup(async () => ({}));
  for (const u of ['A:0:1', 'A:0:2', 'A:0:3', 'A:0:4']) await db.enqueueEvent(evento(u));
  assert.equal(await sync.flush(), 4);
  assert.deepEqual(sent, ['A:0:1', 'A:0:2', 'A:0:3', 'A:0:4']);
  assert.equal(await db.countByStatus('synced'), 4);
  assert.equal((await db.pendingEvents()).length, 0);
});

test('sem rede: para no primeiro erro, mantém pendentes e conta tentativa', async () => {
  let calls = 0;
  const { db, sync } = await setup(async () => { calls += 1; throw httpError(undefined, 'Failed to fetch'); });
  await db.enqueueEvent(evento('A:0:1'));
  await db.enqueueEvent(evento('A:0:2'));
  assert.equal(await sync.flush(), 0);
  assert.equal(calls, 1, 'não insiste no segundo evento enquanto a rede está fora');
  const pend = await db.pendingEvents();
  assert.equal(pend.length, 2);
  assert.equal(pend[0].attempts, 1);
});

test('5xx é tratado como indisponibilidade (fica pendente)', async () => {
  const { db, sync } = await setup(async () => { throw httpError(503); });
  await db.enqueueEvent(evento('A:0:1'));
  await sync.flush();
  assert.equal((await db.pendingEvents()).length, 1);
});

test('400 (ex.: sessão encerrada) vira rejected e segue para o próximo', async () => {
  const { db, sync, sent } = await setup(async (p) => {
    if (p.event_uid === 'A:0:1') throw httpError(400, 'Não é possível registrar eventos em uma sessão encerrada');
    return {};
  });
  await db.enqueueEvent(evento('A:0:1'));
  await db.enqueueEvent(evento('A:0:2'));
  assert.equal(await sync.flush(), 1);
  assert.deepEqual(sent, ['A:0:1', 'A:0:2']);
  assert.equal(await db.countByStatus('rejected'), 1);
  assert.equal(await db.countByStatus('synced'), 1);
});

test('reenvio após queda não duplica: API responde o evento existente (mesmo uid)', async () => {
  let fail = true;
  const { db, sync, sent } = await setup(async () => {
    if (fail) { fail = false; throw httpError(undefined, 'timeout'); }
    return {};
  });
  await db.enqueueEvent(evento('A:0:7'));
  await sync.flush();
  await sync.flush();
  assert.deepEqual(sent, ['A:0:7', 'A:0:7']);
  assert.equal(await db.countByStatus('synced'), 1);
});

test('flush não roda em paralelo', async () => {
  let inFlight = 0; let maxInFlight = 0;
  const { db, sync } = await setup(async () => {
    inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 10));
    inFlight -= 1; return {};
  });
  await db.enqueueEvent(evento('A:0:1'));
  await Promise.all([sync.flush(), sync.flush(), sync.flush()]);
  assert.equal(maxInFlight, 1);
});

test('snapshot informa pendências por sessão (soma de quantidades não enviadas)', async () => {
  const db = new DatabaseService(createMemoryDriver());
  const sync = new SyncService({ db, api: { create: async () => { throw httpError(undefined, 'offline'); } } });
  await db.enqueueEvent({ ...evento('S1:1'), session_id: 'sA', quantity: 2 });
  await db.enqueueEvent({ ...evento('S1:2'), session_id: 'sA', quantity: 1 });
  await db.enqueueEvent({ ...evento('S1:3'), session_id: 'sB', quantity: 4 });
  const snap = await sync.snapshot();
  assert.equal(snap.pending, 3);
  assert.deepEqual(snap.pendingBySession, { sA: 3, sB: 4 });
});
