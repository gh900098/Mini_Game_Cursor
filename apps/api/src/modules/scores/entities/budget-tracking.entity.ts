import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { GameInstance } from '../../game-instances/entities/game-instance.entity';

@Entity('budget_tracking')
@Unique(['instanceId', 'trackingDate'])
@Index(['trackingDate'])
export class BudgetTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  instanceId: string;

  @Column({ type: 'date' })
  trackingDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ type: 'integer', default: 0 })
  playCount: number;

  @ManyToOne(() => GameInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instanceId' })
  instance: GameInstance;
}
