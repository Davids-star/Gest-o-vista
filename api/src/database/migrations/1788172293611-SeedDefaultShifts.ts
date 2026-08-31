import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sem turnos cadastrados, "apontamento por turno" não tem como agrupar nada
 * (production_sessions.shift_id sempre fica nulo). Semeia 3 turnos padrão
 * (comuns em fábrica) pra toda empresa já cadastrada, cobrindo os 7 dias da
 * semana. SessionsService passa a resolver e preencher o shift_id sozinho
 * ao iniciar uma sessão (ver ShiftsService.resolverTurnoParaHorario).
 */
export class SeedDefaultShifts1788172293611 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const empresas: Array<{ id: string }> = await queryRunner.query(`SELECT id FROM companies`);

    for (const empresa of empresas) {
      const existentes = await queryRunner.query(
        `SELECT id FROM shifts WHERE company_id = $1 LIMIT 1`,
        [empresa.id],
      );
      if (existentes.length) continue; // empresa já tem turnos — não sobrescreve

      await queryRunner.query(
        `INSERT INTO shifts (id, company_id, name, start_time, end_time, days_of_week, active)
         VALUES
           (uuid_generate_v4(), $1, '1º Turno', '06:00:00', '14:00:00', ARRAY[0,1,2,3,4,5,6], true),
           (uuid_generate_v4(), $1, '2º Turno', '14:00:00', '22:00:00', ARRAY[0,1,2,3,4,5,6], true),
           (uuid_generate_v4(), $1, '3º Turno', '22:00:00', '06:00:00', ARRAY[0,1,2,3,4,5,6], true)`,
        [empresa.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM shifts WHERE name IN ('1º Turno', '2º Turno', '3º Turno')`);
  }
}
