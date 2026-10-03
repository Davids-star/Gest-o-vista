/**
 * Interpreta o protocolo do sensor e transforma leituras em eventos de produção.
 *
 * Protocolo (firmware do Arduino, igual ao usado em simulator/serve.py):
 *   COUNT:n                       → contagem acumulada desde o último RESET/boot
 *   Contagem atual: n             → banner do boot; define a referência inicial
 *   Doce detectado. ... Total: n  → mesma contagem; duplicata não gera quantidade extra
 *
 * Regras:
 * - A quantidade de um evento é a DIFERENÇA para a última contagem vista,
 *   nunca "sempre +1" — assim uma linha perdida não some com a produção.
 * - Se a contagem diminuir, o sensor reiniciou (RESET/boot): começa uma nova
 *   "época" e o event_uid muda, para não colidir com eventos antigos.
 * - Contagens recebidas sem sessão ativa atualizam a referência mas não geram
 *   evento (não é produção de ninguém).
 * - event_uid é determinístico (deviceId:sessão:época:contagem): reenvios e
 *   reconexões geram o mesmo uid e a API ignora a duplicata. A sessão faz parte
 *   do uid para que peças de sessões diferentes nunca colidam, mesmo que a
 *   referência local seja perdida.
 */

// Formas aceitas da contagem acumulada (todas trazem o mesmo total).
const COUNT_PATTERNS = [
  /^COUNT:\s*(\d+)\s*$/,
  /^Contagem atual:\s*(\d+)\s*$/,
  /Total:\s*(\d+)\s*$/,
];

/** Retorna { total } para linhas de contagem, ou null para qualquer outra linha. */
export function parseSensorLine(line) {
  if (typeof line !== 'string') return null;
  const text = line.trim();
  for (const re of COUNT_PATTERNS) {
    const match = text.match(re);
    if (match) return { total: Number(match[1]) };
  }
  return null;
}

/**
 * Mantém a referência (última contagem e época) de um sensor.
 * `state` é { lastTotal, epoch } — persistido pelo chamador (DatabaseService),
 * para sobreviver a reinício do app.
 */
export function computeProductionDelta(state, total) {
  const epoch = state?.epoch ?? 0;
  const lastTotal = state?.lastTotal ?? null;

  // Primeira leitura do sensor: só define a referência.
  if (lastTotal === null) {
    return { delta: 0, epoch, nextState: { epoch, lastTotal: total } };
  }

  // Contagem menor que a anterior: sensor reiniciou (RESET ou reboot).
  if (total < lastTotal) {
    const newEpoch = epoch + 1;
    return { delta: total, epoch: newEpoch, nextState: { epoch: newEpoch, lastTotal: total } };
  }

  const delta = total - lastTotal;
  return { delta, epoch, nextState: { epoch, lastTotal: total } };
}

/** event_uid estável: mesmo sensor, sessão, época e contagem → mesmo uid. */
export function buildEventUid(deviceId, sessionId, epoch, total) {
  return `${deviceId}:${sessionId}:${epoch}:${total}`;
}

/**
 * Orquestra leitura → delta → evento. Não conhece Bluetooth nem API:
 * recebe `saveEvent(evento)` (fila local) e `getState/saveState` (referência do sensor).
 */
export class ProductionService {
  constructor({ deviceId, getActiveSession, getState, saveState, saveEvent, now = () => new Date() }) {
    this.deviceId = deviceId;
    this.getActiveSession = getActiveSession; // () => { session_id, machine_id } | null
    this.getState = getState;                 // async () => { lastTotal, epoch } | null
    this.saveState = saveState;               // async (state) => void
    this.saveEvent = saveEvent;               // async (evento) => void
    this.now = now;
    this._queue = Promise.resolve();
  }

  /** Processa uma linha vinda do gateway. Serializado para não misturar leituras. */
  handleLine(line) {
    this._queue = this._queue.then(() => this._process(line)).catch(() => {});
    return this._queue;
  }

  async _process(line) {
    const reading = parseSensorLine(line);
    if (!reading) return null;

    const state = await this.getState();
    const { delta, epoch, nextState } = computeProductionDelta(state, reading.total);
    await this.saveState({ ...nextState, deviceId: this.deviceId });

    if (delta <= 0) return null;

    const session = this.getActiveSession();
    if (!session) return null;

    const evento = {
      event_uid: buildEventUid(this.deviceId, session.session_id, epoch, reading.total),
      session_id: session.session_id,
      machine_id: session.machine_id,
      quantity: delta,
      occurred_at: this.now().toISOString(),
      source: 'bluetooth',
    };
    await this.saveEvent(evento);
    return evento;
  }
}
