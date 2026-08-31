import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PossibleStop } from '../database/entities/possible-stop.entity';
import { ProductionSession } from '../database/entities/production-session.entity';
import { ProductionEvent } from '../database/entities/production-event.entity';
import { Stop } from '../database/entities/stop.entity';
import { Device } from '../database/entities/device.entity';
import { MachineState } from '../database/entities/machine-state.entity';
import { PossibleStopsService } from './possible-stops.service';
import { PossibleStopsController } from './possible-stops.controller';
import { PossibleStopDetectorService } from './possible-stop-detector.service';
import { ParadasRegistrosModule } from '../paradas-registros/paradas-registros.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PossibleStop, ProductionSession, ProductionEvent, Stop, Device, MachineState]),
    ParadasRegistrosModule,
  ],
  providers: [PossibleStopsService, PossibleStopDetectorService],
  controllers: [PossibleStopsController],
  exports: [PossibleStopsService],
})
export class PossibleStopsModule {}
