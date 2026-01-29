import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../../common/guards/permissions.guard';

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

        return this.membersService.findAllByCompany(req.user.currentCompanyId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('members:read')
    findOne(@Param('id') id: string) {
        return this.membersService.findById(id);
    }
}
