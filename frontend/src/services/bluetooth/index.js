import { BluetoothGateway } from './BluetoothGateway.js';
import { MockBluetoothGateway } from './MockBluetoothGateway.js';
import { CordovaBluetoothSerialGateway } from './CordovaBluetoothSerialGateway.js';
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

let instance = null;

/** Gateway único do aplicativo (singleton). */
export function getGatewayInstance() {
  if (!instance) {
    const plugin = typeof window !== 'undefined' ? window.bluetoothSerial : undefined;
    const permissions = typeof window !== 'undefined' ? window.cordova?.plugins?.permissions : null;
    instance = createBluetoothGateway({ plugin, permissions });
  }
  return instance;
}

export { BluetoothGateway, MockBluetoothGateway, CordovaBluetoothSerialGateway };
