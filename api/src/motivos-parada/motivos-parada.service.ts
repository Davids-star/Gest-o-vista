import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StopReason as MotivoParada } from '../database/entities/stop-reason.entity';

@Injectable()
export class MotivosParadaService {
  constructor(
    @InjectRepository(MotivoParada)
    private readonly repo: Repository<MotivoParada>,
  ) {}

  listarTodos(companyId: string) {
    return this.repo.find({ where: { company_id: companyId } });
  }

  async buscarPorId(id: string, companyId: string) {
    const motivo = await this.repo.findOne({ where: { id, company_id: companyId } });
    if (!motivo) throw new NotFoundException(`Motivo de parada ${id} não encontrado`);
    return motivo;
  }

  criar(companyId: string, dados: Partial<MotivoParada>) {
    const motivo = this.repo.create({ ...dados, company_id: companyId });
    return this.repo.save(motivo);
  }

  async atualizar(id: string, companyId: string, dados: Partial<MotivoParada>) {
    await this.buscarPorId(id, companyId);
    delete dados.company_id;
    await this.repo.update(id, dados);
    return this.buscarPorId(id, companyId);
  }

  async remover(id: string, companyId: string) {
    await this.buscarPorId(id, companyId);
    return this.repo.delete(id);
  }
}
