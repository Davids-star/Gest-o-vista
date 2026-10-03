import { BluetoothGateway, SENSOR_COMMANDS } from './BluetoothGateway.js';

/**
 * Gateway para o APK (Android) usando o plugin cordova-plugin-bluetooth-serial.
 *
 * Fluxo: habilita Bluetooth → acha o HC-06 entre os pareados (ou usa o endereço
 * salvo) → connect(address) → subscribe('\n') → cada linha vai para onLine.
 * Se a conexão cair (erro do plugin ou verificação periódica), volta para
 * 'reconnecting' e tenta de novo com espera crescente. Eventos já recebidos
 * ficam com quem consome (ProductionService/fila) — nada é perdido aqui.
 *
 * `plugin` é o objeto global `window.bluetoothSerial` (injetado pelo plugin).
 * `storage` é { get(key), set(key, value) } para lembrar o endereço do HC-06.
 */
export class CordovaBluetoothSerialGateway extends BluetoothGateway {
  constructor({
    plugin,
    permissions = null,
    storage,
    deviceName = 'HC-06',
    delimiter = '\n',
    retryDelaysMs = [2000, 4000, 8000, 10000],
    healthCheckMs = 5000,
  }) {
    super();
    this._plugin = plugin;
    // cordova.plugins.permissions (cordova-plugin-android-permissions); null fora do APK.
    this._permissions = permissions;
    this._storage = storage;
    this._deviceName = deviceName;
    this._delimiter = delimiter;
    this._retryDelaysMs = retryDelaysMs;
    this._healthCheckMs = healthCheckMs;
    this._address = storage?.get('gp_bt_address') || null;
    this._retryIndex = 0;
    this._retryTimer = null;
    this._healthTimer = null;
    this._wantConnected = false;
  }

  get kind() {
    return 'cordova';
  }

  get address() {
    return this._address;
  }

  async connect() {
    this._wantConnected = true;
    if (!this._plugin) {
      this._setStatus('disconnected', 'Plugin Bluetooth não encontrado neste aparelho');
      return;
    }
    await this._attempt();
  }

  async disconnect() {
    this._wantConnected = false;
    this._clearTimers();
    await this._call('disconnect').catch(() => {});
    this._setStatus('disconnected');
  }

  async sendCommand(command) {
    const cmd = String(command || '').trim().toUpperCase();
    if (!SENSOR_COMMANDS.includes(cmd)) {
      throw new Error(`Comando desconhecido: ${command}`);
    }
    if (this._status !== 'connected') {
      throw new Error('Sensor não conectado');
    }
    return this._call('write', `${cmd}${this._delimiter}`);
  }

  async _attempt() {
    this._clearRetry();
    this._setStatus(this._retryIndex === 0 ? 'connecting' : 'reconnecting');
    try {
      await this._ensurePermissions();
      await this._ensureEnabled();
      const address = await this._resolveAddress();
      await this._call('connect', address);
      // subscribe não tem um "sucesso" único: o plugin chama o callback a cada
      // linha recebida. Por isso não é embrulhado em Promise. Falha de leitura
      // (HC-06 desligou/fora de alcance) cai na reconexão.
      this._plugin.subscribe(
        this._delimiter,
        (line) => this._emitLine(String(line).trim()),
        (err) => this._handleDrop(typeof err === 'string' ? err : 'Falha na leitura do sensor'),
      );
      this._retryIndex = 0;
      this._setStatus('connected');
      this._startHealthCheck();
    } catch (err) {
      this._handleDrop(err?.message || String(err));
    }
  }

  /** Android 12+ exige BLUETOOTH_CONNECT/SCAN em tempo de execução. */
  async _ensurePermissions() {
    if (!this._permissions) return;
    const needed = [
      this._permissions.BLUETOOTH_CONNECT,
      this._permissions.BLUETOOTH_SCAN,
    ].filter(Boolean);
    const granted = await new Promise((resolve, reject) => {
      this._permissions.requestPermissions(needed, (status) => resolve(Boolean(status?.hasPermission)), () => reject(new Error('Pedido de permissão Bluetooth falhou')));
    });
    if (!granted) throw new Error('Permissão Bluetooth negada: libere em Configurações > Apps > GP Totem');
  }

  async _ensureEnabled() {
    const enabled = await this._call('isEnabled');
    if (!enabled) await this._call('enable');
  }

  async _resolveAddress() {
    if (this._address) return this._address;
    const paired = await this._call('list');
    const found = (paired || []).find((d) => (d.name || '').toUpperCase().includes(this._deviceName.toUpperCase()));
    if (!found) throw new Error(`${this._deviceName} não está pareado com este aparelho`);
    this._address = found.address;
    this._storage?.set('gp_bt_address', this._address);
    return this._address;
  }

  _handleDrop(reason) {
    this._clearHealth();
    if (!this._wantConnected) return;
    this._setStatus('reconnecting', reason);
    const delay = this._retryDelaysMs[Math.min(this._retryIndex, this._retryDelaysMs.length - 1)];
    this._retryIndex += 1;
    this._retryTimer = setTimeout(() => this._attempt(), delay);
  }

  _startHealthCheck() {
    this._clearHealth();
    this._healthTimer = setInterval(async () => {
      try {
        const connected = await this._call('isConnected');
        if (!connected) this._handleDrop('Conexão Bluetooth perdida');
      } catch (err) {
        this._handleDrop(err?.message || 'Falha ao verificar conexão');
      }
    }, this._healthCheckMs);
  }

  _call(method, ...args) {
    return new Promise((resolve, reject) => {
      if (!this._plugin || typeof this._plugin[method] !== 'function') {
        reject(new Error(`bluetoothSerial.${method} indisponível`));
        return;
      }
      const onOk = (result) => resolve(result);
      const onError = (err) => reject(new Error(typeof err === 'string' ? err : `bluetoothSerial.${method} falhou`));
      try {
        this._plugin[method](...args, onOk, onError);
      } catch (err) {
        reject(err);
      }
    });
  }

  _clearRetry() {
    if (this._retryTimer) clearTimeout(this._retryTimer);
    this._retryTimer = null;
  }

  _clearHealth() {
    if (this._healthTimer) clearInterval(this._healthTimer);
    this._healthTimer = null;
  }

  _clearTimers() {
    this._clearRetry();
    this._clearHealth();
  }
}
