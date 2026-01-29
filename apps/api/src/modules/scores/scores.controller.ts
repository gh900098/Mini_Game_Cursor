import { Controller, Get, Post, Body, Param, UseGuards, Query, Request } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('scores')
export class ScoresController {
    constructor(private readonly scoresService: ScoresService) { }

    @Post(':instanceSlug')
    @UseGuards(JwtAuthGuard)
    submit(
        @Request() req: any,
        @Param('instanceSlug') instanceSlug: string,
        @Body() body: { score: number; metadata?: any }
    ) {
        // req.user could be either an Admin (userId) or a Member (memberId)
        // For marketplace games, we expect a Member token
        const memberId = req.user.memberId;
        if (!memberId) {
            throw new Error('This endpoint requires a Member token');
        }
        return this.scoresService.submit(memberId, instanceSlug, body.score, body.metadata);
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
}
