/**
 * Configuração central do frontend — ÚNICO lugar que lê import.meta.env.
 * Nenhum outro arquivo deve montar URL de API ou ler variável de ambiente.
 *
 * - Desenvolvimento: VITE_API_URL vazio → API em http://<mesmo host>:3000.
 * - Produção: VITE_API_URL obrigatório (ex.: https://api.exemplo.com),
 *   definido em .env.production antes do `npm run build`.
 *
 * Variáveis VITE_* são públicas (vão para o bundle). Nunca colocar segredo aqui.
 */

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const APP_ENV = env.MODE || 'development';
export const IS_PRODUCTION = APP_ENV === 'production';

function resolveApiUrl() {
  const configured = (env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  if (IS_PRODUCTION) {
    console.warn('[config] VITE_API_URL não definido em produção — defina em .env.production');
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
}

export const API_URL = resolveApiUrl();

/**
 * Origem do sensor de produção no Totem:
 * - 'auto'      → Bluetooth (cordova-plugin-bluetooth-serial) se o plugin
 *                 existir no aparelho (APK); senão Mock (PWA/navegador).
 * - 'mock'      → nunca usa Bluetooth, mesmo no APK (testes).
 * - 'bluetooth' → força o gateway Bluetooth.
 */
export const SENSOR_MODE = (env.VITE_SENSOR_MODE || 'auto').toLowerCase();

/** Nome (parcial) do HC-06 pareado, usado para escolher o dispositivo certo. */
export const BLUETOOTH_DEVICE_NAME = env.VITE_BLUETOOTH_DEVICE_NAME || 'HC-06';

/**
 * Token do aparelho Totem (APK), definido no build (.env.android.local).
 * Só o app nativo usa; a PWA não recebe este valor.
 */
export const DEVICE_TOKEN = env.VITE_DEVICE_TOKEN || '';

/** Intervalo de tentativa de envio da fila para a API (ms). */
export const SYNC_INTERVAL_MS = Number(env.VITE_SYNC_INTERVAL_MS) || 5000;
