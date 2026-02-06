import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameInstance } from './entities/game-instance.entity';
import { Score } from '../scores/entities/score.entity';

@Injectable()
export class GameInstancesService {
    constructor(
        @InjectRepository(GameInstance)
        private readonly instanceRepository: Repository<GameInstance>,
        @InjectRepository(Score)
        private readonly scoreRepository: Repository<Score>,
    ) { }

    async create(data: Partial<GameInstance>): Promise<GameInstance> {
        const instance = this.instanceRepository.create(data);
        return this.instanceRepository.save(instance);
    }

    async findBySlug(slug: string): Promise<GameInstance> {
        const instance = await this.instanceRepository.findOne({
            where: { slug },
            relations: ['gameTemplate', 'company']
        });
        if (!instance) {
            throw new NotFoundException(`Game instance with slug "${slug}" not found`);
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
        return { ...templateConfig, ...instanceConfig };
    }
}
