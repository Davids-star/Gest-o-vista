import { BluetoothGateway, SENSOR_COMMANDS } from './BluetoothGateway.js';

/**
 * Sensor por cabo USB (OTG): o Arduino ligado direto no tablet. Mesma interface do
 * Bluetooth — o resto do app só recebe linhas ("COUNT:n").
 *
 * `plugin` é o plugin nativo UsbSerial (app/.../UsbSerialPlugin.java):
 *   connect({ baudRate }), write({ data }), disconnect(), addListener('data'|'error'|'detached').
 * O texto chega em pedaços; aqui ele é remontado e separado por '\n'.
 * Sem cabo plugado, tenta de novo de tempos em tempos (e a janela de permissão do Android
 * só aparece quando há um dispositivo).
 */
export class UsbSerialGateway extends BluetoothGateway {
  constructor({ plugin, baudRate = 9600, retryDelaysMs = [2000, 4000, 8000, 10000] }) {
    super();
    this._plugin = plugin;
    this._baudRate = baudRate;
    this._retryDelaysMs = retryDelaysMs;
    this._retryIndex = 0;
    this._retryTimer = null;
    this._wantConnected = false;
    this._listeners = null;
    this._buffer = '';
  }

  get kind() {
    return 'usb';
  }

  async connect() {
    this._wantConnected = true;
    if (!this._plugin) {
      this._setStatus('disconnected', 'USB indisponível neste aparelho');
      return;
    }
    await this._attempt();
  }

  async disconnect() {
    this._wantConnected = false;
    clearTimeout(this._retryTimer);
    this._retryTimer = null;
    await this._plugin?.disconnect?.().catch(() => {});
    this._setStatus('disconnected');
  }

  async sendCommand(command) {
    const cmd = String(command || '').trim().toUpperCase();
    if (!SENSOR_COMMANDS.includes(cmd)) throw new Error(`Comando desconhecido: ${command}`);
    if (this._status !== 'connected') throw new Error('Sensor USB não conectado');
    await this._plugin.write({ data: `${cmd}\n` });
  }

  async _attempt() {
    clearTimeout(this._retryTimer);
    this._setStatus(this._retryIndex === 0 ? 'connecting' : 'reconnecting');
    try {
      await this._ensureListeners();
      this._buffer = '';
      await this._plugin.connect({ baudRate: this._baudRate });
      this._retryIndex = 0;
      this._setStatus('connected');
    } catch (err) {
      this._handleDrop(err?.message || String(err));
    }
  }

  async _ensureListeners() {
    if (this._listeners) return;
    this._listeners = [
      await this._plugin.addListener('data', ({ data }) => this._onData(data)),
      await this._plugin.addListener('error', ({ message }) => this._handleDrop(message || 'Falha na leitura USB')),
      await this._plugin.addListener('detached', () => this._handleDrop('Cabo USB desconectado')),
    ];
  }

  _onData(chunk) {
    this._buffer += String(chunk);
    let i;
    while ((i = this._buffer.indexOf('\n')) >= 0) {
      const line = this._buffer.slice(0, i).trim();
      this._buffer = this._buffer.slice(i + 1);
      if (line) this._emitLine(line);
    }
    if (this._buffer.length > 500) this._buffer = ''; // lixo sem quebra de linha: descarta
  }

  _handleDrop(reason) {
    if (!this._wantConnected) return;
    clearTimeout(this._retryTimer);
    this._setStatus('reconnecting', reason);
    const delay = this._retryDelaysMs[Math.min(this._retryIndex, this._retryDelaysMs.length - 1)];
    this._retryIndex += 1;
    this._retryTimer = setTimeout(() => this._attempt(), delay);
  }
}
