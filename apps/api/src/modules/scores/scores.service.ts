import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from './entities/score.entity';
import { PlayAttempt } from './entities/play-attempt.entity';
import { MemberPrize, PrizeStatus } from './entities/member-prize.entity';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { GameInstancesService } from '../game-instances/game-instances.service';
import { MembersService } from '../members/members.service';
import { GameRulesService } from './game-rules.service';
import { PrizesService } from '../prizes/prizes.service';
import { PrizeStrategyService } from '../prizes/prize-strategy.service';

@Injectable()
export class ScoresService {
    constructor(
        @InjectRepository(Score)
        private readonly scoreRepository: Repository<Score>,
        @InjectRepository(PlayAttempt)
        private readonly playAttemptsRepo: Repository<PlayAttempt>,
        @InjectRepository(MemberPrize)
        private readonly memberPrizeRepo: Repository<MemberPrize>,
        private readonly instanceService: GameInstancesService,
        private readonly membersService: MembersService,
        private readonly gameRulesService: GameRulesService,
        private readonly prizesService: PrizesService,
        private readonly strategyService: PrizeStrategyService,
    ) { }

    async submit(memberId: string, instanceSlug: string, scoreValue: number, metadata?: any, ipAddress?: string, isImpersonated: boolean = false, companyId?: string): Promise<Score> {
        // 1. Find Game Instance
        let instance;
        if (companyId) {
            // Find by company ID and slug
            instance = await this.instanceService.findByCompanyIdAndSlug(companyId, instanceSlug);
        } else {
            // Fallback for legacy global slugs
            instance = await this.instanceService.findBySlug(instanceSlug);
        }

        // If impersonated, return a mock score and skip all persistence/rule checks
        if (isImpersonated) {
            console.log(`[Impersonation] Bypassing scores/rules/points for member ${memberId}`);
            return {
                id: 'impersonated-test-id',
                memberId,
                instanceId: instance.id,
                score: scoreValue,
                metadata,
                createdAt: new Date(),
            } as Score;
        }

        // 2. Validate Game Rules (Normal Flow)
        await this.gameRulesService.validatePlay(memberId, instance);

        // 6. Apply VIP multiplier to score
        let finalPoints = scoreValue;
        let multiplier = 1;
        const member = await this.membersService.findById(memberId);
        if (member?.vipTier && instance.config?.vipTiers) {
            const vipConfig = instance.config.vipTiers.find((t: any) => t.name === member.vipTier);
            if (vipConfig?.multiplier) {
                multiplier = vipConfig.multiplier;
                finalPoints = Math.floor(scoreValue * multiplier);
            }
        }

        // Determine outcome
        const outcome = (metadata?.isLose || scoreValue === 0) ? 'lose' : 'win';

        // 3. Log Score
        const score = this.scoreRepository.create({
            memberId,
            instanceId: instance.id,
            score: scoreValue,
            metadata,
            multiplier,
            finalPoints,
        });
        const savedScore = await this.scoreRepository.save(score);

        // 4. Record Play Attempt
        const attempt = await this.gameRulesService.recordAttempt(memberId, instance.id, true, ipAddress, outcome, metadata);

        // 8. Record Member Prize if applicable
        if (metadata?.prizeIndex !== undefined && instance.config?.prizeList && !metadata?.isLose) {
            const prizeConfig = instance.config.prizeList[metadata.prizeIndex];
            if (prizeConfig) {
                const configTypeSlug = String(prizeConfig.type || prizeConfig.prizeType || 'points').toLowerCase();
                const prizeType = await this.prizesService.findBySlug(configTypeSlug);

                // Execute fulfillment strategy
                let status = PrizeStatus.PENDING;
                let fulfillmentNote = '';

                if (prizeType) {
                    const result = await this.strategyService.executeStrategy(
                        memberId,
                        prizeType,
                        prizeConfig.value || scoreValue,
                        { config: prizeConfig, metadata }
                    );
                    status = result.status as PrizeStatus;
                    fulfillmentNote = result.note || '';
                }

                const prize = this.memberPrizeRepo.create({
                    memberId,
                    instanceId: instance.id,
                    playAttemptId: attempt.id,
                    prizeId: String(metadata.prizeIndex),
                    prizeName: prizeConfig.name || prizeConfig.label || (prizeConfig.isJackpot ? 'JACKPOT' : 'Reward'),
                    prizeType: configTypeSlug,
                    prizeValue: prizeConfig.value || scoreValue,
                    status,
                    metadata: {
                        config: prizeConfig,
                        metadata,
                        note: fulfillmentNote
                    }
                });
                await this.memberPrizeRepo.save(prize);
            }
        }

        // 5. Update Budget (if prize has cost)
        if (metadata?.prizeIndex !== undefined && instance.config?.prizeList) {
            const prize = instance.config.prizeList[metadata.prizeIndex];
            if (prize?.cost) {
                await this.gameRulesService.updateBudget(instance.id, prize.cost);
            }
        }

        // 7. Update Member's points balance (Atomic increment/decrement)
        const costPerSpin = instance.config?.costPerSpin || 0;

        // Only credit points from SCORE if no prize logic was executed or if the prize logic didn't handle crediting.
        // However, since we now possess a robust PrizeStrategyService, we should rely on it for winnings.
        // If a prize was involved (prizeIndex exists), we assume the strategy handled the winnings (if any).
        // Therefore, we only deduct the cost.
        let netPointsChange = -costPerSpin;

        // Fallback: If this is a pure score-based game (no prizes involved), then the Score is the Winnings.
        // We detect this by checking if prizeIndex is missing.
        if (metadata?.prizeIndex === undefined) {
            netPointsChange += finalPoints;
        }

        if (netPointsChange !== 0) {
            await this.membersService.updatePoints(memberId, netPointsChange);
        }

        return savedScore;
    }

    async getLeaderboard(instanceSlug: string, limit = 10, companyId?: string): Promise<Score[]> {
        const instance = companyId
            ? await this.instanceService.findByCompanyIdAndSlug(companyId, instanceSlug)
            : await this.instanceService.findBySlug(instanceSlug);
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
