import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PossibleStop, PossibleStopStatus } from '../database/entities/possible-stop.entity';
import { ParadasRegistrosService } from '../paradas-registros/paradas-registros.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class PossibleStopsService {
  constructor(
    @InjectRepository(PossibleStop)
    private readonly repo: Repository<PossibleStop>,
    private readonly paradasRegistrosService: ParadasRegistrosService,
    private readonly realtime: RealtimeGateway,
  ) {}

  listar(companyId: string, status?: PossibleStopStatus, machineId?: string) {
    const qb = this.repo.createQueryBuilder('possible_stop')
      .innerJoin('possible_stop.machine', 'machine')
      .addSelect(['machine.id', 'machine.code', 'machine.name'])
      .leftJoinAndSelect('possible_stop.session', 'session')
      .where('machine.company_id = :companyId', { companyId });

    if (status) qb.andWhere('possible_stop.status = :status', { status });
    if (machineId) qb.andWhere('possible_stop.machine_id = :machineId', { machineId });

    return qb.orderBy('possible_stop.detected_at', 'DESC').getMany();
  }

  async buscarPorId(id: string, companyId: string) {
    const possivel = await this.repo.createQueryBuilder('possible_stop')
      .innerJoin('possible_stop.machine', 'machine')
      .addSelect(['machine.id', 'machine.code', 'machine.name', 'machine.company_id'])
      .leftJoinAndSelect('possible_stop.session', 'session')
      .where('possible_stop.id = :id', { id })
      .andWhere('machine.company_id = :companyId', { companyId })
      .getOne();
    if (!possivel) throw new NotFoundException(`Possível parada ${id} não encontrada`);
    return possivel;
  }

  /**
   * POSSIBLE_STOP → CONFIRMAR → STOP real. A parada criada usa o horário em
   * que a produção realmente parou de ser vista (detected_at - duration),
   * não "agora" — senão o tempo parado ficaria sub-contado no apontamento.
   */
  async confirmar(
    id: string,
    companyId: string,
    userId: string,
    dto: { reason_id: string; observation?: string },
  ) {
    const possivel = await this.buscarPorId(id, companyId);
    if (possivel.status !== PossibleStopStatus.PENDING) {
      throw new ConflictException(`Possível parada já foi ${possivel.status === PossibleStopStatus.CONFIRMED ? 'confirmada' : 'descartada'}`);
    }

    const inicioReal = new Date(possivel.detected_at.getTime() - possivel.duration_seconds * 1000);

    const stop = await this.paradasRegistrosService.criar(companyId, userId, {
      machine_id: possivel.machine_id,
      reason_id: dto.reason_id,
      observation: dto.observation || `Parada confirmada a partir de detecção automática (sem produção por ${Math.round(possivel.duration_seconds / 60)} min)`,
      session_id: possivel.session_id ?? undefined,
      started_at: inicioReal,
      possible_stop_id: possivel.id,
    });

    possivel.status = PossibleStopStatus.CONFIRMED;
    possivel.resolved_at = new Date();
    await this.repo.save(possivel);

    this.realtime.emitToCompany(companyId, 'possible_stop.resolved', {
      possible_stop_id: possivel.id,
      machine_id: possivel.machine_id,
      status: possivel.status,
    });

    return { possible_stop: possivel, stop };
  }

  async descartar(id: string, companyId: string) {
    const possivel = await this.buscarPorId(id, companyId);
    if (possivel.status !== PossibleStopStatus.PENDING) {
      throw new ConflictException(`Possível parada já foi ${possivel.status === PossibleStopStatus.CONFIRMED ? 'confirmada' : 'descartada'}`);
    }

    possivel.status = PossibleStopStatus.DISMISSED;
    possivel.resolved_at = new Date();
    await this.repo.save(possivel);

    this.realtime.emitToCompany(companyId, 'possible_stop.resolved', {
      possible_stop_id: possivel.id,
      machine_id: possivel.machine_id,
      status: possivel.status,
    });

    return possivel;
  }
}
