import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSecretHashToDevices1788114018823 implements MigrationInterface {
    name = 'AddSecretHashToDevices1788114018823'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "devices" ADD "secret_hash" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "devices" DROP COLUMN "secret_hash"`);
    }

}
