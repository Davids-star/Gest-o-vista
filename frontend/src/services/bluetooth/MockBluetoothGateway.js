import { BluetoothGateway } from './BluetoothGateway.js';

/**
 * Usado na PWA (navegador) e em testes. Não lê hardware: a contagem da PWA
 * continua vindo da API (MQTT/simulador). `simulateLine` permite injetar
 * linhas "COUNT:n" manualmente em desenvolvimento.
 */
export class MockBluetoothGateway extends BluetoothGateway {
  get kind() {
    return 'mock';
  }

  async connect() {
    this._setStatus('simulated');
  }

  async disconnect() {
    this._setStatus('disconnected');
  }

  async sendCommand(command) {
    return `mock: ${command}`;
  }

  simulateLine(line) {
    this._emitLine(line);
  }
}
