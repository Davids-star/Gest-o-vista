import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product as Produto } from '../database/entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProdutosService {
  constructor(
    @InjectRepository(Produto)
    private readonly repo: Repository<Produto>,
  ) {}

  listarTodos(companyId: string) {
    return this.repo.find({
      where: { company_id: companyId },
      order: { created_at: 'ASC' },
    });
  }

  async buscarPorId(id: string, companyId: string) {
    const produto = await this.repo.findOne({
      where: { id, company_id: companyId },
    });
    if (!produto) {
      throw new NotFoundException(`Produto ${id} não encontrado`);
    }
    return produto;
  }

  criar(companyId: string, dto: CreateProductDto) {
    const produto = this.repo.create({
      ...dto,
      company_id: companyId,
      active: true,
    });
    return this.repo.save(produto);
  }

  async atualizar(id: string, companyId: string, dto: UpdateProductDto) {
    const produto = await this.buscarPorId(id, companyId);
    Object.assign(produto, dto);
    return this.repo.save(produto);
  }
}
