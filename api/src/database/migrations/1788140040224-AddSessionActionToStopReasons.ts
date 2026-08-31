import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona stop_reasons.session_action — o que fazer com a sessão de
 * produção quando essa parada acaba (ver enum StopSessionAction). Classifica
 * de cara os motivos padrão pedidos: Pausa nunca encerra sessão; Limpeza e
 * Falta de material perguntam se quer continuar; os demais mantêm o
 * comportamento antigo (encerra a sessão), inclusive motivos futuros/
 * customizados que a empresa cadastrar sem escolher isso explicitamente.
 */
export class AddSessionActionToStopReasons1788140040224 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stop_reasons
      ADD COLUMN IF NOT EXISTS session_action VARCHAR(20) NOT NULL DEFAULT 'end_session'
    `);

    await queryRunner.query(`UPDATE stop_reasons SET session_action = 'keep_running' WHERE code = 'PAUSA'`);
    await queryRunner.query(`UPDATE stop_reasons SET session_action = 'ask_to_resume' WHERE code IN ('LIMPEZA', 'MATERIAL')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE stop_reasons DROP COLUMN IF EXISTS session_action`);
  }
}
