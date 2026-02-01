import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from './entities/score.entity';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { GameInstancesService } from '../game-instances/game-instances.service';
import { MembersService } from '../members/members.service';
import { GameRulesService } from './game-rules.service';

@Injectable()
export class ScoresService {
    constructor(
        @InjectRepository(Score)
        private readonly scoreRepository: Repository<Score>,
        private readonly instanceService: GameInstancesService,
        private readonly membersService: MembersService,
        private readonly gameRulesService: GameRulesService,
    ) { }

    async submit(memberId: string, instanceSlug: string, scoreValue: number, metadata?: any, ipAddress?: string): Promise<Score> {
        // 1. Find Game Instance
        const instance = await this.instanceService.findBySlug(instanceSlug);

        // 2. Validate Game Rules (NEW!)
        await this.gameRulesService.validatePlay(memberId, instance);

        // 3. Log Score
        const score = this.scoreRepository.create({
            memberId,
            instanceId: instance.id,
            score: scoreValue,
            metadata,
        });
        const savedScore = await this.scoreRepository.save(score);

        // 4. Record Play Attempt (NEW!)
        await this.gameRulesService.recordAttempt(memberId, instance.id, true, ipAddress);

        // 5. Update Member's points balance (Atomic increment)
        await this.membersService.updatePoints(memberId, scoreValue);

        return savedScore;
    }

    async getLeaderboard(instanceSlug: string, limit = 10): Promise<Score[]> {
        const instance = await this.instanceService.findBySlug(instanceSlug);
        return this.scoreRepository.find({
            where: { instanceId: instance.id },
            relations: ['member'],
            order: { score: 'DESC' },
            take: limit,
        });
    }

    async getMemberHistory(memberId: string): Promise<Score[]> {
        return this.scoreRepository.find({
            where: { memberId },
            relations: ['instance', 'instance.gameTemplate'],
            order: { createdAt: 'DESC' },
        });
    }
}
