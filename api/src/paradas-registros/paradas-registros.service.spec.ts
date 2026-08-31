import { ParadasRegistrosService } from './paradas-registros.service';

function montarService(overrides: { machine?: any; reason?: any; aberta?: any } = {}) {
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ id: 'parada-nova', ...x })),
  };
  const machineRepo = { findOne: jest.fn().mockResolvedValue(overrides.machine ?? { id: 'maquina-1', company_id: 'empresa-1' }) };
  const reasonRepo = { findOne: jest.fn().mockResolvedValue(overrides.reason ?? null) };
  const alertRepo = { save: jest.fn((x) => Promise.resolve(x)), create: jest.fn((x) => x), update: jest.fn() };
  const realtime = { emitToCompany: jest.fn() };

  // buscarParadaAberta usa this.repo.findOne — precisa mockar separado do
  // findOne genérico usado em buscarPorId (mesma instância, então
  // configuramos mockResolvedValueOnce onde importa nos testes).
  repo.findOne.mockResolvedValue(overrides.aberta ?? null);

  const service = new ParadasRegistrosService(repo as any, machineRepo as any, reasonRepo as any, alertRepo as any, realtime as any);
  return { service, repo, machineRepo, reasonRepo, alertRepo, realtime };
}

describe('ParadasRegistrosService.criar — planejada x não planejada (seção 25, casos 6 e 7)', () => {
  it('Caso 6 — parada planejada: cria a parada mas NÃO gera alerta', async () => {
    const { service, alertRepo, realtime } = montarService({
      reason: { id: 'motivo-1', company_id: 'empresa-1', active: true, planned: true, default_priority: 'baixa', label: 'Limpeza programada' },
    });

    await service.criar('empresa-1', 'usuario-1', { machine_id: 'maquina-1', reason_id: 'motivo-1' });

    expect(alertRepo.save).not.toHaveBeenCalled();
    expect(realtime.emitToCompany).not.toHaveBeenCalledWith('empresa-1', 'alert.created', expect.anything());
    expect(realtime.emitToCompany).toHaveBeenCalledWith('empresa-1', 'stop.started', expect.any(Object));
  });

  it('Caso 7 — parada NÃO planejada: cria a parada E gera alerta respeitando a prioridade do motivo', async () => {
    const { service, alertRepo, realtime } = montarService({
      reason: { id: 'motivo-2', company_id: 'empresa-1', active: true, planned: false, default_priority: 'alta', label: 'Problema no equipamento' },
    });

    await service.criar('empresa-1', 'usuario-1', { machine_id: 'maquina-1', reason_id: 'motivo-2' });

    expect(alertRepo.save).toHaveBeenCalledTimes(1);
    const alertaCriado = alertRepo.save.mock.calls[0][0];
    expect(alertaCriado.priority).toBe('alta');
    expect(alertaCriado.type).toBe('UNPLANNED_STOP');
    expect(realtime.emitToCompany).toHaveBeenCalledWith('empresa-1', 'alert.created', expect.any(Object));
  });

  it('não permite duas paradas em aberto na mesma máquina ao mesmo tempo', async () => {
    const { service } = montarService({
      reason: { id: 'motivo-1', company_id: 'empresa-1', active: true, planned: true },
      aberta: { id: 'ja-tem-uma-aberta' },
    });

    await expect(
      service.criar('empresa-1', 'usuario-1', { machine_id: 'maquina-1', reason_id: 'motivo-1' }),
    ).rejects.toThrow('Já existe uma parada em aberto para esta máquina');
  });

  it('aceita started_at retroativo (usado ao confirmar um possible_stop) em vez de sempre usar "agora"', async () => {
    const { service, repo } = montarService({
      reason: { id: 'motivo-1', company_id: 'empresa-1', active: true, planned: true },
    });
    const inicioReal = new Date('2026-08-31T10:00:00.000Z');

    await service.criar('empresa-1', 'usuario-1', {
      machine_id: 'maquina-1',
      reason_id: 'motivo-1',
      started_at: inicioReal,
      possible_stop_id: 'possible-1',
    });

    const salvo = repo.create.mock.calls[0][0];
    expect(salvo.started_at).toBe(inicioReal);
    expect(salvo.possible_stop_id).toBe('possible-1');
  });
});
