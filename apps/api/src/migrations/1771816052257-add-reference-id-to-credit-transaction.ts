import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReferenceIdToCreditTransaction1771816052257 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credit_transactions" ADD "referenceId" character varying`);
        await queryRunner.query(`ALTER TABLE "credit_transactions" ADD CONSTRAINT "UQ_credit_transactions_referenceId" UNIQUE ("referenceId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credit_transactions" DROP CONSTRAINT "UQ_credit_transactions_referenceId"`);
        await queryRunner.query(`ALTER TABLE "credit_transactions" DROP COLUMN "referenceId"`);
    }
}
