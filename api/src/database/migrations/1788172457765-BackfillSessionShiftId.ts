import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Preenche production_sessions.shift_id pra sessões que já existiam antes do
 * SessionsService passar a resolver o turno sozinho (ver ShiftsService).
 * Mesma lógica de match (turno normal x que cruza meia-noite), só que em
 * SQL. Horários das fábricas são em horário local — converte timestamptz
 * pra America/Fortaleza (== America/Sao_Paulo, sem horário de verão) antes
 * de extrair hora/dia da semana, senão dá 3h de diferença (Postgres guarda
 * tudo em UTC).
 */
export class BackfillSessionShiftId1788172457765 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // UPDATE ... FROM não deixa a tabela-alvo ser referenciada dentro de um
    // JOIN da cláusula FROM — por isso o match vira uma subquery à parte.
    await queryRunner.query(`
      UPDATE production_sessions s
      SET shift_id = encontrado.turno_id
      FROM (
        SELECT s2.id AS session_id, t.id AS turno_id
        FROM production_sessions s2
        INNER JOIN machines m ON m.id = s2.machine_id
        INNER JOIN shifts t ON t.company_id = m.company_id AND t.active = true
        WHERE s2.shift_id IS NULL
          AND (
            -- turno normal (não cruza meia-noite)
            (
              t.start_time <= t.end_time
              AND EXTRACT(DOW FROM (s2.started_at AT TIME ZONE 'America/Fortaleza'))::int = ANY(t.days_of_week)
              AND (s2.started_at AT TIME ZONE 'America/Fortaleza')::time >= t.start_time
              AND (s2.started_at AT TIME ZONE 'America/Fortaleza')::time < t.end_time
            )
            OR
            -- turno que cruza meia-noite (ex.: 22:00–06:00)
            (
              t.start_time > t.end_time
              AND (
                (
                  EXTRACT(DOW FROM (s2.started_at AT TIME ZONE 'America/Fortaleza'))::int = ANY(t.days_of_week)
                  AND (s2.started_at AT TIME ZONE 'America/Fortaleza')::time >= t.start_time
                )
                OR
                (
                  EXTRACT(DOW FROM ((s2.started_at AT TIME ZONE 'America/Fortaleza') - INTERVAL '1 day'))::int = ANY(t.days_of_week)
                  AND (s2.started_at AT TIME ZONE 'America/Fortaleza')::time < t.end_time
                )
              )
            )
          )
      ) encontrado
      WHERE s.id = encontrado.session_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Não reversível de forma limpa (não sabemos quais linhas eram
    // originalmente nulas vs já preenchidas) — não é destrutivo o bastante
    // pra justificar guardar um snapshot só pra isso.
  }
}
