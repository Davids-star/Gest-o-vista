import {
  ApontamentoService, formatarDataLocal, limitesDoDia, limitesDoMes, duracaoParada,
  limitesDaHora, overlapSegundos, calcularPorHora,
} from './apontamento.service';
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

describe('limitesDoMes', () => {
  it('cobre do dia 1 00:00 ao último dia 23:59:59.999 locais — mês de 31 dias', () => {
    const { inicio, fim } = limitesDoMes(2026, 8);
    expect(inicio.toISOString()).toBe('2026-08-01T03:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-09-01T02:59:59.999Z');
  });

  it('mês de 30 dias (setembro)', () => {
    const { inicio, fim } = limitesDoMes(2026, 9);
    expect(inicio.toISOString()).toBe('2026-09-01T03:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-10-01T02:59:59.999Z');
  });

  it('fevereiro em ano bissexto (2028 → 29 dias)', () => {
    const { fim } = limitesDoMes(2028, 2);
    expect(fim.toISOString()).toBe('2028-03-01T02:59:59.999Z');
  });

  it('dezembro vira o ano corretamente', () => {
    const { inicio, fim } = limitesDoMes(2026, 12);
    expect(inicio.toISOString()).toBe('2026-12-01T03:00:00.000Z');
    expect(fim.toISOString()).toBe('2027-01-01T02:59:59.999Z');
  });
});

describe('limitesDaHora', () => {
  it('08h local == 11h UTC (fuso -03:00)', () => {
    const { inicio, fim } = limitesDaHora('2026-09-02', 8);
    expect(inicio.toISOString()).toBe('2026-09-02T11:00:00.000Z');
    expect(fim.toISOString()).toBe('2026-09-02T11:59:59.999Z');
  });

  it('hora 0 (meia-noite local)', () => {
    const { inicio } = limitesDaHora('2026-09-02', 0);
    expect(inicio.toISOString()).toBe('2026-09-02T03:00:00.000Z');
  });
});

describe('overlapSegundos', () => {
  it('sem sobreposição nenhuma → 0', () => {
    const a1 = new Date('2026-09-02T10:00:00Z');
    const a2 = new Date('2026-09-02T10:30:00Z');
    const b1 = new Date('2026-09-02T11:00:00Z');
    const b2 = new Date('2026-09-02T12:00:00Z');
    expect(overlapSegundos(a1, a2, b1, b2)).toBe(0);
  });

  it('intervalo B totalmente dentro de A → duração de B inteira', () => {
    const a1 = new Date('2026-09-02T08:00:00Z');
    const a2 = new Date('2026-09-02T17:00:00Z');
    const b1 = new Date('2026-09-02T09:00:00Z');
    const b2 = new Date('2026-09-02T10:00:00Z');
    expect(overlapSegundos(a1, a2, b1, b2)).toBe(3600);
  });

  it('sobreposição parcial → só o pedaço que se cruza', () => {
    const a1 = new Date('2026-09-02T08:30:00Z');
    const a2 = new Date('2026-09-02T09:15:00Z');
    const b1 = new Date('2026-09-02T09:00:00Z');
    const b2 = new Date('2026-09-02T10:00:00Z');
    expect(overlapSegundos(a1, a2, b1, b2)).toBe(900); // 15min
  });
});

