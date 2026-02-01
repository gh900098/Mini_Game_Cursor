import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { PlayAttempt } from './entities/play-attempt.entity';
import { BudgetTracking } from './entities/budget-tracking.entity';
import { Member } from '../members/entities/member.entity';
import { GameInstance } from '../game-instances/entities/game-instance.entity';
import { Score } from './entities/score.entity';

@Injectable()
export class GameRulesService {
  constructor(
    @InjectRepository(PlayAttempt)
    private playAttemptsRepo: Repository<PlayAttempt>,
    @InjectRepository(BudgetTracking)
    private budgetRepo: Repository<BudgetTracking>,
    @InjectRepository(Member)
    private membersRepo: Repository<Member>,
    @InjectRepository(Score)
    private scoresRepo: Repository<Score>,
  ) {}

  /**
   * 验证所有规则（在玩游戏前调用）
   */
  async validatePlay(memberId: string, instance: GameInstance): Promise<void> {
    // 高优先级规则（必须全部通过）
    await this.checkTimeLimit(instance);
    await this.checkOneTimeOnly(memberId, instance);
    await this.checkDailyLimit(memberId, instance);
    await this.checkCooldown(memberId, instance);

    // 中优先级规则
    await this.checkMinLevel(memberId, instance);
    await this.checkBudget(instance);
  }

  /**
   * 记录游戏尝试
   */
  async recordAttempt(
    memberId: string,
    instanceId: string,
    success: boolean = true,
    ipAddress?: string,
  ): Promise<PlayAttempt> {
    const attempt = this.playAttemptsRepo.create({
      memberId,
      instanceId,
      success,
      ipAddress,
    });

    return this.playAttemptsRepo.save(attempt);
  }

  /**
   * 规则1: 每日次数限制
   */
  async checkDailyLimit(memberId: string, instance: GameInstance): Promise<void> {
    const dailyLimit = instance.config?.dailyLimit || 0;

    // 0 = 无限制
    if (dailyLimit === 0) return;

    // 查询今天玩了几次
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.playAttemptsRepo.count({
      where: {
        memberId,
        instanceId: instance.id,
        attemptedAt: MoreThanOrEqual(startOfDay),
        success: true,
      },
    });

    // 应用VIP加成
    let effectiveLimit = dailyLimit;
    const member = await this.membersRepo.findOne({ where: { id: memberId } });
    if (member?.vipTier && instance.config?.vipTiers) {
      const vipConfig = instance.config.vipTiers.find((t: any) => t.name === member.vipTier);
      if (vipConfig) {
        effectiveLimit += vipConfig.extraSpins || 0;
      }
    }

    if (count >= effectiveLimit) {
      const tomorrow = new Date(startOfDay);
      tomorrow.setDate(tomorrow.getDate() + 1);

      throw new BadRequestException({
        code: 'DAILY_LIMIT_REACHED',
        message: `您今天的游戏次数已用完（${effectiveLimit}次/天）`,
        resetAt: tomorrow.toISOString(),
        remaining: 0,
        limit: effectiveLimit,
      });
    }
  }

  /**
   * 规则2: 冷却时间
   */
  async checkCooldown(memberId: string, instance: GameInstance): Promise<void> {
    const cooldown = instance.config?.cooldown || 0; // 秒

    // 0 = 无冷却
    if (cooldown === 0) return;

    // 查询上次玩的时间
    const lastAttempt = await this.playAttemptsRepo.findOne({
      where: {
        memberId,
        instanceId: instance.id,
        success: true,
      },
      order: { attemptedAt: 'DESC' },
    });

    if (!lastAttempt) return; // 第一次玩，无需冷却

    const elapsed = Date.now() - lastAttempt.attemptedAt.getTime();
    const remaining = cooldown * 1000 - elapsed;

    if (remaining > 0) {
      throw new BadRequestException({
        code: 'COOLDOWN_ACTIVE',
        message: `请等待${Math.ceil(remaining / 1000)}秒后再玩`,
        cooldownSeconds: cooldown,
        remainingSeconds: Math.ceil(remaining / 1000),
        canPlayAt: new Date(Date.now() + remaining).toISOString(),
      });
    }
  }

  /**
   * 规则3: 只能玩一次
   */
  async checkOneTimeOnly(memberId: string, instance: GameInstance): Promise<void> {
    const oneTimeOnly = instance.config?.oneTimeOnly || false;

    if (!oneTimeOnly) return;

    // 检查是否玩过
    const hasPlayed = await this.playAttemptsRepo.exists({
      where: {
        memberId,
        instanceId: instance.id,
        success: true,
      },
    });

    if (hasPlayed) {
      throw new BadRequestException({
        code: 'ALREADY_PLAYED',
        message: '您已经玩过此游戏，每人仅限一次机会',
      });
    }
  }

