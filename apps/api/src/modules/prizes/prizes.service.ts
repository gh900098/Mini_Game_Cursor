import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PrizeType, PrizeStrategy } from './entities/prize-type.entity';

@Injectable()
export class PrizesService {
    private readonly logger = new Logger(PrizesService.name);

    constructor(
        @InjectRepository(PrizeType)
        private readonly prizeTypeRepo: Repository<PrizeType>,
    ) { }

    async findAll(companyId?: string) {
        const isValidTenant = typeof companyId === 'string' && companyId.trim().length > 0;
        const where: any = isValidTenant ? [
            { companyId: companyId, isActive: true },
            { companyId: IsNull(), isActive: true }
        ] : { companyId: IsNull(), isActive: true };

        return this.prizeTypeRepo.find({
            where,
            order: { name: 'ASC' }
        });
    }

    private isUuid(id: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }

    async findBySlug(slug: string, companyId?: string) {
        const isValidTenant = typeof companyId === 'string' && companyId.trim().length > 0;
        const where: any = isValidTenant ? [
            { slug, companyId, isActive: true },
            { slug, companyId: IsNull(), isActive: true }
        ] : { slug, companyId: IsNull(), isActive: true };

        return this.prizeTypeRepo.findOne({
            where,
            order: { companyId: 'DESC' } // Prefer tenant-specific over global
        });
    }

    async create(data: Partial<PrizeType>) {
        // Clean up empty strings that might have been sent from the frontend
        if (data.id === '') delete data.id;
        if (data.companyId === '') data.companyId = null;

        const type = this.prizeTypeRepo.create(data);
        return this.prizeTypeRepo.save(type);
    }

    async resolveType(idOrSlug: string, companyId?: string): Promise<PrizeType> {
        if (this.isUuid(idOrSlug)) {
            const type = await this.prizeTypeRepo.findOne({ where: { id: idOrSlug } });
            if (type) return type;
        }

        // Fallback to slug lookup if not a UUID or ID not found
        const type = await this.findBySlug(idOrSlug, companyId);
        if (!type) throw new NotFoundException(`Prize type ${idOrSlug} not found`);
        return type;
    }

    async findOne(id: string) {
        if (!this.isUuid(id)) throw new NotFoundException('Invalid prize type ID');
        const type = await this.prizeTypeRepo.findOne({ where: { id } });
        if (!type) throw new NotFoundException('Prize type not found');
        return type;
    }

    async update(idOrSlug: string, data: Partial<PrizeType>, companyId?: string) {
        // Clean up empty strings that might have been sent from the frontend
        if (data.id === '') delete data.id;
        if (data.companyId === '') data.companyId = null;

        const type = await this.resolveType(idOrSlug, companyId);
        await this.prizeTypeRepo.update(type.id, data);
        return this.findOne(type.id);
    }

    async remove(idOrSlug: string, companyId?: string) {
        const type = await this.resolveType(idOrSlug, companyId);
        return this.prizeTypeRepo.remove(type);
    }

    // Seed default types
    async seedDefaults() {
        const defaultTypes = [
            { name: 'Item', slug: 'item', strategy: PrizeStrategy.MANUAL_FULFILL, showValue: false, icon: '🎁', description: 'Physical items requiring manual fulfillment', companyId: null, isPoints: false },
            { name: 'E-Gift', slug: 'egift', strategy: PrizeStrategy.VIRTUAL_CODE, showValue: true, icon: '📧', description: 'Digital codes/coupons', companyId: null, isPoints: false },
            { name: 'Cash', slug: 'cash', strategy: PrizeStrategy.MANUAL_FULFILL, showValue: true, icon: '💰', description: 'Cash payout (requires approval)', companyId: null, isPoints: false },
            { name: 'Points', slug: 'points', strategy: PrizeStrategy.BALANCE_CREDIT, showValue: true, icon: '⚪', description: 'Loyalty points credit', companyId: null, isPoints: true },
        ];

        for (const typeData of defaultTypes) {
            const existing = await this.prizeTypeRepo.findOne({ where: { slug: typeData.slug, companyId: IsNull() } });
            if (!existing) {
                await this.create(typeData);
                this.logger.log(`Created prize type: ${typeData.slug}`);
            } else {
                // Update existing to ensure labels/icons are corrected
                await this.prizeTypeRepo.update(existing.id, typeData);
                this.logger.log(`Updated prize type: ${typeData.slug}`);
            }
        }
    }
}
