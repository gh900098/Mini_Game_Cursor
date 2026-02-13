import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrizesService } from './prizes.service';
import { CreatePrizeTypeDto } from './dto/create-prize-type.dto';
import { UpdatePrizeTypeDto } from './dto/update-prize-type.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard, RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('admin/prizes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('admin/prizes/types')
export class PrizesController {
    constructor(private readonly prizesService: PrizesService) { }

    @Post()
    @RequirePermission('games:manage')
    @ApiOperation({ summary: 'Create a new prize type' })
    create(@Body() createDto: CreatePrizeTypeDto, @Request() req: any) {
        // Automatically associate with the current company context
        if (!req.user.isSuperAdmin || !createDto.companyId) {
            createDto.companyId = req.user.currentCompanyId;
        }
        return this.prizesService.create(createDto);
    }

    @Get()
    @RequirePermission('games:read')
    @ApiOperation({ summary: 'Get all prize types' })
    findAll(@Request() req: any) {
        return this.prizesService.findAll(req.user.currentCompanyId);
    }

    private isUuid(id: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }

    @Get(':idOrSlug')
    @RequirePermission('games:read')
    @ApiOperation({ summary: 'Get a prize type by ID or Slug' })
    findOne(@Param('idOrSlug') idOrSlug: string, @Request() req: any) {
        if (this.isUuid(idOrSlug)) {
            return this.prizesService.findOne(idOrSlug);
        }
        return this.prizesService.findBySlug(idOrSlug, req.user.currentCompanyId);
    }

    @Patch(':idOrSlug')
    @RequirePermission('games:manage')
    @ApiOperation({ summary: 'Update a prize type' })
    update(@Param('idOrSlug') idOrSlug: string, @Body() updateDto: UpdatePrizeTypeDto, @Request() req: any) {
        return this.prizesService.update(idOrSlug, updateDto, req.user.currentCompanyId);
    }

    @Delete(':idOrSlug')
    @RequirePermission('games:manage')
    @ApiOperation({ summary: 'Delete a prize type' })
    remove(@Param('idOrSlug') idOrSlug: string, @Request() req: any) {
        return this.prizesService.remove(idOrSlug, req.user.currentCompanyId);
    }

    @Post('seed')
    @RequirePermission('games:manage')
    @ApiOperation({ summary: 'Seed default prize types' })
    seed() {
        return this.prizesService.seedDefaults();
    }
}
