import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission } from './entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    const slug = `${createPermissionDto.resource}:${createPermissionDto.action}`;
    const name = `${createPermissionDto.resource} ${createPermissionDto.action}`;

    // Check if permission already exists
    const existing = await this.permissionRepository.findOne({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException('Permission already exists');
    }

    const permission = this.permissionRepository.create({
      name,
      slug,
      resource: createPermissionDto.resource,
      action: createPermissionDto.action,
      description: createPermissionDto.description,
    });

    return await this.permissionRepository.save(permission);
  }

  async findAll(
    query: { page?: number; limit?: number; keyword?: string } = {},
  ): Promise<{
    items: Permission[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, keyword } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const qb = this.permissionRepository.createQueryBuilder('permission');

    if (keyword) {
      qb.where(
        '(permission.name ILIKE :keyword OR permission.slug ILIKE :keyword OR permission.resource ILIKE :keyword OR permission.action ILIKE :keyword)',
        {
          keyword: `%${keyword}%`,
        },
      );
    }

    qb.orderBy('permission.resource', 'ASC')
      .addOrderBy('permission.action', 'ASC')
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

  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return permission;
  }

  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.findOne(id);

    if (updatePermissionDto.description !== undefined) {
      permission.description = updatePermissionDto.description;
    }

    return await this.permissionRepository.save(permission);
  }

  async remove(id: string): Promise<void> {
    const permission = await this.findOne(id);
    await this.permissionRepository.remove(permission);
  }
}
