import { BluetoothGateway } from './BluetoothGateway.js';
import { MockBluetoothGateway } from './MockBluetoothGateway.js';
import { CordovaBluetoothSerialGateway } from './CordovaBluetoothSerialGateway.js';
import { UsbSerialGateway } from './UsbSerialGateway.js';
import { CompositeSensorGateway } from './CompositeSensorGateway.js';
import { SENSOR_MODE, BLUETOOTH_DEVICE_NAME } from '../../config/env.js';

const localStorageAdapter = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* armazenamento indisponível: o endereço só fica em memória */
    }
  },
};

/**
 * Escolhe o gateway. 'auto': plugin presente no aparelho → Cordova; senão Mock.
 * Função pura (recebe o plugin) para facilitar teste.
 */
export function createBluetoothGateway({ mode = SENSOR_MODE, plugin, permissions = null, storage = localStorageAdapter, deviceName = BLUETOOTH_DEVICE_NAME } = {}) {
  const useBluetooth = mode === 'bluetooth' || (mode === 'auto' && Boolean(plugin));
  if (useBluetooth) {
    return new CordovaBluetoothSerialGateway({ plugin, permissions, storage, deviceName });
  }
  return new MockBluetoothGateway();
}

/**
 * Gateway do aplicativo: USB (cabo OTG) e Bluetooth juntos, cada um só se o aparelho tiver o
 * plugin. 'bluetooth' / 'usb' forçam um só; 'mock' nunca usa hardware.
 * Com algum caminho real, devolve o CompositeSensorGateway (que identifica qual está valendo);
 * sem nenhum (PWA/navegador), o Mock.
 */
export function createSensorGateway({ mode = SENSOR_MODE, bluetoothPlugin, usbPlugin, permissions = null, storage = localStorageAdapter, deviceName = BLUETOOTH_DEVICE_NAME } = {}) {
  if (mode === 'mock') return new MockBluetoothGateway();
  const gateways = {};
  if (usbPlugin && (mode === 'auto' || mode === 'usb')) gateways.usb = new UsbSerialGateway({ plugin: usbPlugin });
  if (bluetoothPlugin && (mode === 'auto' || mode === 'bluetooth')) {
    gateways.bluetooth = new CordovaBluetoothSerialGateway({ plugin: bluetoothPlugin, permissions, storage, deviceName });
  }
  return Object.keys(gateways).length ? new CompositeSensorGateway(gateways) : new MockBluetoothGateway();
}

let instance = null;

/** Gateway único do aplicativo (singleton). */
export function getGatewayInstance() {
  if (!instance) {
    const w = typeof window !== 'undefined' ? window : {};
    const usbPlugin = w.Capacitor?.isNativePlatform?.() && w.Capacitor?.Plugins?.UsbSerial ? w.Capacitor.Plugins.UsbSerial : undefined;
    instance = createSensorGateway({
      bluetoothPlugin: w.bluetoothSerial,
      usbPlugin,
      permissions: w.cordova?.plugins?.permissions ?? null,
    });
  }
  return instance;
}

export { BluetoothGateway, MockBluetoothGateway, CordovaBluetoothSerialGateway, UsbSerialGateway, CompositeSensorGateway };
