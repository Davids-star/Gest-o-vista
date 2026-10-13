import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  async criar(companyId: string, dados: Partial<MotivoParada>) {
    const codigo = String(dados.code).trim();
    const existente = await this.repo.findOne({ where: { company_id: companyId, code: codigo } });
    if (existente) throw new ConflictException(`Já existe um motivo de parada com o código "${codigo}"`);
    const motivo = this.repo.create({ ...dados, code: codigo, label: String(dados.label).trim(), company_id: companyId });
    return this.repo.save(motivo);
  }

  async atualizar(id: string, companyId: string, dados: Partial<MotivoParada>) {
    await this.buscarPorId(id, companyId);
    await this.repo.update({ id, company_id: companyId }, dados);
    return this.buscarPorId(id, companyId);
  }

  async remover(id: string, companyId: string) {
    await this.buscarPorId(id, companyId);
    try {
      return await this.repo.delete({ id, company_id: companyId });
    } catch (err: any) {
      // 23503: já existem paradas registradas com esse motivo — desative em vez de excluir.
      if (err.code === '23503') {
        throw new ConflictException('Este motivo já foi usado em paradas e não pode ser excluído; desative-o.');
      }
      throw err;
    }
  }
}
