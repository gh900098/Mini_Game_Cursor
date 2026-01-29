import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    userId: string;

    @Column({ nullable: true })
    userName: string;

    @Column({ nullable: true })
    companyId: string;

    @Column({ nullable: true })
    module: string;

    @Column({ nullable: true })
    action: string;

    @Column({ nullable: true })
    method: string;

    @Column({ nullable: true })
    path: string;

    @Column({ nullable: true })
    ip: string;

    @Column({ type: 'text', nullable: true })
    userAgent: string;

    @Column({ type: 'jsonb', nullable: true })
    payload: any;

    @Column({ type: 'jsonb', nullable: true })
    params: any;

    @Column({ type: 'jsonb', nullable: true })
    result: any;

    @Column({ nullable: true })
    status: number;

    @Column({ nullable: true })
    duration: number;

    @CreateDateColumn()
    createdAt: Date;
}
