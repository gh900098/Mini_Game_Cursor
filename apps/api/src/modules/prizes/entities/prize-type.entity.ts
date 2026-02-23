import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum PrizeStrategy {
  BALANCE_CREDIT = 'balance_credit',
  MANUAL_FULFILL = 'manual_fulfill',
  VIRTUAL_CODE = 'virtual_code',
  EXTERNAL_HOOK = 'external_hook',
}

@Entity('prize_types')
@Unique(['companyId', 'slug'])
export class PrizeType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({
    type: 'enum',
    enum: PrizeStrategy,
    default: PrizeStrategy.MANUAL_FULFILL,
  })
  strategy: PrizeStrategy;

  @Column({ nullable: true })
  icon: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @Column({ default: true })
  showValue: boolean;

  @Column({ default: true })
  isPoints: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
