/**
 * productionStore.js — GP Frontend V2
 *
 * REGRA: Pinia NÃO é banco de dados.
 * - Estado inicial: arrays vazios.
 * - Dados vêm exclusivamente de chamadas à API NestJS → PostgreSQL.
 * - Writes (POST/PATCH) chamam a API ANTES de atualizar o estado local.
 */
import { defineStore } from 'pinia';
import {
  machinesApi,
  productsApi,
  lotsApi,
  stopReasonsApi,
  alertasApi,
  sessionsApi,
  totemApi,
  eventsApi,
  metasApi,
  paradasApi,
  shiftsApi,
  possibleStopsApi,
  apontamentoApi,
} from '../services/api';
import { connectRealtime, disconnectRealtime, isRealtimeConnected } from '../services/realtime';

export const useProductionStore = defineStore('production', {
  state: () => ({
    // ── Dados vindos exclusivamente da API ──────────────────────────────
    machines: [],
    products: [],
    lots: [],
    stopReasons: [],
    alerts: [],
    sessions: [],
    stops: [],       // paradas-registros
    metas: [],       // target_plans
    todayEvents: [],
    // Soma real (SQL, sem paginação) de unidades produzidas por sessão —
    // { [session_id]: total }. É ISSO que qualquer tela deve usar pra exibir
    // "unidades produzidas", nunca somar todayEvents (que é paginado e trava
    // no tamanho da página assim que a sessão passa de ~100 eventos).
    productionTotals: {},
    shifts: [],
    possibleStops: [],
    // Resposta pronta de GET /apontamento (resumo + sessões + paradas do
    // dia/turno/máquina selecionados) — null até o primeiro fetchApontamento.
    apontamento: null,
    // Resposta pronta de GET /apontamento/mensal (Resumo do Mês) — null até
    // o primeiro fetchApontamentoMensal.
    apontamentoMensal: null,

    // ── Estado da UI ─────────────────────────────────────────────────
    selectedStationId: null,

    // ── Loading e erros por domínio ─────────────────────────────────
    loading: {
      machines: false,
      products: false,
      lots: false,
      stopReasons: false,
      alerts: false,
      sessions: false,
      session: false,
      stops: false,
      metas: false,
      apontamento: false,
      apontamentoMensal: false,
    },
    errors: {
      machines: null,
      products: null,
      lots: null,
      stopReasons: null,
      alerts: null,
      sessions: null,
      session: null,
      stops: null,
      metas: null,
      apontamento: null,
      apontamentoMensal: null,
    },
  }),

  getters: {
    // Máquina selecionada no painel do supervisor
    selectedMachine: (state) => {
      let m = null;
      if (state.selectedStationId) {
        m = state.machines.find((x) => x.id === state.selectedStationId);
      }
      if (!m) m = state.machines[0] ?? null;
      return m;
    },

    // Targets para MetasView derivados das metas da API
    targets: (state) => {
      return state.metas.map((meta) => ({
        id: meta.id,
        machineId: meta.machine_id,
        machineName: meta.machine?.name || meta.machine?.code || 'Máquina',
        machineCode: meta.machine?.code || 'M',
        product: meta.product?.name || '—',
        periodType: meta.period_type,
        periodStart: meta.period_start,
        periodEnd: meta.period_end,
        quantity: meta.quantity,
        // Produção real vem dos eventos — por enquanto 0 até ESP32/MQTT
        current: 0,
      }));
    },

    // Sessão ativa da máquina selecionada (Totem).
    // ANTES isso era um state.activeSession preenchido manualmente uma única
    // vez (em onMounted da ProducaoView) — por isso só atualizava dando
    // refresh na página. Agora é derivado de state.sessions, que fica fresco
    // sozinho via polling e WebSocket, então some/aparece em tempo real
    // mesmo quando a sessão muda por causa de outra tela (ex.: supervisor).
    activeSession(state) {
      const machine = this.selectedMachine;
      if (!machine) return null;
      return state.sessions.find((s) => s.machine_id === machine.id && s.status === 'active') || null;
    },

    // Conta máquinas em operação (status de sessão ativa)
    machinesOnline: (state) =>
      state.machines.filter((m) => m.status === 'operating' || m.active).length,

    machinesIsOffline: (state) =>
      state.errors.machines !== null && state.machines.length === 0,
  },

  actions: {
    // ── Selecionar estação ──────────────────────────────────────────
    selectStation(machineId) {
      this.selectedStationId = machineId;
    },

    // ── MÁQUINAS: GET /machines ────────────────────────────────────
    async fetchMachines() {
      this.loading.machines = true;
      this.errors.machines = null;
      try {
        const result = await machinesApi.list();
        if (Array.isArray(result)) {
          this.machines = result;
          if (!this.selectedStationId && this.machines.length) {
            this.selectedStationId = this.machines[0].id;
          }
        }
      } catch (err) {
        this.errors.machines = err.message || 'Erro ao carregar máquinas';
      } finally {
        this.loading.machines = false;
      }
    },

    // ── PRODUTOS: GET /products ────────────────────────────────────
    async fetchProducts() {
      this.loading.products = true;
      this.errors.products = null;
      try {
        const result = await productsApi.list();
        if (Array.isArray(result)) this.products = result;
      } catch (err) {
        this.errors.products = err.message || 'Erro ao carregar produtos';
      } finally {
        this.loading.products = false;
      }
    },

    // ── PRODUTOS: POST /products → PostgreSQL → atualiza lista ─────
    async createProduct(data) {
      const created = await productsApi.create(data);
      if (created) this.products.push(created);
      return created;
    },

    // ── PRODUTOS: PATCH /products/:id ─────────────────────────────
    async updateProduct(id, data) {
      const updated = await productsApi.update(id, data);
      if (updated) {
        const idx = this.products.findIndex((p) => p.id === id);
        if (idx !== -1) this.products[idx] = updated;
      }
      return updated;
    },

    // ── MÁQUINAS: PATCH /machines/:id/planned-production ──────────
    // Define (ou limpa, com null) o produto/lote planejado pra próxima
    // produção — a API recusa (409) se a máquina tiver sessão ativa.
    async setPlannedProduction(machineId, data) {
      const updated = await machinesApi.setPlannedProduction(machineId, data);
      if (updated) {
        const idx = this.machines.findIndex((m) => m.id === machineId);
        if (idx !== -1) this.machines[idx] = updated;
      }
      return updated;
    },

    // ── LOTES: GET /lots ───────────────────────────────────────────
    async fetchLots() {
      this.loading.lots = true;
      this.errors.lots = null;
      try {
        const result = await lotsApi.list();
        if (Array.isArray(result)) this.lots = result;
      } catch (err) {
        this.errors.lots = err.message || 'Erro ao carregar lotes';
      } finally {
        this.loading.lots = false;
      }
    },

    // ── LOTES: POST /lots → PostgreSQL ────────────────────────────
    async createLot(data) {
      const created = await lotsApi.create(data);
      if (created) this.lots.push(created);
      return created;
    },

    // ── MOTIVOS DE PARADA: GET /motivos-parada ─────────────────────
    async fetchStopReasons() {
      this.loading.stopReasons = true;
      this.errors.stopReasons = null;
      try {
        const result = await stopReasonsApi.list();
        if (Array.isArray(result)) this.stopReasons = result;
      } catch (err) {
        this.errors.stopReasons = err.message || 'Erro ao carregar motivos de parada';
      } finally {
        this.loading.stopReasons = false;
      }
    },

    // ── ALERTAS: GET /alertas/abertos ─────────────────────────────
    async fetchAlerts() {
      this.loading.alerts = true;
      this.errors.alerts = null;
      try {
        const result = await alertasApi.listOpen();
        if (Array.isArray(result)) this.alerts = result;
      } catch (err) {
        this.errors.alerts = err.message || 'Erro ao carregar alertas';
      } finally {
        this.loading.alerts = false;
      }
    },

    // ── ALERTAS: PATCH /alertas/:id/visto → PostgreSQL ────────────
    async acknowledgeAlert(alertId) {
      await alertasApi.marcarVisto(alertId);
      // Remove localmente após confirmação da API
      this.alerts = this.alerts.filter((a) => a.id !== alertId);
    },

    // ── SESSÕES: GET /production-sessions ─────────────────────────
    async fetchSessions() {
      this.loading.sessions = true;
      this.errors.sessions = null;
      try {
        const result = await sessionsApi.list();
        if (Array.isArray(result)) this.sessions = result;
      } catch (err) {
        this.errors.sessions = err.message || 'Erro ao carregar sessões';
      } finally {
        this.loading.sessions = false;
      }
    },

    // ── EVENTOS: GET /production-events (histórico paginado, não usar pra contar) ──
    async fetchProductionEvents(sessionId = null) {
      try {
        const result = await eventsApi.list(sessionId ? { session_id: sessionId, limit: 100 } : { limit: 100 });
        this.todayEvents = Array.isArray(result?.data) ? result.data : [];
        return this.todayEvents;
      } catch (err) {
        // Eventos são complementares à sessão. A falha não cria contagem local.
        this.todayEvents = [];
        throw err;
      }
    },

    // ── EVENTOS: GET /production-events/totals — soma real via SQL ────
    // Sem `sessionId` traz o total de TODAS as sessões da empresa numa
    // chamada só (usado pelo TV/Estações, que mostram várias máquinas de
    // uma vez); com `sessionId`, só daquela (usado pelo Totem).
    async fetchProductionTotals(sessionId = null) {
      try {
        const result = await eventsApi.totals(sessionId);
        if (result && typeof result === 'object') {
          this.productionTotals = { ...this.productionTotals, ...result };
        }
      } catch {
        // Não derruba a tela por isso — mantém o último total conhecido.
      }
    },

    // ── PARADAS: GET /paradas-registros ───────────────────────────
    async fetchStops(maquinaId = null) {
      this.loading.stops = true;
      this.errors.stops = null;
      try {
        const result = maquinaId
          ? await paradasApi.listByMachine(maquinaId)
          : await paradasApi.list();
        if (Array.isArray(result)) this.stops = result;
      } catch (err) {
        this.errors.stops = err.message || 'Erro ao carregar paradas';
      } finally {
        this.loading.stops = false;
      }
    },

    // ── PARADAS: POST /paradas-registros → PostgreSQL ─────────────
    async createStop(data) {
      const created = await paradasApi.create(data);
      if (created) this.stops.unshift(created);
      return created;
    },

    // ── PARADAS: PATCH /paradas-registros/:id/encerrar ─────────────
    async encerrarStop(id, motivoParadaId) {
      const updated = await paradasApi.encerrar(id, motivoParadaId);
      if (updated) {
        const idx = this.stops.findIndex((s) => s.id === id);
        if (idx !== -1) this.stops[idx] = updated;
      }
      return updated;
    },

    // ── METAS: GET /metas ─────────────────────────────────────────
    async fetchMetas(machineId = null) {
      this.loading.metas = true;
      this.errors.metas = null;
      try {
        const result = machineId
          ? await metasApi.listByMachine(machineId)
          : await metasApi.list();
        if (Array.isArray(result)) this.metas = result;
      } catch (err) {
        this.errors.metas = err.message || 'Erro ao carregar metas';
      } finally {
        this.loading.metas = false;
      }
    },

    // ── METAS: POST /metas → PostgreSQL ───────────────────────────
    async createMeta(data) {
      const created = await metasApi.create(data);
      if (created) this.metas.push(created);
      return created;
    },

    // ── TURNOS: GET /shifts ────────────────────────────────────────
    async fetchShifts() {
      try {
        const result = await shiftsApi.list();
        if (Array.isArray(result)) this.shifts = result;
      } catch {
        // turnos são só um filtro auxiliar — falha aqui não derruba a tela
      }
    },

    // ── POSSÍVEIS PARADAS: GET /possible-stops ─────────────────────
    async fetchPossibleStops(query = {}) {
      try {
        const result = await possibleStopsApi.list(query);
        if (Array.isArray(result)) this.possibleStops = result;
      } catch {
        // idem — não é dado crítico pra tela renderizar
      }
    },

    // ── POSSÍVEIS PARADAS: PATCH /possible-stops/:id/confirmar ─────
    // POSSIBLE_STOP → CONFIRMAR → STOP real (ver PossibleStopsService).
    async confirmarPossibleStop(id, data) {
      const resultado = await possibleStopsApi.confirmar(id, data);
      this.possibleStops = this.possibleStops.filter((p) => p.id !== id);
      return resultado;
    },

    // ── POSSÍVEIS PARADAS: PATCH /possible-stops/:id/descartar ─────
    async descartarPossibleStop(id) {
      const resultado = await possibleStopsApi.descartar(id);
      this.possibleStops = this.possibleStops.filter((p) => p.id !== id);
      return resultado;
    },

    // ── APONTAMENTO: GET /apontamento?date&shift_id&machine_id&... ──
    // Resposta já vem pronta pra tela (resumo + sessões + paradas do
    // contexto filtrado) — ver ApontamentoService no backend.
    async fetchApontamento(filtros = {}) {
      this.loading.apontamento = true;
      this.errors.apontamento = null;
      try {
        this.apontamento = await apontamentoApi.obter(filtros);
      } catch (err) {
        this.errors.apontamento = err.message || 'Erro ao carregar apontamento';
        this.apontamento = null;
      } finally {
        this.loading.apontamento = false;
      }
    },

    // ── RESUMO MENSAL: GET /apontamento/mensal?year&month&... ──────
    // Resposta já vem pronta pra tela (resumo + quebras por dia/máquina/
    // turno/motivo do mês filtrado) — ver ApontamentoService.obterMensal.
    async fetchApontamentoMensal(filtros = {}) {
      this.loading.apontamentoMensal = true;
      this.errors.apontamentoMensal = null;
      try {
        this.apontamentoMensal = await apontamentoApi.mensal(filtros);
      } catch (err) {
        this.errors.apontamentoMensal = err.message || 'Não foi possível carregar o resumo.';
        this.apontamentoMensal = null;
      } finally {
        this.loading.apontamentoMensal = false;
      }
    },

    // ── METAS: PATCH /metas/:id → PostgreSQL ─────────────────────
    async updateMeta(id, data) {
      const updated = await metasApi.update(id, data);
      if (updated) {
        const idx = this.metas.findIndex((m) => m.id === id);
        if (idx !== -1) this.metas[idx] = updated;
      }
      return updated;
    },

    // Insere/atualiza uma sessão em state.sessions (por id). Usado depois de
    // toda escrita de sessão do Totem pra manter o getter activeSession
    // correto sem precisar esperar o próximo polling/refetch.
    _upsertSession(session) {
      const idx = this.sessions.findIndex((s) => s.id === session.id);
      if (idx !== -1) this.sessions[idx] = session;
      else this.sessions.push(session);
    },

    // ── TOTEM: POST /totem/sessions → Inicia sessão ───────────────
    async startSession({ machine_id, product_id, lot_code, operator_name }) {
      this.loading.session = true;
      this.errors.session = null;
      try {
        const session = await totemApi.startSession({
          machine_id,
          product_id,
          lot_code,
          operator_name,
        });
        if (session) this._upsertSession(session);
        return session;
      } catch (err) {
        this.errors.session = err.message || 'Erro ao iniciar sessão';
        throw err;
      } finally {
        this.loading.session = false;
      }
    },

    // ── TOTEM: PATCH /totem/sessions/current/lot ──────────────────
    async changeLot({ machine_id, lot_code }) {
      this.loading.session = true;
      this.errors.session = null;
      try {
        const session = await totemApi.changeLot({ machine_id, lot_code });
        if (session) this._upsertSession(session);
        return session;
      } catch (err) {
        this.errors.session = err.message || 'Erro ao trocar lote';
        throw err;
      } finally {
        this.loading.session = false;
      }
    },

    // ── TOTEM: PATCH /totem/sessions/current/operator ─────────────
    async changeOperator({ machine_id, operator_name }) {
      this.loading.session = true;
      this.errors.session = null;
      try {
        const session = await totemApi.changeOperator({ machine_id, operator_name });
        if (session) this._upsertSession(session);
        return session;
      } catch (err) {
        this.errors.session = err.message || 'Erro ao trocar operador';
        throw err;
      } finally {
        this.loading.session = false;
      }
    },

    // ── TOTEM: POST /totem/sessions/current/close ─────────────────
    // Encerra sessão: status=CLOSED, ended_at registrado no banco
    async closeSession({ machine_id }) {
      this.loading.session = true;
      this.errors.session = null;
      try {
        const result = await totemApi.closeSession({ machine_id });
        if (result) this._upsertSession(result);
        else await this.fetchSessions();
        return result;
      } catch (err) {
        this.errors.session = err.message || 'Erro ao encerrar sessão';
        throw err;
      } finally {
        this.loading.session = false;
      }
    },

    // ── EVENTOS: POST /production-events (futuro ESP32/MQTT) ───────
    // Aguardando sensor físico. Não usar para simular produção.
    async registerProductionEvent({ session_id, machine_id, quantity = 1, source = 'manual' }) {
      const event = await eventsApi.create({
        session_id,
        machine_id,
        event_uid: `FE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        quantity,
        source,
        occurred_at: new Date().toISOString(),
      });
      return event;
    },

    // ── Bootstrap: carrega dados iniciais ─────────────────────────
    async bootstrap() {
      await Promise.allSettled([
        this.fetchMachines(),
        this.fetchProducts(),
        this.fetchStopReasons(),
        this.fetchAlerts(),
        this.fetchMetas(),
        this.fetchSessions(),
        this.fetchStops(),
        this.fetchProductionTotals(),
      ]);
    },

    // ── WebSocket: sincronização instantânea entre Totem/TV/Dashboard ──
    // Ao chegar qualquer evento do NestJS, refaz o fetch real via API
    // (nunca escreve dado fabricado no Pinia). O polling abaixo continua
    // como rede de segurança caso o socket caia ou o servidor reinicie.
    _connectRealtime() {
      connectRealtime({
        'session.started': () => { this.fetchSessions(); this.fetchMachines(); },
        'session.closed': () => this.fetchSessions(),
        'session.updated': () => this.fetchSessions(),
        'machine.state.changed': () => {
          this.fetchMachines();
          this.fetchSessions();
          this.fetchStops(this.selectedStationId);
        },
        'stop.started': () => {
          this.fetchStops(this.selectedStationId);
          this.fetchAlerts();
        },
        'stop.ended': () => {
          this.fetchStops(this.selectedStationId);
          this.fetchAlerts();
        },
        'alert.created': () => this.fetchAlerts(),
        'alert.resolved': () => this.fetchAlerts(),
        'alert.acknowledged': () => this.fetchAlerts(),
        'target.updated': () => this.fetchMetas(),
        'production.updated': (payload) => this.fetchProductionTotals(payload?.session_id),
        'possible_stop.created': () => this.fetchPossibleStops({ status: 'pending' }),
        'possible_stop.resolved': () => this.fetchPossibleStops({ status: 'pending' }),
      });
    },

    // ── Polling otimizado e leve (Sincronização multi-tela) ───────
    // Rede de segurança do WebSocket: mesmo que o socket caia, o estado
    // ainda converge sozinho a cada intervalo.
    _pollTimer: null,
    _isPollingInProgress: false,
    _visibilityHandler: null,
    _pageshowHandler: null,

    async _refetchDynamicData() {
      if (this._isPollingInProgress) return;
      this._isPollingInProgress = true;
      try {
        const promises = [
          this.fetchSessions(),
          this.fetchStops(this.selectedStationId),
          this.fetchAlerts(),
          this.fetchMetas(),
          this.fetchProductionTotals(),
        ];
        if (!this.machines.length) {
          promises.push(this.fetchMachines());
        }
        await Promise.allSettled(promises);
      } finally {
        this._isPollingInProgress = false;
      }
    },

    startPolling(intervalMs = 6000) {
      if (this._pollTimer) return;

      this._connectRealtime();

      this._pollTimer = setInterval(() => {
        // Pausar SÓ o polling (não o WS) se a aba estiver oculta/minimizada —
        // evita gastar rede/CPU com uma tela que ninguém está olhando.
        if (typeof document !== 'undefined' && document.hidden) return;
        this._refetchDynamicData();
      }, intervalMs);

      // Rede de segurança pra quando a aba volta a ficar visível: sem isso,
      // uma tela em background (ex.: alternando de janela) fica travada com
      // dado velho até o próximo tick de até `intervalMs`, e se o socket.io
      // tiver caído nesse meio tempo (bem comum em aba em segundo plano,
      // que o navegador limita/congela), refetch imediato garante que o
      // Totem/TV se atualiza assim que volta a ser exibido — sem precisar F5.
      if (typeof document !== 'undefined') {
        this._visibilityHandler = () => {
          if (!document.hidden) {
            this._refetchDynamicData();
            if (!isRealtimeConnected()) this._connectRealtime();
          }
        };
        document.addEventListener('visibilitychange', this._visibilityHandler);
      }

      // Celular (PWA instalado principalmente): trocar de app e voltar não é
      // "aba oculta/visível" — o navegador pode congelar a página inteira e
      // restaurá-la depois do bfcache, e nesse caso o `visibilitychange`
      // acima nem sempre dispara (comportamento conhecido do Safari/iOS em
      // modo standalone). Sintoma exato: meta/contador ficam parados até dar
      // F5 manual. `pageshow` com `persisted=true` cobre esse caso — dispara
      // sempre que a página volta do bfcache, WebView incluído.
      if (typeof window !== 'undefined') {
        this._pageshowHandler = (event) => {
          if (event.persisted) {
            this._refetchDynamicData();
            if (!isRealtimeConnected()) this._connectRealtime();
          }
        };
        window.addEventListener('pageshow', this._pageshowHandler);
      }
    },

    stopPolling() {
      if (typeof document !== 'undefined' && this._visibilityHandler) {
        document.removeEventListener('visibilitychange', this._visibilityHandler);
        this._visibilityHandler = null;
      }
      if (typeof window !== 'undefined' && this._pageshowHandler) {
        window.removeEventListener('pageshow', this._pageshowHandler);
        this._pageshowHandler = null;
      }
      if (this._pollTimer) {
        clearInterval(this._pollTimer);
        this._pollTimer = null;
      }
      this._isPollingInProgress = false;
      disconnectRealtime();
    },
  },
});
