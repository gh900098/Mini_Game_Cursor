import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { GameInstance } from './entities/game-instance.entity';
import { Score } from '../scores/entities/score.entity';
import { BudgetTracking } from '../scores/entities/budget-tracking.entity';

import { PrizeType } from '../prizes/entities/prize-type.entity';

@Injectable()
export class GameInstancesService {
    constructor(
        @InjectRepository(GameInstance)
        private readonly instanceRepository: Repository<GameInstance>,
        @InjectRepository(Score)
        private readonly scoreRepository: Repository<Score>,
        @InjectRepository(BudgetTracking)
        private readonly budgetRepo: Repository<BudgetTracking>,
        @InjectRepository(PrizeType)
        private readonly prizeTypeRepo: Repository<PrizeType>,
    ) { }

    /**
     * Enrich the config with prize metadata (isPoints) for smarter masking
     */
    async enrichConfigWithPrizeMeta(instance: GameInstance, config: any): Promise<any> {
        if (!config.prizeList || !Array.isArray(config.prizeList)) return config;

        // Fetch all prize types for this company to look up "isPoints"
        const prizeTypes = await this.prizeTypeRepo.find({
            where: { companyId: instance.companyId } // Assuming tenant isolation
        });

        // Create a lookup map: prizeType slug -> isPoints
        const typeMap = new Map<string, boolean>();
        prizeTypes.forEach(pt => typeMap.set(pt.slug, pt.isPoints));

        // Enrich the prize list
        config.prizeList = config.prizeList.map((p: any) => {
            // Default to false if not found (safe assumption for "things")
            // If p.prizeType is missing, assume 'item' (false)
            // If p.prizeType is 'points' (hardcoded string), it's true
            const isPoints = typeMap.get(p.prizeType) || p.prizeType === 'points';
            return { ...p, isPoints };
        });

        return config;
    }

    /**
     * Lightweight check for budget exhaustion (for UI masking)
     */
    async isBudgetExhausted(instance: GameInstance): Promise<boolean> {
        const config = instance.config?.budgetConfig;
        if (!config?.enable) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Daily Budget
        if (config.dailyBudget) {
            const todayTracking = await this.budgetRepo.findOne({
                where: { instanceId: instance.id, trackingDate: today },
            });
            if (Number(todayTracking?.totalCost || 0) >= config.dailyBudget) return true;
        }

        // 2. Monthly Budget
        if (config.monthlyBudget) {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthTracking = await this.budgetRepo.createQueryBuilder('bt')
                .where('bt.instanceId = :instanceId', { instanceId: instance.id })
                .andWhere('bt.trackingDate >= :startOfMonth', { startOfMonth })
                .select('SUM(bt.totalCost)', 'total')
                .getRawOne();
            if (Number(monthTracking?.total || 0) >= config.monthlyBudget) return true;
        }

        // 3. Total/Activity Budget
        if (config.totalBudget) {
            const totalTracking = await this.budgetRepo.createQueryBuilder('bt')
                .where('bt.instanceId = :instanceId', { instanceId: instance.id })
                .select('SUM(bt.totalCost)', 'total')
                .getRawOne();
            if (Number(totalTracking?.total || 0) >= config.totalBudget) return true;
        }

        return false;
    }

    async create(data: Partial<GameInstance>): Promise<GameInstance> {
        if (data.slug && data.companyId) {
            data.slug = await this.ensureUniqueSlug(data.slug, data.companyId);
        }
        const instance = this.instanceRepository.create(data);
        return this.instanceRepository.save(instance);
    }

    async findBySlug(slug: string): Promise<GameInstance> {
        // Warning: This is now ambiguous if the same slug exists in multiple companies.
        // It's better to use findByCompanyAndSlug
        const instance = await this.instanceRepository.findOne({
            where: { slug },
            relations: ['gameTemplate', 'company']
        });
        if (!instance) {
            throw new NotFoundException(`Game instance with slug "${slug}" not found`);
        }
        return instance;
    }

    async findByCompanyAndSlug(companySlug: string, gameSlug: string): Promise<GameInstance> {
        const instance = await this.instanceRepository.findOne({
            where: {
                slug: gameSlug,
                company: { slug: companySlug }
            },
            relations: ['gameTemplate', 'company']
        });
        if (!instance) {
            throw new NotFoundException(`Game instance "${gameSlug}" not found for company "${companySlug}"`);
        }
        return instance;
    }

