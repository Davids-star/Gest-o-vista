import { ApontamentoService, formatarDataLocal, limitesDoDia, duracaoParada } from './apontamento.service';
import { StopStatus } from '../database/entities/stop.entity';
import { SessionStatus } from '../database/entities/production-session.entity';

describe('formatarDataLocal / limitesDoDia (horário de fábrica, America/Fortaleza)', () => {
  it('formata a data em YYYY-MM-DD no fuso local, não em UTC', () => {
    // 2026-08-31T02:00:00Z = 2026-08-30T23:00:00 em -03:00 (ainda dia 30 local)
    const data = formatarDataLocal(new Date('2026-08-31T02:00:00.000Z'));
    expect(data).toBe('2026-08-30');
  });

  it('limitesDoDia cobre exatamente das 00:00 às 23:59:59.999 locais', () => {
    const { inicio, fim } = limitesDoDia('2026-08-31');
    // 00:00:00 -03:00 == 03:00:00 UTC
    expect(inicio.toISOString()).toBe('2026-08-31T03:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-09-01T02:59:59.999Z');
  });
});

describe('duracaoParada', () => {
  const agora = new Date('2026-08-31T12:00:00.000Z');

  it('usa duration_seconds quando a parada já está fechada', () => {
    const stop = { duration_seconds: 900, started_at: new Date('2026-08-31T11:00:00.000Z') } as any;
    expect(duracaoParada(stop, agora)).toBe(900);
  });

  it('calcula até "agora" quando a parada ainda está aberta (duration_seconds null)', () => {
    const stop = { duration_seconds: null, started_at: new Date('2026-08-31T11:50:00.000Z') } as any;
    expect(duracaoParada(stop, agora)).toBe(600); // 10 minutos
  });
});

/** QueryBuilder fake — encadeia tudo e devolve o resultado configurado no fim. */
function fakeQb(resultado: any[]) {
  const qb: any = {};
  const encadeavel = ['innerJoinAndSelect', 'leftJoinAndSelect', 'innerJoin', 'leftJoin', 'where', 'andWhere', 'select', 'addSelect', 'groupBy', 'orderBy'];
  for (const m of encadeavel) qb[m] = jest.fn().mockReturnValue(qb);
  qb.getMany = jest.fn().mockResolvedValue(resultado);
  qb.getRawMany = jest.fn().mockResolvedValue(resultado);
  return qb;
}

