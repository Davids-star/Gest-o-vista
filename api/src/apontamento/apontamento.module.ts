import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionSession } from '../database/entities/production-session.entity';
import { ProductionEvent } from '../database/entities/production-event.entity';
import { Stop } from '../database/entities/stop.entity';
import { AuditLog } from '../database/entities/audit-log.entity';
import { User } from '../database/entities/user.entity';
import { ApontamentoService } from './apontamento.service';
import { ApontamentoController } from './apontamento.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionSession, ProductionEvent, Stop, AuditLog, User])],
  providers: [ApontamentoService],
  controllers: [ApontamentoController],
})
export class ApontamentoModule {}
