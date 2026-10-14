import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../database/entities/device.entity';
import { Machine } from '../database/entities/machine.entity';
import { Company } from '../database/entities/company.entity';
import { PareamentoController } from './pareamento.controller';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Device, Machine, Company])],
  providers: [DevicesService],
  controllers: [DevicesController, PareamentoController],
  exports: [DevicesService],
})
export class DevicesModule {}
