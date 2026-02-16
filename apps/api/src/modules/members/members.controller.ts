import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query, UnauthorizedException } from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../../common/guards/permissions.guard';
import { getClientIp } from '../../common/utils/ip-utils';

@Controller('members')
export class MembersController {
    constructor(private readonly membersService: MembersService) { }

    @Get()
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('members:read')
    findAll(@Request() req: any, @Query('companyId') companyId?: string) {
        if (req.user.isSuperAdmin) {
            if (companyId) {
                return this.membersService.findAllByCompany(companyId);
            }
            return this.membersService.findAll();
        }

        const targetCompanyId = req.user.currentCompanyId || req.user.companyId;
        return this.membersService.findAllByCompany(targetCompanyId || '');
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('members:read')
    findOne(@Param('id') id: string) {
        return this.membersService.findById(id);
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
