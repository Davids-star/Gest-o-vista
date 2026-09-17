// exportarApontamentoExcel.js — exporta o relatório atualmente carregado na
// tela (Dia/Semana/Mês) pra uma planilha .xlsx, gerada 100% no navegador a
// partir dos dados já buscados (sem endpoint novo no backend). Usa
// `write-excel-file` (não `xlsx`/SheetJS, que tem CVEs conhecidas de
// parsing — aqui só escrevemos, nunca lemos planilha nenhuma, mas evita a
// dependência mesmo assim).
import writeExcelFile from 'write-excel-file/browser';
import { formatDuracao } from '../composables/useFormatters';

function cabecalho(titulos) {
  return titulos.map((t) => ({ type: String, value: t, fontWeight: 'bold' }));
}

// Detecta número vs texto automaticamente — cobre os dois tipos de coluna
// que essas planilhas têm (contagens/segundos vs nomes/datas/motivos).
function linha(celulas) {
  return celulas.map((v) => (typeof v === 'number'
    ? { type: Number, value: v }
    : { type: String, value: v == null ? '' : String(v) }));
}

function sheetResumo(resumo) {
  const linhas = [cabecalho(['Indicador', 'Valor'])];
  linhas.push(linha(['Produção', resumo.producao]));
  linhas.push(linha(['Tempo Produzido', formatDuracao(resumo.tempo_produzido_segundos)]));
  linhas.push(linha(['Tempo Parado', formatDuracao(resumo.tempo_parado_segundos)]));
  linhas.push(linha(['Paradas', resumo.paradas]));
  linhas.push(linha(['Sessões', resumo.sessoes]));
  if (resumo.operadores != null) linhas.push(linha(['Operadores', resumo.operadores]));
  if (resumo.maquinas_utilizadas != null) linhas.push(linha(['Máquinas Utilizadas', resumo.maquinas_utilizadas]));
  if (resumo.lotes != null) linhas.push(linha(['Lotes', resumo.lotes]));
  return { sheet: 'Resumo', data: linhas };
}

function formatarDataHora(dt) {
  if (!dt) return '—';
  try { return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return String(dt); }
}

// ── Planilhas do Dia ────────────────────────────────────────────────────

function sheetSessoes(sessoes) {
  const linhas = [cabecalho(['Máquina', 'Produto', 'Lote', 'Operador', 'Início', 'Fim', 'Produção', 'T. Produzido', 'T. Parado'])];
  for (const s of sessoes || []) {
    linhas.push(linha([
      s.machine?.code || '—',
      s.product?.name || '—',
      s.lot?.code || '—',
      s.operator?.name || '—',
      formatarDataHora(s.started_at),
      s.ended_at ? formatarDataHora(s.ended_at) : 'Em aberto',
      s.producao || 0,
      formatDuracao(s.tempo_produzido_segundos),
      formatDuracao(s.tempo_parado_segundos),
    ]));
  }
  return { sheet: 'Sessões', data: linhas };
}

function sheetProducaoPorHoraMaquina(porHoraPorMaquina) {
  const maquinas = porHoraPorMaquina || [];
  const linhas = [cabecalho(['Hora', ...maquinas.map((m) => m.machine_code)])];
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, '0');
    linhas.push(linha([`${hh}h`, ...maquinas.map((m) => m.por_hora.find((x) => x.hora === hh)?.quantidade || 0)]));
  }
  return { sheet: 'Produção por Hora e Máquina', data: linhas };
}

function sheetParadasDia(paradas, machines) {
  const nomeMaquina = (id) => machines?.find((m) => m.id === id)?.code || id || '—';
  const linhas = [cabecalho(['Máquina', 'Motivo', 'Início', 'Fim', 'Duração', 'Observação'])];
  for (const p of paradas || []) {
    linhas.push(linha([
      nomeMaquina(p.machine_id),
      p.reason?.label || 'Motivo não informado',
      formatarDataHora(p.started_at),
      p.ended_at ? formatarDataHora(p.ended_at) : 'Em aberto',
      formatDuracao(p.duration_seconds),
      p.observation || '',
    ]));
  }
  return { sheet: 'Paradas', data: linhas };
}

// ── Planilhas de Semana/Mês ─────────────────────────────────────────────

function sheetProducaoPorDia(producaoPorDia) {
  const linhas = [cabecalho(['Data', 'Produção', 'T. Produzido', 'T. Parado'])];
  for (const d of producaoPorDia || []) {
    linhas.push(linha([d.data, d.producao, formatDuracao(d.tempo_produzido_segundos), formatDuracao(d.tempo_parado_segundos)]));
  }
  return { sheet: 'Produção por Dia', data: linhas };
}

function sheetPorMaquina(porMaquina) {
  const linhas = [cabecalho(['Máquina', 'Produção', 'T. Produzido', 'T. Parado', 'Paradas', 'Sessões'])];
  for (const m of porMaquina || []) {
    linhas.push(linha([m.machine_code, m.producao, formatDuracao(m.tempo_produzido_segundos), formatDuracao(m.tempo_parado_segundos), m.paradas, m.sessoes]));
  }
  return { sheet: 'Produção por Máquina', data: linhas };
}

function sheetPorMaquinaPorDia(porMaquinaPorDia) {
  const maquinas = porMaquinaPorDia || [];
  const dias = maquinas[0]?.por_dia?.map((d) => d.data) || [];
  const linhas = [cabecalho(['Máquina', ...dias])];
  for (const m of maquinas) {
    linhas.push(linha([m.machine_code, ...m.por_dia.map((d) => d.producao)]));
  }
  return { sheet: 'Produção por Máquina e Dia', data: linhas };
}

// Já vem ordenado por maior tempo parado (ver ApontamentoService) — é
// literalmente "onde está tendo mais falha e perda de produção", sem
// precisar de lógica nova aqui.
function sheetParadasPorMotivo(paradasPorMotivo) {
  const linhas = [cabecalho(['Motivo', 'Planejada', 'Tempo Parado', 'Quantidade'])];
  for (const m of paradasPorMotivo || []) {
    linhas.push(linha([m.label, m.planned ? 'Sim' : 'Não', formatDuracao(m.segundos), m.quantidade]));
  }
  return { sheet: 'Paradas por Motivo', data: linhas };
}

/**
 * Exporta o relatório carregado na tela (aba Dia, Semana ou Mês) pra um
 * .xlsx com uma planilha por tópico — mesma lógica de agregação já
 * mostrada na tela, sem inventar cálculo novo aqui.
 *
 * @param {{ periodo: 'dia'|'semana'|'mes', dados: object, machines?: Array, rotulo?: string }} params
 */
export async function exportarApontamentoExcel({ periodo, dados, machines = [], rotulo = '' }) {
  if (!dados) return;

  const sheets = periodo === 'dia'
    ? [
      sheetResumo(dados.resumo),
      sheetSessoes(dados.sessoes),
      sheetProducaoPorHoraMaquina(dados.producao_por_hora_por_maquina),
      sheetParadasDia(dados.paradas, machines),
    ]
    : [
      sheetResumo(dados.resumo),
      sheetProducaoPorDia(dados.producao_por_dia),
      sheetPorMaquina(dados.por_maquina),
      sheetPorMaquinaPorDia(dados.por_maquina_por_dia),
      sheetParadasPorMotivo(dados.paradas_por_motivo),
    ];

  const sufixo = rotulo ? `_${rotulo.replace(/[^\d\w-]+/g, '_')}` : '';
  await writeExcelFile(sheets).toFile(`Relatorio_Apontamento${sufixo}.xlsx`);
}
