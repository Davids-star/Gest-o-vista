import { PossibleStopsService } from './possible-stops.service';
import { PossibleStopStatus } from '../database/entities/possible-stop.entity';

function fakeQb(resultado: any) {
  const qb: any = {};
  const encadeavel = ['innerJoin', 'leftJoinAndSelect', 'addSelect', 'where', 'andWhere'];
  for (const m of encadeavel) qb[m] = jest.fn().mockReturnValue(qb);
  qb.getOne = jest.fn().mockResolvedValue(resultado);
  return qb;
}

function montarService(possivel: any) {
  const repo = {
    createQueryBuilder: jest.fn().mockReturnValue(fakeQb(possivel)),
    save: jest.fn((x) => Promise.resolve(x)),
  };
  const paradasRegistrosService = { criar: jest.fn().mockResolvedValue({ id: 'stop-novo', status: 'open' }) };
  const realtime = { emitToCompany: jest.fn() };

  const service = new PossibleStopsService(repo as any, paradasRegistrosService as any, realtime as any);
  return { service, repo, paradasRegistrosService, realtime };
}

// Função (não constante compartilhada!) — o service muta o objeto em
// memória ao confirmar/descartar, então cada teste precisa da sua própria
// cópia, senão um teste "vaza" estado mutado pro próximo.
const possivelPendente = () => ({
  id: 'possible-1',
  machine_id: 'maquina-1',
  session_id: 'sessao-1',
  detected_at: new Date('2026-08-31T10:05:00.000Z'),
  duration_seconds: 300, // 5 minutos sem produção
  status: PossibleStopStatus.PENDING,
  machine: { company_id: 'empresa-1' },
});

describe('PossibleStopsService — POSSIBLE_STOP → CONFIRMAR/DESCARTAR (seção 25, casos 3 e 4)', () => {
  it('Caso 3 — confirmar: vira STOP real, com o horário retroativo certo (detected_at - duration)', async () => {
    const { service, repo, paradasRegistrosService, realtime } = montarService(possivelPendente());

    const resultado = await service.confirmar('possible-1', 'empresa-1', 'usuario-1', { reason_id: 'motivo-1' });

    expect(paradasRegistrosService.criar).toHaveBeenCalledWith(
      'empresa-1',
      'usuario-1',
      expect.objectContaining({
        machine_id: 'maquina-1',
        reason_id: 'motivo-1',
        session_id: 'sessao-1',
        possible_stop_id: 'possible-1',
        started_at: new Date('2026-08-31T10:00:00.000Z'), // 10:05 - 5min
      }),
    );
    expect(resultado.possible_stop.status).toBe(PossibleStopStatus.CONFIRMED);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: PossibleStopStatus.CONFIRMED }));
    expect(realtime.emitToCompany).toHaveBeenCalledWith('empresa-1', 'possible_stop.resolved', expect.objectContaining({ status: PossibleStopStatus.CONFIRMED }));
  });

  it('Caso 4 — descartar: NÃO cria stop nenhuma, só marca dismissed', async () => {
    const { service, repo, paradasRegistrosService } = montarService(possivelPendente());

    const resultado = await service.descartar('possible-1', 'empresa-1');

    expect(paradasRegistrosService.criar).not.toHaveBeenCalled();
    expect(resultado.status).toBe(PossibleStopStatus.DISMISSED);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: PossibleStopStatus.DISMISSED }));
  });

  it('não deixa confirmar de novo uma possível parada que já foi resolvida', async () => {
    const jaConfirmada = { ...possivelPendente(), status: PossibleStopStatus.CONFIRMED };
    const { service } = montarService(jaConfirmada);

    await expect(
      service.confirmar('possible-1', 'empresa-1', 'usuario-1', { reason_id: 'motivo-1' }),
    ).rejects.toThrow(/já foi confirmada/);
  });

  it('não deixa descartar de novo uma possível parada que já foi descartada', async () => {
    const jaDescartada = { ...possivelPendente(), status: PossibleStopStatus.DISMISSED };
    const { service } = montarService(jaDescartada);

    await expect(service.descartar('possible-1', 'empresa-1')).rejects.toThrow(/já foi descartada/);
  });
});
