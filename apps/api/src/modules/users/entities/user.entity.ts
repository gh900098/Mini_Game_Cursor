import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import { encryptionServiceInstance } from '../../encryption/encryption.service';
import { Exclude } from 'class-transformer';
import { UserCompany } from '../../user-companies/entities/user-company.entity';

import { EncryptionTransformer } from '../../encryption/encryption.transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, transformer: new EncryptionTransformer() })
  email: string;

  @Index({ unique: true })
  @Column({ nullable: true })
  emailHash: string;

  @Index()
  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true, transformer: new EncryptionTransformer() })
  mobile: string;

  @Index({ unique: true })
  @Column({ nullable: true })
  mobileHash: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  @Exclude()
  verificationCode: string;

  @Column({ type: 'timestamp', nullable: true })
  @Exclude()
  verificationCodeExpires: Date;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserCompany, (userCompany) => userCompany.user)
  userCompanies: UserCompany[];

  @BeforeInsert()
  @BeforeUpdate()
  updateHashes() {
    if (encryptionServiceInstance) {
      if (this.email) {
        this.emailHash = encryptionServiceInstance.hash(this.email);
      }
      if (this.mobile) {
        this.mobileHash = encryptionServiceInstance.hash(this.mobile);
      }
    }
  }
}
