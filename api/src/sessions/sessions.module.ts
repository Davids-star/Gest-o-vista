import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionSession } from '../database/entities/production-session.entity';
import { Machine } from '../database/entities/machine.entity';
import { Product } from '../database/entities/product.entity';
import { Lot } from '../database/entities/lot.entity';
import { User } from '../database/entities/user.entity';
import { AuditLog } from '../database/entities/audit-log.entity';
import { Stop } from '../database/entities/stop.entity';
import { Alert } from '../database/entities/alert.entity';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { TotemController } from './totem.controller';
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionSession,
      Machine,
      Product,
      Lot,
      User,
      AuditLog,
      Stop,
      Alert,
    ]),
    ShiftsModule,
  ],
  providers: [SessionsService],
  controllers: [SessionsController, TotemController],
  exports: [SessionsService],
})
export class SessionsModule {}
