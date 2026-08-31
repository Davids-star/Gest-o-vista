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

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sistema_producao',
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
