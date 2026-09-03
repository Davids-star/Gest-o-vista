import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ProductionSession, SessionStatus } from '../database/entities/production-session.entity';
import { ProductionEvent } from '../database/entities/production-event.entity';
import { PossibleStop, PossibleStopStatus } from '../database/entities/possible-stop.entity';
import { Stop } from '../database/entities/stop.entity';
import { Device } from '../database/entities/device.entity';
import { MachineState, MachineStateEnum } from '../database/entities/machine-state.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  DEVICE_OFFLINE_SECONDS,
  STOP_DETECTION_SECONDS,
  STOP_DETECTOR_POLL_INTERVAL_MS,
} from '../common/constants/stop-detection.constants';

/**
 * Varre periodicamente as sessões de produção ativas e cria um
 * `possible_stop` quando uma máquina fica tempo demais sem evento de
 * produção. Diferencia isso de "OFFLINE" (dispositivo sem se comunicar —
 * ver heartbeat MQTT em mqtt-message-handler.service.ts): falta de
 * comunicação NUNCA vira possible_stop sozinha.
 *
 * Também cancela sozinha: se a produção volta (chega evento novo) antes de
 * alguém confirmar ou descartar a suspeita pendente, ela mesma marca como
 * descartada — não precisa de ação manual pra "falso alarme" que se
 * resolveu por conta própria.
 */
@Injectable()
export class PossibleStopDetectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PossibleStopDetectorService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private rodando = false;

  constructor(
    @InjectRepository(ProductionSession)
    private readonly sessionRepo: Repository<ProductionSession>,
    @InjectRepository(ProductionEvent)
    private readonly eventRepo: Repository<ProductionEvent>,
    @InjectRepository(PossibleStop)
    private readonly possibleStopRepo: Repository<PossibleStop>,
    @InjectRepository(Stop)
    private readonly stopRepo: Repository<Stop>,
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    @InjectRepository(MachineState)
    private readonly machineStateRepo: Repository<MachineState>,
    private readonly realtime: RealtimeGateway,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.verificarTodas(), STOP_DETECTOR_POLL_INTERVAL_MS);
    this.logger.log(
      `Detector de parada iniciado (varredura a cada ${STOP_DETECTOR_POLL_INTERVAL_MS / 1000}s, ` +
      `limite de ${STOP_DETECTION_SECONDS}s sem produção, offline após ${DEVICE_OFFLINE_SECONDS}s sem comunicação)`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async verificarTodas() {
    // Evita sobreposição se uma varredura anterior ainda estiver rodando
    // (ex.: banco lento) — nunca roda duas ao mesmo tempo.
    if (this.rodando) return;
    this.rodando = true;
    try {
      const sessoesAtivas = await this.sessionRepo.find({
        where: { status: SessionStatus.ACTIVE },
        relations: { machine: true },
      });

      for (const sessao of sessoesAtivas) {
        try {
          await this.verificarSessao(sessao);
        } catch (err: any) {
          this.logger.error(`Erro verificando sessão ${sessao.id}: ${err.message}`, err.stack);
        }
      }
    } finally {
      this.rodando = false;
    }
  }

  private async verificarSessao(sessao: ProductionSession) {
    const agora = new Date();
    const companyId = sessao.machine.company_id;

    // 1. Dispositivo da máquina (se houver) decide ONLINE x OFFLINE.
    // Sem device cadastrado pra essa máquina, não dá pra saber — trata como
    // online (não bloqueia a detecção de parada, só não conseguimos
    // diferenciar offline nesse caso específico).
    const device = await this.deviceRepo.findOne({ where: { machine_id: sessao.machine_id, active: true } });
    const offline = Boolean(
      device?.last_seen_at &&
      (agora.getTime() - device.last_seen_at.getTime()) / 1000 > DEVICE_OFFLINE_SECONDS,
    );

    if (offline) {
      await this.registrarEstado(sessao.machine_id, MachineStateEnum.OFFLINE, companyId);
      return; // falta de comunicação != parada de produção — não cria possible_stop
    }

    // 2. Já existe uma parada REAL aberta pra essa máquina? Então o
    // operador já resolveu manualmente — não precisa de detecção automática.
    const paradaAberta = await this.stopRepo.findOne({ where: { machine_id: sessao.machine_id, ended_at: IsNull() } });
    if (paradaAberta) return;

    // 3. Último evento de produção desta sessão (ou o início da sessão, se
    // ainda não produziu nada) — calculado antes de olhar o possible_stop
    // pendente, porque precisamos comparar os dois abaixo.
    const ultimoEvento = await this.eventRepo.findOne({
      where: { session_id: sessao.id },
      order: { occurred_at: 'DESC' },
    });
    const referencia = ultimoEvento?.occurred_at ?? sessao.started_at;
    const segundosSemProducao = (agora.getTime() - referencia.getTime()) / 1000;

    // 4. Já existe um possible_stop pendente pra essa máquina?
    const jaPendente = await this.possibleStopRepo.findOne({
      where: { machine_id: sessao.machine_id, status: PossibleStopStatus.PENDING },
    });
    if (jaPendente) {
      // A produção voltou sozinha (chegou evento novo) antes de alguém
      // confirmar ou descartar — cancela a suspeita automaticamente, ela
      // mesma sabe que não era uma parada de verdade.
      if (segundosSemProducao < STOP_DETECTION_SECONDS) {
        jaPendente.status = PossibleStopStatus.DISMISSED;
        jaPendente.resolved_at = agora;
        await this.possibleStopRepo.save(jaPendente);
        this.realtime.emitToCompany(companyId, 'possible_stop.resolved', {
          possible_stop_id: jaPendente.id,
          machine_id: sessao.machine_id,
          status: jaPendente.status,
        });
        this.logger.log(
          `Possível parada cancelada automaticamente: máquina ${sessao.machine.code} voltou a produzir sozinha`,
        );
        await this.registrarEstado(sessao.machine_id, MachineStateEnum.RUNNING, companyId);
      }
      // Continua pendente (ainda sem produção) ou acabou de ser cancelada
      // agora mesmo — nos dois casos não cria outra em cima dela.
      return;
    }

    if (segundosSemProducao < STOP_DETECTION_SECONDS) {
      await this.registrarEstado(sessao.machine_id, MachineStateEnum.RUNNING, companyId);
      return;
    }

    const possivel = await this.possibleStopRepo.save(
      this.possibleStopRepo.create({
        machine_id: sessao.machine_id,
        session_id: sessao.id,
        detected_at: agora,
        duration_seconds: Math.round(segundosSemProducao),
        status: PossibleStopStatus.PENDING,
      }),
    );

    this.realtime.emitToCompany(companyId, 'possible_stop.created', {
      possible_stop_id: possivel.id,
      machine_id: sessao.machine_id,
    });
    this.logger.log(`Possível parada detectada: máquina ${sessao.machine.code} sem produção há ${Math.round(segundosSemProducao)}s`);
  }

  /** Só grava machine_states quando o estado realmente muda — não spamma a
   * tabela a cada varredura enquanto nada muda. */
  private async registrarEstado(machineId: string, estado: MachineStateEnum, companyId: string) {
    const ultimo = await this.machineStateRepo.findOne({
      where: { machine_id: machineId },
      order: { changed_at: 'DESC' },
    });
    if (ultimo?.state === estado) return;

    await this.machineStateRepo.save(
      this.machineStateRepo.create({ machine_id: machineId, state: estado, changed_at: new Date() }),
    );
    this.realtime.emitToCompany(companyId, 'machine.state.changed', { machine_id: machineId });
  }
}
