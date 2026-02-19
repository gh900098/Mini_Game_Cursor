import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

import { EncryptionTransformer } from '../../encryption/encryption.transformer';
import { encryptionServiceInstance } from '../../encryption/encryption.service';
import { BeforeInsert, BeforeUpdate } from 'typeorm';

@Entity('verification_codes')
export class VerificationCode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ transformer: new EncryptionTransformer() })
    email: string;

    @Column({ nullable: true })
    emailHash: string;

    @Column()
    code: string;

    @Column({ default: 'registration' })
    type: string;

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @BeforeInsert()
    @BeforeUpdate()
    updateHashes() {
        if (encryptionServiceInstance && this.email) {
            this.emailHash = encryptionServiceInstance.hash(this.email);
        }
    }
}
