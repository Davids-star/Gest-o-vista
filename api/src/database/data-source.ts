import 'dotenv/config';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './all-entities';

// Mesmo esquema de env do app.module.ts: database/.env (credenciais do
// Postgres, pasta dedicada) sobrepondo api/.env (segredos de aplicação).
// Usado apenas pelo CLI de migrations (npm run migration:*), fora do
// bootstrap do Nest.
dotenv.config({ path: path.resolve(__dirname, '../../../database/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sistema_producao',
  entities: ALL_ENTITIES,
  migrations: [path.resolve(__dirname, 'migrations/*.{ts,js}')],
  synchronize: false,
});
