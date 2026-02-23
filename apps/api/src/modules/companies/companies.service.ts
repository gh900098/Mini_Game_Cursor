import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './entities/company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Enforce slug or generate from name
    const slug =
      createCompanyDto.slug || this.generateSlug(createCompanyDto.name);

    // Check if slug already exists
    const existingCompany = await this.companyRepository.findOne({
      where: { slug },
    });
    if (existingCompany) {
      throw new ConflictException('Company with this slug already exists');
    }

    const company = this.companyRepository.create({
      ...createCompanyDto,
      slug,
      inactiveAt: createCompanyDto.inactiveAt
        ? new Date(createCompanyDto.inactiveAt)
        : createCompanyDto.isActive === false
          ? new Date()
          : null,
    });

    try {
      return await this.companyRepository.save(company);
    } catch (error) {
      if (error.code === '23505') {
        // Unique violation
        throw new ConflictException('Company with this slug already exists');
      }
      throw error;
    }
  }

  async findAll(
    query: { page?: number; limit?: number; keyword?: string } = {},
  ): Promise<{ items: Company[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, keyword } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const qb = this.companyRepository.createQueryBuilder('company');

    if (keyword) {
      qb.where('(company.name ILIKE :keyword OR company.slug ILIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    qb.orderBy('company.createdAt', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async findBySlug(slug: string): Promise<Company | null> {
    return await this.companyRepository.findOne({ where: { slug } });
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.findOne(id);

    // If slug is being updated, check for uniqueness
    if (updateCompanyDto.slug && updateCompanyDto.slug !== company.slug) {
      const existingCompany = await this.companyRepository.findOne({
        where: { slug: updateCompanyDto.slug },
      });
      if (existingCompany) {
        throw new ConflictException('Company with this slug already exists');
      }
    }

    // Handle inactiveAt tracking
    if (updateCompanyDto.inactiveAt !== undefined) {
      company.inactiveAt = updateCompanyDto.inactiveAt
        ? new Date(updateCompanyDto.inactiveAt)
        : null;
    } else if (updateCompanyDto.isActive !== undefined) {
      if (updateCompanyDto.isActive === false && company.isActive === true) {
        company.inactiveAt = new Date();
      } else if (
        updateCompanyDto.isActive === true &&
        company.isActive === false
      ) {
        company.inactiveAt = null;
      }
    }

    Object.assign(company, updateCompanyDto);
    const updated = await this.companyRepository.save(company);

    // If integration_config was updated, notify listeners (e.g. SyncScheduler)
    if (updateCompanyDto.integration_config) {
      this.eventEmitter.emit('sync.refresh');
    }

    return updated;
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    await this.companyRepository.remove(company);
  }

  // Helper methods
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
