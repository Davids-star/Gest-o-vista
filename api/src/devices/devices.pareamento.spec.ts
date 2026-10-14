import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DevicesService } from './devices.service';

describe('DevicesService — pareamento por código', () => {
  const empresa = { id: 'emp1' };
  const maquina = { id: 'm1', code: 'MQ-01', name: 'Máquina 1' };
  let deviceRepo: any; let machineRepo: any; let companyRepo: any; let service: DevicesService;

  beforeEach(() => {
    process.env.CODIGO_PAREAMENTO = 'fabrica-2026';
    deviceRepo = { create: jest.fn((x) => x), save: jest.fn(async (x) => x) };
    machineRepo = { find: jest.fn().mockResolvedValue([maquina]), findOne: jest.fn().mockResolvedValue(maquina) };
    companyRepo = { find: jest.fn().mockResolvedValue([empresa]) };
    service = new DevicesService(deviceRepo, machineRepo, companyRepo);
  });
  afterEach(() => { delete process.env.CODIGO_PAREAMENTO; });

  it('código certo lista as máquinas para escolher', async () => {
    expect(await service.maquinasParaPareamento('fabrica-2026')).toEqual([{ id: 'm1', code: 'MQ-01', name: 'Máquina 1' }]);
  });

  it('código errado é recusado e nada é criado', async () => {
    await expect(service.maquinasParaPareamento('errado')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.parearAparelho('errado', 'm1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(deviceRepo.save).not.toHaveBeenCalled();
  });

  it('sem CODIGO_PAREAMENTO no servidor, o pareamento fica desligado', async () => {
    delete process.env.CODIGO_PAREAMENTO;
    await expect(service.maquinasParaPareamento('qualquer')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('parear cria o aparelho ligado à máquina e devolve o token em texto só na resposta', async () => {
    const r = await service.parearAparelho('fabrica-2026', 'm1', 'Tablet do forno');
    expect(r.identifier).toMatch(/^APP-MQ-01-[0-9A-F]{6}$/);
    expect(r.token).toMatch(/^dev_tok_[0-9a-f]{32}$/);
    const salvo = deviceRepo.save.mock.calls[0][0];
    expect(salvo).toMatchObject({ machine_id: 'm1', type: 'app', active: true, config: { nome: 'Tablet do forno' } });
    expect(salvo.secret_hash).not.toContain(r.token); // só o hash vai para o banco
  });

  it('máquina de outra empresa ou inexistente não pareia', async () => {
    machineRepo.findOne.mockResolvedValue(null);
    await expect(service.parearAparelho('fabrica-2026', 'x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
