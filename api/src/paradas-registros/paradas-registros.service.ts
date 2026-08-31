import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Stop as ParadaRegistro, StopStatus } from '../database/entities/stop.entity';
import { Machine } from '../database/entities/machine.entity';
import { StopReason } from '../database/entities/stop-reason.entity';
import { Alert, AlertStatus } from '../database/entities/alert.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class ParadasRegistrosService {
  constructor(
    @InjectRepository(ParadaRegistro)
    private readonly repo: Repository<ParadaRegistro>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    @InjectRepository(StopReason)
    private readonly reasonRepo: Repository<StopReason>,
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    private readonly realtime: RealtimeGateway,
  ) {}

  listarTodos(companyId: string) {
    return this.repo.createQueryBuilder('stop')
      .innerJoinAndSelect('stop.machine', 'machine')
      .leftJoinAndSelect('stop.reason', 'reason')
      .where('machine.company_id = :companyId', { companyId })
      .orderBy('stop.started_at', 'DESC')
      .getMany();
  }

  async buscarPorId(id: string, companyId?: string) {
    const qb = this.repo.createQueryBuilder('stop').innerJoinAndSelect('stop.machine', 'machine').leftJoinAndSelect('stop.reason', 'reason')
      .where('stop.id = :id', { id });
    if (companyId) qb.andWhere('machine.company_id = :companyId', { companyId });
    const parada = await qb.getOne();
    if (!parada) throw new NotFoundException(`Registro de parada ${id} não encontrado`);
    return parada;
  }

  listarPorMaquina(machine_id: string, companyId: string) {
    return this.repo.createQueryBuilder('stop').innerJoin('stop.machine', 'machine').leftJoinAndSelect('stop.reason', 'reason')
      .where('stop.machine_id = :machine_id', { machine_id }).andWhere('machine.company_id = :companyId', { companyId })
      .orderBy('stop.started_at', 'DESC').getMany();
  }

  buscarParadaAberta(machine_id: string) {
    return this.repo.findOne({
      where: { machine_id, ended_at: IsNull() },
      order: { started_at: 'DESC' },
    });
  }

  async encerrar(id: string, companyId: string, reason_id?: string) {
    const parada = await this.buscarPorId(id, companyId);
    const ended_at = new Date();
    const duration_seconds = Math.round((ended_at.getTime() - parada.started_at.getTime()) / 1000);

    const updates: Partial<ParadaRegistro> = { ended_at, duration_seconds, status: StopStatus.CLOSED };
    if (reason_id) {
      updates.reason_id = reason_id;
    }

    await this.repo.update(id, updates);

    // Encerrar/resolver alertas vinculados a essa parada
    const { affected } = await this.alertRepo.update(
      { stop_id: id, status: AlertStatus.OPEN },
      { status: AlertStatus.RESOLVED, resolved_at: ended_at },
    );

    const resultado = await this.buscarPorId(id, companyId);
    this.realtime.emitToCompany(companyId, 'stop.ended', {
      stop_id: id,
      machine_id: parada.machine_id,
    });
    this.realtime.emitToCompany(companyId, 'machine.state.changed', {
      machine_id: parada.machine_id,
    });
    if (affected) {
      this.realtime.emitToCompany(companyId, 'alert.resolved', {
        stop_id: id,
        machine_id: parada.machine_id,
      });
    }
    return resultado;
  }

  async criar(
    companyId: string,
    userId: string,
    dados: { machine_id: string; reason_id: string; observation?: string; session_id?: string; started_at?: Date; possible_stop_id?: string },
  ) {
    const machine = await this.machineRepo.findOne({ where: { id: dados.machine_id, company_id: companyId } });
    if (!machine) throw new NotFoundException('Máquina inexistente ou pertence a outra empresa');
    const reason = await this.reasonRepo.findOne({ where: { id: dados.reason_id, company_id: companyId, active: true } });
    if (!reason) throw new NotFoundException('Motivo de parada inexistente ou inativo');
    const aberta = await this.buscarParadaAberta(dados.machine_id);
    if (aberta) throw new ConflictException('Já existe uma parada em aberto para esta máquina');

    const parada = await this.repo.save(
      this.repo.create({
        machine_id: dados.machine_id,
        reason_id: dados.reason_id,
        operator_id: userId,
        session_id: dados.session_id ?? null,
        possible_stop_id: dados.possible_stop_id ?? null,
        observation: dados.observation?.trim() || null,
        // Confirmação de possible_stop passa o horário real em que a
        // produção parou de ser vista, não "agora" (ver PossibleStopsService).
        started_at: dados.started_at ?? new Date(),
        status: StopStatus.OPEN,
      }),
    );

    // Se for parada não planejada, gerar alerta no banco PostgreSQL automaticamente
    let alertaCriado = false;
    if (!reason.planned) {
      await this.alertRepo.save(
        this.alertRepo.create({
          machine_id: dados.machine_id,
          stop_id: parada.id,
          type: 'UNPLANNED_STOP',
          priority: reason.default_priority || 'alta',
          message: `Parada não planejada: ${reason.label} (${dados.observation || 'Sem observações'})`,
          status: AlertStatus.OPEN,
          triggered_at: new Date(),
        }),
      );
      alertaCriado = true;
    }

    this.realtime.emitToCompany(companyId, 'stop.started', {
      stop_id: parada.id,
      machine_id: dados.machine_id,
    });
    this.realtime.emitToCompany(companyId, 'machine.state.changed', {
      machine_id: dados.machine_id,
    });
    if (alertaCriado) {
      this.realtime.emitToCompany(companyId, 'alert.created', {
        stop_id: parada.id,
        machine_id: dados.machine_id,
      });
    }

    return parada;
  }

  async atualizar(id: string, companyId: string, dados: Partial<ParadaRegistro>) {
    const parada = await this.buscarPorId(id, companyId);
    if (dados.ended_at) {
      dados.duration_seconds = Math.round((new Date(dados.ended_at).getTime() - parada.started_at.getTime()) / 1000);
      dados.status = StopStatus.CLOSED;
    }
    await this.repo.update(id, dados);
    const resultado = await this.buscarPorId(id, companyId);
    this.realtime.emitToCompany(companyId, 'machine.state.changed', {
      machine_id: parada.machine_id,
    });
    return resultado;
  }

  async remover(id: string, companyId: string) {
    const parada = await this.buscarPorId(id, companyId);
    await this.repo.delete(id);
    this.realtime.emitToCompany(companyId, 'machine.state.changed', {
      machine_id: parada.machine_id,
    });
  }
}
