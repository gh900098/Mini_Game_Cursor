import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from './entities/score.entity';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { GameInstancesService } from '../game-instances/game-instances.service';
import { MembersService } from '../members/members.service';

@Injectable()
export class ScoresService {
    constructor(
        @InjectRepository(Score)
        private readonly scoreRepository: Repository<Score>,
        private readonly instanceService: GameInstancesService,
        private readonly membersService: MembersService,
    ) { }

    async submit(memberId: string, instanceSlug: string, scoreValue: number, metadata?: any): Promise<Score> {
        // 1. Find Game Instance
        const instance = await this.instanceService.findBySlug(instanceSlug);

        // 2. Log Score
        const score = this.scoreRepository.create({
            memberId,
            instanceId: instance.id,
            score: scoreValue,
            metadata,
        });
        const savedScore = await this.scoreRepository.save(score);

        // 3. Update Member's points balance (Atomic increment)
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
