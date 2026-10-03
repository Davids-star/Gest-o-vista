/**
 * Contrato do gateway de sensor (Bluetooth Classic / SPP, HC-06).
 *
 * Quem consome (ProductionService) só conhece esta interface — nunca o plugin
 * nativo. Implementações:
 * - CordovaBluetoothSerialGateway → APK (Android) com o HC-06 pareado.
 * - MockBluetoothGateway          → PWA/navegador (não recebe contagem real).
 *
 * Estados: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'simulated'
 */
export class BluetoothGateway {
  constructor() {
    this._status = 'disconnected';
    this._lineHandlers = new Set();
    this._statusHandlers = new Set();
  }

  /** 'mock' | 'cordova' — usado pela UI para decidir se mostra o indicador. */
  get kind() {
    return 'base';
  }

  get status() {
    return this._status;
  }

  /** Cada linha completa recebida do sensor (ex.: "COUNT:15"). Retorna função de cancelamento. */
  onLine(handler) {
    this._lineHandlers.add(handler);
    return () => this._lineHandlers.delete(handler);
  }

  /** Mudanças de status (🟢/🔴). Retorna função de cancelamento. */
  onStatus(handler) {
    this._statusHandlers.add(handler);
    return () => this._statusHandlers.delete(handler);
  }

  async connect() {
    throw new Error('connect() não implementado');
  }

  async disconnect() {
    throw new Error('disconnect() não implementado');
  }

  /** Envia um comando textual ao firmware (RESET, STATUS, CALIBRAR, HELP). */
  async sendCommand() {
    throw new Error('sendCommand() não implementado');
  }

  /** Uso interno das subclasses. */
  _setStatus(status, detail = null) {
    if (status === this._status && detail === null) return;
    this._status = status;
    for (const handler of this._statusHandlers) handler(status, detail);
  }

  _emitLine(line) {
    for (const handler of this._lineHandlers) handler(line);
  }
}

/** Comandos aceitos pelo firmware do Arduino (ver simulator/serve.py). */
export const SENSOR_COMMANDS = Object.freeze(['RESET', 'STATUS', 'CALIBRAR', 'HELP']);
