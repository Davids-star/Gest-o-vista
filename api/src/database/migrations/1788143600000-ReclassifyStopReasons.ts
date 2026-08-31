import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reclassifica os motivos de parada padrão conforme pedido:
 *
 *  - "Pergunta se vai voltar" (session_action = ask_to_resume): Manutenção,
 *    Problema no equipamento, Falta de material, Limpeza, Pausa, Outros.
 *  - "Encerra direto" (session_action = end_session): Troca de produto,
 *    Fim de turno.
 *  - Gera alerta em /alertas (planned = false): Problema no equipamento,
 *    Falta de material, Limpeza, Manutenção, Fim de turno.
 *  - NÃO gera alerta (planned = true): Pausa, Outros, Troca de produto.
 */
export class ReclassifyStopReasons1788143600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE stop_reasons SET session_action = 'ask_to_resume'
      WHERE code IN ('MANUTENCAO', 'EQUIPAMENTO', 'MATERIAL', 'LIMPEZA', 'PAUSA', 'OUTROS')
    `);
    await queryRunner.query(`
      UPDATE stop_reasons SET session_action = 'end_session'
      WHERE code IN ('TROCA_PRODUTO', 'FIM_TURNO')
    `);

    await queryRunner.query(`
      UPDATE stop_reasons SET planned = false
      WHERE code IN ('EQUIPAMENTO', 'MATERIAL', 'LIMPEZA', 'MANUTENCAO', 'FIM_TURNO')
    `);
    await queryRunner.query(`
      UPDATE stop_reasons SET planned = true
      WHERE code IN ('PAUSA', 'OUTROS', 'TROCA_PRODUTO')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverte pro estado anterior (tudo end_session / planned=false), que
    // era o comportamento antes desta migration.
    await queryRunner.query(`UPDATE stop_reasons SET session_action = 'end_session'`);
    await queryRunner.query(`UPDATE stop_reasons SET planned = false`);
    await queryRunner.query(`UPDATE stop_reasons SET session_action = 'keep_running' WHERE code = 'PAUSA'`);
  }
}
