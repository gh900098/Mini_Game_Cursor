import { Controller, Post, UseGuards, Request, Get, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UsersService } from '../users/users.service';
import { SwitchCompanyDto } from './dto/switch-company.dto';

import { SystemSettingsService } from '../system-settings/system-settings.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService,
        private settingsService: SystemSettingsService,
    ) { }

    @Get('verification-required')
    @ApiOperation({ summary: 'Check if email verification is required' })
    async isVerificationRequired() {
        const required = await this.settingsService.getSetting('EMAIL_VERIFICATION_REQUIRED');
        return { required: String(required) === 'true' };
    }


    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User successfully created' })
    @ApiResponse({ status: 409, description: 'Email already exists' })
    async register(@Body() createUserDto: CreateUserDto) {
        return this.authService.register(createUserDto);
    }

    @Post('send-registration-code')
    @ApiOperation({ summary: 'Send registration verification code to email' })
    async sendRegistrationCode(@Body() dto: { email: string }) {
        return this.authService.sendRegistrationCode(dto.email);
    }

    @Post('verify-email')
    @ApiOperation({ summary: 'Verify user email with 6-digit code' })
    async verifyEmail(@Body() dto: { email: string; code: string }) {
        return this.authService.verifyEmail(dto.email, dto.code);
    }

    @Post('resend-verification')
    @ApiOperation({ summary: 'Resend verification code to email' })
    async resendVerification(@Body() dto: { email: string }) {
        return this.authService.resendVerification(dto.email);
    }

    @Post('send-password-reset-code')
    @ApiOperation({ summary: 'Send password reset code to email' })
    async sendPasswordResetCode(@Body() dto: { email: string }) {
        return this.authService.sendPasswordResetCode(dto.email);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password with verification code' })
    async resetPassword(@Body() dto: { email: string; code: string; password: any }) {
        return this.authService.resetPassword(dto);
    }

    @Post('verify-password-reset-code')
    @ApiOperation({ summary: 'Verify password reset code' })
    async verifyPasswordResetCode(@Body() dto: { email: string; code: string }) {
        return this.authService.verifyPasswordResetCode(dto.email, dto.code);
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Returns JWT access token with company context' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Request() req: any) {
        return this.authService.login(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Returns user profile' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @Get('profile')
    async getProfile(@Request() req: any) {
        const user = await this.usersService.findOne(req.user.userId);
        const currentCompany = user.userCompanies?.find(uc => uc.companyId === req.user.currentCompanyId)?.company;

        return {
            ...user,
            currentCompanyId: req.user.currentCompanyId,
            currentCompanySlug: currentCompany?.slug || null,
            currentRoleId: req.user.currentRoleId,
            currentRoleLevel: req.user.currentRoleLevel,
            isSuperAdmin: req.user.isSuperAdmin,
            permissions: req.user.permissions || []
        };
    }

    @UseGuards(JwtAuthGuard)
    @Patch('profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'Returns updated user' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async updateProfile(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(req.user.userId, updateUserDto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('switch-company')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Switch active company context' })
    @ApiResponse({ status: 200, description: 'Returns new JWT with updated company context' })
    @ApiResponse({ status: 400, description: 'User does not have access to this company' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async switchCompany(@Request() req: any, @Body() dto: SwitchCompanyDto) {
        return this.authService.switchCompany(req.user.userId, dto.companyId);
    }
}
