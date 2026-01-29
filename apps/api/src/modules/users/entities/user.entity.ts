import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserCompany } from '../../user-companies/entities/user-company.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    name: string;

    @Column({ nullable: true })
    mobile: string;

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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @OneToMany(() => UserCompany, (userCompany) => userCompany.user)
    userCompanies: UserCompany[];
}
