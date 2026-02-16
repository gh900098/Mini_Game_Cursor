import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('companies')
export class Company {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 255, unique: true })
    slug: string;

    @Column({ type: 'jsonb', nullable: true })
    settings: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    jk_config: {
        enabled: boolean;
        apiUrl: string;
        accessId: number;
        accessToken: string;
        ipWhitelistEnabled?: boolean;
        ipWhitelist?: string; // Comma separated IPs
        proxy?: {
            enabled: boolean;
            protocol: 'http' | 'socks5';
            host: string;
            port: number;
            username?: string;
            password?: string;
        };
        /** Granular configs per type (member, deposit, withdraw etc) */
        syncConfigs?: Record<string, {
            enabled: boolean;
            syncMode: 'full' | 'incremental';
            maxPages: number;
            syncCron?: string;
            syncParams?: Record<string, any>;
        }>;
        // Legacy / Root fallback fields (for migration)
        syncParams?: Record<string, any>;
        syncCron?: string;
        syncMode?: 'full' | 'incremental';
        maxPages?: number;
    };

    @Column({ length: 255, nullable: true })
    apiSecret: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'timestamp', nullable: true })
    inactiveAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
