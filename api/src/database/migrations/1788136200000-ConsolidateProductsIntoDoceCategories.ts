import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Consolida os produtos de teste (várias linhas quase-duplicadas de
 * "Chocolate"/"Bolacha"/"Biscoito" geradas por scripts de teste anteriores)
 * em exatamente 4 categorias de doce: Chocolate, Bolacha, Biscoito, Wafer.
 *
 * Nada é apagado sem antes reatribuir sessões/lotes/metas/planejamento pro
 * produto canônico — só depois disso os duplicados órfãos são removidos.
 * Não é reversível (não há como recriar os produtos apagados com o mesmo
 * id/relacionamentos originais).
 */
export class ConsolidateProductsIntoDoceCategories1788136200000 implements MigrationInterface {
  private readonly CHOCOLATE = '817d7399-1a9f-4632-8e53-c2f3ded919ac';
  private readonly BOLACHA = '753c3b8b-8f39-4100-bafa-f5c9d05b0e8e';
  private readonly BISCOITO = '21bd4332-9994-42bc-ad2f-7892a8776cb4';
  private readonly WAFER = '4cf629f3-b0af-440b-abda-9d340809a814';

  private readonly chocolateDuplicados = [
    'd3c658a6-9707-4c57-82c1-542e48834e38',
    'dd63a15e-bc30-46e0-a442-6a63c54c83ba',
    'afbebe70-26b6-4563-b713-f6422b12ecc3',
    '5cf314d9-bae2-4bc2-bd88-7bf8440d12f0',
  ];

  private readonly biscoitoDuplicados = [
    '3515557c-87c6-41d0-85bd-1a461e60bca5',
    '51d48443-1226-457b-aff4-a75463cdcd27',
  ];

  private readonly orfaosSemUso = [
    'b3442b90-fbdf-4e38-b9b6-4d6a3dee7746',
    '58086395-a3f5-4cad-a9b5-97df3ff567f1',
    '84f14cd8-4628-4c26-9f57-081877bc8a94',
    'd014525b-6ccb-413b-8487-4123ce71776c',
    'ec3b658a-3351-46f8-9ce6-e4aae865bb78',
    '4a003d0c-7db8-490f-9ff5-e9f359927393',
    '5ec0999c-a119-4996-93f1-34a53221de74',
    '97597182-6b9f-484b-85c0-24be8634276a',
    'aede3895-ad88-422d-963d-021e0196f645',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE products SET name = 'Biscoito', sku = 'BIS-001' WHERE id = $1`, [this.BISCOITO]);
    await queryRunner.query(`UPDATE products SET name = 'Wafer', sku = 'WAF-001' WHERE id = $1`, [this.WAFER]);

    const paraChocolate = this.chocolateDuplicados;
    await queryRunner.query(`UPDATE production_sessions SET product_id = $1 WHERE product_id = ANY($2)`, [this.CHOCOLATE, paraChocolate]);
    await queryRunner.query(`UPDATE lots SET product_id = $1 WHERE product_id = ANY($2)`, [this.CHOCOLATE, paraChocolate]);
    await queryRunner.query(`UPDATE target_plans SET product_id = $1 WHERE product_id = ANY($2)`, [this.CHOCOLATE, paraChocolate]);
    await queryRunner.query(`UPDATE machines SET planned_product_id = $1 WHERE planned_product_id = ANY($2)`, [this.CHOCOLATE, paraChocolate]);

    const paraBiscoito = this.biscoitoDuplicados;
    await queryRunner.query(`UPDATE production_sessions SET product_id = $1 WHERE product_id = ANY($2)`, [this.BISCOITO, paraBiscoito]);
    await queryRunner.query(`UPDATE lots SET product_id = $1 WHERE product_id = ANY($2)`, [this.BISCOITO, paraBiscoito]);
    await queryRunner.query(`UPDATE target_plans SET product_id = $1 WHERE product_id = ANY($2)`, [this.BISCOITO, paraBiscoito]);
    await queryRunner.query(`UPDATE machines SET planned_product_id = $1 WHERE planned_product_id = ANY($2)`, [this.BISCOITO, paraBiscoito]);

    const paraApagar = [...paraChocolate, ...paraBiscoito, ...this.orfaosSemUso];
    await queryRunner.query(`DELETE FROM products WHERE id = ANY($1)`, [paraApagar]);
  }

  public async down(): Promise<void> {
    // Não reversível de propósito: os produtos apagados eram duplicados de
    // teste sem valor próprio a preservar. Restaurar exigiria o backup
    // (database/backups/) tirado antes desta migração.
  }
}
