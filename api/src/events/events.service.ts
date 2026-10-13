import { Injectable, NotFoundException, BadRequestException, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductionEvent, EventSource } from '../database/entities/production-event.entity';
import { ProductionSession, SessionStatus } from '../database/entities/production-session.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

/**
 * Origem de um evento em termos da origem do sensor da máquina.
 * 'sensor' (serve.py) e 'simulator' são o caminho por cabo/MQTT; 'bluetooth' é o tablet.
 * 'manual' (correção do supervisor) não pertence a nenhuma origem de sensor.
 */
export function origemDoEvento(source: string): 'cable' | 'bluetooth' | null {
  if (source === 'bluetooth') return 'bluetooth';
  if (source === 'sensor' || source === 'simulator') return 'cable';
  return null;
}

/** Recusa evento de origem diferente da configurada para a máquina. */
export function assertOrigemPermitida(configurada: string | null | undefined, source: string) {
  if (!configurada) return;
  const origem = origemDoEvento(source);
  if (!origem || origem === configurada) return;
  throw new BadRequestException(
    `Máquina configurada para sensor "${configurada}": evento de "${origem}" recusado para não contar a mesma peça duas vezes`,
  );
}

/** Resultado de um evento dentro de um lote. 'rejected' é definitivo (não adianta reenviar). */
export interface ResultadoEventoLote {
  event_uid: string;
  status: 'accepted' | 'duplicate' | 'rejected';
  error?: string;
}

/** Janela de agrupamento do aviso em tempo real (ms). */
const JANELA_AVISO_PRODUCAO_MS = 300;

@Injectable()
export class EventsService implements OnModuleDestroy {
  // Um evento por peça (MQTT) ou um lote de 200 gerava um 'production.updated'
  // para cada um, e cada tela respondia com um GET /totals — uma tempestade de
  // requisições. Agora os avisos da mesma sessão dentro da janela viram UM só.
  private readonly avisosPendentes = new Map<string, NodeJS.Timeout>();

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

    // 2b. Origem do sensor da máquina: a outra origem não pode contar
    assertOrigemPermitida(session.machine.sensor_source, dto.source || EventSource.SIMULATOR);

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

