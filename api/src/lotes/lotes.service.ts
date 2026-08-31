import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lot as Lote } from '../database/entities/lot.entity';
import { Product as Produto } from '../database/entities/product.entity';
import { Machine } from '../database/entities/machine.entity';
import { CreateLotDto } from './dto/create-lot.dto';

@Injectable()
export class LotesService {
  constructor(
    @InjectRepository(Lote)
    private readonly repo: Repository<Lote>,
    @InjectRepository(Produto)
    private readonly produtoRepo: Repository<Produto>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
  ) {}

  listarTodos(companyId: string) {
    return this.repo.find({
      where: { company_id: companyId },
      relations: { product: true, machine: true },
      order: { created_at: 'DESC' },
    });
  }

  async buscarPorId(id: string, companyId: string) {
    const lote = await this.repo.findOne({
      where: { id, company_id: companyId },
      relations: { product: true, machine: true },
    });
    if (!lote) {
      throw new NotFoundException(`Lote ${id} não encontrado`);
    }
    return lote;
  }

  async criar(companyId: string, dto: CreateLotDto) {
    // Validar se o produto existe e pertence à mesma empresa
    const produto = await this.produtoRepo.findOne({
      where: { id: dto.product_id, company_id: companyId },
    });

    if (!produto) {
      throw new NotFoundException('Produto inexistente ou pertence a outra empresa');
    }

    if (dto.machine_id) {
      const machine = await this.machineRepo.findOne({ where: { id: dto.machine_id, company_id: companyId } });
      if (!machine) throw new NotFoundException('Máquina inexistente ou pertence a outra empresa');
    }

    // Verificar se já existe um lote com este código na empresa
    let existente = await this.repo.findOne({
      where: { company_id: companyId, code: dto.code },
    });

    if (existente) {
      existente.product_id = dto.product_id;
      existente.machine_id = dto.machine_id ?? existente.machine_id;
      await this.repo.save(existente);
      return this.buscarPorId(existente.id, companyId);
    }

    const lote = this.repo.create({
      code: dto.code,
      product_id: dto.product_id,
      company_id: companyId,
      machine_id: dto.machine_id ?? null,
    });

    const salvo = await this.repo.save(lote);
    return this.buscarPorId(salvo.id, companyId);
  }

  async buscarOuCriarPorCodigo(code: string, productId: string, companyId: string) {
    let lote = await this.repo.findOne({
      where: { company_id: companyId, code },
    });

    if (!lote) {
      lote = await this.repo.save(
        this.repo.create({
          code,
          product_id: productId,
          company_id: companyId,
        }),
      );
    }

    return lote;
  }
}
