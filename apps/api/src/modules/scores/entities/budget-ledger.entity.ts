import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BudgetTracking } from './budget-tracking.entity';

export enum BudgetLedgerType {
  DEDUCTION = 'DEDUCTION',
  TOP_UP = 'TOP_UP',
  REFUND = 'REFUND',
}

@Entity('budget_ledger')
export class BudgetLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  budgetId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: BudgetLedgerType,
    default: BudgetLedgerType.DEDUCTION,
  })
  type: BudgetLedgerType;

  @Column({ nullable: true })
  referenceType: string; // e.g., 'SCORE', 'MEMBER_PRIZE'

  @Column({ nullable: true })
  referenceId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => BudgetTracking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budgetId' })
  budget: BudgetTracking;
}
