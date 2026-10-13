import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseService, createMemoryDriver } from '../database/DatabaseService.js';
import { SyncService } from '../sync/SyncService.js';

const evento = (uid) => ({ event_uid: uid, session_id: 's1', machine_id: 'm1', quantity: 1, occurred_at: '2026-10-03T12:00:00Z', source: 'bluetooth' });

const httpError = (status, message = `HTTP ${status}`) => Object.assign(new Error(message), { status });

// apiCreate recebe UM evento (como antes) e devolve {} ou lança; o fake de lote
// aplica isso a cada evento do lote — um erro 4xx/5xx derruba o lote inteiro,
// como faz a API real.
async function setup(apiCreate) {
  const db = new DatabaseService(createMemoryDriver());
  const sent = [];
  const batches = [];
  const api = {
    createBatch: async (events) => {
      batches.push(events.map((e) => e.event_uid));
      const results = [];
      for (const e of events) {
        sent.push(e.event_uid);
        await apiCreate(e);
        results.push({ event_uid: e.event_uid, status: 'accepted' });
      }
      return { results, totals: { s1: sent.length } };
    },
  };
  const totals = [];
  const sync = new SyncService({ db, api, onTotals: (t) => totals.push(t) });
  return { db, sync, sent, batches, totals };
}

test('envia pendentes e marca como sincronizados, sem apagar', async () => {
  const { db, sync, sent } = await setup(async () => ({}));
  for (const u of ['A:0:1', 'A:0:2', 'A:0:3', 'A:0:4']) await db.enqueueEvent(evento(u));
  assert.equal(await sync.flush(), 4);
  assert.deepEqual(sent, ['A:0:1', 'A:0:2', 'A:0:3', 'A:0:4']);
  assert.equal(await db.countByStatus('synced'), 4);
  assert.equal((await db.pendingEvents()).length, 0);
});

test('sem rede: mantém pendentes, conta tentativa e faz UMA requisição', async () => {
  const { db, sync, batches } = await setup(async () => { throw httpError(undefined, 'Failed to fetch'); });
  await db.enqueueEvent(evento('A:0:1'));
  await db.enqueueEvent(evento('A:0:2'));
  assert.equal(await sync.flush(), 0);
  assert.equal(batches.length, 1, 'não insiste enquanto a rede está fora');
  const pend = await db.pendingEvents();
  assert.equal(pend.length, 2);
  assert.equal(pend[0].attempts, 1);
});

test('fila grande vai em lotes de 200, não um POST por evento', async () => {
  const { db, sync, batches } = await setup(async () => ({}));
  for (let i = 0; i < 450; i += 1) await db.enqueueEvent(evento(`B:0:${i}`));
  assert.equal(await sync.flush(), 450);
  assert.deepEqual(batches.map((b) => b.length), [200, 200, 50]);
  assert.equal((await db.pendingEvents()).length, 0);
});

test('totais devolvidos pela API chegam antes do aviso de pendências', async () => {
  const ordem = [];
  const db = new DatabaseService(createMemoryDriver());
  const api = { createBatch: async (events) => ({ results: events.map((e) => ({ event_uid: e.event_uid, status: 'accepted' })), totals: { s1: 99 } }) };
  const sync = new SyncService({
    db, api,
    onTotals: () => ordem.push('totals'),
    onChange: (snap) => ordem.push(`pending:${snap.pending}`),
  });
  await db.enqueueEvent(evento('C:0:1'));
  await sync.flush();
  assert.equal(ordem[0], 'totals');
  assert.equal(ordem[1], 'pending:0');
});

test('evento recusado pela API no lote vira rejected sem travar os demais', async () => {
  const db = new DatabaseService(createMemoryDriver());
  const api = {
    createBatch: async (events) => ({
      results: events.map((e) => (e.event_uid === 'D:0:1'
        ? { event_uid: e.event_uid, status: 'rejected', error: 'sessão encerrada' }
        : { event_uid: e.event_uid, status: 'duplicate' })),
      totals: {},
    }),
  };
  const sync = new SyncService({ db, api });
  await db.enqueueEvent(evento('D:0:1'));
  await db.enqueueEvent(evento('D:0:2'));
  assert.equal(await sync.flush(), 1);
  assert.equal(await db.countByStatus('rejected'), 1);
  assert.equal(await db.countByStatus('synced'), 1);
});

test('5xx é tratado como indisponibilidade (fica pendente)', async () => {
  const { db, sync } = await setup(async () => { throw httpError(503); });
  await db.enqueueEvent(evento('A:0:1'));
  await sync.flush();
  assert.equal((await db.pendingEvents()).length, 1);
});

