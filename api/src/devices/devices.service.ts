import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Device } from '../database/entities/device.entity';
import { Machine } from '../database/entities/machine.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

/** Quanto tempo uma credencial de aparelho já conferida fica em memória (ms). */
const TTL_CACHE_CREDENCIAL_MS = 60_000;
const MAX_CREDENCIAIS_EM_CACHE = 500;

@Injectable()
export class DevicesService {
  // bcrypt.compare custa ~60-100 ms de CPU. Sem cache ele rodava em TODA
  // requisição do tablet (inclusive os GETs de polling) e travava a API —
  // era uma das causas do envio lento. A chave é um SHA-256 do par
  // identificador+token, nunca o token puro. Revogar/rotacionar limpa o cache
  // na hora; no pior caso (outra instância da API) vale em até 60 s.
  private readonly credenciaisValidas = new Map<string, { device: Device; expira: number }>();

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
  ) {}

  async criarDevice(companyId: string, dto: CreateDeviceDto) {
    const machine = await this.machineRepo.findOne({
      where: { id: dto.machine_id, company_id: companyId },
    });
    if (!machine) {
      throw new NotFoundException('Máquina não encontrada ou pertence a outra empresa');
    }

    const exist = await this.deviceRepo.findOne({ where: { identifier: dto.identifier } });
    if (exist) {
      throw new BadRequestException('Dispositivo com este identificador já existe');
    }

    const rawToken = `dev_tok_${crypto.randomBytes(16).toString('hex')}`;
    const secret_hash = await bcrypt.hash(rawToken, 10);

    const device = this.deviceRepo.create({
      machine_id: dto.machine_id,
      type: dto.type,
      identifier: dto.identifier,
      config: dto.config || null,
      secret_hash,
      active: true,
    });

    const saved = await this.deviceRepo.save(device);
    const { secret_hash: _, ...rest } = saved as any;
    return {
      ...rest,
      raw_token: rawToken, // Exibido apenas uma vez no cadastro
    };
  }

  async listarDevices(companyId: string) {
    return this.deviceRepo
      .createQueryBuilder('device')
      .innerJoinAndSelect('device.machine', 'machine')
      .where('machine.company_id = :companyId', { companyId })
      .select([
        'device.id',
        'device.machine_id',
        'device.type',
        'device.identifier',
        'device.config',
        'device.last_seen_at',
        'device.active',
        'device.created_at',
        'device.updated_at',
        'machine.id',
        'machine.code',
        'machine.name',
        'machine.company_id',
      ])
      .getMany();
  }

  async obterDevice(companyId: string, id: string) {
    const device = await this.deviceRepo
      .createQueryBuilder('device')
      .innerJoinAndSelect('device.machine', 'machine')
      .where('device.id = :id', { id })
      .andWhere('machine.company_id = :companyId', { companyId })
      .getOne();

    if (!device) throw new NotFoundException('Dispositivo não encontrado');
    const { secret_hash: _, ...rest } = device as any;
    return rest;
  }

  async atualizarDevice(companyId: string, id: string, dto: UpdateDeviceDto) {
    const device = await this.deviceRepo
      .createQueryBuilder('device')
      .innerJoinAndSelect('device.machine', 'machine')
      .where('device.id = :id', { id })
      .andWhere('machine.company_id = :companyId', { companyId })
      .getOne();

    if (!device) throw new NotFoundException('Dispositivo não encontrado');

    if (dto.type !== undefined) device.type = dto.type;
    if (dto.config !== undefined) device.config = dto.config;
    if (dto.active !== undefined) device.active = dto.active;
    this.esquecerCredenciais(device.identifier);

    const saved = await this.deviceRepo.save(device);
    const { secret_hash: _, ...rest } = saved as any;
    return rest;
  }

  async rotacionarToken(companyId: string, id: string) {
    const device = await this.deviceRepo
      .createQueryBuilder('device')
      .innerJoinAndSelect('device.machine', 'machine')
      .where('device.id = :id', { id })
      .andWhere('machine.company_id = :companyId', { companyId })
      .getOne();

    if (!device) throw new NotFoundException('Dispositivo não encontrado');

    const rawToken = `dev_tok_${crypto.randomBytes(16).toString('hex')}`;
    device.secret_hash = await bcrypt.hash(rawToken, 10);
    await this.deviceRepo.save(device);
    this.esquecerCredenciais(device.identifier);

    return {
      id: device.id,
      identifier: device.identifier,
      raw_token: rawToken,
    };
  }

  private chaveCredencial(identifier: string, token: string) {
    return crypto.createHash('sha256').update(`${identifier}\0${token}`).digest('hex');
  }

  private esquecerCredenciais(identifier: string) {
    for (const [chave, { device }] of this.credenciaisValidas) {
      if (device.identifier === identifier) this.credenciaisValidas.delete(chave);
    }
  }

  async validarDeviceToken(identifier: string, token: string) {
    const chave = this.chaveCredencial(identifier, token);
    const emCache = this.credenciaisValidas.get(chave);
    if (emCache && emCache.expira > Date.now()) return emCache.device;
    this.credenciaisValidas.delete(chave);

    const device = await this.deviceRepo
      .createQueryBuilder('device')
      .innerJoinAndSelect('device.machine', 'machine')
      .innerJoinAndSelect('machine.company', 'company')
      .where('device.identifier = :identifier', { identifier })
      .andWhere('device.active = true')
      .getOne();

    // Dispositivo inexistente gasta o mesmo bcrypt que um existente: sem isso o
    // tempo de resposta revelaria quais identificadores existem.
    const valid = await bcrypt.compare(token, device?.secret_hash || HASH_FALSO);
    if (!device || !device.secret_hash || !valid) return null;

    if (this.credenciaisValidas.size >= MAX_CREDENCIAIS_EM_CACHE) this.credenciaisValidas.clear();
    this.credenciaisValidas.set(chave, { device, expira: Date.now() + TTL_CACHE_CREDENCIAL_MS });
    return device;
  }
}

/** Hash bcrypt (custo 10) de um valor descartável, só para igualar o tempo de resposta. */
const HASH_FALSO = bcrypt.hashSync('gp-hash-falso', 10);
