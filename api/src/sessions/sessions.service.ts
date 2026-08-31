import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ProductionSession, SessionStatus } from '../database/entities/production-session.entity';
import { Machine } from '../database/entities/machine.entity';
import { Product } from '../database/entities/product.entity';
import { Lot } from '../database/entities/lot.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { AuditLog } from '../database/entities/audit-log.entity';
import { Stop, StopStatus } from '../database/entities/stop.entity';
import { Alert, AlertStatus } from '../database/entities/alert.entity';
import { StartSessionDto } from './dto/start-session.dto';
import { ChangeLotDto } from './dto/change-lot.dto';
import { ChangeOperatorDto } from './dto/change-operator.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ShiftsService } from '../shifts/shifts.service';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(ProductionSession)
    private readonly sessionRepo: Repository<ProductionSession>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Lot)
    private readonly lotRepo: Repository<Lot>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(Stop)
    private readonly stopRepo: Repository<Stop>,
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    private readonly realtime: RealtimeGateway,
    private readonly shiftsService: ShiftsService,
  ) {}

  /**
   * Uma máquina com sessão ativa não pode "parecer parada" pro resto do
   * sistema (TV/Dashboard checam parada em aberto com prioridade sobre
   * sessão). Iniciar produção de novo é o sinal inequívoco de que qualquer
   * parada pendurada dessa máquina acabou — fecha e resolve alertas ligados.
   */
  private async fecharParadasAbertas(machineId: string, companyId: string) {
    const abertas = await this.stopRepo.find({ where: { machine_id: machineId, ended_at: IsNull() } });
    if (!abertas.length) return;

    const ended_at = new Date();
    for (const parada of abertas) {
      const duration_seconds = Math.round((ended_at.getTime() - parada.started_at.getTime()) / 1000);
      await this.stopRepo.update(parada.id, { ended_at, duration_seconds, status: StopStatus.CLOSED });

      const { affected } = await this.alertRepo.update(
        { stop_id: parada.id, status: AlertStatus.OPEN },
        { status: AlertStatus.RESOLVED, resolved_at: ended_at },
      );

      this.realtime.emitToCompany(companyId, 'stop.ended', { stop_id: parada.id, machine_id: machineId });
      if (affected) {
        this.realtime.emitToCompany(companyId, 'alert.resolved', { stop_id: parada.id, machine_id: machineId });
      }
    }
  }

  listarTodas(companyId: string) {
    return this.sessionRepo
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.machine', 'machine')
      .innerJoinAndSelect('session.product', 'product')
      .innerJoinAndSelect('session.lot', 'lot')
      .innerJoinAndSelect('session.operator', 'operator')
      .leftJoinAndSelect('session.shift', 'shift')
      .where('machine.company_id = :companyId', { companyId })
      .orderBy('session.started_at', 'DESC')
      .getMany();
  }

  async buscarPorId(id: string, companyId: string) {
    const session = await this.sessionRepo
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.machine', 'machine')
      .innerJoinAndSelect('session.product', 'product')
      .innerJoinAndSelect('session.lot', 'lot')
      .innerJoinAndSelect('session.operator', 'operator')
      .leftJoinAndSelect('session.shift', 'shift')
      .where('session.id = :id', { id })
      .andWhere('machine.company_id = :companyId', { companyId })
      .getOne();

    if (!session) {
      throw new NotFoundException(`Sessão de produção ${id} não encontrada`);
    }

    return session;
  }

  async buscarSessaoAtivaPorMaquina(machineId: string, companyId: string) {
    const machine = await this.machineRepo.findOne({ where: { id: machineId, company_id: companyId } });
    if (!machine) {
      throw new NotFoundException('Máquina não encontrada para esta empresa');
    }

    return this.sessionRepo.findOne({
      where: { machine_id: machineId, status: SessionStatus.ACTIVE },
      relations: { machine: true, product: true, lot: true, operator: true },
    });
  }

  async iniciarSessao(companyId: string, currentUserId: string, dto: StartSessionDto) {
    // 1. Validar máquina
    const machine = await this.machineRepo.findOne({ where: { id: dto.machine_id, company_id: companyId } });
    if (!machine) {
      throw new NotFoundException('Máquina inexistente ou pertence a outra empresa');
    }

    // 2. Validar se já existe sessão ativa
    const sessaoAtiva = await this.sessionRepo.findOne({
      where: { machine_id: dto.machine_id, status: SessionStatus.ACTIVE },
    });
    if (sessaoAtiva) {
      throw new ConflictException('Já existe uma sessão ativa para esta máquina');
    }

    // 3. Validar produto
    const product = await this.productRepo.findOne({ where: { id: dto.product_id, company_id: companyId } });
    if (!product) {
      throw new NotFoundException('Produto inexistente ou pertence a outra empresa');
    }

    // 4. Buscar ou criar lote por código
    let lot = await this.lotRepo.findOne({ where: { company_id: companyId, code: dto.lot_code } });
    if (!lot) {
      lot = await this.lotRepo.save(
        this.lotRepo.create({
          company_id: companyId,
          code: dto.lot_code,
          product_id: dto.product_id,
        }),
      );
    }

    // 5. Determinar operador
    let operatorId = currentUserId;
    if (dto.operator_name) {
      const users = await this.userRepo.find({ where: { company_id: companyId } });
      const matchedUser = users.find(
        (u) => u.name.toLowerCase().includes(dto.operator_name!.toLowerCase()) || (u.email && u.email.toLowerCase().includes(dto.operator_name!.toLowerCase())),
      );

      if (matchedUser) {
        operatorId = matchedUser.id;
      } else {
        let newOperator = await this.userRepo.findOne({ where: { company_id: companyId, name: dto.operator_name } });
        if (!newOperator) {
          newOperator = await this.userRepo.save(
            this.userRepo.create({
              company_id: companyId,
              name: dto.operator_name,
              role: UserRole.OPERADOR,
              active: true,
            }),
          );
        }
        operatorId = newOperator.id;
      }
    }

    // 6. Resolver o turno vigente (pra "apontamento por turno" ter o que agrupar)
    const startedAt = new Date();
    const turno = await this.shiftsService.resolverTurnoParaHorario(companyId, startedAt);

    // 7. Criar e salvar sessão ativa
    const session = this.sessionRepo.create({
      machine_id: dto.machine_id,
      product_id: dto.product_id,
      lot_id: lot.id,
      operator_id: operatorId,
      shift_id: turno?.id ?? null,
      started_at: startedAt,
      status: SessionStatus.ACTIVE,
    });

    try {
      const salva = await this.sessionRepo.save(session);
      await this.fecharParadasAbertas(dto.machine_id, companyId);
      const resultado = await this.buscarPorId(salva.id, companyId);
      this.realtime.emitToCompany(companyId, 'session.started', {
        session_id: salva.id,
        machine_id: dto.machine_id,
      });
      this.realtime.emitToCompany(companyId, 'machine.state.changed', {
        machine_id: dto.machine_id,
      });
      return resultado;
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('Já existe uma sessão ativa para esta máquina');
      }
      throw err;
    }
  }

  async trocarLote(companyId: string, dto: ChangeLotDto) {
    const session = await this.buscarSessaoAtivaPorMaquina(dto.machine_id, companyId);
    if (!session) {
      throw new NotFoundException('Nenhuma sessão ativa encontrada para esta máquina');
    }

    let lot = await this.lotRepo.findOne({ where: { company_id: companyId, code: dto.lot_code } });
    if (!lot) {
      lot = await this.lotRepo.save(
        this.lotRepo.create({
          company_id: companyId,
          code: dto.lot_code,
          product_id: session.product_id,
        }),
      );
    }

    session.lot_id = lot.id;
    session.lot = lot;
    await this.sessionRepo.save(session);
    const resultado = await this.buscarPorId(session.id, companyId);
    this.realtime.emitToCompany(companyId, 'session.updated', {
      session_id: session.id,
      machine_id: dto.machine_id,
    });
    this.realtime.emitToCompany(companyId, 'machine.state.changed', {
      machine_id: dto.machine_id,
    });
    return resultado;
  }

  async trocarOperador(companyId: string, userId: string, dto: ChangeOperatorDto) {
    const session = await this.buscarSessaoAtivaPorMaquina(dto.machine_id, companyId);
    if (!session) {
      throw new NotFoundException('Nenhuma sessão ativa encontrada para esta máquina');
    }

    const oldOperatorId = session.operator_id;

    let newOperator = await this.userRepo.findOne({ where: { company_id: companyId, name: dto.operator_name } });
    if (!newOperator) {
      newOperator = await this.userRepo.save(
        this.userRepo.create({
          company_id: companyId,
          name: dto.operator_name,
          role: UserRole.OPERADOR,
          active: true,
        }),
      );
    }

    await this.auditRepo.save(
      this.auditRepo.create({
        user_id: userId,
        action: 'CHANGE_OPERATOR',
        entity: 'production_sessions',
        entity_id: session.id,
        old_value: { operator_id: oldOperatorId },
        new_value: { operator_id: newOperator.id, operator_name: dto.operator_name },
      }),
    );

    session.operator_id = newOperator.id;
    session.operator = newOperator;
    await this.sessionRepo.save(session);
    const resultado = await this.buscarPorId(session.id, companyId);
    this.realtime.emitToCompany(companyId, 'session.updated', {
      session_id: session.id,
      machine_id: dto.machine_id,
    });
    return resultado;
  }

  async encerrarSessao(companyId: string, dto: CloseSessionDto) {
    const session = await this.buscarSessaoAtivaPorMaquina(dto.machine_id, companyId);
    if (!session) {
      throw new NotFoundException('Nenhuma sessão ativa encontrada para esta máquina');
    }

    session.status = SessionStatus.CLOSED;
    session.ended_at = new Date();
    await this.sessionRepo.save(session);
    const resultado = await this.buscarPorId(session.id, companyId);
    this.realtime.emitToCompany(companyId, 'session.closed', {
      session_id: session.id,
      machine_id: dto.machine_id,
    });
    this.realtime.emitToCompany(companyId, 'machine.state.changed', {
      machine_id: dto.machine_id,
    });
    return resultado;
  }
}
