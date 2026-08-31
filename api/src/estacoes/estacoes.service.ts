import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estacao } from './estacao.entity';

@Injectable()
export class EstacoesService {
  constructor(
    @InjectRepository(Estacao)
    private readonly repo: Repository<Estacao>,
  ) {}

  listarTodas() {
    return this.repo.find();
  }

  async buscarPorId(id: string) {
    const estacao = await this.repo.findOne({ where: { id } });
    if (!estacao) throw new NotFoundException(`Estação ${id} não encontrada`);
    return estacao;
  }

  async buscarPorApiKey(apiKey: string) {
    return this.repo.findOne({ where: { apiKey } });
  }

  criar(dados: Partial<Estacao>) {
    const estacao = this.repo.create(dados);
    return this.repo.save(estacao);
  }

  async atualizar(id: string, dados: Partial<Estacao>) {
    await this.buscarPorId(id);
    await this.repo.update(id, dados);
    return this.buscarPorId(id);
  }

  async remover(id: string) {
    await this.buscarPorId(id);
    return this.repo.delete(id);
  }

  async registrarSincronizacao(id: string) {
    await this.repo.update(id, { ultimaSincronizacao: new Date() });
  }
}
