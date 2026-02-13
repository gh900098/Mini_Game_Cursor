import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberPrize, PrizeStatus } from './entities/member-prize.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../../common/guards/permissions.guard';

@Controller('admin/prizes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPrizesController {
    constructor(
        @InjectRepository(MemberPrize)
        private readonly memberPrizeRepo: Repository<MemberPrize>,
    ) { }

    @Get()
    @RequirePermission('manage_games')
    async getAllPrizes(
        @Query('status') status?: PrizeStatus,
        @Query('memberId') memberId?: string,
        @Query('instanceId') instanceId?: string,
    ) {
        const query = this.memberPrizeRepo.createQueryBuilder('prize')
            .leftJoinAndSelect('prize.member', 'member')
            .leftJoinAndSelect('prize.instance', 'instance')
            .leftJoinAndSelect('instance.company', 'company')
            .orderBy('prize.createdAt', 'DESC');

        if (status) {
            query.andWhere('prize.status = :status', { status });
        }
        if (memberId) {
            query.andWhere('prize.memberId = :memberId', { memberId });
        }
        if (instanceId) {
            query.andWhere('prize.instanceId = :instanceId', { instanceId });
        }

        return query.getMany();
    }

    @Patch(':id/status')
    @RequirePermission('manage_games')
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: PrizeStatus; metadata?: any }
    ) {
        const prize = await this.memberPrizeRepo.findOneOrFail({ where: { id } });
        prize.status = body.status;
        if (body.metadata) {
            prize.metadata = { ...prize.metadata, ...body.metadata };
        }
        return this.memberPrizeRepo.save(prize);
    }

    @Get('stats')
    @RequirePermission('manage_games')
    async getPrizeStats() {
        const stats = await this.memberPrizeRepo.createQueryBuilder('prize')
            .select('prize.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('prize.status')
            .getRawMany();

        return stats;
    }
}