  /**
   * 规则4: 时间限制
   */
  async checkTimeLimit(instance: GameInstance): Promise<void> {
    const config = instance.config?.timeLimitConfig;

    if (!config?.enable) return;

    const now = new Date();

    // 检查日期范围
    if (config.startTime && now < new Date(config.startTime)) {
      throw new BadRequestException({
        code: 'NOT_STARTED',
        message: '活动尚未开始',
        startTime: config.startTime,
      });
    }

    if (config.endTime && now > new Date(config.endTime)) {
      throw new BadRequestException({
        code: 'ENDED',
        message: '活动已结束',
        endTime: config.endTime,
      });
    }

    // 检查星期几
    if (config.activeDays && config.activeDays.length > 0) {
      const today = now.getDay(); // 0-6

      if (!config.activeDays.includes(today)) {
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const activeDayNames = config.activeDays.map((d: number) => dayNames[d]);

        throw new BadRequestException({
          code: 'INVALID_DAY',
          message: `此游戏仅在${activeDayNames.join('、')}开放`,
          activeDays: config.activeDays,
        });
      }
    }
  }

  /**
   * 规则5: 等级要求（中优先级，暂时注释）
   */
  async checkMinLevel(memberId: string, instance: GameInstance): Promise<void> {
    const minLevel = instance.config?.minLevel || 0;

    if (minLevel === 0) return; // 无等级要求

    const member = await this.membersRepo.findOne({
      where: { id: memberId },
      select: ['level'],
    });

    if (!member || member.level < minLevel) {
      throw new ForbiddenException({
        code: 'LEVEL_TOO_LOW',
        message: `此游戏需要达到等级${minLevel}`,
        required: minLevel,
        current: member?.level || 1,
        missing: minLevel - (member?.level || 1),
      });
    }
  }

