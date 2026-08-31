import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionEvent, EventSource } from '../database/entities/production-event.entity';
import { ProductionSession, SessionStatus } from '../database/entities/production-session.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(ProductionEvent)
    private readonly eventRepo: Repository<ProductionEvent>,
    @InjectRepository(ProductionSession)
    private readonly sessionRepo: Repository<ProductionSession>,
    private readonly realtime: RealtimeGateway,
  ) {}

  async criarEvento(companyId: string, dto: CreateEventDto) {
    // 1. Buscar sessão e validar máquina e empresa
    const session = await this.sessionRepo
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.machine', 'machine')
      .where('session.id = :sessionId', { sessionId: dto.session_id })
      .andWhere('machine.company_id = :companyId', { companyId })
      .getOne();

    if (!session) {
      throw new NotFoundException('Sessão inexistente ou pertence a outra empresa');
    }

    // 2. Validar se a máquina corresponde à sessão
    if (session.machine_id !== dto.machine_id) {
      throw new BadRequestException('A máquina informada não corresponde à máquina da sessão');
    }

    // 3. Validar se a sessão está ativa (não encerrada)
    if (session.status === SessionStatus.CLOSED) {
      throw new BadRequestException('Não é possível registrar eventos em uma sessão encerrada');
    }

    // 4. Idempotência: verificar se event_uid já foi processado
    const existente = await this.eventRepo.findOne({
      where: { event_uid: dto.event_uid },
    });

    if (existente) {
      return existente; // Reenvio ignorado, retorna o evento original
    }

    // 5. Criar e salvar novo evento
    const evento = this.eventRepo.create({
      session_id: dto.session_id,
      machine_id: dto.machine_id,
      event_uid: dto.event_uid,
      quantity: dto.quantity,
      occurred_at: dto.occurred_at ? new Date(dto.occurred_at) : new Date(),
      received_at: new Date(),
      source: dto.source || EventSource.SIMULATOR,
    });

    let salvo: ProductionEvent;
    try {
      salvo = await this.eventRepo.save(evento);
    } catch (err: any) {
      if (err.code === '23505') {
        // Tratar concorrência no event_uid caso chegue simultaneamente
        const eventoConcorrente = await this.eventRepo.findOne({
          where: { event_uid: dto.event_uid },
        });
        if (eventoConcorrente) return eventoConcorrente;
      }
      throw err;
    }

    this.realtime.emitToCompany(companyId, 'production.updated', {
      session_id: dto.session_id,
      machine_id: dto.machine_id,
    });
    return salvo;
  }

  /**
   * Soma real (SQL, sem paginação) das quantidades por sessão. `listarEventos`
   * é paginado (`limit`) pra listagem — NUNCA usar a soma de uma página de
   * eventos como "total produzido": uma sessão longa passa fácil de 100
   * eventos e o contador ficaria travado no tamanho da página.
   */
  async totaisPorSessao(companyId: string, sessionId?: string): Promise<Record<string, number>> {
    const qb = this.eventRepo
      .createQueryBuilder('event')
      .innerJoin('event.machine', 'machine')
      // Se o evento tiver uma correção (production_corrections), o valor
      // corrigido vale — não o original. Sem isso, uma correção feita pelo
      // supervisor nunca refletiria no total exibido.
      .leftJoin('production_corrections', 'correction', 'correction.event_id = event.id')
      .where('machine.company_id = :companyId', { companyId })
      .select('event.session_id', 'session_id')
      .addSelect('COALESCE(SUM(COALESCE(correction.corrected_quantity, event.quantity)), 0)', 'total')
      .groupBy('event.session_id');

    if (sessionId) qb.andWhere('event.session_id = :sessionId', { sessionId });

    const rows = await qb.getRawMany<{ session_id: string; total: string }>();
    const totais: Record<string, number> = {};
    for (const row of rows) totais[row.session_id] = Number(row.total);
    return totais;
  }

  async listarEventos(companyId: string, query: QueryEventsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .innerJoinAndSelect('event.machine', 'machine')
      .innerJoinAndSelect('event.session', 'session')
      .where('machine.company_id = :companyId', { companyId });

    if (query.session_id) {
      qb.andWhere('event.session_id = :sessionId', { sessionId: query.session_id });
    }

    if (query.machine_id) {
      qb.andWhere('event.machine_id = :machineId', { machineId: query.machine_id });
    }

    if (query.from) {
      qb.andWhere('event.occurred_at >= :from', { from: new Date(query.from) });
    }

    if (query.to) {
      qb.andWhere('event.occurred_at <= :to', { to: new Date(query.to) });
    }

    qb.orderBy('event.occurred_at', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
