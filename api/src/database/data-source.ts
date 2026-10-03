import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './all-entities';
import { dbConfigFromEnv } from './db-config';

// Mesmo .env da raiz usado pelo app.module.ts. Usado pelo CLI de migrations
// (npm run migration:*), fora do bootstrap do Nest.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const AppDataSource = new DataSource({
  ...dbConfigFromEnv(),
  entities: ALL_ENTITIES,
  migrations: [path.resolve(__dirname, 'migrations/*.{ts,js}')],
  synchronize: false,
});