describe('ApontamentoService.obter — exemplo da seção 9 do briefing (tempo produzido descontando paradas)', () => {
  // Sessão: 08:00 → 12:00 (4h totais)
  // Parada 1: 10:00 → 10:15 (15min)
  // Parada 2: 11:30 → 11:42 (12min)
  // Tempo parado esperado: 27min = 1620s
  // Tempo produzido esperado: 4h - 27min = 3h33min = 12780s
  const sessao = {
    id: 'sessao-1',
    machine_id: 'maquina-1',
    product_id: 'produto-1',
    lot_id: 'lote-1',
    operator_id: 'operador-1',
    shift_id: null,
    started_at: new Date('2026-08-31T08:00:00.000-03:00'),
    ended_at: new Date('2026-08-31T12:00:00.000-03:00'),
    status: SessionStatus.CLOSED,
    machine: { id: 'maquina-1', code: 'MQ-01', name: 'Máquina 01' },
    product: { id: 'produto-1', name: 'Biscoito' },
    lot: { id: 'lote-1', code: 'LT-0001' },
    operator: { id: 'operador-1', name: 'João' },
    shift: null,
  };

  const parada1 = {
    id: 'parada-1',
    session_id: 'sessao-1',
    machine_id: 'maquina-1',
    reason_id: 'motivo-1',
    started_at: new Date('2026-08-31T10:00:00.000-03:00'),
    ended_at: new Date('2026-08-31T10:15:00.000-03:00'),
    duration_seconds: 15 * 60,
    status: StopStatus.CLOSED,
    observation: null,
    reason: { id: 'motivo-1', code: 'EQUIPAMENTO', label: 'Problema no equipamento', default_priority: 'alta', planned: false },
  };
  const parada2 = {
    id: 'parada-2',
    session_id: 'sessao-1',
    machine_id: 'maquina-1',
    reason_id: 'motivo-2',
    started_at: new Date('2026-08-31T11:30:00.000-03:00'),
    ended_at: new Date('2026-08-31T11:42:00.000-03:00'),
    duration_seconds: 12 * 60,
    status: StopStatus.CLOSED,
    observation: null,
    reason: { id: 'motivo-2', code: 'MATERIAL', label: 'Falta de material', default_priority: 'alta', planned: false },
  };

  function montarService() {
    const sessionRepo = { createQueryBuilder: jest.fn().mockReturnValue(fakeQb([sessao])) };
    const eventRepo = { createQueryBuilder: jest.fn().mockReturnValue(fakeQb([{ session_id: 'sessao-1', total: '650' }])) };
    const stopRepo = {
      find: jest.fn().mockResolvedValue([parada1, parada2]), // paradas ligadas à sessão
      createQueryBuilder: jest.fn().mockReturnValue(fakeQb([])), // paradas sem sessão — nenhuma no cenário
    };
    const auditRepo = { find: jest.fn().mockResolvedValue([]) }; // sem troca de operador
    const userRepo = { find: jest.fn().mockResolvedValue([]) };

    return new ApontamentoService(sessionRepo as any, eventRepo as any, stopRepo as any, auditRepo as any, userRepo as any);
  }

  it('desconta corretamente as paradas do tempo total (não é só ended_at - started_at)', async () => {
    const service = montarService();
    const resultado = await service.obter('empresa-1', { date: '2026-08-31' });

    expect(resultado.sessoes).toHaveLength(1);
    const s = resultado.sessoes[0];

    expect(s.tempo_total_segundos).toBe(4 * 3600); // 4h
    expect(s.tempo_parado_segundos).toBe(27 * 60); // 27min
    expect(s.tempo_produzido_segundos).toBe(4 * 3600 - 27 * 60); // 3h33min

    expect(s.producao).toBe(650);
    expect(resultado.resumo.paradas).toBe(2);
    expect(resultado.resumo.tempo_produzido_segundos).toBe(4 * 3600 - 27 * 60);
    expect(resultado.resumo.tempo_parado_segundos).toBe(27 * 60);
  });

  it('agrupa tempo parado por motivo corretamente', async () => {
    const service = montarService();
    const resultado = await service.obter('empresa-1', { date: '2026-08-31' });

    const porMotivo = Object.fromEntries(resultado.tempo_parado_por_motivo.map((m) => [m.label, m.segundos]));
    expect(porMotivo['Problema no equipamento']).toBe(15 * 60);
    expect(porMotivo['Falta de material']).toBe(12 * 60);
  });

  it('sem sessões no dia filtrado, devolve resumo zerado (sem inventar dado nenhum)', async () => {
    const sessionRepo = { createQueryBuilder: jest.fn().mockReturnValue(fakeQb([])) };
    const eventRepo = { createQueryBuilder: jest.fn().mockReturnValue(fakeQb([])) };
    const stopRepo = { find: jest.fn(), createQueryBuilder: jest.fn().mockReturnValue(fakeQb([])) };
    const auditRepo = { find: jest.fn() };
    const userRepo = { find: jest.fn() };
    const service = new ApontamentoService(sessionRepo as any, eventRepo as any, stopRepo as any, auditRepo as any, userRepo as any);

    const resultado = await service.obter('empresa-1', { date: '2099-01-01' });

    expect(resultado.sessoes).toHaveLength(0);
    expect(resultado.resumo.producao).toBe(0);
    expect(resultado.resumo.sessoes).toBe(0);
  });
});
