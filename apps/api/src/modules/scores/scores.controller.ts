import { Controller, Get, Post, Body, Param, UseGuards, Query, Request, ForbiddenException } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { GameRulesService } from './game-rules.service';
import { GameInstancesService } from '../game-instances/game-instances.service';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { getClientIp } from '../../common/utils/ip-utils';

@Controller('scores')
export class ScoresController {
    constructor(
        private readonly scoresService: ScoresService,
        private readonly gameRulesService: GameRulesService,
        private readonly gameInstancesService: GameInstancesService,
    ) { }

    @Post(':instanceSlug')
    @UseGuards(JwtAuthGuard)
    async submit(
        @Request() req: any,
        @Param('instanceSlug') instanceSlug: string,
        @Body() body: { score: number; metadata?: any },
    ) {
        const memberId = req.user.memberId;
        const companyId = req.user.companyId;
        const ipAddress = getClientIp(req);
        if (!memberId) {
            throw new Error('This endpoint requires a Member token');
        }

        const instance = await this.gameInstancesService.findBySlug(instanceSlug);

        // Tenant Isolation Check
        if (!req.user.isSuperAdmin && instance.companyId !== companyId) {
            throw new ForbiddenException('You do not have access to this game instance');
        }

        return this.scoresService.submit(memberId, instanceSlug, body.score, body.metadata, ipAddress, req.user.isImpersonated, companyId);
    }

    @Get('leaderboard/:instanceSlug')
    @UseGuards(JwtAuthGuard)
    async getLeaderboard(@Request() req: any, @Param('instanceSlug') instanceSlug: string, @Query('limit') limit?: number) {
        const companyId = req.user.companyId;
        const instance = await this.gameInstancesService.findBySlug(instanceSlug);

        // Tenant Isolation Check
        if (!req.user.isSuperAdmin && instance.companyId !== companyId) {
            throw new ForbiddenException('You do not have access to this leaderboard');
        }

        return this.scoresService.getLeaderboard(instanceSlug, limit, companyId);
    }

    @Get('leaderboard/c/:companySlug/:gameSlug')
    @UseGuards(JwtAuthGuard)
    async getLeaderboardByCompany(
        @Request() req: any,
        @Param('companySlug') companySlug: string,
        @Param('gameSlug') gameSlug: string,
        @Query('limit') limit?: number
    ) {
        const companyId = req.user.companyId;
        const instance = await this.gameInstancesService.findByCompanyAndSlug(companySlug, gameSlug);

        // Tenant Isolation Check
        if (!req.user.isSuperAdmin && instance.companyId !== companyId) {
            throw new ForbiddenException('You do not have access to this leaderboard');
        }

        return this.scoresService.getLeaderboard(gameSlug, limit, instance.companyId);
    }

    @Get('my-scores')
    @UseGuards(JwtAuthGuard)
    getMyScores(@Request() req: any) {
        const memberId = req.user.memberId;
        if (!memberId) {
            throw new Error('This endpoint requires a Member token');
        }
        return this.scoresService.getMemberHistory(memberId);
    }

    @Get('status/:instanceSlug')
    @UseGuards(JwtAuthGuard)
    async getGameStatus(@Request() req: any, @Param('instanceSlug') instanceSlug: string) {
        const memberId = req.user.memberId;
        const companyId = req.user.companyId;
        if (!memberId) {
            throw new Error('This endpoint requires a Member token');
        }

        const instance = await this.gameInstancesService.findBySlug(instanceSlug);

        // Tenant Isolation Check
        if (!req.user.isSuperAdmin && instance.companyId !== companyId) {
            throw new ForbiddenException('You do not have access to this game instance');
        }

        return this.gameRulesService.getPlayerStatus(memberId, instance, req.user.isImpersonated);
    }

    @Get('status/c/:companySlug/:gameSlug')
    @UseGuards(JwtAuthGuard)
    async getGameStatusByCompany(
        @Request() req: any,
        @Param('companySlug') companySlug: string,
        @Param('gameSlug') gameSlug: string
    ) {
        const memberId = req.user.memberId;
        const companyId = req.user.companyId;
        if (!memberId) {
            throw new Error('This endpoint requires a Member token');
        }

        const instance = await this.gameInstancesService.findByCompanyAndSlug(companySlug, gameSlug);

        // Tenant Isolation Check
        if (!req.user.isSuperAdmin && instance.companyId !== companyId) {
            throw new ForbiddenException('You do not have access to this game instance');
        }

        return this.gameRulesService.getPlayerStatus(memberId, instance, req.user.isImpersonated);
    }
}
