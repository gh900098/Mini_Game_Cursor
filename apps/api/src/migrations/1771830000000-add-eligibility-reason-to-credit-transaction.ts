import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEligibilityReasonToCreditTransaction1771830000000 implements MigrationInterface {
  name = 'AddEligibilityReasonToCreditTransaction1771830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'credit_transactions',
      new TableColumn({
        name: 'eligibilityReason',
        type: 'varchar',
        isNullable: true,
        comment: 'Explains why pointsAdded might be 0 due to engine limits',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('credit_transactions', 'eligibilityReason');
  }
}
