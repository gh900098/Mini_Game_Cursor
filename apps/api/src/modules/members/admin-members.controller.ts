import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
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
import { MemberPrize } from '../scores/entities/member-prize.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MembersService } from './members.service';

import * as bcrypt from 'bcrypt';

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
        private readonly loginHistoryRepo: Repository<LoginHistory>,
        @InjectRepository(MemberPrize)
        private readonly memberPrizeRepo: Repository<MemberPrize>,
        @InjectRepository(PlayAttempt)
        private playAttemptsRepo: Repository<PlayAttempt>,
        @InjectRepository(Score)
        private scoresRepo: Repository<Score>,
        private auditLogService: AuditLogService,
        private membersService: MembersService,
    ) { }

    @Get()
    async getMembers(@Request() req: any, @Query('companyId') requestedCompanyId?: string) {
        const targetCompanyId = req.user.currentCompanyId || req.user.companyId || requestedCompanyId;

        if (requestedCompanyId && !req.user.isSuperAdmin && requestedCompanyId !== targetCompanyId) {
            throw new ForbiddenException('You do not have access to this company');
        }

        const query = this.membersRepo
            .createQueryBuilder('member')
            .leftJoinAndSelect('member.company', 'company')
            .orderBy('member.createdAt', 'DESC')
            .take(1000);

        if (targetCompanyId) {
            query.where('member.companyId = :companyId', { companyId: targetCompanyId });
        }

        return query.getMany();
    }

    @Get(':id')
    async getMember(@Request() req: any, @Param('id') id: string) {
        const member = await this.membersRepo.findOne({
            where: { id },
            relations: ['company'],
        });

        if (!member) return null;

        // Tenant Isolation Check
        if (!req.user.isSuperAdmin && member.companyId !== req.user.currentCompanyId) {
            throw new ForbiddenException('You do not have access to this member');
        }

        return member;
    }

    @Post()
    async createMember(@Body() data: Partial<Member>, @Request() req: any) {
        // Enforce current admin's company ID
        if (!req.user.isSuperAdmin) {
            data.companyId = req.user.currentCompanyId;
        }

        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }

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
        const member = await this.membersRepo.findOne({ where: { id } });
        if (!member) throw new ForbiddenException('Member not found');

        // Tenant Isolation Check
        if (!req.user.isSuperAdmin && member.companyId !== req.user.currentCompanyId) {
            throw new ForbiddenException('You do not have access to this member');
        }

        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }

        // Prevent moving member to another company
        if (data.companyId) {
            delete data.companyId;
        }

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
    async toggleStatus(
        @Param('id') id: string,
        @Body() body: { isActive?: boolean },
        @Request() req: any
    ) {
        await this.membersRepo.update(id, { isActive: body.isActive });
        return { message: 'Status updated' };
    }

    @Patch(':id/reset-password')
    async resetPassword(
        @Param('id') id: string,
        @Body() body: { password?: string },
        @Request() req: any
    ) {
        if (!body.password) {
            throw new Error('Password is required');
        }

        const hashedPassword = await bcrypt.hash(body.password, 10);
        await this.membersRepo.update(id, { password: hashedPassword });

        const updated = await this.membersRepo.findOne({ where: { id } });
        if (updated) {
            await this.auditLogService.create({
                userId: req.user.userId,
                userName: req.user.name,
                companyId: updated.companyId,
                module: 'Member',
                action: 'RESET_PASSWORD',
                payload: { id },
                result: { success: true },
            });
        }

        return { message: 'Password reset successfully' };
    }

    @Post(':id/impersonate')
    async impersonate(@Param('id') id: string) {
        // Generate a token for the member without password validation
        const result = await this.membersService.getImpersonationToken(id);

        // Return the token and a redirect URL for the frontend to use
        const webAppUrl = process.env.VITE_WEBAPP_BASE_URL || 'http://localhost:3102';
        const redirectUrl = `${webAppUrl}/login`;

        return {
            ...result,
            redirectUrl
        };
    }


    @Post(':id/adjust-credit')
    async adjustCredit(
        @Param('id') id: string,
        @Body() body: { amount: number; reason: string; type?: string },
        @Request() req: any
    ) {
        const member = await this.membersRepo.findOne({ where: { id } });
        if (!member) throw new ForbiddenException('Member not found');

        // Tenant Isolation Check
        if (!req.user.isSuperAdmin && member.companyId !== req.user.currentCompanyId) {
            throw new ForbiddenException('You do not have access to this member');
        }

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
        const [totalPlays, totalPointsData, gamesPlayedData] = await Promise.all([
            this.playAttemptsRepo.count({ where: { memberId: id } }),
            this.scoresRepo
                .createQueryBuilder('score')
                .where('score.memberId = :memberId', { memberId: id })
                .select('SUM(score.finalPoints)', 'sum')
                .getRawOne(),
            this.playAttemptsRepo
                .createQueryBuilder('attempt')
                .where('attempt.memberId = :memberId', { memberId: id })
                .select('COUNT(DISTINCT(attempt.instanceId))', 'count')
                .getRawOne(),
        ]);

        const totalPoints = totalPointsData?.sum ? parseInt(totalPointsData.sum, 10) : 0;
        const gamesPlayed = gamesPlayedData?.count ? parseInt(gamesPlayedData.count, 10) : 0;

        return {
            totalPlays,
            totalPoints,
            avgPointsPerPlay: totalPlays > 0 ? (totalPoints / totalPlays).toFixed(2) : 0,
            gamesPlayed,
        };
    }
    @Get(':id/prizes')
    async getMemberPrizes(@Param('id') id: string) {
        return this.memberPrizeRepo.find({
            where: { memberId: id },
            relations: ['instance', 'instance.company'],
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    @Delete(':id')
    @Roles(RoleLevel.COMPANY_ADMIN)
    async deleteMember(@Param('id') id: string, @Request() req: any) {
        const member = await this.membersRepo.findOne({ where: { id } });
        if (!member) throw new ForbiddenException('Member not found');

        // Tenant Isolation Check
        if (!req.user.isSuperAdmin && member.companyId !== req.user.currentCompanyId) {
            throw new ForbiddenException('You do not have access to this member');
        }

        // Check for related data
        const [scoreCount, playCount, txCount] = await Promise.all([
            this.scoresRepo.count({ where: { memberId: id } }),
            this.playAttemptsRepo.count({ where: { memberId: id } }),
            this.creditTransactionsRepo.count({ where: { memberId: id } }),
        ]);

        if (scoreCount > 0 || playCount > 0 || txCount > 0) {
            throw new Error('Cannot delete member with existing scores, play history, or transactions');
        }

        // Delete member
        await this.membersRepo.delete(id);

        await this.auditLogService.create({
            userId: req.user.userId,
            userName: req.user.name,
            companyId: member.companyId,
            module: 'Member',
            action: 'DELETE',
            payload: { id, username: member.username },
            result: { success: true },
        });

        return { success: true };
    }
}
