import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Device } from '../database/entities/device.entity';
import { Machine } from '../database/entities/machine.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
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

    return {
      id: device.id,
      identifier: device.identifier,
      raw_token: rawToken,
    };
  }

  async validarDeviceToken(identifier: string, token: string) {
    const device = await this.deviceRepo
      .createQueryBuilder('device')
      .innerJoinAndSelect('device.machine', 'machine')
      .innerJoinAndSelect('machine.company', 'company')
      .where('device.identifier = :identifier', { identifier })
      .andWhere('device.active = true')
      .getOne();

    if (!device || !device.secret_hash) return null;

    const valid = await bcrypt.compare(token, device.secret_hash);
    if (!valid) return null;

    return device;
  }
}
