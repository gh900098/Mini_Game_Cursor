import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { GameInstance } from '../../game-instances/entities/game-instance.entity';
import { PlayAttempt } from './play-attempt.entity';

export enum PrizeStatus {
    PENDING = 'pending',
    CLAIMED = 'claimed',
    FULFILLED = 'fulfilled',
    SHIPPED = 'shipped',
    REJECTED = 'rejected',
}

/* 
export enum PrizeType {
    POINTS = 'points',
    PHYSICAL = 'physical',
    VIRTUAL = 'virtual',
    BONUS_CREDIT = 'bonus_credit',
}
*/

@Entity('member_prizes')
@Index(['memberId'])
@Index(['instanceId'])
@Index(['status'])
@Index(['createdAt'])
export class MemberPrize {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    memberId: string;

    @Column()
    instanceId: string;

    @Column({ nullable: true })
    playAttemptId: string;

    @Column({ nullable: true })
    prizeId: string; // The ID or index from the game config

    @Column()
    prizeName: string;

    @Column({ default: 'points' })
    prizeType: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    prizeValue: number;

    @Column({
        type: 'enum',
        enum: PrizeStatus,
        default: PrizeStatus.PENDING,
    })
    status: PrizeStatus;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Member)
    @JoinColumn({ name: 'memberId' })
    member: Member;

    @ManyToOne(() => GameInstance)
    @JoinColumn({ name: 'instanceId' })
    instance: GameInstance;

    @ManyToOne(() => PlayAttempt)
    @JoinColumn({ name: 'playAttemptId' })
    playAttempt: PlayAttempt;
}
