import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSensorSourceToMachines1788500000000 implements MigrationInterface {
    name = 'AddSensorSourceToMachines1788500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "machines" ADD "sensor_source" character varying(20)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "machines" DROP COLUMN "sensor_source"`);
    }

}
