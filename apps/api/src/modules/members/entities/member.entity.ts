import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { encryptionServiceInstance } from '../../encryption/encryption.service';
import { Company } from '../../companies/entities/company.entity';
import { EncryptionTransformer } from '../../encryption/encryption.transformer';

@Entity('members')
@Index(['companyId', 'externalId'], { unique: true, where: '"externalId" IS NOT NULL' })
@Index(['companyId', 'createdAt']) // Optimize default sort
@Index(['username']) // Optimize search
export class Member {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index() // Optimize filtering by company
    companyId: string;

    @Column({ nullable: true })
    @Index() // Optimize search
    externalId: string;

    @Column({ nullable: true })
    username: string;

    @Column({ type: 'integer', default: 0 })
    pointsBalance: number;

    @Column({ type: 'integer', default: 1 })
    level: number;

    @Column({ nullable: true, length: 20 })
    vipTier: string;

    @Column({ type: 'integer', default: 0 })
    experience: number;

    @Column({ default: false })
    isAnonymous: boolean;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'timestamp', nullable: true })
    lastLoginAt: Date;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ nullable: true, transformer: new EncryptionTransformer() })
    realName: string;

    @Column({ nullable: true, transformer: new EncryptionTransformer() })
    phoneNumber: string;

    @Column({ nullable: true })
    phoneNumberHash: string;

    @Column({ nullable: true, transformer: new EncryptionTransformer() })
    email: string;

    @Column({ nullable: true })
    emailHash: string;

    @Column({ nullable: true, transformer: new EncryptionTransformer() })
    address: string;

    @Column({ nullable: true })
    addressHash: string;

    @Column({ nullable: true, select: false }) // Don't return password by default
    password: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @BeforeInsert()
    @BeforeUpdate()
    updateHashes() {
        if (encryptionServiceInstance) {
            if (this.email) {
                this.emailHash = encryptionServiceInstance.hash(this.email);
            }
            if (this.phoneNumber) {
                this.phoneNumberHash = encryptionServiceInstance.hash(this.phoneNumber);
            }
            if (this.address) {
                this.addressHash = encryptionServiceInstance.hash(this.address);
            }
        }
    }
}
