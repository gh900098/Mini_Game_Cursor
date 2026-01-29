import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { VerificationCode } from './entities/verification-code.entity';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private emailService: EmailService,
        private settingsService: SystemSettingsService,
        @InjectRepository(VerificationCode)
        private codeRepository: Repository<VerificationCode>,
    ) { }

    async sendRegistrationCode(email: string) {
        // Check if email already exists
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            throw new BadRequestException('Email already registered');
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 15);

        // Delete any existing registration codes for this email
        await this.codeRepository.delete({ email, type: 'registration' });

        // Save new code
        const verificationCode = this.codeRepository.create({
            email,
            code,
            expiresAt: expires,
            type: 'registration'
        });
        await this.codeRepository.save(verificationCode);

        // Send email
        await this.emailService.sendVerificationCode(email, code);

        return { message: 'Registration code sent' };
    }

    async sendPasswordResetCode(email: string) {
        // Check if user exists
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            // For security, don't reveal if user exists or not, 
            // but in this specific request, the user wants us to verify email.
            // "update the forget password page to verify the email"
            // So we'll throw an error if not found.
            throw new BadRequestException('page.login.common.userNotFound');
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 15);

        // Delete any existing reset codes for this email
        await this.codeRepository.delete({ email, type: 'reset_password' });

        // Save new code
        const verificationCode = this.codeRepository.create({
            email,
            code,
            expiresAt: expires,
            type: 'reset_password'
        });
        await this.codeRepository.save(verificationCode);

        // Send email (we can reuse the same template or create a new one, 
        // but emailService.sendVerificationCode is general enough)
        await this.emailService.sendVerificationCode(email, code);

        return { message: 'Password reset code sent' };
    }

    async verifyPasswordResetCode(email: string, code: string) {
        const storedCode = await this.codeRepository.findOne({
            where: { email, code, type: 'reset_password' },
        });

        if (!storedCode || new Date() > storedCode.expiresAt) {
            throw new BadRequestException('Invalid or expired verification code');
        }

        return { message: 'Code verified successfully' };
    }

    async resetPassword(dto: { email: string; code: string; password: string }) {
        const { email, code, password } = dto;

        const storedCode = await this.codeRepository.findOne({
            where: { email, code, type: 'reset_password' },
        });

        if (!storedCode || new Date() > storedCode.expiresAt) {
            throw new BadRequestException('Invalid or expired verification code');
        }

        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new BadRequestException('page.login.common.userNotFound');
        }

        // Update password
        const hashedPassword = await bcrypt.hash(password, 10);
        await this.usersService.update(user.id, { password: hashedPassword } as any);

        // Cleanup code
        await this.codeRepository.delete({ id: storedCode.id });

        return { message: 'Password reset successfully' };
    }


    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('page.login.common.userNotFound');
        }

        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('page.login.common.invalidPassword');
        }

        // Check if verification is required (stored as 'true' or 'false' string)
        const verificationRequired = await this.settingsService.getSetting('EMAIL_VERIFICATION_REQUIRED');
        if (String(verificationRequired) === 'true' && !user.isVerified) {
            throw new UnauthorizedException('Email not verified. Please check your inbox.');
        }

        const { password, ...result } = user;
        return result;
    }

    async register(createUserDto: any) {
        const { code, ...userData } = createUserDto;

        const verificationRequired = await this.settingsService.getSetting('EMAIL_VERIFICATION_REQUIRED');
        const isVerificationOn = String(verificationRequired) === 'true';

        if (isVerificationOn) {
            if (!code) {
                throw new BadRequestException('Verification code is required');
            }

            const storedCode = await this.codeRepository.findOne({
                where: { email: userData.email, code, type: 'registration' },
            });

            if (!storedCode || new Date() > storedCode.expiresAt) {
                throw new BadRequestException('Invalid or expired verification code');
            }

            // Cleanup code
            await this.codeRepository.delete({ id: storedCode.id });
        }

        // Create user via usersService
        const user = await this.usersService.create({
            ...userData,
            isVerified: isVerificationOn, // Automatically verified if they provided a valid code
        });

        return user;
    }

    async resendVerification(email: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) throw new BadRequestException('User not found');
        if (user.isVerified) throw new BadRequestException('Email already verified');

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 15); // 15 mins expiry

        // Save to user
        await this.usersService.update(user.id, {
            verificationCode: code,
            verificationCodeExpires: expires,
        } as any);

        // Send email
        await this.emailService.sendVerificationCode(email, code);

        return { message: 'Verification code sent' };
    }

    async verifyEmail(email: string, code: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) throw new BadRequestException('User not found');
        if (user.isVerified) return { message: 'Email already verified' };

        if (user.verificationCode !== code) {
            throw new BadRequestException('Invalid verification code');
        }

        if (new Date() > user.verificationCodeExpires) {
            throw new BadRequestException('Verification code expired');
        }

        // Mark as verified
        await this.usersService.update(user.id, {
            isVerified: true,
            verificationCode: null,
            verificationCodeExpires: null,
        } as any);

        return { message: 'Email verified successfully' };
    }

    async login(user: any) {
        // Get user's companies and roles
        const userCompanies = user.userCompanies || [];
        const primaryCompany = userCompanies.find((uc: any) => uc.isPrimary) || userCompanies[0];

        // Check if user is super admin (no company restrictions)
        const isSuperAdmin = primaryCompany?.role?.slug === 'super_admin';

        const payload = {
            email: user.email,
            sub: user.id,
            currentCompanyId: isSuperAdmin ? null : primaryCompany?.companyId,
            currentRoleId: primaryCompany?.roleId,
            currentRoleLevel: primaryCompany?.role?.level,
            permissions: primaryCompany?.role?.permissions?.map((p: any) => p.slug) || [],
            companies: userCompanies.map((uc: any) => uc.companyId),
            isSuperAdmin,
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                companies: userCompanies.map((uc: any) => ({
                    id: uc.companyId,
                    name: uc.company?.name,
                    roleId: uc.roleId,
                    roleName: uc.role?.name,
                    roleLevel: uc.role?.level,
                    isPrimary: uc.isPrimary,
                    permissions: uc.role?.permissions?.map((p: any) => p.slug) || []
                })),
                currentCompany: primaryCompany ? {
                    id: primaryCompany.companyId,
                    name: primaryCompany.company?.name,
                    roleId: primaryCompany.roleId,
                    roleName: primaryCompany.role?.name,
                    roleLevel: primaryCompany.role?.level,
                } : null,
            },
        };
    }

    async switchCompany(userId: string, companyId: string) {
        const user = await this.usersService.findOne(userId);

        // Handle "ALL" case for Super Admin
        if (companyId === 'ALL') {
            const superAdminUc = user.userCompanies?.find((uc: any) => uc.role?.slug === 'super_admin');

            if (!superAdminUc) {
                throw new ForbiddenException('Only Super Admins can switch to Global view');
            }

            const payload = {
                email: user.email,
                sub: user.id,
                currentCompanyId: null,
                currentRoleId: superAdminUc.roleId,
                currentRoleLevel: 100, // Super Admin Level
                permissions: superAdminUc.role?.permissions?.map((p: any) => p.slug) || [],
                companies: user.userCompanies.map((uc: any) => uc.companyId),
                isSuperAdmin: true,
            };

            return {
                access_token: this.jwtService.sign(payload),
            };
        }

        let userCompany = user.userCompanies?.find((uc: any) => uc.companyId === companyId);
        const superAdminUc = user.userCompanies?.find((uc: any) => uc.role?.slug === 'super_admin');

        if (!userCompany) {
            if (superAdminUc) {
                // User is Super Admin but not explicitly in this company.
                // Operate as Super Admin in this context.
                userCompany = {
                    roleId: superAdminUc.roleId,
                    role: superAdminUc.role
                } as any;
            } else {
                throw new ForbiddenException('User does not have access to this company');
            }
        }

        const payload = {
            email: user.email,
            sub: user.id,
            currentCompanyId: companyId,
            currentRoleId: userCompany?.roleId,
            currentRoleLevel: userCompany?.role?.level,
            permissions: userCompany?.role?.permissions?.map((p: any) => p.slug) || [],
            companies: user.userCompanies.map((uc: any) => uc.companyId),
            isSuperAdmin: userCompany?.role?.slug === 'super_admin' || !!superAdminUc,
        };

        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
