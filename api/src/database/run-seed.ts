import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { runSeed } from './seed';
import {
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
} from './entities';

dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

import { dbConfigFromEnv } from './db-config';

const AppDataSource = new DataSource({
  ...dbConfigFromEnv(),
  entities: [
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
  ],
  synchronize: true,
});

AppDataSource.initialize()
  .then(async (ds) => {
    await runSeed(ds);
    await ds.destroy();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error seeding database:', err);
    process.exit(1);
  });
