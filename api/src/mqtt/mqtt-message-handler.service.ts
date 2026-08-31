import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../database/entities/device.entity';
import { ProductionSession, SessionStatus } from '../database/entities/production-session.entity';
import { EventsService } from '../events/events.service';
import { EventSource } from '../database/entities/production-event.entity';

@Injectable()
export class MqttMessageHandlerService {
  private readonly logger = new Logger(MqttMessageHandlerService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    @InjectRepository(ProductionSession)
    private readonly sessionRepo: Repository<ProductionSession>,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Roteia pelo sufixo do tópico: .../production (evento real de produção,
   * exige sessão ativa) ou .../heartbeat (só "estou vivo", não gera evento
   * nenhum — é o sinal usado pra diferenciar OFFLINE de parada real: ver
   * PossibleStopDetectorService).
   */
  async handleMessage(topic: string, payloadBuf: Buffer): Promise<boolean> {
    if (/^gp\/[^/]+\/heartbeat$/.test(topic)) {
      return this.handleHeartbeat(topic);
    }
    return this.handleProductionMessage(topic, payloadBuf);
  }

  async handleHeartbeat(topic: string): Promise<boolean> {
    const match = topic.match(/^gp\/([^/]+)\/heartbeat$/);
    if (!match) return false;
    const deviceIdentifier = match[1];

    const { affected } = await this.deviceRepo.update(
      { identifier: deviceIdentifier, active: true },
      { last_seen_at: new Date() },
    );
    if (!affected) {
      this.logger.warn(`Heartbeat de device desconhecido/inativo: ${deviceIdentifier}`);
      return false;
    }
    return true;
  }

  async handleProductionMessage(topic: string, payloadBuf: Buffer): Promise<boolean> {
    try {
      // 1. Extrair device_identifier do tópico: gp/{device_identifier}/production
      const match = topic.match(/^gp\/([^/]+)\/production$/);
      if (!match) {
        this.logger.warn(`Tópico MQTT inválido: ${topic}`);
        return false;
      }
      const deviceIdentifier = match[1];

      // 2. Parse do payload JSON
      let data: any;
      try {
        data = JSON.parse(payloadBuf.toString('utf-8'));
      } catch {
        this.logger.warn(`Payload MQTT não é um JSON válido no tópico ${topic}`);
        return false;
      }

      const { event_uid, quantity = 1, occurred_at } = data || {};
      if (!event_uid) {
        this.logger.warn(`Payload MQTT sem event_uid no tópico ${topic}`);
        return false;
      }

      // 3. Buscar Device -> Machine -> Company
      const device = await this.deviceRepo
        .createQueryBuilder('device')
        .innerJoinAndSelect('device.machine', 'machine')
        .where('device.identifier = :identifier', { identifier: deviceIdentifier })
        .andWhere('device.active = true')
        .getOne();

      if (!device) {
        this.logger.warn(`Device inativo ou não encontrado: ${deviceIdentifier}`);
        return false;
      }

      // Atualizar last_seen_at
      device.last_seen_at = new Date();
      await this.deviceRepo.save(device);

      const machine = device.machine;
      if (!machine || !machine.company_id) {
        this.logger.warn(`Device ${deviceIdentifier} sem máquina ou empresa associada`);
        return false;
      }

      // 4. Buscar sessão ativa para a máquina
      const activeSession = await this.sessionRepo.findOne({
        where: { machine_id: machine.id, status: SessionStatus.ACTIVE },
      });

      if (!activeSession) {
        this.logger.warn(`Nenhuma sessão ativa para a máquina ${machine.code} (${machine.id}). Evento ${event_uid} ignorado.`);
        return false;
      }

      // 5. Reutilizar EventsService para criar o evento de produção
      await this.eventsService.criarEvento(machine.company_id, {
        session_id: activeSession.id,
        machine_id: machine.id,
        event_uid,
        quantity: Number(quantity) || 1,
        occurred_at: occurred_at ? new Date(occurred_at).toISOString() : new Date().toISOString(),
        source: EventSource.SENSOR,
      });

      this.logger.log(`Evento MQTT processado com sucesso: ${event_uid} (Máquina: ${machine.code})`);
      return true;
    } catch (err: any) {
      this.logger.error(`Erro ao processar mensagem MQTT (${topic}): ${err.message}`, err.stack);
      return false;
    }
  }
}
