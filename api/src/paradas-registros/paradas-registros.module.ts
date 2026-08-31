import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParadaRegistro } from './parada-registro.entity';
import { ParadasRegistrosService } from './paradas-registros.service';
import { ParadasRegistrosController } from './paradas-registros.controller';
import { Machine } from '../database/entities/machine.entity';
import { StopReason } from '../database/entities/stop-reason.entity';
import { Alert } from '../database/entities/alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParadaRegistro, Machine, StopReason, Alert])],
  providers: [ParadasRegistrosService],
  controllers: [ParadasRegistrosController],
  exports: [ParadasRegistrosService],
})
export class ParadasRegistrosModule {}
