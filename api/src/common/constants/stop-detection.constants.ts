/**
 * Configuração central da detecção automática de parada — NUNCA espalhar
 * esses números pelo código, sempre importar daqui. Todos configuráveis via
 * variável de ambiente (com um default razoável pra fábrica).
 */

/** Sem evento de produção há mais que isso (com sessão ativa e device
 * online) = cria um possible_stop. */
export const STOP_DETECTION_SECONDS = Number(process.env.STOP_DETECTION_SECONDS) || 120;

/** Sem heartbeat/evento do device há mais que isso = considerado OFFLINE
 * (não gera possible_stop — falta de comunicação não é parada de produção). */
export const DEVICE_OFFLINE_SECONDS = Number(process.env.DEVICE_OFFLINE_SECONDS) || 300;

/** De quanto em quanto tempo o detector varre as sessões ativas. */
export const STOP_DETECTOR_POLL_INTERVAL_MS = Number(process.env.STOP_DETECTOR_POLL_INTERVAL_MS) || 15000;