describe('calcularPorHora — mesmo exemplo da seção 9 (sessão 08h-12h, 27min parado)', () => {
  it('quebra a sessão em 4 horas, com produzido/parado batendo com o total já testado', () => {
    const sessao = {
      started_at: new Date('2026-09-02T08:00:00.000-03:00'),
      ended_at: new Date('2026-09-02T12:00:00.000-03:00'),
    };
    const paradas = [
      { started_at: new Date('2026-09-02T10:00:00.000-03:00'), ended_at: new Date('2026-09-02T10:15:00.000-03:00') },
      { started_at: new Date('2026-09-02T11:30:00.000-03:00'), ended_at: new Date('2026-09-02T11:42:00.000-03:00') },
    ] as any;
    const producaoPorHora = new Map([['08', 100], ['09', 150], ['10', 200], ['11', 200]]);
    const agora = new Date('2026-09-02T12:00:00.000-03:00');

    const resultado = calcularPorHora('2026-09-02', sessao, paradas, producaoPorHora, agora);

    expect(resultado).toHaveLength(4); // só as horas em que a sessão realmente esteve ativa
    expect(resultado.map((r) => r.hora)).toEqual(['08', '09', '10', '11']);

    // Horas sem parada nenhuma: 1h inteira produzindo.
    expect(resultado[0]).toMatchObject({ producao: 100, tempo_produzido_segundos: 3600, tempo_parado_segundos: 0 });
    expect(resultado[1]).toMatchObject({ producao: 150, tempo_produzido_segundos: 3600, tempo_parado_segundos: 0 });

    // 10h: parada de 15min (900s) dentro dela.
    expect(resultado[2]).toMatchObject({ producao: 200, tempo_produzido_segundos: 2700, tempo_parado_segundos: 900 });

    // 11h: parada de 12min (720s) dentro dela.
    expect(resultado[3]).toMatchObject({ producao: 200, tempo_produzido_segundos: 2880, tempo_parado_segundos: 720 });

    // Soma das horas bate com o total já validado no teste da seção 9
    // (4h - 27min = 12780s produzido, 27min = 1620s parado).
    const totalProduzido = resultado.reduce((a, r) => a + r.tempo_produzido_segundos, 0);
    const totalParado = resultado.reduce((a, r) => a + r.tempo_parado_segundos, 0);
    expect(totalProduzido).toBe(12780);
    expect(totalParado).toBe(1620);
  });

  it('sessão que ainda não passou por uma hora não aparece na lista (não inventa hora vazia)', () => {
    const sessao = { started_at: new Date('2026-09-02T08:00:00.000-03:00'), ended_at: null };
    const agora = new Date('2026-09-02T08:30:00.000-03:00'); // só 30min de sessão, ainda na hora 08
    const resultado = calcularPorHora('2026-09-02', sessao, [], new Map(), agora);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].hora).toBe('08');
    expect(resultado[0].tempo_produzido_segundos).toBe(1800); // 30min
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
  const encadeavel = ['innerJoinAndSelect', 'leftJoinAndSelect', 'innerJoin', 'leftJoin', 'where', 'andWhere', 'select', 'addSelect', 'groupBy', 'addGroupBy', 'orderBy'];
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

  it('calcula produção por hora do dia, preenchendo horas sem eventos com 0', async () => {
    const sessionRepo = { createQueryBuilder: jest.fn().mockReturnValue(fakeQb([sessao])) };
    const producaoPorSessaoResultado = [{ session_id: 'sessao-1', total: '650' }];
    const producaoPorHoraResultado = [
      { hora: '08', total: '400' },
      { hora: '09', total: '250' },
    ];
    let chamadaEvent = 0;
    const eventRepo = {
      createQueryBuilder: jest.fn().mockImplementation(() => {
        chamadaEvent += 1;
        return fakeQb(chamadaEvent === 1 ? producaoPorSessaoResultado : producaoPorHoraResultado);
      }),
    };
    const stopRepo = {
      find: jest.fn().mockResolvedValue([parada1, parada2]),
      createQueryBuilder: jest.fn().mockReturnValue(fakeQb([])),
    };
    const auditRepo = { find: jest.fn().mockResolvedValue([]) };
    const userRepo = { find: jest.fn().mockResolvedValue([]) };
    const service = new ApontamentoService(sessionRepo as any, eventRepo as any, stopRepo as any, auditRepo as any, userRepo as any);

    const resultado = await service.obter('empresa-1', { date: '2026-08-31' });

    expect(resultado.producao_por_hora).toHaveLength(24);
    const porHora = Object.fromEntries(resultado.producao_por_hora.map((h: any) => [h.hora, h.quantidade]));
    expect(porHora['08']).toBe(400);
    expect(porHora['09']).toBe(250);
    expect(porHora['00']).toBe(0); // hora sem produção não some do gráfico, aparece zerada
    expect(resultado.producao_por_hora.reduce((a: number, h: any) => a + h.quantidade, 0)).toBe(650);
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

describe('ApontamentoService.obterMensal — exemplo de consistência do briefing (seção 46)', () => {
  // Máquina 01: dia 01 → 100, dia 02 → 200, dia 03 → 400 (total 700)
  // Máquina 02: dia 02 → 300
  // Total do mês esperado: 1000 | Máquina 01: 700 | Máquina 02: 300
  // Números só de fixture de teste — não são seed nem dado do app.
  function sessaoFixture(id: string, machineId: string, machineCode: string, dia: string) {
    return {
      id,
      machine_id: machineId,
      product_id: 'produto-1',
      lot_id: 'lote-1',
      operator_id: 'operador-1',
      shift_id: null,
      started_at: new Date(`2026-08-${dia}T08:00:00.000-03:00`),
      ended_at: new Date(`2026-08-${dia}T12:00:00.000-03:00`),
      status: SessionStatus.CLOSED,
      machine: { id: machineId, code: machineCode, name: `Máquina ${machineCode}` },
      product: { id: 'produto-1', name: 'Biscoito' },
      lot: { id: 'lote-1', code: 'LT-0001' },
      operator: { id: 'operador-1', name: 'João' },
      shift: null,
    };
  }

  const s1 = sessaoFixture('s1', 'maquina-1', '01', '01');
  const s2 = sessaoFixture('s2', 'maquina-1', '01', '02');
  const s3 = sessaoFixture('s3', 'maquina-1', '01', '03');
  const s4 = sessaoFixture('s4', 'maquina-2', '02', '02');

  function montarService() {
    const sessionRepo = { createQueryBuilder: jest.fn().mockReturnValue(fakeQb([s1, s2, s3, s4])) };
    const eventRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(fakeQb([
        { session_id: 's1', total: '100' },
        { session_id: 's2', total: '200' },
        { session_id: 's3', total: '400' },
        { session_id: 's4', total: '300' },
      ])),
    };
    const stopRepo = {
      find: jest.fn().mockResolvedValue([]), // sem paradas neste cenário
      createQueryBuilder: jest.fn().mockReturnValue(fakeQb([])),
    };
    const auditRepo = { find: jest.fn().mockResolvedValue([]) };
    const userRepo = { find: jest.fn().mockResolvedValue([]) };
    return new ApontamentoService(sessionRepo as any, eventRepo as any, stopRepo as any, auditRepo as any, userRepo as any);
  }

  it('soma produção total do mês corretamente', async () => {
    const service = montarService();
    const resultado = await service.obterMensal('empresa-1', { year: 2026, month: 8 });
    expect(resultado.resumo.producao).toBe(1000);
    expect(resultado.resumo.sessoes).toBe(4);
    expect(resultado.resumo.maquinas_utilizadas).toBe(2);
  });

  it('agrupa produção por máquina corretamente (700 / 300)', async () => {
    const service = montarService();
    const resultado = await service.obterMensal('empresa-1', { year: 2026, month: 8 });
    const porMaquina = Object.fromEntries(resultado.por_maquina.map((m: any) => [m.machine_code, m.producao]));
    expect(porMaquina['01']).toBe(700);
    expect(porMaquina['02']).toBe(300);
  });

  it('agrupa produção por dia corretamente e preenche o mês inteiro (31 dias)', async () => {
    const service = montarService();
    const resultado = await service.obterMensal('empresa-1', { year: 2026, month: 8 });
    expect(resultado.producao_por_dia).toHaveLength(31);
    const porDia = Object.fromEntries(resultado.producao_por_dia.map((d: any) => [d.data, d.producao]));
    expect(porDia['2026-08-01']).toBe(100);
    expect(porDia['2026-08-02']).toBe(500); // 200 (máquina 01) + 300 (máquina 02)
    expect(porDia['2026-08-03']).toBe(400);
    expect(porDia['2026-08-15']).toBe(0); // dia sem produção aparece zerado, não some
  });

  it('sem sessões no mês filtrado, devolve resumo zerado com os 31 dias presentes', async () => {
    const sessionRepo = { createQueryBuilder: jest.fn().mockReturnValue(fakeQb([])) };
    const eventRepo = { createQueryBuilder: jest.fn().mockReturnValue(fakeQb([])) };
    const stopRepo = { find: jest.fn(), createQueryBuilder: jest.fn().mockReturnValue(fakeQb([])) };
    const auditRepo = { find: jest.fn() };
    const userRepo = { find: jest.fn() };
    const service = new ApontamentoService(sessionRepo as any, eventRepo as any, stopRepo as any, auditRepo as any, userRepo as any);

    const resultado = await service.obterMensal('empresa-1', { year: 2099, month: 1 });

    expect(resultado.resumo.producao).toBe(0);
    expect(resultado.resumo.sessoes).toBe(0);
    expect(resultado.producao_por_dia).toHaveLength(31);
    expect(resultado.producao_por_dia.every((d: any) => d.producao === 0)).toBe(true);
  });
});
