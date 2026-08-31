import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SimpleMqttClient } from './simple-mqtt.client';
import { SimpleMqttBroker } from './simple-mqtt.broker';
import { MqttMessageHandlerService } from './mqtt-message-handler.service';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: SimpleMqttClient | null = null;
  private broker: SimpleMqttBroker | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly handler: MqttMessageHandlerService,
  ) {}

  async onModuleInit() {
    const host = this.configService.get<string>('MQTT_HOST', 'localhost');
    const port = Number(this.configService.get<number>('MQTT_PORT', 1883));

    // Iniciar broker embutido caso a porta esteja livre
    this.broker = new SimpleMqttBroker();
    await this.broker.start(port);

    this.client = new SimpleMqttClient(host, port);

    this.client.on('connect', () => {
      this.logger.log(`Conectado ao MQTT broker em ${host}:${port}`);
      this.client?.subscribe('gp/+/production');
      this.client?.subscribe('gp/+/heartbeat');
      this.logger.log(`Inscrito nos tópicos: gp/+/production, gp/+/heartbeat`);
    });

    this.client.on('message', async (topic, payload) => {
      await this.handler.handleMessage(topic, payload);
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Erro na conexão MQTT: ${err.message}`);
    });

    try {
      await this.client.connect();
    } catch (err: any) {
      this.logger.warn(`Não foi possível conectar ao broker MQTT na inicialização (${err.message}). O sistema continuará operando via HTTP.`);
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
    if (this.broker) {
      this.broker.stop();
      this.broker = null;
    }
  }
}
