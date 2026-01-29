import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { GameInstance } from '../../game-instances/entities/game-instance.entity';

@Entity('scores')
export class Score {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    memberId: string;

    @Column()
    instanceId: string;

    @Column({ type: 'integer' })
    score: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Member)
    @JoinColumn({ name: 'memberId' })
    member: Member;

    @ManyToOne(() => GameInstance)
    @JoinColumn({ name: 'instanceId' })
    instance: GameInstance;
}
