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

// Data de hoje em 'YYYY-MM-DD', no horário de fábrica (America/Fortaleza,
// mesma convenção de formatarDataLocal no backend) — SEMPRE uma função
// pura chamada na hora, nunca um `computed`/`ref` guardado.
//
// Achado real: `hojeIso`/`hojeStr` viviam como `computed(() => new
// Date()...)` em Dashboard.vue, ApontamentoView.vue, RelatoriosView.vue e
// PeriodReportPanel.vue. Um `computed` do Vue só recalcula quando uma
// dependência REATIVA que ele leu muda — `new Date()` não é reativo, não
// conta como dependência nenhuma. Resultado: o valor era calculado
// UMA VEZ (no primeiro acesso) e ficava travado pro resto da vida do
// componente. Numa tela deixada aberta passando da meia-noite (exatamente
// o caso de uso de um Dashboard de fábrica), "hoje" nunca virava o dia
// novo sozinho — o polling de 6s continuava buscando `/apontamento` com a
// data de ONTEM pra sempre, até alguém dar F5 na página. Por isso agora é
// função, chamada de novo a cada uso — nunca cacheada.
export function hojeIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date());
}
