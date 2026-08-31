import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlannedProductionToMachines1788109325347 implements MigrationInterface {
    name = 'AddPlannedProductionToMachines1788109325347'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "machines" ADD "planned_product_id" uuid`);
        await queryRunner.query(`ALTER TABLE "machines" ADD "planned_lot_code" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "machines" ADD CONSTRAINT "FK_7e7ffdfc05d92369c19e47d74b6" FOREIGN KEY ("planned_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "machines" DROP CONSTRAINT "FK_7e7ffdfc05d92369c19e47d74b6"`);
        await queryRunner.query(`ALTER TABLE "machines" DROP COLUMN "planned_lot_code"`);
        await queryRunner.query(`ALTER TABLE "machines" DROP COLUMN "planned_product_id"`);
    }

}
