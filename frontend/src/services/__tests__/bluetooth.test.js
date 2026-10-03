import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CordovaBluetoothSerialGateway } from '../bluetooth/CordovaBluetoothSerialGateway.js';
import { MockBluetoothGateway } from '../bluetooth/MockBluetoothGateway.js';
import { createBluetoothGateway } from '../bluetooth/index.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const memStorage = () => { const m = new Map(); return { get: (k) => m.get(k) ?? null, set: (k, v) => m.set(k, v) }; };

function fakePlugin({ failConnect = 0 } = {}) {
  const p = {
    subscriber: null,
    connects: 0,
    alive: true,
    written: [],
    isEnabled: (ok) => ok(true),
    enable: (ok) => ok(),
    list: (ok) => ok([{ name: 'HC-06', address: '00:11:22:33:44:55' }, { name: 'Fone', address: 'AA' }]),
    connect: (address, ok, fail) => {
      p.connects += 1;
      if (p.connects <= failConnect) return fail('timeout');
      p.alive = true; ok();
    },
    subscribe: (delim, ok) => { p.subscriber = ok; },
    isConnected: (ok) => ok(p.alive),
    write: (data, ok) => { p.written.push(data); ok(); },
    disconnect: (ok) => { p.alive = false; ok(); },
  };
  return p;
}

test('conecta ao HC-06 pareado, salva o endereço e recebe linhas', async () => {
  const plugin = fakePlugin();
  const storage = memStorage();
  const gw = new CordovaBluetoothSerialGateway({ plugin, storage, healthCheckMs: 10_000 });
  const lines = [];
  gw.onLine((l) => lines.push(l));
  await gw.connect();
  assert.equal(gw.status, 'connected');
  assert.equal(storage.get('gp_bt_address'), '00:11:22:33:44:55');
  plugin.subscriber('COUNT:1\n');
  plugin.subscriber('COUNT:2');
  assert.deepEqual(lines, ['COUNT:1', 'COUNT:2']);
  await gw.disconnect();
  assert.equal(gw.status, 'disconnected');
});

test('queda detectada pela verificação periódica: vai a reconnecting e volta sozinho', async () => {
  const plugin = fakePlugin();
  const gw = new CordovaBluetoothSerialGateway({ plugin, storage: memStorage(), retryDelaysMs: [10], healthCheckMs: 20 });
  const states = [];
  gw.onStatus((s) => states.push(s));
  await gw.connect();
  plugin.alive = false;                 // HC-06 desligou
  await wait(60);
  assert.ok(states.includes('reconnecting'));
  assert.equal(gw.status, 'connected');  // reconectou sozinho
  await gw.disconnect();
});

test('falha ao conectar tenta de novo com espera; sem plugin fica desconectado', async () => {
  const plugin = fakePlugin({ failConnect: 2 });
  const gw = new CordovaBluetoothSerialGateway({ plugin, storage: memStorage(), retryDelaysMs: [5, 5], healthCheckMs: 10_000 });
  await gw.connect();
  await wait(50);
  assert.equal(plugin.connects, 3);
  assert.equal(gw.status, 'connected');
  await gw.disconnect();

  const semPlugin = new CordovaBluetoothSerialGateway({ plugin: undefined, storage: memStorage() });
  await semPlugin.connect();
  assert.equal(semPlugin.status, 'disconnected');
});

test('sendCommand aceita só os comandos do firmware e exige conexão', async () => {
  const plugin = fakePlugin();
  const gw = new CordovaBluetoothSerialGateway({ plugin, storage: memStorage(), healthCheckMs: 10_000 });
  await assert.rejects(gw.sendCommand('RESET'), /não conectado/);
  await gw.connect();
  await gw.sendCommand('reset');
  assert.deepEqual(plugin.written, ['RESET\n']);
  await assert.rejects(gw.sendCommand('APAGAR'), /desconhecido/);
  await gw.disconnect();
});

test('factory: auto escolhe Mock sem plugin e Cordova com plugin; modo mock nunca usa Bluetooth', () => {
  assert.ok(createBluetoothGateway({ mode: 'auto', plugin: undefined, storage: memStorage() }) instanceof MockBluetoothGateway);
  assert.equal(createBluetoothGateway({ mode: 'auto', plugin: fakePlugin(), storage: memStorage() }).kind, 'cordova');
  assert.equal(createBluetoothGateway({ mode: 'mock', plugin: fakePlugin(), storage: memStorage() }).kind, 'mock');
});

test('Mock: simulateLine entrega linha ao consumidor', () => {
  const gw = new MockBluetoothGateway();
  const lines = [];
  gw.onLine((l) => lines.push(l));
  gw.simulateLine('COUNT:9');
  assert.deepEqual(lines, ['COUNT:9']);
});

test('permissão Bluetooth negada: fica desconectado com motivo claro e não conecta', async () => {
  const plugin = fakePlugin();
  let connected = false;
  const origConnect = plugin.connect;
  plugin.connect = (...a) => { connected = true; origConnect(...a); };
  const permissions = {
    BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
    BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
    requestPermissions: (list, ok) => ok({ hasPermission: false }),
  };
  const gw = new CordovaBluetoothSerialGateway({ plugin, permissions, storage: memStorage(), retryDelaysMs: [10_000], healthCheckMs: 10_000 });
  let detail = null;
  gw.onStatus((s, d) => { if (d) detail = d; });
  await gw.connect();
  assert.equal(connected, false);
  assert.equal(gw.status, 'reconnecting');
  assert.match(detail, /Permissão Bluetooth negada/);
  await gw.disconnect();
});

test('permissão concedida: conecta normalmente', async () => {
  const permissions = { BLUETOOTH_CONNECT: 'c', BLUETOOTH_SCAN: 's', requestPermissions: (l, ok) => ok({ hasPermission: true }) };
  const gw = new CordovaBluetoothSerialGateway({ plugin: fakePlugin(), permissions, storage: memStorage(), healthCheckMs: 10_000 });
  await gw.connect();
  assert.equal(gw.status, 'connected');
  await gw.disconnect();
});
