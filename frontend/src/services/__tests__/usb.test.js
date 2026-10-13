import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UsbSerialGateway } from '../bluetooth/UsbSerialGateway.js';
import { CompositeSensorGateway } from '../bluetooth/CompositeSensorGateway.js';
import { MockBluetoothGateway } from '../bluetooth/MockBluetoothGateway.js';
import { createSensorGateway } from '../bluetooth/index.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const memStorage = () => ({ get: () => null, set: () => {} });

function fakeUsb({ failConnect = 0 } = {}) {
  const p = { listeners: {}, connects: 0, written: [],
    async addListener(name, fn) { p.listeners[name] = fn; return { remove() {} }; },
    async connect() { p.connects += 1; if (p.connects <= failConnect) throw new Error('Nenhum dispositivo USB serial encontrado'); },
    async write({ data }) { p.written.push(data); },
    async disconnect() {},
  };
  return p;
}

test('USB: remonta linhas que chegam em pedaços e ignora lixo vazio', async () => {
  const plugin = fakeUsb();
  const gw = new UsbSerialGateway({ plugin });
  const lines = [];
  gw.onLine((l) => lines.push(l));
  await gw.connect();
  assert.equal(gw.status, 'connected');
  plugin.listeners.data({ data: 'COU' });
  plugin.listeners.data({ data: 'NT:7\r\nCOUNT:' });
  plugin.listeners.data({ data: '8\r\n\r\n' });
  assert.deepEqual(lines, ['COUNT:7', 'COUNT:8']);
});

test('USB: sem cabo tenta de novo e conecta quando o cabo aparece; cabo solto reconecta', async () => {
  const plugin = fakeUsb({ failConnect: 2 });
  const gw = new UsbSerialGateway({ plugin, retryDelaysMs: [10, 20] });
  await gw.connect();
  assert.equal(gw.status, 'reconnecting');
  await wait(120);
  assert.equal(gw.status, 'connected');
  plugin.listeners.detached();
  assert.equal(gw.status, 'reconnecting');
  await wait(60);
  assert.equal(gw.status, 'connected');
  await gw.disconnect();
});

test('USB: comando vai com quebra de linha; desconhecido é recusado', async () => {
  const plugin = fakeUsb();
  const gw = new UsbSerialGateway({ plugin });
  await gw.connect();
  await gw.sendCommand('status');
  assert.deepEqual(plugin.written, ['STATUS\n']);
  await assert.rejects(() => gw.sendCommand('APAGAR'), /desconhecido/);
});

class FakeLink extends MockBluetoothGateway {
  constructor(kind) { super(); this._k = kind; }
  get kind() { return this._k; }
  async connect() { this._setStatus('connected'); }
  down() { this._setStatus('reconnecting', 'caiu'); }
}

test('Composite: identifica o caminho ativo (cabo tem preferência) e troca quando o cabo cai', async () => {
  let t = 1000;
  const usb = new FakeLink('usb'); const bt = new FakeLink('bluetooth');
  const gw = new CompositeSensorGateway({ usb, bluetooth: bt }, { now: () => t, recentMs: 20000 });
  const seen = [];
  gw.onLink((s) => seen.push(s.active));
  await gw.connect();
  assert.equal(gw.status, 'connected');
  assert.equal(gw.activeLink, 'usb', 'os dois conectados: cabo primeiro');

  bt.simulateLine('COUNT:5'); // só o Bluetooth entregou, o cabo está mudo
  usb.down();
  assert.equal(gw.activeLink, 'bluetooth', 'cabo caiu: vale o Bluetooth');
  assert.equal(gw.status, 'connected', 'ainda há um caminho vivo');

  await usb.connect();
  usb.simulateLine('COUNT:6');
  assert.equal(gw.activeLink, 'usb', 'cabo voltou e entregou: volta para ele');
  assert.ok(seen.includes('bluetooth') && seen.includes('usb'));
});

test('Composite: linhas dos dois caminhos chegam ao app; status só cai quando os dois caem', async () => {
  const usb = new FakeLink('usb'); const bt = new FakeLink('bluetooth');
  const gw = new CompositeSensorGateway({ usb, bluetooth: bt });
  const lines = [];
  gw.onLine((l) => lines.push(l));
  await gw.connect();
  usb.simulateLine('COUNT:1'); bt.simulateLine('COUNT:1');
  assert.deepEqual(lines, ['COUNT:1', 'COUNT:1'], 'o repetido é tratado pelo cálculo de diferença do ProductionService');
  usb.down();
  assert.equal(gw.status, 'connected');
  bt.down();
  assert.equal(gw.status, 'reconnecting');
});

test("fábrica: 'auto' usa os caminhos que o aparelho tem; sem nenhum, Mock; 'mock' nunca usa hardware", () => {
  const bt = { isEnabled() {} };
  const usb = fakeUsb();
  const ambos = createSensorGateway({ mode: 'auto', bluetoothPlugin: bt, usbPlugin: usb, storage: memStorage() });
  assert.equal(ambos.kind, 'multi');
  assert.deepEqual(Object.keys(ambos.links).sort(), ['bluetooth', 'usb']);
  assert.deepEqual(Object.keys(createSensorGateway({ mode: 'auto', usbPlugin: usb, storage: memStorage() }).links), ['usb']);
  assert.equal(createSensorGateway({ mode: 'auto', storage: memStorage() }).kind, 'mock');
  assert.equal(createSensorGateway({ mode: 'mock', bluetoothPlugin: bt, usbPlugin: usb, storage: memStorage() }).kind, 'mock');
  assert.deepEqual(Object.keys(createSensorGateway({ mode: 'usb', bluetoothPlugin: bt, usbPlugin: usb, storage: memStorage() }).links), ['usb']);
});
