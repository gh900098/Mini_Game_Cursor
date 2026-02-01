import { Controller, Get, Post, Body, Param, UseGuards, Query, Request, Ip } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { GameRulesService } from './game-rules.service';
import { GameInstancesService } from '../game-instances/game-instances.service';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('scores')
export class ScoresController {
    constructor(
        private readonly scoresService: ScoresService,
        private readonly gameRulesService: GameRulesService,
        private readonly gameInstancesService: GameInstancesService,
    ) { }

    @Post(':instanceSlug')
    @UseGuards(JwtAuthGuard)
    submit(
        @Request() req: any,
        @Param('instanceSlug') instanceSlug: string,
        @Body() body: { score: number; metadata?: any },
        @Ip() ipAddress: string,
    ) {
        // req.user could be either an Admin (userId) or a Member (memberId)
        // For marketplace games, we expect a Member token
        const memberId = req.user.memberId;
        if (!memberId) {
            throw new Error('This endpoint requires a Member token');
        }
        return this.scoresService.submit(memberId, instanceSlug, body.score, body.metadata, ipAddress);
    }

    @Get('leaderboard/:instanceSlug')
    getLeaderboard(@Param('instanceSlug') instanceSlug: string, @Query('limit') limit?: number) {
        return this.scoresService.getLeaderboard(instanceSlug, limit);
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
        if (!memberId) {
            throw new Error('This endpoint requires a Member token');
        }
        
        const instance = await this.gameInstancesService.findBySlug(instanceSlug);
        return this.gameRulesService.getPlayerStatus(memberId, instance);
    }
}
