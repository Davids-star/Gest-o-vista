/** Máximo por requisição — igual a MAX_EVENTOS_POR_LOTE da API. */
export const TAMANHO_LOTE = 200;
/** Janela padrão de envio: peças que chegam dentro dela vão juntas; uma peça sozinha espera no máximo isso. */
export const JANELA_ENVIO_MS = 5000;

/**
 * Envia para a API os eventos pendentes da fila local, EM LOTE.
 *
 * Antes era um POST por evento, em série: 300 peças acumuladas = 300 idas e
 * voltas até a API (cada uma com autenticação, 4-5 consultas e um aviso em
 * tempo real). Agora é 1 requisição a cada 200 eventos.
 *
 * Regras:
 * - Resultado 'accepted' ou 'duplicate' (a API já tinha o event_uid) → 'synced'.
 * - 'rejected' (sessão encerrada, máquina inválida) ou 400/404 no evento isolado
 *   → 'rejected': fica no histórico com o motivo; não tenta de novo.
 * - Sem rede, 5xx ou 401/403 → mantém 'pending', para o ciclo e tenta depois.
 * - Ciclo único por vez; dispara a cada `intervalMs`, ao voltar a rede e sob
 *   demanda (`flush`/`requestFlush`).
 * - A resposta traz o total real por sessão: `onTotals` recebe esse total ANTES
 *   de `onChange` informar que as pendências diminuíram, para o contador da tela
 *   nunca "cair" entre uma coisa e outra.
 *
 * `api` é o cliente HTTP ({ createBatch(events) } → { results, totals }).
 * `onlineEvents` é { subscribe(fn) => unsubscribe } (ex.: window 'online').
 */
export class SyncService {
  constructor({ db, api, intervalMs = 5000, windowMs = JANELA_ENVIO_MS, onlineEvents = null, onChange = () => {}, onTotals = () => {} }) {
    this.db = db;
    this.api = api;
    this.intervalMs = intervalMs;
    this.windowMs = windowMs;
    this.onlineEvents = onlineEvents;
    this.onChange = onChange;
    this.onTotals = onTotals;
    this._running = false;
    this._again = false;
    this._timer = null;
    this._debounce = null;
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
    if (this._debounce) clearTimeout(this._debounce);
    this._timer = null;
    this._debounce = null;
    if (this._unsubscribeOnline) this._unsubscribeOnline();
    this._unsubscribeOnline = null;
  }

  /**
   * Chegou peça nova: abre uma janela de `windowMs` (5 s) e manda tudo o que juntar nela.
   * 2 ou 3 peças na janela viajam num lote só; se só passar 1, ela sai quando a janela
   * fecha — nunca espera mais que isso. (A janela abre na primeira peça e não é
   * estendida pelas seguintes.)
   */
  requestFlush() {
    if (this._debounce) return;
    this._debounce = setTimeout(() => {
      this._debounce = null;
      this.flush();
    }, this.windowMs);
  }

  /** Tenta enviar tudo que está pendente. Retorna quantos foram sincronizados nesta rodada. */
  async flush() {
    // Chegou peça nova com um envio em andamento: roda de novo ao terminar,
    // em vez de deixar a peça esperando o próximo ciclo de 5 s.
    if (this._running) { this._again = true; return 0; }
    this._running = true;
    let sent = 0;
    try {
      do {
        this._again = false;
        // Servidor sem rota de lote: junta peças em eventos com quantidade maior (1 requisição, N peças).
        if (this.api.batchSupported === false) await this.db.coalescePending();
        const pending = await this.db.pendingEvents();
        for (let i = 0; i < pending.length; i += TAMANHO_LOTE) {
          const resultado = await this._enviarLote(pending.slice(i, i + TAMANHO_LOTE));
          sent += resultado.sent;
          if (resultado.parar) { this._again = false; break; } // sem rede/servidor fora: não insiste agora
        }
      } while (this._again);
    } catch (err) {
      this.lastError = err?.message || String(err);
    } finally {
      this._running = false;
      this.onChange(await this.snapshot());
    }
    return sent;
  }

  /** Envia um lote. Em 400/404 do lote inteiro, divide ao meio para achar o evento ruim. */
  async _enviarLote(lote) {
    let resposta;
    try {
      resposta = await this.api.createBatch(lote.map(toApiPayload));
    } catch (err) {
      const status = err?.status;
      if (status === 400 || status === 404) {
        if (lote.length === 1) {
          await this.db.markRejected(lote[0].event_uid, err.message);
          this.lastError = err.message;
          return { sent: 0, parar: false };
        }
        const meio = Math.ceil(lote.length / 2);
        const a = await this._enviarLote(lote.slice(0, meio));
        if (a.parar) return a;
        const b = await this._enviarLote(lote.slice(meio));
        return { sent: a.sent + b.sent, parar: b.parar };
      }
      const mensagem = err?.message || 'erro de rede';
      for (const evento of lote) await this.db.markAttempt(evento.event_uid, mensagem);
      this.lastError = mensagem;
      return { sent: 0, parar: true };
    }

    const porUid = new Map((resposta?.results || []).map((r) => [r.event_uid, r]));
    let sent = 0;
    for (const evento of lote) {
      const r = porUid.get(evento.event_uid);
      if (r?.status === 'rejected') {
        await this.db.markRejected(evento.event_uid, r.error || 'recusado pela API');
        this.lastError = r.error || 'recusado pela API';
      } else if (r) {
        await this.db.markSynced(evento.event_uid);
        sent += 1;
      }
      // Sem resultado para este uid (resposta incompleta): continua pendente.
    }
    if (sent) {
      this.lastSyncAt = new Date().toISOString();
      this.lastError = null;
    }
    if (resposta?.totals) this.onTotals(resposta.totals);
    // Pendências já descontadas E total novo aplicado: avisa a tela agora, não só no
    // fim do ciclo (com vários lotes o contador ficaria somando as duas coisas).
    this.onChange(await this.snapshot());
    return { sent, parar: false };
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
