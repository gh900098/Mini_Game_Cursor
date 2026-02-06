import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('games')
export class Game {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 255, unique: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    thumbnailUrl: string;

    @Column({ default: 'arcade' })
    type: string;

    @Column({ default: 360 })
    baseWidth: number;

    @Column({ default: 640 })
    baseHeight: number;

    @Column({ default: true })
    isPortrait: boolean;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'jsonb', nullable: true })
    config: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    configSchema: any;

    @Column({ type: 'jsonb', nullable: true })
    imageSpec: any;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
