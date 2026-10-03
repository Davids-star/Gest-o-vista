import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSensorLine, computeProductionDelta, buildEventUid, ProductionService } from '../production/ProductionService.js';

test('parseSensorLine aceita COUNT:n e ignora o resto', () => {
  assert.deepEqual(parseSensorLine('COUNT:15'), { total: 15 });
  assert.deepEqual(parseSensorLine('  COUNT: 3  '), { total: 3 });
  assert.deepEqual(parseSensorLine('Doce detectado. Distancia: 9.81 cm. Total: 15'), { total: 15 });
  assert.deepEqual(parseSensorLine('Contagem atual: 0'), { total: 0 });
  assert.equal(parseSensorLine('Sistema pronto.'), null);
  assert.equal(parseSensorLine(undefined), null);
});

test('delta é a diferença, não +1 fixo (linha perdida não some)', () => {
  const r = computeProductionDelta({ lastTotal: 10, epoch: 0 }, 13);
  assert.equal(r.delta, 3);
  assert.equal(r.nextState.lastTotal, 13);
});

test('primeira leitura só define referência', () => {
  const r = computeProductionDelta(null, 40);
  assert.equal(r.delta, 0);
  assert.equal(r.nextState.lastTotal, 40);
});

test('contagem menor = reset: nova época e delta = contagem atual', () => {
  const r = computeProductionDelta({ lastTotal: 500, epoch: 2 }, 2);
  assert.equal(r.epoch, 3);
  assert.equal(r.delta, 2);
  assert.equal(buildEventUid('ESP', 's1', r.epoch, 2) === buildEventUid('ESP', 's1', 2, 2), false);
});

function makeService({ session = { session_id: 's1', machine_id: 'm1' } } = {}) {
  let state = null;
  const saved = [];
  const service = new ProductionService({
    deviceId: 'HC06-01',
    getActiveSession: () => session,
    getState: async () => state,
    saveState: async (s) => { state = s; },
    saveEvent: async (e) => { saved.push(e); },
    now: () => new Date('2026-10-03T12:00:00Z'),
  });
  return { service, saved, getState: () => state };
}

test('ProductionService: gera um evento por lote de peças com uid estável', async () => {
  const { service, saved } = makeService();
  await service.handleLine('COUNT:1');
  await service.handleLine('COUNT:2');
  await service.handleLine('Doce detectado. Total: 2');
  await service.handleLine('COUNT:4');
  assert.deepEqual(saved.map((e) => [e.event_uid, e.quantity]), [
    ['HC06-01:s1:0:2', 1],
    ['HC06-01:s1:0:4', 2],
  ]);
  assert.equal(saved[0].source, 'bluetooth');
  assert.equal(saved[0].session_id, 's1');
});

test('ProductionService: banner "Contagem atual: 0" define a referência e a primeira peça conta', async () => {
  const { service, saved } = makeService();
  await service.handleLine('Contagem atual: 0');
  await service.handleLine('COUNT:1');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].quantity, 1);
});

test('ProductionService: mesma contagem em sessões diferentes gera uids diferentes', async () => {
  const a = makeService({ session: { session_id: 's1', machine_id: 'm1' } });
  const b = makeService({ session: { session_id: 's2', machine_id: 'm1' } });
  await a.service.handleLine('COUNT:5'); await a.service.handleLine('COUNT:6');
  await b.service.handleLine('COUNT:5'); await b.service.handleLine('COUNT:6');
  assert.notEqual(a.saved[0].event_uid, b.saved[0].event_uid);
});

test('ProductionService: reenviar a mesma contagem gera o mesmo uid (idempotência)', async () => {
  const a = makeService();
  const b = makeService();
  await a.service.handleLine('COUNT:5');
  await a.service.handleLine('COUNT:6');
  await b.service.handleLine('COUNT:5');
  await b.service.handleLine('COUNT:6');
  assert.equal(a.saved[0].event_uid, b.saved[0].event_uid);
});

test('ProductionService: sem sessão ativa não gera evento mas atualiza a referência', async () => {
  const { service, saved, getState } = makeService({ session: null });
  await service.handleLine('COUNT:1');
  await service.handleLine('COUNT:3');
  assert.equal(saved.length, 0);
  assert.equal(getState().lastTotal, 3);
});

test('ProductionService: reset do sensor gera evento com nova época', async () => {
  const { service, saved } = makeService();
  await service.handleLine('COUNT:3');
  await service.handleLine('COUNT:4');
  await service.handleLine('COUNT:1');
  assert.equal(saved[1].event_uid, 'HC06-01:s1:1:1');
  assert.equal(saved[1].quantity, 1);
});
