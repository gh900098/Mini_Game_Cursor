import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

@Entity('themes')
export class Theme {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    slug: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    thumbnailUrl: string;

    @Column({ name: 'game_template_slug', default: 'spin-wheel' })
    gameTemplateSlug: string;

    @Column({ name: 'company_id', type: 'uuid', nullable: true })
    companyId: string | null;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'company_id' })
    company?: Company;

    @Column('jsonb', { default: {} })
    config: Record<string, any>;

    @Column({ name: 'is_premium', default: false })
    isPremium: boolean;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
