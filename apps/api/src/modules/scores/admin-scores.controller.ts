import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, RoleLevel } from '../../common/decorators/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from './entities/score.entity';
import { PlayAttempt } from './entities/play-attempt.entity';
import { BudgetTracking } from './entities/budget-tracking.entity';

@Controller('admin/scores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleLevel.STAFF)
export class AdminScoresController {
    constructor(
        private readonly scoresService: ScoresService,
        @InjectRepository(Score)
        private scoresRepo: Repository<Score>,
        @InjectRepository(PlayAttempt)
        private playAttemptsRepo: Repository<PlayAttempt>,
        @InjectRepository(BudgetTracking)
        private budgetTrackingRepo: Repository<BudgetTracking>,
    ) { }

    @Get('all')
    async getAllScores(@Query('companyId') companyId?: string) {
        const query = this.scoresRepo
            .createQueryBuilder('score')
            .leftJoinAndSelect('score.member', 'member')
            .leftJoinAndSelect('score.instance', 'instance')
            .leftJoinAndSelect('instance.company', 'company')
            .orderBy('score.createdAt', 'DESC')
            .take(1000); // Limit for performance

        if (companyId) {
            query.where('company.id = :companyId', { companyId });
        }

        return query.getMany();
    }

    @Get('play-attempts')
    async getPlayAttempts(@Query('companyId') companyId?: string) {
        const query = this.playAttemptsRepo
            .createQueryBuilder('attempt')
            .leftJoinAndSelect('attempt.member', 'member')
            .leftJoinAndSelect('attempt.instance', 'instance')
            .leftJoinAndSelect('instance.company', 'company')
            .orderBy('attempt.attemptedAt', 'DESC')
            .take(1000);

        if (companyId) {
            query.where('company.id = :companyId', { companyId });
        }

        return query.getMany();
    }

    @Get('budget-tracking')
    async getBudgetTracking(@Query('companyId') companyId?: string) {
        const query = this.budgetTrackingRepo
            .createQueryBuilder('budget')
            .leftJoinAndSelect('budget.instance', 'instance')
            .leftJoinAndSelect('instance.company', 'company')
            .orderBy('budget.trackingDate', 'DESC')
            .take(100);

        if (companyId) {
            query.where('company.id = :companyId', { companyId });
        }

        return query.getMany();
    }

    @Get('stats')
    async getStats(@Query('companyId') companyId?: string) {
        // Get overall statistics
        const scoresQuery = this.scoresRepo.createQueryBuilder('score');
        const attemptsQuery = this.playAttemptsRepo.createQueryBuilder('attempt');

        if (companyId) {
            scoresQuery
                .leftJoin('score.instance', 'instance')
                .leftJoin('instance.company', 'company')
                .where('company.id = :companyId', { companyId });

            attemptsQuery
                .leftJoin('attempt.instance', 'instance')
                .leftJoin('instance.company', 'company')
                .where('company.id = :companyId', { companyId });
        }

        const totalScores = await scoresQuery.getCount();
        const totalAwardedPointsRaw = await scoresQuery.select('SUM(score.finalPoints)', 'sum').getRawOne();
        const totalAwardedPoints = Number(totalAwardedPointsRaw?.sum || 0);

        const totalAttempts = await attemptsQuery.getCount();
        const successfulAttempts = await attemptsQuery.where('attempt.success = true').getCount();

        return {
            totalScores,
            totalAwardedPoints,
            totalAttempts,
            successfulAttempts,
            successRate: totalAttempts > 0 ? Number((successfulAttempts / totalAttempts * 100).toFixed(2)) : 0,
        };
    }
}
