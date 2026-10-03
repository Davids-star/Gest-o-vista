/**
 * Envia para a API os eventos pendentes da fila local.
 *
 * Regras:
 * - Sucesso (ou a API já ter o event_uid — a API devolve o existente) → 'synced'.
 * - Erro permanente (400/404: sessão encerrada, máquina inválida) → 'rejected',
 *   fica no histórico com o motivo; não tenta de novo.
 * - Sem rede, 5xx ou 401/403 → mantém 'pending', para o ciclo e tenta depois.
 * - Ciclo único por vez; dispara a cada `intervalMs`, ao voltar a rede e sob demanda (`flush`).
 *
 * `api` é o cliente HTTP (services/api.js → eventsApi.create). Injetado para teste.
 * `onlineEvents` é { subscribe(fn) => unsubscribe } (ex.: window 'online').
 */
export class SyncService {
  constructor({ db, api, intervalMs = 5000, onlineEvents = null, onChange = () => {} }) {
    this.db = db;
    this.api = api;
    this.intervalMs = intervalMs;
    this.onlineEvents = onlineEvents;
    this.onChange = onChange;
    this._running = false;
    this._timer = null;
    this._unsubscribeOnline = null;
    this.lastSyncAt = null;
    this.lastError = null;
  }

  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this.flush(), this.intervalMs);
    if (this.onlineEvents) this._unsubscribeOnline = this.onlineEvents.subscribe(() => this.flush());
    this.flush();
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    if (this._unsubscribeOnline) this._unsubscribeOnline();
    this._unsubscribeOnline = null;
  }

  /** Tenta enviar tudo que está pendente. Retorna quantos foram sincronizados nesta rodada. */
  async flush() {
    if (this._running) return 0;
    this._running = true;
    let sent = 0;
    try {
      const pending = await this.db.pendingEvents();
      for (const evento of pending) {
        try {
          await this.api.create(toApiPayload(evento));
          await this.db.markSynced(evento.event_uid);
          sent += 1;
          this.lastSyncAt = new Date().toISOString();
          this.lastError = null;
        } catch (err) {
          const status = err?.status;
          if (status === 400 || status === 404) {
            await this.db.markRejected(evento.event_uid, err.message);
            this.lastError = err.message;
            continue;
          }
          await this.db.markAttempt(evento.event_uid, err?.message || 'erro de rede');
          this.lastError = err?.message || 'sem conexão';
          break; // sem rede/servidor fora: não adianta insistir agora
        }
      }
    } catch (err) {
      this.lastError = err?.message || String(err);
    } finally {
      this._running = false;
      this.onChange(await this.snapshot());
    }
    return sent;
  }

  async snapshot() {
    const pendentes = await this.db.pendingEvents();
    // Peças ainda guardadas no aparelho, por sessão: a tela soma isso ao total
    // da API para o operador ver o que está sendo guardado sem internet.
    const pendingBySession = {};
    for (const e of pendentes) {
      pendingBySession[e.session_id] = (pendingBySession[e.session_id] || 0) + e.quantity;
    }
    return {
      pending: pendentes.length,
      pendingBySession,
      rejected: await this.db.countByStatus('rejected'),
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
    };
  }
}

/** Campos que a API aceita em POST /production-events (o restante fica só no aparelho). */
export function toApiPayload(evento) {
  return {
    event_uid: evento.event_uid,
    session_id: evento.session_id,
    machine_id: evento.machine_id,
    quantity: evento.quantity,
    occurred_at: evento.occurred_at,
    source: evento.source,
  };
}
