import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, RoleLevel } from '../../common/decorators/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from './entities/member.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { LoginHistory } from './entities/login-history.entity';
import { PlayAttempt } from '../scores/entities/play-attempt.entity';
import { Score } from '../scores/entities/score.entity';
import { AuditLogService } from '../audit-log/audit-log.service';

@Controller('admin/members')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleLevel.STAFF)
export class AdminMembersController {
    constructor(
        @InjectRepository(Member)
        private membersRepo: Repository<Member>,
        @InjectRepository(CreditTransaction)
        private creditTransactionsRepo: Repository<CreditTransaction>,
        @InjectRepository(LoginHistory)
        private loginHistoryRepo: Repository<LoginHistory>,
        @InjectRepository(PlayAttempt)
        private playAttemptsRepo: Repository<PlayAttempt>,
        @InjectRepository(Score)
        private scoresRepo: Repository<Score>,
        private auditLogService: AuditLogService,
    ) { }

    @Get()
    async getMembers(@Query('companyId') companyId?: string) {
        const query = this.membersRepo
            .createQueryBuilder('member')
            .leftJoinAndSelect('member.company', 'company')
            .orderBy('member.createdAt', 'DESC')
            .take(1000);

        if (companyId) {
            query.where('member.companyId = :companyId', { companyId });
        }

        return query.getMany();
    }

    @Get(':id')
    async getMember(@Param('id') id: string) {
        return this.membersRepo.findOne({
            where: { id },
            relations: ['company'],
        });
    }

    @Post()
    async createMember(@Body() data: Partial<Member>, @Request() req: any) {
        const member = this.membersRepo.create(data);
        const saved = await this.membersRepo.save(member);

        await this.auditLogService.create({
            userId: req.user.userId,
            userName: req.user.name,
            companyId: data.companyId,
            module: 'Member',
            action: 'CREATE',
            payload: data,
            result: { id: saved.id },
        });

        return saved;
    }

    @Patch(':id')
    async updateMember(
        @Param('id') id: string,
        @Body() data: Partial<Member>,
        @Request() req: any
    ) {
        await this.membersRepo.update(id, data);
        const updated = await this.membersRepo.findOne({ where: { id } });

        if (updated) {
            await this.auditLogService.create({
                userId: req.user.userId,
                userName: req.user.name,
                companyId: updated.companyId,
                module: 'Member',
                action: 'UPDATE',
                payload: data,
                result: { id },
            });
        }

        return updated;
    }

    @Patch(':id/toggle-status')
    async toggleStatus(@Param('id') id: string, @Request() req: any) {
        const member = await this.membersRepo.findOne({ where: { id } });
        if (!member) throw new Error('Member not found');

        member.isActive = !member.isActive;
        await this.membersRepo.save(member);

        await this.auditLogService.create({
            userId: req.user.userId,
            userName: req.user.name,
            companyId: member.companyId,
            module: 'Member',
            action: member.isActive ? 'ENABLE' : 'DISABLE',
            result: { id, isActive: member.isActive },
        });

        return member;
    }

    @Post(':id/adjust-credit')
    async adjustCredit(
        @Param('id') id: string,
        @Body() body: { amount: number; reason: string; type?: string },
        @Request() req: any
    ) {
        const member = await this.membersRepo.findOne({ where: { id } });
        if (!member) throw new Error('Member not found');

        const balanceBefore = member.pointsBalance;
        const balanceAfter = balanceBefore + body.amount;

        // Update member balance
        member.pointsBalance = balanceAfter;
        await this.membersRepo.save(member);

        // Record transaction
        const transaction = this.creditTransactionsRepo.create({
            memberId: id,
            amount: body.amount,
            balanceBefore,
            balanceAfter,
            type: body.type || 'MANUAL_ADJUSTMENT',
            reason: body.reason,
            adminUserId: req.user.userId,
        });
        await this.creditTransactionsRepo.save(transaction);

        // Audit log
        await this.auditLogService.create({
            userId: req.user.userId,
            userName: req.user.name,
            companyId: member.companyId,
            module: 'Member',
            action: 'CREDIT_ADJUSTMENT',
            payload: { amount: body.amount, reason: body.reason },
            result: { balanceBefore, balanceAfter },
        });

        return { member, transaction };
    }

    @Get(':id/credit-history')
    async getCreditHistory(@Param('id') id: string) {
        return this.creditTransactionsRepo.find({
            where: { memberId: id },
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    @Get(':id/play-history')
    async getPlayHistory(@Param('id') id: string) {
        return this.playAttemptsRepo.find({
            where: { memberId: id },
            relations: ['instance', 'instance.company'],
            order: { attemptedAt: 'DESC' },
            take: 100,
        });
    }

    @Get(':id/scores')
    async getScores(@Param('id') id: string) {
        return this.scoresRepo.find({
            where: { memberId: id },
            relations: ['instance', 'instance.company'],
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    @Get(':id/login-history')
    async getLoginHistory(@Param('id') id: string) {
        return this.loginHistoryRepo.find({
            where: { memberId: id },
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    @Get(':id/audit-logs')
    async getAuditLogs(@Param('id') id: string) {
        const member = await this.membersRepo.findOne({ where: { id } });
        if (!member) throw new Error('Member not found');
        
        // Get audit logs for this member (by module=Member and payload/result containing member ID)
        const result = await this.auditLogService.findAll({
            module: 'Member',
            companyId: member.companyId,
            limit: 100,
        });
        
        return result.items;
    }

    @Get(':id/stats')
    async getMemberStats(@Param('id') id: string) {
        const [totalPlays, successfulPlays, totalScores, avgScore] = await Promise.all([
            this.playAttemptsRepo.count({ where: { memberId: id } }),
            this.playAttemptsRepo.count({ where: { memberId: id, success: true } }),
            this.scoresRepo.count({ where: { memberId: id } }),
            this.scoresRepo
                .createQueryBuilder('score')
                .where('score.memberId = :memberId', { memberId: id })
                .select('AVG(score.score)', 'avg')
                .getRawOne(),
        ]);

        return {
            totalPlays,
            successfulPlays,
            successRate: totalPlays > 0 ? (successfulPlays / totalPlays * 100).toFixed(2) : 0,
            totalScores,
            avgScore: avgScore?.avg ? parseFloat(avgScore.avg).toFixed(2) : 0,
        };
    }
}
