/**
 * Credencial do aparelho (Totem). Vem de dois lugares, nesta ordem:
 * 1) a ATIVAÇÃO feita no próprio aparelho com o código de pareamento (guardada aqui);
 * 2) as variáveis do build (VITE_DEVICE_ID / VITE_DEVICE_TOKEN), só para APK de uso interno.
 * O APK para baixar NÃO leva token embutido: cada aparelho se ativa com o código.
 */
import { DEVICE_ID, DEVICE_TOKEN } from '../config/env.js';

const KEY = 'gp_device';

export function getStoredDevice() {
  try {
    const raw = localStorage.getItem(KEY);
    const d = raw ? JSON.parse(raw) : null;
    return d?.id && d?.token ? d : null;
  } catch {
    return null;
  }
}

export function saveDevice(device) {
  try {
    localStorage.setItem(KEY, JSON.stringify(device));
  } catch { /* sem armazenamento: o aparelho precisará ativar de novo */ }
}

export function clearDevice() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* nada a limpar */ }
}

/** { id, token, machineId?, machineCode?, machineName? } ou null se o aparelho ainda não foi ativado. */
export function getDeviceCredentials() {
  const stored = getStoredDevice();
  if (stored) return stored;
  return DEVICE_ID && DEVICE_TOKEN ? { id: DEVICE_ID, token: DEVICE_TOKEN } : null;
}
