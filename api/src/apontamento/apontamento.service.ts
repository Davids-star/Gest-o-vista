import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductionSession } from '../database/entities/production-session.entity';
import { ProductionEvent } from '../database/entities/production-event.entity';
import { Stop } from '../database/entities/stop.entity';
import { AuditLog } from '../database/entities/audit-log.entity';
import { User } from '../database/entities/user.entity';

export interface ApontamentoFiltros {
  date?: string;
  shift_id?: string;
  machine_id?: string;
  product_id?: string;
  lot_id?: string;
}

/** 'YYYY-MM-DD' de uma Date, em horário de fábrica (America/Fortaleza ==
 * America/Sao_Paulo, sem horário de verão desde 2019). */
export function formatarDataLocal(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Início/fim (00:00:00.000 e 23:59:59.999) de um dia local, já em UTC pra
 * comparar direto com colunas timestamptz. */
export function limitesDoDia(dataStr: string): { inicio: Date; fim: Date } {
  return {
    inicio: new Date(`${dataStr}T00:00:00.000-03:00`),
    fim: new Date(`${dataStr}T23:59:59.999-03:00`),
  };
}

/** Duração de uma parada em segundos — se ainda estiver aberta, conta até
 * agora (parada "ao vivo" continua contando no apontamento do turno). */
export function duracaoParada(stop: Stop, agora: Date): number {
  if (stop.duration_seconds != null) return stop.duration_seconds;
  return Math.max(0, Math.round((agora.getTime() - stop.started_at.getTime()) / 1000));
}

function mapParada(stop: Stop, agora: Date) {
  return {
    id: stop.id,
    machine_id: stop.machine_id,
    session_id: stop.session_id,
    started_at: stop.started_at,
    ended_at: stop.ended_at,
    duration_seconds: duracaoParada(stop, agora),
    status: stop.status,
    observation: stop.observation,
    reason: stop.reason ? {
      id: stop.reason.id,
      code: stop.reason.code,
      label: stop.reason.label,
      priority: stop.reason.default_priority,
      planned: stop.reason.planned,
    } : null,
  };
}

@Injectable()
export class ApontamentoService {
  constructor(
    @InjectRepository(ProductionSession)
    private readonly sessionRepo: Repository<ProductionSession>,
    @InjectRepository(ProductionEvent)
    private readonly eventRepo: Repository<ProductionEvent>,
    @InjectRepository(Stop)
    private readonly stopRepo: Repository<Stop>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async obter(companyId: string, filtros: ApontamentoFiltros) {
    const dataStr = filtros.date || formatarDataLocal(new Date());
    const { inicio, fim } = limitesDoDia(dataStr);
    const agora = new Date();

    // Sessão "pertence" ao dia/turno em que ela COMEÇOU — uma sessão que
    // atravessa a meia-noite não é cortada em duas, fica inteira no turno
    // em que iniciou (convenção normal de fábrica).
    const qb = this.sessionRepo
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.machine', 'machine')
      .innerJoinAndSelect('session.product', 'product')
      .innerJoinAndSelect('session.lot', 'lot')
      .innerJoinAndSelect('session.operator', 'operator')
      .leftJoinAndSelect('session.shift', 'shift')
      .where('machine.company_id = :companyId', { companyId })
      .andWhere('session.started_at BETWEEN :inicio AND :fim', { inicio, fim });

    if (filtros.shift_id) qb.andWhere('session.shift_id = :shiftId', { shiftId: filtros.shift_id });
    if (filtros.machine_id) qb.andWhere('session.machine_id = :machineId', { machineId: filtros.machine_id });
    if (filtros.product_id) qb.andWhere('session.product_id = :productId', { productId: filtros.product_id });
    if (filtros.lot_id) qb.andWhere('session.lot_id = :lotId', { lotId: filtros.lot_id });

    const sessoes = await qb.orderBy('session.started_at', 'ASC').getMany();

    const filtrosResposta = {
      date: dataStr,
      shift_id: filtros.shift_id ?? null,
      machine_id: filtros.machine_id ?? null,
      product_id: filtros.product_id ?? null,
      lot_id: filtros.lot_id ?? null,
    };

    if (!sessoes.length) {
      return {
        filtros: filtrosResposta,
        resumo: {
          producao: 0,
          tempo_produzido_segundos: 0,
          tempo_parado_segundos: 0,
          paradas: 0,
          sessoes: 0,
          operadores: 0,
          lotes: 0,
          produtos: [],
        },
        tempo_parado_por_motivo: [],
        sessoes: [],
        paradas: [],
      };
    }

    const sessionIds = sessoes.map((s) => s.id);
    const machineIds = [...new Set(sessoes.map((s) => s.machine_id))];

    // Produção real por sessão — respeita production_corrections (mesma
    // regra do EventsService.totaisPorSessao, ver comentário lá).
    const producaoRows = await this.eventRepo
      .createQueryBuilder('event')
      .leftJoin('production_corrections', 'correction', 'correction.event_id = event.id')
      .select('event.session_id', 'session_id')
      .addSelect('COALESCE(SUM(COALESCE(correction.corrected_quantity, event.quantity)), 0)', 'total')
      .where('event.session_id IN (:...sessionIds)', { sessionIds })
      .groupBy('event.session_id')
      .getRawMany<{ session_id: string; total: string }>();
    const producaoPorSessao: Record<string, number> = {};
    for (const r of producaoRows) producaoPorSessao[r.session_id] = Number(r.total);

    // Paradas ligadas a essas sessões...
    const paradasComSessao = await this.stopRepo.find({
      where: { session_id: In(sessionIds) },
      relations: { reason: true },
      order: { started_at: 'ASC' },
    });
    // ...mais paradas da(s) máquina(s) no dia que por algum motivo não têm
    // session_id (ex.: registro manual antigo) — não ficam de fora do total
    // do dia só por causa disso.
    const paradasSemSessao = await this.stopRepo
      .createQueryBuilder('stop')
      .leftJoinAndSelect('stop.reason', 'reason')
      .where('stop.machine_id IN (:...machineIds)', { machineIds })
      .andWhere('stop.session_id IS NULL')
      .andWhere('stop.started_at BETWEEN :inicio AND :fim', { inicio, fim })
      .getMany();

    const todasParadas = [...paradasComSessao, ...paradasSemSessao];

    // Histórico de troca de operador (audit_logs) — pra reconstituir "quem
    // operou quando" dentro da sessão (troca de operador NÃO cria sessão nova).
    const trocasOperador = sessionIds.length
      ? await this.auditRepo.find({
        where: { entity: 'production_sessions', entity_id: In(sessionIds), action: 'CHANGE_OPERATOR' },
        order: { created_at: 'ASC' },
      })
      : [];
    const idsOperadoresAntigos = trocasOperador
      .map((t) => (t.old_value as any)?.operator_id)
      .filter(Boolean);
    const usuariosAntigos = idsOperadoresAntigos.length
      ? await this.userRepo.find({ where: { id: In(idsOperadoresAntigos) } })
      : [];
    const nomePorOperadorId = new Map(usuariosAntigos.map((u) => [u.id, u.name]));

    const sessoesDetalhadas = sessoes.map((session) => {
      const paradasDaSessao = paradasComSessao.filter((p) => p.session_id === session.id);
      const tempoParadoSeg = paradasDaSessao.reduce((acc, p) => acc + duracaoParada(p, agora), 0);
      const fimEfetivo = session.ended_at ?? agora;
      const tempoTotalSeg = Math.max(0, (fimEfetivo.getTime() - session.started_at.getTime()) / 1000);
      const tempoProduzidoSeg = Math.max(0, tempoTotalSeg - tempoParadoSeg);

      const trocasDaSessao = trocasOperador.filter((t) => t.entity_id === session.id);
      const historicoOperadores = trocasDaSessao.length
        ? [
          {
            at: session.started_at,
            operator_id: (trocasDaSessao[0].old_value as any)?.operator_id ?? null,
            operator_name: nomePorOperadorId.get((trocasDaSessao[0].old_value as any)?.operator_id) || '—',
          },
          ...trocasDaSessao.map((t) => ({
            at: t.created_at,
            operator_id: (t.new_value as any)?.operator_id ?? null,
            operator_name: (t.new_value as any)?.operator_name || '—',
          })),
        ]
        : [{ at: session.started_at, operator_id: session.operator_id, operator_name: session.operator.name }];

      return {
        id: session.id,
        machine: { id: session.machine.id, code: session.machine.code, name: session.machine.name },
        product: { id: session.product.id, name: session.product.name },
        lot: { id: session.lot.id, code: session.lot.code },
        shift: session.shift ? { id: session.shift.id, name: session.shift.name } : null,
        operator: { id: session.operator.id, name: session.operator.name },
        operadores_historico: historicoOperadores,
        started_at: session.started_at,
        ended_at: session.ended_at,
        status: session.status,
        producao: producaoPorSessao[session.id] || 0,
        tempo_total_segundos: Math.round(tempoTotalSeg),
        tempo_produzido_segundos: Math.round(tempoProduzidoSeg),
        tempo_parado_segundos: Math.round(tempoParadoSeg),
        paradas: paradasDaSessao.map((p) => mapParada(p, agora)),
      };
    });

    const resumo = {
      producao: sessoesDetalhadas.reduce((a, s) => a + s.producao, 0),
      tempo_produzido_segundos: sessoesDetalhadas.reduce((a, s) => a + s.tempo_produzido_segundos, 0),
      tempo_parado_segundos: todasParadas.reduce((a, p) => a + duracaoParada(p, agora), 0),
      paradas: todasParadas.length,
      sessoes: sessoes.length,
      operadores: new Set(sessoes.map((s) => s.operator_id)).size,
      lotes: new Set(sessoes.map((s) => s.lot_id)).size,
      produtos: [...new Map(sessoes.map((s) => [s.product_id, { id: s.product.id, name: s.product.name }])).values()],
    };

    const porMotivo = new Map<string, { reason_id: string | null; label: string; segundos: number }>();
    for (const p of todasParadas) {
      const key = p.reason_id || 'sem_motivo';
      const atual = porMotivo.get(key) || { reason_id: p.reason_id, label: p.reason?.label || 'Sem motivo', segundos: 0 };
      atual.segundos += duracaoParada(p, agora);
      porMotivo.set(key, atual);
    }

    return {
      filtros: filtrosResposta,
      resumo,
      tempo_parado_por_motivo: [...porMotivo.values()].sort((a, b) => b.segundos - a.segundos),
      sessoes: sessoesDetalhadas,
      paradas: todasParadas
        .map((p) => mapParada(p, agora))
        .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()),
    };
  }
}
