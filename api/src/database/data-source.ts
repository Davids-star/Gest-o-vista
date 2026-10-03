import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './all-entities';

// Mesmo .env da raiz usado pelo app.module.ts. Usado pelo CLI de migrations
// (npm run migration:*), fora do bootstrap do Nest.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function obrigatorio(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`${nome} não definido no .env da raiz`);
  return valor;
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: obrigatorio('DB_HOST'),
  port: Number(obrigatorio('DB_PORT')),
  username: obrigatorio('DB_USERNAME'),
  password: obrigatorio('DB_PASSWORD'),
  database: obrigatorio('DB_NAME'),
  entities: ALL_ENTITIES,
  migrations: [path.resolve(__dirname, 'migrations/*.{ts,js}')],
  synchronize: false,
});
