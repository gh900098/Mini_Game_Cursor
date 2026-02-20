import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from './entities/theme.entity';
import { CreateThemeDto, UpdateThemeDto } from './dto/theme.dto';

@Injectable()
export class ThemesService {
    constructor(
        @InjectRepository(Theme)
        private readonly themeRepository: Repository<Theme>,
    ) { }

    async create(createThemeDto: CreateThemeDto, companyId?: string): Promise<Theme> {
        const existingTheme = await this.themeRepository.findOne({ where: { slug: createThemeDto.slug } });
        if (existingTheme) {
            throw new ConflictException(`Theme with slug '${createThemeDto.slug}' already exists`);
        }

        const themeData = {
            ...createThemeDto,
            companyId: companyId || createThemeDto.companyId || null,
        };
        const theme = this.themeRepository.create(themeData as any) as unknown as Theme;
        return this.themeRepository.save(theme);
    }

    async findAll(gameTemplateSlug?: string, companyId?: string): Promise<Theme[]> {
        const query = this.themeRepository.createQueryBuilder('theme')
            .where('theme.isActive = :isActive', { isActive: true });

        if (gameTemplateSlug) {
            query.andWhere('theme.gameTemplateSlug = :gameTemplateSlug', { gameTemplateSlug });
        }

        if (companyId) {
            // Find global themes (companyId IS NULL) OR company-specific themes
            query.andWhere('(theme.companyId IS NULL OR theme.companyId = :companyId)', { companyId });
        } else {
            // Only global themes
            query.andWhere('theme.companyId IS NULL');
        }

        query.orderBy('theme.isPremium', 'DESC').addOrderBy('theme.name', 'ASC');

        return query.getMany();
    }

    async findOne(id: string): Promise<Theme> {
        const theme = await this.themeRepository.findOne({ where: { id } });
        if (!theme) {
            throw new NotFoundException(`Theme with ID '${id}' not found`);
        }
        return theme;
    }

    async findBySlug(slug: string): Promise<Theme> {
        const theme = await this.themeRepository.findOne({ where: { slug } });
        if (!theme) {
            throw new NotFoundException(`Theme with slug '${slug}' not found`);
        }
        return theme;
    }

    async update(id: string, updateThemeDto: UpdateThemeDto): Promise<Theme> {
        const theme = await this.findOne(id);

        if (updateThemeDto.slug && updateThemeDto.slug !== theme.slug) {
            const existingTheme = await this.themeRepository.findOne({ where: { slug: updateThemeDto.slug } });
            if (existingTheme) {
                throw new ConflictException(`Theme with slug '${updateThemeDto.slug}' already exists`);
            }
        }

        Object.assign(theme, updateThemeDto);
        return this.themeRepository.save(theme);
    }

    async remove(id: string): Promise<void> {
        const theme = await this.findOne(id);
        // Soft delete by setting isActive to false instead of actual removal
        theme.isActive = false;
        await this.themeRepository.save(theme);
    }
}