    async findByCompanyIdAndSlug(companyId: string, gameSlug: string): Promise<GameInstance> {
        const instance = await this.instanceRepository.findOne({
            where: {
                slug: gameSlug,
                companyId
            },
            relations: ['gameTemplate', 'company']
        });
        if (!instance) {
            throw new NotFoundException(`Game instance "${gameSlug}" not found for company ID "${companyId}"`);
        }
        return instance;
    }

    async findAll(): Promise<GameInstance[]> {
        return this.instanceRepository.find({
            relations: ['gameTemplate', 'company']
        });
    }

    async findAllByCompany(companyId: string): Promise<GameInstance[]> {
        return this.instanceRepository.find({
            where: { companyId },
            relations: ['gameTemplate', 'company']
        });
    }

    async findAllByCompanySlug(companySlug: string): Promise<GameInstance[]> {
        return this.instanceRepository.find({
            where: { company: { slug: companySlug }, isActive: true },
            relations: ['gameTemplate', 'company']
        });
    }

    async update(id: string, data: Partial<GameInstance>): Promise<GameInstance> {
        const instance = await this.instanceRepository.findOne({ where: { id } });
        if (!instance) throw new NotFoundException('Instance not found');

        // Prevent slug from being modified after creation
        if (data.slug) {
            delete data.slug;
        }

        Object.assign(instance, data);
        return this.instanceRepository.save(instance);
    }

    async remove(id: string): Promise<{ result: string, message: string }> {
        const instance = await this.instanceRepository.findOne({ where: { id } });
        if (!instance) throw new NotFoundException('Instance not found');

        // Check for existing game records
        const recordCount = await this.scoreRepository.count({ where: { instanceId: id } });

        if (recordCount > 0) {
            // Soft delete: Mark as inactive
            instance.isActive = false;
            await this.instanceRepository.save(instance);
            return { result: 'soft_delete', message: `Instance has ${recordCount} records. Marked as inactive.` };
        } else {
            // Hard delete
            await this.instanceRepository.remove(instance);
            return { result: 'hard_delete', message: 'Instance deleted permanently.' };
        }
    }

    async checkUsage(id: string): Promise<{ hasRecords: boolean, recordCount: number }> {
        const count = await this.scoreRepository.count({ where: { instanceId: id } });
        return { hasRecords: count > 0, recordCount: count };
    }

    /**
     * Get the effective config for a game instance by merging template and instance configs
     */
    async getEffectiveConfig(instance: GameInstance): Promise<Record<string, any>> {
        const templateConfig = instance.gameTemplate?.config || {};
        const instanceConfig = instance.config || {};
        const config = { ...templateConfig, ...instanceConfig };

        return this.enrichConfigWithPrizeMeta(instance, config);
    }

    /**
     * Validates if a slug is unique within a company and provides a suggestion if it's not
     */
    async validateSlug(slug: string, companyId: string, excludeId?: string): Promise<{ isAvailable: boolean; suggestedSlug: string }> {
        const query = this.instanceRepository.createQueryBuilder('instance')
            .where('instance.slug = :slug', { slug })
            .andWhere('instance.companyId = :companyId', { companyId });

        if (excludeId) {
            query.andWhere('instance.id != :id', { id: excludeId });
        }

        const existing = await query.getOne();

        if (!existing) {
            return { isAvailable: true, suggestedSlug: slug };
        }

        const suggestedSlug = await this.ensureUniqueSlug(slug, companyId, excludeId);
        return { isAvailable: false, suggestedSlug };
    }

    /**
     * Ensures that a slug is unique within a company by appending a random suffix if necessary
     */
    private async ensureUniqueSlug(slug: string, companyId: string, excludeId?: string): Promise<string> {
        let currentSlug = slug;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            const query = this.instanceRepository.createQueryBuilder('instance')
                .where('instance.slug = :slug', { slug: currentSlug })
                .andWhere('instance.companyId = :companyId', { companyId });

            if (excludeId) {
                query.andWhere('instance.id != :id', { id: excludeId });
            }

            const existing = await query.getOne();

            if (!existing) {
                isUnique = true;
            } else {
                // Append random 4-char suffix
                const suffix = Math.random().toString(36).substring(2, 6);
                currentSlug = `${slug}-${suffix}`;
                attempts++;
            }
        }

        return currentSlug;
    }
}
