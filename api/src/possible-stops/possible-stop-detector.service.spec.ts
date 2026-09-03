import { PossibleStopDetectorService } from './possible-stop-detector.service';
import { SessionStatus } from '../database/entities/production-session.entity';
import { PossibleStopStatus } from '../database/entities/possible-stop.entity';
import { MachineStateEnum } from '../database/entities/machine-state.entity';

function montarService(overrides: {
  sessoesAtivas?: any[];
  ultimoEvento?: any;
  possibleStopExistente?: any;
  paradaAberta?: any;
  device?: any;
  ultimoEstado?: any;
} = {}) {
  const sessionRepo = { find: jest.fn().mockResolvedValue(overrides.sessoesAtivas ?? []) };
  const eventRepo = { findOne: jest.fn().mockResolvedValue(overrides.ultimoEvento ?? null) };
  const possibleStopRepo = {
    findOne: jest.fn().mockResolvedValue(overrides.possibleStopExistente ?? null),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ id: 'possible-novo', ...x })),
  };
  const stopRepo = { findOne: jest.fn().mockResolvedValue(overrides.paradaAberta ?? null) };
  const deviceRepo = { findOne: jest.fn().mockResolvedValue(overrides.device ?? null) };
  const machineStateRepo = {
    findOne: jest.fn().mockResolvedValue(overrides.ultimoEstado ?? null),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve(x)),
  };
  const realtime = { emitToCompany: jest.fn() };

  const service = new PossibleStopDetectorService(
    sessionRepo as any,
    eventRepo as any,
    possibleStopRepo as any,
    stopRepo as any,
    deviceRepo as any,
    machineStateRepo as any,
    realtime as any,
  );

  return { service, sessionRepo, eventRepo, possibleStopRepo, stopRepo, deviceRepo, machineStateRepo, realtime };
}

const SESSAO_BASE = {
  id: 'sessao-1',
  machine_id: 'maquina-1',
  status: SessionStatus.ACTIVE,
  started_at: new Date(Date.now() - 10 * 60 * 1000), // começou há 10min
  machine: { id: 'maquina-1', code: 'MQ-01', company_id: 'empresa-1' },
};

describe('PossibleStopDetectorService (varredura privada via verificarTodas)', () => {
  it('Caso 1 — máquina produzindo normalmente: não cria possible_stop', async () => {
    const { service, possibleStopRepo } = montarService({
      sessoesAtivas: [SESSAO_BASE],
      ultimoEvento: { occurred_at: new Date() }, // evento agora mesmo
    });

    await (service as any).verificarTodas();

    expect(possibleStopRepo.save).not.toHaveBeenCalled();
  });

  it('Caso 2 — sem evento além do limite configurado: cria possible_stop pendente', async () => {
    const { service, possibleStopRepo, realtime } = montarService({
      sessoesAtivas: [SESSAO_BASE],
      ultimoEvento: { occurred_at: new Date(Date.now() - 999_000) }, // muito além de STOP_DETECTION_SECONDS
    });

    await (service as any).verificarTodas();

    expect(possibleStopRepo.save).toHaveBeenCalledTimes(1);
    const salvo = possibleStopRepo.save.mock.calls[0][0];
    expect(salvo.machine_id).toBe('maquina-1');
    expect(salvo.session_id).toBe('sessao-1');
    expect(salvo.status).toBe(PossibleStopStatus.PENDING);
    expect(realtime.emitToCompany).toHaveBeenCalledWith('empresa-1', 'possible_stop.created', expect.any(Object));
  });

  it('Caso 5 — device sem heartbeat há muito tempo: marca OFFLINE e NÃO cria possible_stop', async () => {
    const { service, possibleStopRepo, machineStateRepo } = montarService({
      sessoesAtivas: [SESSAO_BASE],
      ultimoEvento: { occurred_at: new Date(Date.now() - 999_000) }, // também estaria "sem produção"
      device: { last_seen_at: new Date(Date.now() - 99_999_000), active: true },
    });

    await (service as any).verificarTodas();

    expect(possibleStopRepo.save).not.toHaveBeenCalled();
    expect(machineStateRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ state: MachineStateEnum.OFFLINE }),
    );
  });

  it('não duplica possible_stop se já existe um PENDING pra mesma máquina', async () => {
    const { service, possibleStopRepo } = montarService({
      sessoesAtivas: [SESSAO_BASE],
      ultimoEvento: { occurred_at: new Date(Date.now() - 999_000) },
      possibleStopExistente: { id: 'ja-existe', status: PossibleStopStatus.PENDING },
    });

    await (service as any).verificarTodas();

    expect(possibleStopRepo.save).not.toHaveBeenCalled();
  });

  it('cancela sozinha a possível parada pendente se a produção voltar antes de alguém confirmar/descartar', async () => {
    const pendente = { id: 'ja-existe', status: PossibleStopStatus.PENDING, resolved_at: null };
    const { service, possibleStopRepo, machineStateRepo, realtime } = montarService({
      sessoesAtivas: [SESSAO_BASE],
      ultimoEvento: { occurred_at: new Date() }, // chegou evento novo agora mesmo
      possibleStopExistente: pendente,
    });

    await (service as any).verificarTodas();

    // Não cria um possible_stop NOVO — atualiza (cancela) o que já existia.
    expect(possibleStopRepo.create).not.toHaveBeenCalled();
    expect(possibleStopRepo.save).toHaveBeenCalledTimes(1);
    expect(possibleStopRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ja-existe', status: PossibleStopStatus.DISMISSED }),
    );
    expect(realtime.emitToCompany).toHaveBeenCalledWith(
      'empresa-1', 'possible_stop.resolved', expect.objectContaining({ possible_stop_id: 'ja-existe' }),
    );
    expect(machineStateRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ state: MachineStateEnum.RUNNING }),
    );
  });

  it('possível parada pendente continua parada (sem produção ainda) — não mexe nela', async () => {
    const pendente = { id: 'ja-existe', status: PossibleStopStatus.PENDING, resolved_at: null };
    const { service, possibleStopRepo, realtime } = montarService({
      sessoesAtivas: [SESSAO_BASE],
      ultimoEvento: { occurred_at: new Date(Date.now() - 999_000) }, // ainda sem produção
      possibleStopExistente: pendente,
    });

    await (service as any).verificarTodas();

    expect(possibleStopRepo.save).not.toHaveBeenCalled();
    expect(realtime.emitToCompany).not.toHaveBeenCalled();
  });

  it('não cria possible_stop se já existe uma parada REAL aberta pra essa máquina (operador já resolveu manualmente)', async () => {
    const { service, possibleStopRepo } = montarService({
      sessoesAtivas: [SESSAO_BASE],
      ultimoEvento: { occurred_at: new Date(Date.now() - 999_000) },
      paradaAberta: { id: 'parada-manual-aberta' },
    });

    await (service as any).verificarTodas();

    expect(possibleStopRepo.save).not.toHaveBeenCalled();
  });

  it('sessão sem NENHUM evento ainda usa started_at como referência (não trava sessão nova recém-criada)', async () => {
    const sessaoNova = { ...SESSAO_BASE, started_at: new Date() }; // acabou de começar
    const { service, possibleStopRepo } = montarService({
      sessoesAtivas: [sessaoNova],
      ultimoEvento: null, // ainda não produziu nada
    });

    await (service as any).verificarTodas();

    // Started agora mesmo => tempo sem produção ainda é ~0s => não dispara
    expect(possibleStopRepo.save).not.toHaveBeenCalled();
  });
});
