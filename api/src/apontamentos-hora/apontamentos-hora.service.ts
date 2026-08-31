import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApontamentoHora } from './apontamento-hora.entity';

@Injectable()
export class ApontamentosHoraService {
  constructor(
    @InjectRepository(ApontamentoHora)
    private readonly repo: Repository<ApontamentoHora>,
  ) {}

  listarTodos() {
    return this.repo.find();
  }

  async buscarPorId(id: string) {
    const apontamento = await this.repo.findOne({
      where: { id },
    });
    if (!apontamento) throw new NotFoundException(`Apontamento ${id} não encontrado`);
    return apontamento;
  }

  listarPorMaquina(maquinaId: string) {
    return this.repo.find({
      where: { maquinaId },
      order: { horaReferencia: 'DESC' },
    });
  }

  criar(dados: Partial<ApontamentoHora>) {
    const apontamento = this.repo.create(dados);
    return this.repo.save(apontamento);
  }

  async remover(id: string) {
    await this.buscarPorId(id);
    return this.repo.delete(id);
  }
}
