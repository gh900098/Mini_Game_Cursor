import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) { }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const slug = this.generateSlug(createRoleDto.name);

    // Check if slug already exists
    const existingRole = await this.roleRepository.findOne({ where: { slug } });
    if (existingRole) {
      throw new ConflictException('Role with this name already exists');
    }

    // Get permissions if provided
    let permissions: Permission[] = [];
    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      permissions = await this.permissionRepository.find({
        where: { id: In(createRoleDto.permissionIds) },
      });
    }

    const role = this.roleRepository.create({
      name: createRoleDto.name,
      slug,
      description: createRoleDto.description,
      permissions,
    });

    return await this.roleRepository.save(role);
  }

  async findAll(query: { page?: number; limit?: number; keyword?: string } = {}): Promise<{ items: Role[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, keyword } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const qb = this.roleRepository.createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions');

    if (keyword) {
      qb.where('(role.name ILIKE :keyword OR role.slug ILIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    qb.orderBy('role.createdAt', 'DESC')
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

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    // Prevent updating system roles SLUG only
    // if (role.isSystem) {
    //   throw new BadRequestException('Cannot update system roles');
    // }
    // We allow updating description and level for system roles now.
    // The slug is protected by not being in the UpdateRoleDto or ignored here.

    // Update permissions if provided
    if (updateRoleDto.permissionIds) {
      role.permissions = await this.permissionRepository.find({
        where: { id: In(updateRoleDto.permissionIds) },
      });
    }

    Object.assign(role, {
      name: updateRoleDto.name,
      description: updateRoleDto.description,
      level: updateRoleDto.level,
    });

    return await this.roleRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    // Prevent deleting system roles
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    await this.roleRepository.remove(role);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
