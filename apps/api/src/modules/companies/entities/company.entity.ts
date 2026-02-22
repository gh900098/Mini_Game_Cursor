import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

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
    integration_config: {
        provider: string; // 'JK', etc.
        enabled: boolean;
        apiUrl: string;
        accessId?: number;     // Optional depending on provider
        accessToken?: string;  // Optional depending on provider
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

    @Index()
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
