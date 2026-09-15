// Lógica de "número de exibição da máquina" — estava copiada (quase)
// idêntica em 7 telas diferentes (Dashboard, ApontamentoView,
// LoteDetalheView, ProducaoView do Totem, LoginPinView do Totem,
// MobileSelectorView). Centralizada aqui.
//
// parseInt(m.code, 10) sozinho sempre dava NaN (code começa com letra,
// ex.: "MQ-02"), então nunca usava o código real, só a posição no
// array — "Máquina 2" podia mostrar uma máquina de teste qualquer, não
// a MQ-02. Por isso o regex \d+ em vez de parseInt direto.

/**
 * Extrai o número de exibição de uma máquina a partir do código
 * (ex.: "MQ-02" → 2). Sem número no código, cai pra posição dela na
 * lista (1-based) — só pra nunca deixar a tela sem nada pra mostrar.
 */
export function getMachineNumber(machines, machine) {
  if (!machine) return '—';
  const idx = machines.findIndex((item) => item.id === machine.id);
  const match = machine.code?.match(/\d+/);
  return match ? parseInt(match[0], 10) : (idx >= 0 ? idx + 1 : 1);
}

/** "Máquina N" pronto pra exibir — mesma regra de getMachineNumber. */
export function getMachineDisplayName(machines, machine) {
  if (!machine) return '—';
  return `Máquina ${getMachineNumber(machines, machine)}`;
}
