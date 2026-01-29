import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

@Entity('members')
@Index(['companyId', 'externalId'], { unique: true, where: '"externalId" IS NOT NULL' })
export class Member {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    companyId: string;

    @Column({ nullable: true })
    externalId: string;

    @Column({ nullable: true })
    username: string;

    @Column({ type: 'integer', default: 0 })
    pointsBalance: number;

    @Column({ default: false })
    isAnonymous: boolean;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company: Company;
}
