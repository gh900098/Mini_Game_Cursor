import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Member } from './member.entity';

@Entity('credit_transactions')
export class CreditTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    memberId: string;

    @Column({ type: 'integer' })
    amount: number; // Positive for credits, negative for debits

    @Column({ type: 'integer' })
    balanceBefore: number;

    @Column({ type: 'integer' })
    balanceAfter: number;

    @Column()
    type: string; // 'MANUAL_ADJUSTMENT', 'GAME_WIN', 'GAME_COST', 'ADMIN_BONUS', etc.

    @Column({ nullable: true })
    reason: string;

    @Column({ nullable: true })
    adminUserId: string; // Who made the change (for manual adjustments)

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Member)
    @JoinColumn({ name: 'memberId' })
    member: Member;
}
