import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { GameInstance } from '../../game-instances/entities/game-instance.entity';

@Entity('play_attempts')
@Index(['memberId', 'instanceId'])
@Index(['attemptedAt'])
export class PlayAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  memberId: string;

  @Column()
  instanceId: string;

  @CreateDateColumn()
  attemptedAt: Date;

  @Column({ default: true })
  success: boolean;

  @Column({ nullable: true, length: 45 })
  ipAddress: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: Member;

  @ManyToOne(() => GameInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instanceId' })
  instance: GameInstance;
}
