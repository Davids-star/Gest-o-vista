import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert as Alerta, AlertStatus } from '../database/entities/alert.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class AlertasService {
  constructor(
    @InjectRepository(Alerta)
    private readonly repo: Repository<Alerta>,
    private readonly realtime: RealtimeGateway,
  ) {}

  listarTodos(companyId: string) {
    return this.repo.createQueryBuilder('alert').innerJoinAndSelect('alert.machine', 'machine')
      .where('machine.company_id = :companyId', { companyId }).orderBy('alert.created_at', 'DESC').getMany();
  }

  listarAbertos(companyId: string) {
    return this.repo.createQueryBuilder('alert').innerJoinAndSelect('alert.machine', 'machine')
      .where('machine.company_id = :companyId', { companyId }).andWhere('alert.status = :status', { status: AlertStatus.OPEN })
      .orderBy('alert.created_at', 'DESC').getMany();
  }

  async buscarPorId(id: string, companyId: string) {
    const alerta = await this.repo.createQueryBuilder('alert').innerJoinAndSelect('alert.machine', 'machine')
      .where('alert.id = :id', { id }).andWhere('machine.company_id = :companyId', { companyId }).getOne();
    if (!alerta) throw new NotFoundException(`Alerta ${id} não encontrado`);
    return alerta;
  }

  listarPorMaquina(machine_id: string, companyId: string) {
    return this.repo.createQueryBuilder('alert').innerJoinAndSelect('alert.machine', 'machine')
      .where('alert.machine_id = :machine_id', { machine_id }).andWhere('machine.company_id = :companyId', { companyId })
      .orderBy('alert.created_at', 'DESC').getMany();
  }

  criar(dados: Partial<Alerta>) {
    const alerta = this.repo.create(dados);
    return this.repo.save(alerta);
  }

  async marcarVisto(id: string, companyId: string) {
    const alerta = await this.buscarPorId(id, companyId);
    await this.repo.update(id, {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledged_at: new Date(),
    });
    this.realtime.emitToCompany(companyId, 'alert.acknowledged', {
      alert_id: id,
      machine_id: alerta.machine_id,
    });
    return this.buscarPorId(id, companyId);
  }

  async marcarResolvido(id: string, companyId: string) {
    const alerta = await this.buscarPorId(id, companyId);
    await this.repo.update(id, {
      status: AlertStatus.RESOLVED,
      resolved_at: new Date(),
    });
    this.realtime.emitToCompany(companyId, 'alert.resolved', {
      alert_id: id,
      machine_id: alerta.machine_id,
    });
    return this.buscarPorId(id, companyId);
  }

  async remover(id: string, companyId: string) {
    await this.buscarPorId(id, companyId);
    return this.repo.delete(id);
  }
}
