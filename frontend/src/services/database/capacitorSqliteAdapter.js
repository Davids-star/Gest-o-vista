/**
 * Adaptador do plugin @capacitor-community/sqlite para o SqliteDriver.
 * Só é carregado no APK (import dinâmico em ProductionPipeline).
 */
export async function createCapacitorSqliteAdapter(database = 'gp_local') {
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
  const sqlite = new SQLiteConnection(CapacitorSQLite);

  const exists = await sqlite.isConnection(database, false);
  const conn = exists.result
    ? await sqlite.retrieveConnection(database, false)
    : await sqlite.createConnection(database, false, 'no-encryption', 1, false);
  await conn.open();

  return {
    async run(sql, params) {
      await conn.run(sql, params, true);
    },
    async query(sql, params) {
      const result = await conn.query(sql, params);
      return result.values || [];
    },
  };
}
