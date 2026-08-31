import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine as Maquina } from '../database/entities/machine.entity';
import { Product } from '../database/entities/product.entity';
import { ProductionSession, SessionStatus } from '../database/entities/production-session.entity';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { SetPlannedProductionDto } from './dto/set-planned-production.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class MaquinasService {
  constructor(
    @InjectRepository(Maquina)
    private readonly repo: Repository<Maquina>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductionSession)
    private readonly sessionRepo: Repository<ProductionSession>,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Listar todas as máquinas da empresa do usuário autenticado */
  listarTodas(companyId: string) {
    return this.repo.find({
      where: { company_id: companyId },
      order: { created_at: 'ASC' },
    });
  }

  /** Consultar máquina específica garantindo isolamento por empresa */
  async buscarPorId(id: string, companyId: string) {
    const maquina = await this.repo.findOne({
      where: { id, company_id: companyId },
    });

    if (!maquina) {
      throw new NotFoundException(`Máquina ${id} não encontrada`);
    }

    return maquina;
  }

  /** Criar nova máquina associada à empresa do usuário autenticado */
  async criar(companyId: string, dto: CreateMachineDto) {
    // Verificar se já existe máquina com o mesmo código na mesma empresa (Constraint Unique idx_machines_company_code)
    const existente = await this.repo.findOne({
      where: { company_id: companyId, code: dto.code },
    });

    if (existente) {
      throw new ConflictException(`Código de máquina "${dto.code}" já está em uso nesta empresa`);
    }

    const maquina = this.repo.create({
      code: dto.code,
      name: dto.name,
      company_id: companyId,
      active: true,
    });

    return this.repo.save(maquina);
  }

  /** Atualizar dados de uma máquina pertencente à empresa */
  async atualizar(id: string, companyId: string, dto: UpdateMachineDto) {
    const maquina = await this.buscarPorId(id, companyId);

    if (dto.code && dto.code !== maquina.code) {
      const duplicada = await this.repo.findOne({
        where: { company_id: companyId, code: dto.code },
      });

      if (duplicada) {
        throw new ConflictException(`Código de máquina "${dto.code}" já está em uso nesta empresa`);
      }
    }

    Object.assign(maquina, dto);
    return this.repo.save(maquina);
  }

  /** Realizar Soft Delete (active = false) da máquina da empresa */
  async remover(id: string, companyId: string) {
    const maquina = await this.buscarPorId(id, companyId);
    maquina.active = false;
    await this.repo.save(maquina);
    return { message: `Máquina ${id} desativada com sucesso`, active: false };
  }

  /**
   * Define (ou limpa) a próxima produção planejada para a máquina — só
   * permitido enquanto ela NÃO tem sessão ativa (aguardando). O Totem lê
   * planned_product_id/planned_lot_code pra pré-preencher "Nova produção".
   * Fica valendo até alguém trocar — não é consumido ao iniciar sessão.
   */
  async definirProximaProducao(id: string, companyId: string, dto: SetPlannedProductionDto) {
    const maquina = await this.buscarPorId(id, companyId);

    const sessaoAtiva = await this.sessionRepo.findOne({
      where: { machine_id: id, status: SessionStatus.ACTIVE },
    });
    if (sessaoAtiva) {
      throw new ConflictException(
        'Só é possível definir a próxima produção enquanto a máquina não tem sessão ativa',
      );
    }

    if (dto.product_id) {
      const produto = await this.productRepo.findOne({ where: { id: dto.product_id, company_id: companyId } });
      if (!produto) throw new NotFoundException('Produto inexistente ou pertence a outra empresa');
    }

    if (dto.product_id !== undefined) maquina.planned_product_id = dto.product_id;
    if (dto.lot_code !== undefined) maquina.planned_lot_code = dto.lot_code?.trim() || null;

    const salva = await this.repo.save(maquina);
    this.realtime.emitToCompany(companyId, 'machine.state.changed', { machine_id: id });
    return salva;
  }
}
