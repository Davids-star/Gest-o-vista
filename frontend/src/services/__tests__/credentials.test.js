import { test } from 'node:test';
import assert from 'node:assert/strict';

// localStorage mínimo para o teste (o módulo só usa getItem/setItem/removeItem).
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { getDeviceCredentials, saveDevice, clearDevice, getStoredDevice } = await import('../deviceCredentials.js');

test('sem ativação e sem variáveis do build: aparelho sem credencial', () => {
  clearDevice();
  assert.equal(getDeviceCredentials(), null);
});

test('ativação guarda a credencial e ela passa a valer; limpar volta ao estado inicial', () => {
  saveDevice({ id: 'APP-MQ-01-ABC123', token: 'dev_tok_x', machineId: 'm1', machineCode: 'MQ-01' });
  assert.deepEqual(getDeviceCredentials(), { id: 'APP-MQ-01-ABC123', token: 'dev_tok_x', machineId: 'm1', machineCode: 'MQ-01' });
  clearDevice();
  assert.equal(getStoredDevice(), null);
});

test('registro guardado sem token é ignorado (não vira credencial pela metade)', () => {
  localStorage.setItem('gp_device', JSON.stringify({ id: 'so-id' }));
  assert.equal(getStoredDevice(), null);
});