test('400 no lote: divide ao meio, rejeita só o evento ruim e envia o resto', async () => {
  const { db, sync } = await setup(async (p) => {
    if (p.event_uid === 'A:0:1') throw httpError(400, 'Não é possível registrar eventos em uma sessão encerrada');
    return {};
  });
  await db.enqueueEvent(evento('A:0:1'));
  await db.enqueueEvent(evento('A:0:2'));
  assert.equal(await sync.flush(), 1);
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
  const sync = new SyncService({ db, api: { createBatch: async () => { throw httpError(undefined, 'offline'); } } });
  await db.enqueueEvent({ ...evento('S1:1'), session_id: 'sA', quantity: 2 });
  await db.enqueueEvent({ ...evento('S1:2'), session_id: 'sA', quantity: 1 });
  await db.enqueueEvent({ ...evento('S1:3'), session_id: 'sB', quantity: 4 });
  const snap = await sync.snapshot();
  assert.equal(snap.pending, 3);
  assert.deepEqual(snap.pendingBySession, { sA: 3, sB: 4 });
});

test('janela de envio: peças que chegam juntas vão num lote só; peça sozinha sai quando a janela fecha', async () => {
  const batches = [];
  const db = new DatabaseService(createMemoryDriver());
  const api = { createBatch: async (events) => { batches.push(events.map((e) => e.event_uid)); return { results: events.map((e) => ({ event_uid: e.event_uid, status: 'accepted' })), totals: {} }; } };
  const sync = new SyncService({ db, api, windowMs: 40 });

  await db.enqueueEvent(evento('W:0:1')); sync.requestFlush();
  await db.enqueueEvent(evento('W:0:2')); sync.requestFlush();
  assert.equal(batches.length, 0, 'não envia antes da janela fechar');
  await new Promise((r) => setTimeout(r, 120));
  assert.deepEqual(batches, [['W:0:1', 'W:0:2']]);

  await db.enqueueEvent(evento('W:0:3')); sync.requestFlush();
  await new Promise((r) => setTimeout(r, 120));
  assert.deepEqual(batches[1], ['W:0:3'], 'uma peça sozinha também sai ao fim da janela');
  sync.stop();
});

test('servidor sem rota de lote: peças juntam num evento só, com a quantidade somada', async () => {
  const db = new DatabaseService(createMemoryDriver());
  const enviados = [];
  const api = {
    batchSupported: false,
    createBatch: async (events) => { enviados.push(...events); return { results: events.map((e) => ({ event_uid: e.event_uid, status: 'accepted' })), totals: {} }; },
  };
  const sync = new SyncService({ db, api });
  for (let i = 1; i <= 8; i += 1) await db.enqueueEvent({ ...evento(`C:0:${i}`), occurred_at: `2026-10-03T12:00:0${i}Z` });
  assert.equal(await sync.flush(), 1, 'uma requisição só');
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].quantity, 8);
  assert.equal(enviados[0].occurred_at, '2026-10-03T12:00:08Z');
  assert.equal((await db.pendingEvents()).length, 0);
  assert.equal(await db.countByStatus('merged'), 8);
});

test('juntar não mistura sessões nem passa do limite de tempo/tamanho e é idempotente', async () => {
  const db = new DatabaseService(createMemoryDriver());
  await db.enqueueEvent({ ...evento('D:0:1'), session_id: 'A', occurred_at: '2026-10-03T12:00:00Z' });
  await db.enqueueEvent({ ...evento('D:0:2'), session_id: 'A', occurred_at: '2026-10-03T12:00:10Z' });
  await db.enqueueEvent({ ...evento('D:0:3'), session_id: 'B', occurred_at: '2026-10-03T12:00:11Z' });
  await db.enqueueEvent({ ...evento('D:0:4'), session_id: 'B', occurred_at: '2026-10-03T12:05:00Z' });
  assert.equal(await db.coalescePending({ maxSpanMs: 60000 }), 2, 'só A1+A2 juntam; B3 e B4 ficam >60 s afastados');
  const pend = await db.pendingEvents();
  assert.equal(pend.length, 3);
  assert.equal(pend.find((e) => e.grouped).quantity, 2);
  assert.equal(await db.coalescePending({ maxSpanMs: 60000 }), 0, 'eventos já juntos não são juntados de novo');
  const total = pend.reduce((sum, e) => sum + e.quantity, 0);
  assert.equal(total, 4, 'a soma de peças pendentes não muda');
});
