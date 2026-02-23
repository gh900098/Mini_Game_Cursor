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
  ) {}

  /**
   * Determine the correct prize value based on prize type
   */
  private getPrizeValue(
    prizeType: any,
    configValue: number | undefined,
    scoreValue: number,
  ): number {
    // If it's a points-bearing prize, using the scoreValue is usually correct if configValue is missing
    if (prizeType?.isPoints) {
      return configValue ?? scoreValue;
    }

    // For non-points prizes (Item, Cash, etc.), use explicit config value or 0
    return configValue ?? 0;
  }

  async submit(
    memberId: string,
    instanceSlug: string,
    scoreValue: number,
    metadata?: any,
    ipAddress?: string,
    isImpersonated: boolean = false,
    companyId?: string,
  ): Promise<Score> {
    // 1. Find Game Instance
    let instance;
    if (companyId) {
      // Find by company ID and slug
      instance = await this.instanceService.findByCompanyIdAndSlug(
        companyId,
        instanceSlug,
      );
    } else {
      // Fallback for legacy global slugs
      instance = await this.instanceService.findBySlug(instanceSlug);
    }

    // If impersonated, return a mock score and skip all persistence/rule checks
    if (isImpersonated) {
      console.log(
        `[Impersonation] Bypassing scores/rules/points for member ${memberId}`,
      );
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
    await this.gameRulesService.validatePlay(
      memberId,
      instance,
      isImpersonated,
    );

    // 6. Apply VIP multiplier to score
    let finalPoints = scoreValue;
    let multiplier = 1;
    const member = await this.membersService.findById(memberId);
    if (member?.vipTier && instance.config?.vipTiers) {
      const vipConfig = instance.config.vipTiers.find(
        (t: any) => t.name === member.vipTier,
      );
      if (vipConfig?.multiplier) {
        multiplier = vipConfig.multiplier;
        finalPoints = Math.floor(scoreValue * multiplier);
      }
    }

    // 7. Resolve Prize Type (if applicable) early to determine if this is a "Points" win
    let prizeType: any = null;
    let prizeConfig: any = null;
    let isPointsPrize = true; // Default to true for pure score games

    if (
      metadata?.prizeIndex !== undefined &&
      instance.config?.prizeList &&
      !metadata?.isLose
    ) {
      prizeConfig = instance.config.prizeList[metadata.prizeIndex];

      // 7.1 Enterprise: Soft-Landing Prize Filtering (Budget-Aware)
      // If budget is hit AND mode is 'soft', strictly block any prize with cost > 0
      if (prizeConfig && instance.config?.budgetConfig?.enable) {
        const isSoftMode =
          instance.config.budgetConfig.exhaustionMode === 'soft';
        if (isSoftMode) {
          const isExhausted =
            await this.gameRulesService.isBudgetExhausted(instance);
          if (isExhausted) {
            const attemptedPrizeCost = Number(prizeConfig.cost || 0);
            if (attemptedPrizeCost > 0) {
              console.warn(
                `[SoftLanding] Blocking high-cost prize (${prizeConfig.label}) due to budget exhaustion. Converting to points.`,
              );

              // Forcibly neutralize the prize for safety
              prizeConfig = {
                ...prizeConfig,
                cost: 0,
                prizeType: 'points',
                isPoints: true,
                label: `${prizeConfig.label || 'Reward'} (Social Mode)`,
              };
              metadata.prize = prizeConfig.label;
              metadata.convertedToPoints = true;
            }
          }
        }
      }

      if (prizeConfig) {
        const configTypeSlug = String(
          prizeConfig.type || prizeConfig.prizeType || 'points',
        ).toLowerCase();
        prizeType = await this.prizesService.findBySlug(configTypeSlug);
        if (prizeType) {
          isPointsPrize = prizeType.isPoints;
        } else {
          // Fallback for unknown types - check hardcoded list if prize object doesn't exist yet
          const nonMonetaryTypes = [
            'item',
            'physical',
            'egift',
            'e-gift',
            'voucher',
            'cash',
          ];
          isPointsPrize = !nonMonetaryTypes.includes(configTypeSlug);
        }

        // Phase 4: Enrich metadata if prize name is missing but it's a win
        if (metadata && !metadata.isLose && !metadata.prize) {
          metadata.prize =
            prizeConfig.label ||
            prizeConfig.prizeName ||
            prizeConfig.type ||
            prizeConfig.prizeType ||
            'Win';
        }
      }
    }

    // If it's a win but NOT a points prize, set finalPoints to 0 for statistics
    if (metadata?.prizeIndex !== undefined && !isPointsPrize) {
      finalPoints = 0;
    }

    // Determine outcome
    const outcome = metadata?.isLose || scoreValue === 0 ? 'lose' : 'win';

    // 3. Log Score
    const score = this.scoreRepository.create({
      memberId,
      instanceId: instance.id,
      score: scoreValue,
      metadata,
      multiplier,
      finalPoints,
    });

    // 7. Determine Token Cost (moved up so it can be recorded in the score entity)
    // Flexible Token Consumption Hierarchy:
    // 1. Instance Config Override (costPerSpin)
    // 2. Company Default Setting (defaultTokenCost)
    // 3. Global Fallback (10)
    let costPerSpin = 10;
    if (instance.config?.costPerSpin !== undefined) {
      costPerSpin = Number(instance.config.costPerSpin);
    } else if (instance.company?.settings?.defaultTokenCost !== undefined) {
      costPerSpin = Number(instance.company.settings.defaultTokenCost);
    }

    score.tokenCost = costPerSpin;
    const savedScore = await this.scoreRepository.save(score);

    // 4. Record Play Attempt
    const attempt = await this.gameRulesService.recordAttempt(
      memberId,
      instance.id,
      true,
      ipAddress,
      outcome,
      metadata,
    );

    const isSocialMode = !!metadata?.convertedToPoints;

    // 8. Record Member Prize if applicable
    if (prizeConfig && !metadata?.isLose && !isSocialMode) {
      // Execute fulfillment strategy
      let status = PrizeStatus.PENDING;
      let fulfillmentNote = '';

      if (prizeType) {
        const result = await this.strategyService.executeStrategy(
          memberId,
          prizeType,
          prizeConfig.value || scoreValue,
          { config: prizeConfig, metadata },
        );
        status = result.status as PrizeStatus;
        fulfillmentNote = result.note || '';
      }

      const prize = this.memberPrizeRepo.create({
        memberId,
        instanceId: instance.id,
        playAttemptId: attempt.id,
        prizeId: String(metadata.prizeIndex),
        prizeName:
          prizeConfig.name ||
          prizeConfig.label ||
          (prizeConfig.isJackpot ? 'JACKPOT' : 'Reward'),
        prizeType: prizeType?.slug || 'points',
        prizeValue: this.getPrizeValue(
          prizeType,
          prizeConfig.value,
          scoreValue,
        ),
        status,
        metadata: {
          config: prizeConfig,
          metadata,
          note: fulfillmentNote,
        },
      });
      await this.memberPrizeRepo.save(prize);
    }

    // 5. Update Budget (Track play count and cost)
    // Enterprise Logic: If 'cost' is missing for Cash prizes, fallback to 'value'
    let budgetCost = 0;
    if (prizeConfig && !metadata?.isLose) {
      if (prizeConfig.cost !== undefined) {
        budgetCost = Number(prizeConfig.cost);
      } else if (
        prizeType?.slug === 'cash' ||
        String(prizeConfig.type || '').toLowerCase() === 'cash'
      ) {
        budgetCost = Number(prizeConfig.value || 0);
      } else {
        budgetCost = 0; // Items/E-gifts require explicit cost or they are treated as $0 for budget
      }
    }

    await this.gameRulesService.updateBudget(instance.id, budgetCost, {
      type: 'SCORE',
      id: savedScore.id,
      metadata: {
        prizeIndex: metadata?.prizeIndex,
        prizeName:
          prizeConfig?.name ||
          prizeConfig?.label ||
          (metadata?.isLose ? 'Lose' : 'Win'),
        isLose: metadata?.isLose,
      },
    });

    // 8. Update Member's points balance (Atomic increment/decrement)
    // Only credit points from SCORE if no prize logic was executed or if the prize logic didn't handle crediting.
    // If a prize was involved (prizeIndex exists), we assume the strategy handled the winnings (if any).
    // Therefore, we only deduct the cost.
    let netPointsChange = -costPerSpin;

    // Fallback: If this is a pure score-based game (no prizes involved), then the Score is the Winnings.
    // We detect this by checking if prizeIndex is missing.
    // Safety: If in Social Mode, NEVER credit points back from the score.
    if (metadata?.prizeIndex === undefined && !isSocialMode) {
      netPointsChange += Number(finalPoints);
    }

    if (netPointsChange !== 0) {
      await this.membersService.updatePoints(memberId, netPointsChange);
    }

    return savedScore;
  }

  async getLeaderboard(
    instanceSlug: string,
    limit = 10,
    companyId?: string,
  ): Promise<Score[]> {
    const instance = companyId
      ? await this.instanceService.findByCompanyIdAndSlug(
          companyId,
          instanceSlug,
        )
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
