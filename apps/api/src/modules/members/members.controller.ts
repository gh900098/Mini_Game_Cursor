import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query, UnauthorizedException } from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../../common/guards/permissions.guard';
import { getClientIp } from '../../common/utils/ip-utils';
import { maskEmail, maskPhone } from '../../common/utils/masking.utils';

@Controller('members')
export class MembersController {
    constructor(private readonly membersService: MembersService) { }

    @Get()
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('members:read')
    async findAll(@Request() req: any, @Query('companyId') companyId?: string) {
        let members;
        if (req.user.isSuperAdmin) {
            if (companyId) {
                members = await this.membersService.findAllByCompany(companyId);
            } else {
                members = await this.membersService.findAll();
            }
        } else {
            const targetCompanyId = req.user.currentCompanyId || req.user.companyId;
            members = await this.membersService.findAllByCompany(targetCompanyId || '');
        }

        // ALWAYS mask in list view
        return members.map(m => ({
            ...m,
            email: maskEmail(m.email),
            phoneNumber: maskPhone(m.phoneNumber)
        }));
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('members:read')
    async findOne(@Param('id') id: string, @Request() req: any) {
        const member = await this.membersService.findById(id);
        if (!member) return null;

        // Check for permission to view sensitive data
        // Assuming req.user has permissions array or we check if they are admin
        // For now, let's look for the specific permission string in req.user.permissions
        // OR if they are super admin.

        const hasSensitivePermission = req.user.isSuperAdmin ||
            (req.user.permissions && req.user.permissions.includes('members:view_sensitive'));

        if (!hasSensitivePermission) {
            member.email = maskEmail(member.email);
            member.phoneNumber = maskPhone(member.phoneNumber);
        }

        return member;
    }

    @Post('login')
    async login(
        @Body() loginDto: any,
        @Request() req: any
    ) {
        const member = await this.membersService.validateMember(loginDto.username, loginDto.password);
        if (!member) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const userAgent = req.headers['user-agent'];
        const ipAddress = getClientIp(req);
        return this.membersService.login(member, ipAddress, userAgent);
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    getProfile(@Request() req: any) {
        // req.user contains the payload from JWT strategy
        const userId = req.user.userId || req.user.memberId || req.user.sub;
        return this.membersService.findById(userId);
    }
}