  /**
   * 规则6: 预算控制（中优先级，暂时注释）
   */
  async checkBudget(instance: GameInstance): Promise<void> {
    const config = instance.config?.budgetConfig;

    if (!config?.enable) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 查询今日消耗
    const todayTracking = await this.budgetRepo.findOne({
      where: {
        instanceId: instance.id,
        trackingDate: today,
      },
    });

    const dailySpent = todayTracking?.totalCost || 0;

    // 检查每日预算
    if (config.dailyBudget && dailySpent >= config.dailyBudget) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      throw new BadRequestException({
        code: 'DAILY_BUDGET_EXCEEDED',
        message: '今日预算已用完，明天再来吧',
        dailyBudget: config.dailyBudget,
        spent: dailySpent,
        resetAt: tomorrow.toISOString(),
      });
    }
  }

  /**
   * 更新预算（在玩家赢奖后调用）
   */
  async updateBudget(instanceId: string, prizeCost: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upsert budget tracking
    const existingTracking = await this.budgetRepo.findOne({
      where: {
        instanceId,
        trackingDate: today,
      },
    });

    if (existingTracking) {
      existingTracking.totalCost = Number(existingTracking.totalCost) + prizeCost;
      existingTracking.playCount += 1;
      await this.budgetRepo.save(existingTracking);
    } else {
      const tracking = this.budgetRepo.create({
        instanceId,
        trackingDate: today,
        totalCost: prizeCost,
        playCount: 1,
      });
      await this.budgetRepo.save(tracking);
    }
  }

  /**
   * 规则7: 动态概率调整（保底机制）
   */
  async getDynamicWeights(
    memberId: string,
    instance: GameInstance,
    baseWeights: number[],
  ): Promise<number[]> {
    const config = instance.config?.dynamicProbConfig;

    if (!config?.enable) return baseWeights;

    // 查询最近的游戏记录
    const recentScores = await this.playAttemptsRepo
      .createQueryBuilder('attempt')
      .leftJoin('scores', 'score', 'score.memberId = attempt.memberId AND score.instanceId = attempt.instanceId')
      .where('attempt.memberId = :memberId', { memberId })
      .andWhere('attempt.instanceId = :instanceId', { instanceId: instance.id })
      .andWhere('attempt.success = :success', { success: true })
      .orderBy('attempt.attemptedAt', 'DESC')
      .limit(10)
      .select(['attempt.id', 'score.metadata'])
      .getRawMany();

    // 计算连输次数
    let lossStreak = 0;
    for (const record of recentScores) {
      if (record.score_metadata?.isLose) {
        lossStreak++;
      } else {
        break; // 赢了一次，连输中断
      }
    }

    // 未达到连输阈值
    if (lossStreak < config.lossStreakLimit) {
      return baseWeights;
    }

    // 调整权重：降低输奖品概率，提高赢奖品概率
    const adjustedWeights = baseWeights.map((weight, idx) => {
      const prize = instance.config?.prizeList?.[idx];
      if (prize?.isLose) {
        return weight * 0.5; // 输奖品概率减半
      } else {
        return weight * (1 + config.lossStreakBonus / 100); // 赢奖品概率增加
      }
    });

    console.log(
      `[DynamicProb] User ${memberId} loss streak: ${lossStreak}, adjusting weights`,
    );

    return adjustedWeights;
  }

  /**
   * 获取玩家当前状态（用于前端显示）
   */
  async getPlayerStatus(memberId: string, instance: GameInstance): Promise<any> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const dailyLimit = instance.config?.dailyLimit || 0;
    const played = await this.playAttemptsRepo.count({
      where: {
        memberId,
        instanceId: instance.id,
        attemptedAt: MoreThanOrEqual(startOfDay),
        success: true,
      },
    });

    // 应用VIP加成
    let effectiveLimit = dailyLimit;
    const member = await this.membersRepo.findOne({ where: { id: memberId } });
    if (member?.vipTier && instance.config?.vipTiers) {
      const vipConfig = instance.config.vipTiers.find((t: any) => t.name === member.vipTier);
      if (vipConfig) {
        effectiveLimit += vipConfig.extraSpins || 0;
      }
    }

    const tomorrow = new Date(startOfDay);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check all rules to determine if player can play
    let canPlay = effectiveLimit === 0 || played < effectiveLimit;
    let blockReason = null;
    let blockDetails: any = {};

    // Check minLevel rule
    if (canPlay && instance.config?.minLevel) {
      if (!member || member.level < instance.config.minLevel) {
        canPlay = false;
        blockReason = 'LEVEL_TOO_LOW';
        blockDetails = {
          required: instance.config.minLevel,
          current: member?.level || 0,
          missing: instance.config.minLevel - (member?.level || 0),
        };
      }
    }

    // Check timeLimit rule
    if (canPlay && instance.config?.timeLimitConfig?.enable) {
      const now = new Date();
      const config = instance.config.timeLimitConfig;

      // Check date range
      if (config.startTime && new Date(config.startTime) > now) {
        canPlay = false;
        blockReason = 'NOT_STARTED';
        blockDetails = { startTime: config.startTime };
      } else if (config.endTime && new Date(config.endTime) < now) {
        canPlay = false;
        blockReason = 'ENDED';
        blockDetails = { endTime: config.endTime };
      }

      // Check active days
      if (canPlay && config.activeDays && config.activeDays.length > 0) {
        const dayOfWeek = now.getDay();
        if (!config.activeDays.includes(dayOfWeek)) {
          canPlay = false;
          blockReason = 'INVALID_DAY';
          blockDetails = { activeDays: config.activeDays };
        }
      }
    }

    // Check cooldown (if recently played)
    if (canPlay) {
      const lastAttempt = await this.playAttemptsRepo.findOne({
        where: { memberId, instanceId: instance.id },
        order: { attemptedAt: 'DESC' },
      });

      if (lastAttempt && instance.config?.cooldown) {
        const secondsSince = (Date.now() - lastAttempt.attemptedAt.getTime()) / 1000;
        const cooldownRemaining = Math.max(0, instance.config.cooldown - secondsSince);
        if (cooldownRemaining > 0) {
          blockDetails.cooldownRemaining = Math.ceil(cooldownRemaining);
        }
      }
    }

    // Check oneTimeOnly rule for display
    const oneTimeOnly = instance.config?.oneTimeOnly || false;
    let hasPlayedEver = false;
    if (oneTimeOnly) {
      hasPlayedEver = await this.playAttemptsRepo.exists({
        where: {
          memberId,
          instanceId: instance.id,
          success: true,
        },
      });
      
      // If user has played and oneTimeOnly is enabled, block them
      if (canPlay && hasPlayedEver) {
        canPlay = false;
        blockReason = 'ALREADY_PLAYED';
        blockDetails = { message: '您已经玩过此游戏，每人仅限一次机会' };
      }
    }

    // Determine if currently in active time (for UI coloring)
    let isInActiveTime = true;
    if (instance.config?.timeLimitConfig?.enable) {
      const now = new Date();
      const config = instance.config.timeLimitConfig;

      // Check date range
      if (config.startTime && new Date(config.startTime) > now) {
        isInActiveTime = false;
      } else if (config.endTime && new Date(config.endTime) < now) {
        isInActiveTime = false;
      }

      // Check active days
      if (isInActiveTime && config.activeDays && config.activeDays.length > 0) {
        const dayOfWeek = now.getDay();
        if (!config.activeDays.includes(dayOfWeek)) {
          isInActiveTime = false;
        }
      }
    }

    const result: any = {
      canPlay,
      dailyLimit: effectiveLimit,
      played,
      remaining: effectiveLimit === 0 ? -1 : Math.max(0, effectiveLimit - played),
      resetAt: tomorrow.toISOString(),
      // Additional info for UI
      oneTimeOnly,
      hasPlayedEver,
      timeLimitConfig: instance.config?.timeLimitConfig || null,
      isInActiveTime,
    };

    if (!canPlay && blockReason) {
      result.blockReason = blockReason;
      result.blockDetails = blockDetails;
    }

    if (blockDetails.cooldownRemaining) {
      result.cooldownRemaining = blockDetails.cooldownRemaining;
    }

    return result;
  }
}
