import { Company } from './entities/company.entity';
import { User } from './entities/user.entity';
import { Machine } from './entities/machine.entity';
import { Device } from './entities/device.entity';
import { Product } from './entities/product.entity';
import { Lot } from './entities/lot.entity';
import { Shift } from './entities/shift.entity';
import { ProductionSession } from './entities/production-session.entity';
import { ProductionEvent } from './entities/production-event.entity';
import { ProductionCorrection } from './entities/production-correction.entity';
import { StopReason } from './entities/stop-reason.entity';
import { PossibleStop } from './entities/possible-stop.entity';
import { Stop } from './entities/stop.entity';
import { MachineState } from './entities/machine-state.entity';
import { TargetPlan } from './entities/target-plan.entity';
import { TargetAllocation } from './entities/target-allocation.entity';
import { Alert } from './entities/alert.entity';
import { AuditLog } from './entities/audit-log.entity';

/**
 * Lista única de entidades TypeORM — usada tanto pelo NestJS
 * (app.module.ts) quanto pelo DataSource do CLI de migrations
 * (data-source.ts), pra nunca desalinhar as duas.
 */
export const ALL_ENTITIES = [
  Company,
  User,
  Machine,
  Device,
  Product,
  Lot,
  Shift,
  ProductionSession,
  ProductionEvent,
  ProductionCorrection,
  StopReason,
  PossibleStop,
  Stop,
  MachineState,
  TargetPlan,
  TargetAllocation,
  Alert,
  AuditLog,
];
