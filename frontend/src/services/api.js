/**
 * API Client — GP Frontend V2
 * Conecta com NestJS na porta 3000
 *
 * REGRA:
 * - GETs retornam null silenciosamente em caso de erro (401/403/offline)
 * - POSTs, PATCHs e DELETEs propagam o erro para o componente tratar
 * - Pinia NUNCA é o banco de dados — toda escrita vai para a API
 */

export const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : 'http://localhost:3000');

export function getToken() {
  try {
    const raw = localStorage.getItem('gp_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const isReadOnly = !options.method || options.method === 'GET';

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

    if (response.status === 204) return null;

    // 401/403: para leituras, silencioso; para escritas, propaga
    if (response.status === 401 || response.status === 403) {
      if (isReadOnly) return null;
      throw Object.assign(new Error('Sem autorização para esta ação'), { status: response.status });
    }

    if (!response.ok) {
      let msg = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        msg = body.message || (Array.isArray(body.message) ? body.message.join('; ') : msg);
      } catch { /* ignore */ }
      throw Object.assign(new Error(msg), { status: response.status });
    }

    return response.json();
  } catch (err) {
    if (isReadOnly && !err.status) return null; // Offline silencioso para leituras
    throw err;
  }
}

// ─── AUTH ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),
};

// ─── MÁQUINAS ──────────────────────────────────────────────────────────────
export const machinesApi = {
  list: () => request('/machines'),
  get: (id) => request(`/machines/${id}`),
  create: (data) => request('/machines', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/machines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/machines/${id}`, { method: 'DELETE' }),
  // Próxima produção (produto/lote) planejada — só aceito pela API enquanto
  // a máquina não tem sessão ativa.
  setPlannedProduction: (id, data) =>
    request(`/machines/${id}/planned-production`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── PRODUTOS ──────────────────────────────────────────────────────────────
export const productsApi = {
  list: () => request('/products'),
  get: (id) => request(`/products/${id}`),
  create: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── LOTES ─────────────────────────────────────────────────────────────────
export const lotsApi = {
  list: () => request('/lots'),
  get: (id) => request(`/lots/${id}`),
  create: (data) => request('/lots', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── MOTIVOS DE PARADA ─────────────────────────────────────────────────────
export const stopReasonsApi = {
  list: () => request('/motivos-parada'),
  get: (id) => request(`/motivos-parada/${id}`),
  create: (data) => request('/motivos-parada', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/motivos-parada/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── PARADAS REGISTRADAS ───────────────────────────────────────────────────
// Endpoint: /paradas-registros
export const paradasApi = {
  list: () => request('/paradas-registros'),
  get: (id) => request(`/paradas-registros/${id}`),
  listByMachine: (maquinaId) => request(`/paradas-registros/maquina/${maquinaId}`),
  /** Requer role: ADMIN */
  create: (data) => request('/paradas-registros', { method: 'POST', body: JSON.stringify(data) }),
  /** PATCH /paradas-registros/:id/encerrar — Supervisor ou Admin */
  encerrar: (id, motivoParadaId) =>
    request(`/paradas-registros/${id}/encerrar`, {
      method: 'PATCH',
      body: JSON.stringify({ motivoParadaId }),
    }),
  update: (id, data) => request(`/paradas-registros/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/paradas-registros/${id}`, { method: 'DELETE' }),
};

// ─── ALERTAS ───────────────────────────────────────────────────────────────
export const alertasApi = {
  listOpen: () => request('/alertas/abertos'),
  list: () => request('/alertas'),
  get: (id) => request(`/alertas/${id}`),
  listByMachine: (maquinaId) => request(`/alertas/maquina/${maquinaId}`),
  marcarVisto: (id) => request(`/alertas/${id}/visto`, { method: 'PATCH' }),
  marcarResolvido: (id) => request(`/alertas/${id}/resolvido`, { method: 'PATCH' }),
};

// ─── SESSÕES (HISTÓRICO — Supervisor/Admin) ────────────────────────────────
export const sessionsApi = {
  list: () => request('/production-sessions'),
  get: (id) => request(`/production-sessions/${id}`),
};

// ─── TOTEM (OPERAÇÕES DO OPERADOR) ─────────────────────────────────────────
export const totemApi = {
  /** POST /totem/sessions — Inicia sessão de produção */
  startSession: (data) =>
    request('/totem/sessions', { method: 'POST', body: JSON.stringify(data) }),

  /** PATCH /totem/sessions/current/lot — Troca de lote (mantém session_id) */
  changeLot: (data) =>
    request('/totem/sessions/current/lot', { method: 'PATCH', body: JSON.stringify(data) }),

  /** PATCH /totem/sessions/current/operator — Troca operador (gera audit_log) */
  changeOperator: (data) =>
    request('/totem/sessions/current/operator', { method: 'PATCH', body: JSON.stringify(data) }),

  /** POST /totem/sessions/current/close — Encerra sessão (status=CLOSED, ended_at) */
  closeSession: (data) =>
    request('/totem/sessions/current/close', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── EVENTOS DE PRODUÇÃO (sensor ESP32/MQTT) ───────────────────────────────
// NOTA: Por enquanto sem sensor. Eventos gerados manualmente via este endpoint.
export const eventsApi = {
  list: (query = {}) => {
    const params = new URLSearchParams(query).toString();
    return request(`/production-events${params ? '?' + params : ''}`);
  },
  create: (data) =>
    request('/production-events', { method: 'POST', body: JSON.stringify(data) }),
  // Soma real via SQL (sem paginação) — usar SEMPRE pra "unidades produzidas",
  // nunca somar `list()` no cliente (é paginado, trava no tamanho da página).
  totals: (sessionId) =>
    request(`/production-events/totals${sessionId ? `?session_id=${sessionId}` : ''}`),
};

// ─── METAS (target_plans) ──────────────────────────────────────────────────
// Campos necessários: machine_id, company_id, quantity, period_type, period_start, period_end, created_by
export const metasApi = {
  list: () => request('/metas'),
  get: (id) => request(`/metas/${id}`),
  listByMachine: (machineId) => request(`/metas/maquina/${machineId}`),
  create: (data) => request('/metas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/metas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/metas/${id}`, { method: 'DELETE' }),
};

// ─── TURNOS ────────────────────────────────────────────────────────────────
export const shiftsApi = {
  list: () => request('/shifts'),
};

// ─── POSSÍVEIS PARADAS (detecção automática) ───────────────────────────────
export const possibleStopsApi = {
  list: (query = {}) => {
    const params = new URLSearchParams(query).toString();
    return request(`/possible-stops${params ? '?' + params : ''}`);
  },
  confirmar: (id, data) => request(`/possible-stops/${id}/confirmar`, { method: 'PATCH', body: JSON.stringify(data) }),
  descartar: (id) => request(`/possible-stops/${id}/descartar`, { method: 'PATCH' }),
};

// ─── APONTAMENTO (histórico por dia/turno/máquina) ─────────────────────────
export const apontamentoApi = {
  obter: (filtros = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)),
    ).toString();
    return request(`/apontamento${params ? '?' + params : ''}`);
  },
};

// ─── ESTAÇÕES ──────────────────────────────────────────────────────────────
export const estacoesApi = {
  list: () => request('/estacoes'),
  get: (id) => request(`/estacoes/${id}`),
  create: (data) => request('/estacoes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/estacoes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── USUÁRIOS ──────────────────────────────────────────────────────────────
export const usuariosApi = {
  list: () => request('/usuarios'),
  get: (id) => request(`/usuarios/${id}`),
  create: (data) => request('/usuarios', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/usuarios/${id}`, { method: 'DELETE' }),
};
