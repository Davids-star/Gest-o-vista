import { dbConfigFromEnv } from './db-config';

describe('dbConfigFromEnv', () => {
  it('lê tudo de DATABASE_URL e liga SSL com sslmode=require', () => {
    const cfg = dbConfigFromEnv({
      DATABASE_URL: 'postgresql://usuario:senha%40forte@host.neon.tech/meubanco?sslmode=require',
    } as NodeJS.ProcessEnv);
    expect(cfg).toMatchObject({
      type: 'postgres',
      host: 'host.neon.tech',
      port: 5432,
      username: 'usuario',
      password: 'senha@forte',
      database: 'meubanco',
      ssl: { rejectUnauthorized: true },
    });
  });

  it('DATABASE_URL sem sslmode e sem DB_SSL não liga SSL (banco local)', () => {
    const cfg = dbConfigFromEnv({ DATABASE_URL: 'postgresql://u:p@localhost:5433/db' } as NodeJS.ProcessEnv);
    expect(cfg.ssl).toBe(false);
    expect(cfg.port).toBe(5433);
  });

  it('formato antigo (variáveis separadas) continua funcionando', () => {
    const cfg = dbConfigFromEnv({
      DB_HOST: 'localhost', DB_PORT: '5433', DB_USERNAME: 'postgres', DB_PASSWORD: 'x', DB_NAME: 'sistema_producao', DB_SSL: 'true',
    } as unknown as NodeJS.ProcessEnv);
    expect(cfg).toMatchObject({ host: 'localhost', port: 5433, username: 'postgres', database: 'sistema_producao', ssl: { rejectUnauthorized: true } });
  });

  it('sem nenhuma configuração de banco, falha com mensagem clara', () => {
    expect(() => dbConfigFromEnv({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
  });
});
