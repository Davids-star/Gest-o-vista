import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ProductionEvent as ProducaoRegistro } from '../database/entities/production-event.entity';

@Injectable()
export class ProducaoRegistrosService {
  constructor(
    @InjectRepository(ProducaoRegistro)
    private readonly repo: Repository<ProducaoRegistro>,
  ) {}

  listarTodos() {
    return this.repo.find({ relations: { machine: true, session: true } });
  }

  async buscarPorId(id: string) {
    const registro = await this.repo.findOne({
      where: { id },
      relations: { machine: true, session: true },
    });
    if (!registro) throw new NotFoundException(`Registro de produção ${id} não encontrado`);
    return registro;
  }

  listarPorMaquina(machine_id: string, inicio?: Date, fim?: Date) {
    const where: any = { machine_id };
    if (inicio && fim) {
      where.occurred_at = Between(inicio, fim);
    }
    return this.repo.find({
      where,
      relations: { machine: true, session: true },
      order: { occurred_at: 'DESC' },
    });
  }

  async criar(dados: Partial<ProducaoRegistro>) {
    if (dados.event_uid) {
      const existente = await this.repo.findOne({ where: { event_uid: dados.event_uid } });
      if (existente) return existente; // idempotente: reenvio não duplica
    }
    const registro = this.repo.create(dados);
    return this.repo.save(registro);
  }

  async remover(id: string) {
    await this.buscarPorId(id);
    return this.repo.delete(id);
  }
}
