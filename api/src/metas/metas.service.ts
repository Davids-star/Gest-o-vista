import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TargetPlan as Meta } from '../database/entities/target-plan.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class MetasService {
  constructor(
    @InjectRepository(Meta)
    private readonly repo: Repository<Meta>,
    private readonly realtime: RealtimeGateway,
  ) {}

  listarTodas(companyId: string) {
    return this.repo.find({ where: { company_id: companyId }, relations: { machine: true, product: true } });
  }

  async buscarPorId(id: string, companyId: string) {
    const meta = await this.repo.findOne({ where: { id, company_id: companyId }, relations: { machine: true, product: true } });
    if (!meta) throw new NotFoundException(`Meta ${id} não encontrada`);
    return meta;
  }

  listarPorMaquina(machine_id: string, companyId: string) {
    return this.repo.find({ where: { machine_id, company_id: companyId }, relations: { machine: true, product: true } });
  }

  async criar(companyId: string, userId: string, dados: Partial<Meta>) {
    const meta = this.repo.create({ ...dados, company_id: companyId, created_by: userId });
    const salva = await this.repo.save(meta);
    this.realtime.emitToCompany(companyId, 'target.updated', {
      target_id: salva.id,
      machine_id: salva.machine_id,
    });
    return salva;
  }

  async atualizar(id: string, companyId: string, dados: Partial<Meta>) {
    await this.buscarPorId(id, companyId);
    delete dados.company_id;
    delete dados.created_by;
    await this.repo.update(id, dados);
    const resultado = await this.buscarPorId(id, companyId);
    this.realtime.emitToCompany(companyId, 'target.updated', {
      target_id: id,
      machine_id: resultado.machine_id,
    });
    return resultado;
  }

  async remover(id: string, companyId: string) {
    const meta = await this.buscarPorId(id, companyId);
    await this.repo.delete(id);
    this.realtime.emitToCompany(companyId, 'target.updated', {
      target_id: id,
      machine_id: meta.machine_id,
    });
  }
}
