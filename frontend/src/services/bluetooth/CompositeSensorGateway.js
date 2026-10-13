import { BluetoothGateway } from './BluetoothGateway.js';

/**
 * Usa USB (cabo OTG) e Bluetooth ao mesmo tempo e identifica qual está valendo.
 *
 * - Linhas de qualquer uma das duas vão para o app. O Arduino manda o mesmo COUNT pelos dois
 *   caminhos; a repetição é inofensiva (o ProductionService calcula a DIFERENÇA do total, então
 *   um COUNT repetido dá diferença 0 e não gera peça).
 * - "Ativo" = quem entregou linha nos últimos `recentMs`; se as duas estão entregando, o cabo
 *   tem preferência. Sem entrega recente, vale o que estiver conectado (cabo primeiro).
 * - Status geral: 'connected' se alguma estiver conectada.
 *
 * `gateways` é { usb?, bluetooth? } (cada um é um BluetoothGateway).
 */
const PREFERENCIA = ['usb', 'bluetooth'];

export class CompositeSensorGateway extends BluetoothGateway {
  constructor(gateways, { recentMs = 20000, now = () => Date.now() } = {}) {
    super();
    this._gateways = gateways;
    this._recentMs = recentMs;
    this._now = now;
    this._lastLineAt = {};
    this._linkHandlers = new Set();
    this._lastReport = null;
    for (const [name, gw] of Object.entries(gateways)) {
      gw.onLine((line) => {
        this._lastLineAt[name] = this._now();
        this._emitLine(line);
        this._publish();
      });
      gw.onStatus(() => { this._recompute(); this._publish(); });
    }
  }

  get kind() {
    return 'multi';
  }

  /** Estado de cada caminho: { usb: 'connected', bluetooth: 'reconnecting' } */
  get links() {
    const out = {};
    for (const [name, gw] of Object.entries(this._gateways)) out[name] = gw.status;
    return out;
  }

  /** Caminho que está valendo agora ('usb' | 'bluetooth' | null). */
  get activeLink() {
    const names = PREFERENCIA.filter((n) => this._gateways[n]);
    const t = this._now();
    const recent = names.find((n) => this._gateways[n].status === 'connected' && t - (this._lastLineAt[n] ?? -Infinity) <= this._recentMs);
    return recent || names.find((n) => this._gateways[n].status === 'connected') || null;
  }

  /** Avisa quando muda o caminho ativo ou o estado de algum: handler({ active, links }). */
  onLink(handler) {
    this._linkHandlers.add(handler);
    return () => this._linkHandlers.delete(handler);
  }

  async connect() {
    await Promise.allSettled(Object.values(this._gateways).map((gw) => gw.connect()));
    this._recompute();
    this._publish();
  }

  async disconnect() {
    await Promise.allSettled(Object.values(this._gateways).map((gw) => gw.disconnect()));
    this._recompute();
    this._publish();
  }

  async sendCommand(command) {
    const gw = this._gateways[this.activeLink];
    if (!gw) throw new Error('Sensor não conectado');
    return gw.sendCommand(command);
  }

  _recompute() {
    const statuses = Object.values(this.links);
    if (statuses.includes('connected')) this._setStatus('connected');
    else if (statuses.includes('reconnecting') || statuses.includes('connecting')) this._setStatus('reconnecting');
    else this._setStatus('disconnected');
  }

  _publish() {
    const snapshot = { active: this.activeLink, links: this.links };
    const key = JSON.stringify(snapshot);
    if (key === this._lastReport) return;
    this._lastReport = key;
    for (const handler of this._linkHandlers) handler(snapshot);
  }
}
