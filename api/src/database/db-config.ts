
/**
 * Configuração de conexão com o Postgres, lida de variáveis de ambiente.
 *
 * Duas formas (use uma):
 * - DATABASE_URL: a string completa do provedor (ex.: Neon). SSL é ligado
 *   se a URL tiver sslmode=require ou se DB_SSL=true.
 * - DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME (+ DB_SSL=true).
 */
export function dbConfigFromEnv(env: NodeJS.ProcessEnv = process.env) {
  const sslLigado = env.DB_SSL === 'true';

  if (env.DATABASE_URL) {
    const url = new URL(env.DATABASE_URL);
    const sslmode = url.searchParams.get('sslmode');
    return {
      type: 'postgres' as const,
      host: url.hostname,
      port: Number(url.port || 5432),
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
      ssl: sslLigado || (sslmode !== null && sslmode !== 'disable') ? { rejectUnauthorized: true } : false,
    };
  }

  return {
    type: 'postgres' as const,
    host: required(env, 'DB_HOST'),
    port: Number(required(env, 'DB_PORT')),
    username: required(env, 'DB_USERNAME'),
    password: required(env, 'DB_PASSWORD'),
    database: required(env, 'DB_NAME'),
    ssl: sslLigado ? { rejectUnauthorized: true } : false,
  };
}

function required(env: NodeJS.ProcessEnv, nome: string): string {
  const valor = env[nome];
  if (!valor) throw new Error(`Defina DATABASE_URL ou ${nome} nas variáveis de ambiente`);
  return valor;
}
