import { EventsService } from './events.service';
import { SessionStatus } from '../database/entities/production-session.entity';

const SESSAO = 'a0000000-0000-4000-8000-000000000001';
const MAQUINA = 'b0000000-0000-4000-8000-000000000001';
const dto = (uid: string, extra: object = {}) => ({ session_id: SESSAO, machine_id: MAQUINA, event_uid: uid, quantity: 1, source: 'bluetooth' as any, ...extra });

function montar(opts: { sessoes?: any[]; existentes?: string[]; totais?: any[] } = {}) {
  const insert = { values: jest.fn().mockReturnThis(), orIgnore: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}) };
  const sessionQb = { innerJoinAndSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue(opts.sessoes ?? [{ id: SESSAO, machine_id: MAQUINA, status: SessionStatus.ACTIVE, machine: { sensor_source: null } }]) };
  const totaisQb = { innerJoin: jest.fn().mockReturnThis(), leftJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), addSelect: jest.fn().mockReturnThis(), groupBy: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue(opts.totais ?? [{ session_id: SESSAO, total: '7' }]) };
  const eventRepo: any = {
    find: jest.fn().mockResolvedValue((opts.existentes ?? []).map((event_uid) => ({ event_uid }))),
    // createQueryBuilder() sem alias → insert; com alias ('event') → soma de totais.
    createQueryBuilder: jest.fn((alias?: string) => (alias ? totaisQb : { insert: () => insert })),
  };
  const sessionRepo: any = { createQueryBuilder: jest.fn(() => sessionQb) };
  const realtime: any = { emitToCompany: jest.fn() };
  const service = new EventsService(eventRepo, sessionRepo, realtime);
  return { service, insert, realtime, eventRepo };
}

describe('EventsService.criarEventosEmLote', () => {
  afterEach(() => jest.useRealTimers());

  it('grava todos num único insert e devolve o total real da sessão', async () => {
    const { service, insert } = montar();
    const r = await service.criarEventosEmLote('c1', [dto('u1'), dto('u2'), dto('u3')]);
    expect(insert.values).toHaveBeenCalledTimes(1);
    expect(insert.values.mock.calls[0][0]).toHaveLength(3);
    expect(r.results.map((x) => x.status)).toEqual(['accepted', 'accepted', 'accepted']);
    expect(r.totals).toEqual({ [SESSAO]: 7 });
    service.onModuleDestroy();
  });

  it('uid que já existe volta como duplicate e não entra no insert', async () => {
    const { service, insert } = montar({ existentes: ['u1'] });
    const r = await service.criarEventosEmLote('c1', [dto('u1'), dto('u2')]);
    expect(r.results.map((x) => x.status)).toEqual(['duplicate', 'accepted']);
    expect(insert.values.mock.calls[0][0]).toHaveLength(1);
    service.onModuleDestroy();
  });

  it('sessão de outra empresa/inexistente é rejeitada sem derrubar o lote', async () => {
    const { service, insert } = montar({ sessoes: [] });
    const r = await service.criarEventosEmLote('c1', [dto('u1')]);
    expect(r.results[0].status).toBe('rejected');
    expect(insert.values).not.toHaveBeenCalled();
  });

  it('sessão encerrada rejeita evento novo', async () => {
    const { service } = montar({ sessoes: [{ id: SESSAO, machine_id: MAQUINA, status: SessionStatus.CLOSED, machine: { sensor_source: null } }] });
    const r = await service.criarEventosEmLote('c1', [dto('u1')]);
    expect(r.results[0]).toMatchObject({ status: 'rejected' });
  });

  it('origem diferente da configurada na máquina é rejeitada', async () => {
    const { service } = montar({ sessoes: [{ id: SESSAO, machine_id: MAQUINA, status: SessionStatus.ACTIVE, machine: { sensor_source: 'cable' } }] });
    const r = await service.criarEventosEmLote('c1', [dto('u1')]);
    expect(r.results[0].status).toBe('rejected');
  });

  it('junta os avisos em tempo real: 3 lotes seguidos = 1 aviso por sessão', async () => {
    jest.useFakeTimers();
    const { service, realtime } = montar();
    await service.criarEventosEmLote('c1', [dto('u1')]);
    await service.criarEventosEmLote('c1', [dto('u2')]);
    await service.criarEventosEmLote('c1', [dto('u3')]);
    jest.advanceTimersByTime(500);
    expect(realtime.emitToCompany).toHaveBeenCalledTimes(1);
  });
});