    this.avisarProducao(companyId, dto.session_id, dto.machine_id);
    return salvo;
  }

  onModuleDestroy() {
    for (const timer of this.avisosPendentes.values()) clearTimeout(timer);
    this.avisosPendentes.clear();
  }

  private avisarProducao(companyId: string, sessionId: string, machineId: string) {
    if (this.avisosPendentes.has(sessionId)) return;
    const timer = setTimeout(() => {
      this.avisosPendentes.delete(sessionId);
      this.realtime.emitToCompany(companyId, 'production.updated', { session_id: sessionId, machine_id: machineId });
    }, JANELA_AVISO_PRODUCAO_MS);
    timer.unref?.();
    this.avisosPendentes.set(sessionId, timer);
  }

  /**
   * Recebe vários eventos de uma vez (fila do tablet). Faz 3 consultas no total
   * (sessões, uids já existentes, soma) e UM insert, em vez de ~5 consultas por
   * evento. Idempotente por event_uid; cada evento tem seu próprio resultado,
   * então um evento ruim não derruba o resto do lote.
   * Devolve também o total real por sessão, para o aparelho atualizar o
   * contador de uma vez, sem esperar outra requisição.
   */
  async criarEventosEmLote(companyId: string, eventos: CreateEventDto[]) {
    const resultados = new Map<string, ResultadoEventoLote>();
    const unicos = new Map<string, CreateEventDto>();
    for (const dto of eventos) {
      if (unicos.has(dto.event_uid)) {
        resultados.set(dto.event_uid, { event_uid: dto.event_uid, status: 'duplicate' });
      } else {
        unicos.set(dto.event_uid, dto);
      }
    }

    const sessionIds = [...new Set([...unicos.values()].map((e) => e.session_id))];
    const sessoes = await this.sessionRepo
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.machine', 'machine')
      .where('session.id IN (:...sessionIds)', { sessionIds })
      .andWhere('machine.company_id = :companyId', { companyId })
      .getMany();
    const sessaoPorId = new Map(sessoes.map((s) => [s.id, s]));

    const existentes = await this.eventRepo.find({
      select: { event_uid: true },
      where: { event_uid: In([...unicos.keys()]) },
    });
    const jaSalvos = new Set(existentes.map((e) => e.event_uid));

    const agora = new Date();
    const novos: Partial<ProductionEvent>[] = [];
    const sessoesAfetadas = new Map<string, string>(); // session_id → machine_id

    for (const dto of unicos.values()) {
      const rejeitar = (error: string) => resultados.set(dto.event_uid, { event_uid: dto.event_uid, status: 'rejected', error });
      const sessao = sessaoPorId.get(dto.session_id);
      if (!sessao) { rejeitar('Sessão inexistente ou pertence a outra empresa'); continue; }
      if (sessao.machine_id !== dto.machine_id) { rejeitar('A máquina informada não corresponde à máquina da sessão'); continue; }
      try {
        assertOrigemPermitida(sessao.machine.sensor_source, dto.source || EventSource.SIMULATOR);
      } catch (err) {
        rejeitar((err as Error).message);
        continue;
      }
      // Reenvio de evento já salvo vale mesmo se a sessão já foi encerrada.
      if (jaSalvos.has(dto.event_uid)) {
        resultados.set(dto.event_uid, { event_uid: dto.event_uid, status: 'duplicate' });
        continue;
      }
      if (sessao.status === SessionStatus.CLOSED) { rejeitar('Não é possível registrar eventos em uma sessão encerrada'); continue; }

      novos.push({
        session_id: dto.session_id,
        machine_id: dto.machine_id,
        event_uid: dto.event_uid,
        quantity: dto.quantity,
        occurred_at: dto.occurred_at ? new Date(dto.occurred_at) : agora,
        received_at: agora,
        source: dto.source || EventSource.SIMULATOR,
      });
      sessoesAfetadas.set(dto.session_id, dto.machine_id);
      resultados.set(dto.event_uid, { event_uid: dto.event_uid, status: 'accepted' });
    }

    if (novos.length) {
      // ON CONFLICT DO NOTHING: concorrência no mesmo event_uid não derruba o lote.
      await this.eventRepo.createQueryBuilder().insert().values(novos).orIgnore().execute();
      for (const [sessionId, machineId] of sessoesAfetadas) this.avisarProducao(companyId, sessionId, machineId);
    }

    // Totais de todas as sessões do lote (inclusive as de reenvio) numa consulta só.
    const totals = sessionIds.length ? await this.totaisPorSessao(companyId, sessionIds) : {};

    return { results: eventos.map((e) => resultados.get(e.event_uid)!), totals };
  }

  /**
   * Soma real (SQL, sem paginação) das quantidades por sessão. `listarEventos`
   * é paginado (`limit`) pra listagem — NUNCA usar a soma de uma página de
   * eventos como "total produzido": uma sessão longa passa fácil de 100
   * eventos e o contador ficaria travado no tamanho da página.
   */
  async totaisPorSessao(companyId: string, sessionId?: string | string[]): Promise<Record<string, number>> {
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

    if (Array.isArray(sessionId)) qb.andWhere('event.session_id IN (:...sessionIds)', { sessionIds: sessionId });
    else if (sessionId) qb.andWhere('event.session_id = :sessionId', { sessionId });

    const rows = await qb.getRawMany<{ session_id: string; total: string }>();
    const totais: Record<string, number> = {};
    for (const row of rows) totais[row.session_id] = Number(row.total);
    return totais;
  }

  async listarEventos(companyId: string, query: QueryEventsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 500) : 10;
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
