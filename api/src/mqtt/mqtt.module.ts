import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../database/entities/device.entity';
import { ProductionSession } from '../database/entities/production-session.entity';
import { EventsModule } from '../events/events.module';
import { MqttService } from './mqtt.service';
import { MqttMessageHandlerService } from './mqtt-message-handler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, ProductionSession]),
    EventsModule,
  ],
  providers: [MqttService, MqttMessageHandlerService],
  exports: [MqttService, MqttMessageHandlerService],
})
export class MqttModule {}
