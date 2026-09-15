// Formatação de duração em segundos → "Xh YYmin" — estava copiada em 4
// telas diferentes (Dashboard, ApontamentoView, DayDetailsModal,
// MonthlySummaryPanel), uma delas até com um sufixo levemente diferente
// ("m" em vez de "min") sem motivo — nenhuma das duas variações era
// proposital, só divergência acumulada de copiar/colar. Centralizada
// aqui; `compact: true` mantém o "m" curto onde o espaço é apertado
// (cards pequenos do Dashboard).
export function formatDuracao(segundos, { compact = false } = {}) {
  const s = Math.max(0, Math.round(segundos || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sufixo = compact ? 'm' : 'min';
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}${sufixo}`;
  return `${m}${sufixo}`;
}
