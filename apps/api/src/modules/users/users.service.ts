import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { EncryptionService } from '../encryption/encryption.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private encryptionService: EncryptionService,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const emailHash = this.encryptionService.hash(createUserDto.email);
    const existing = await this.usersRepository.findOne({ where: { emailHash } });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async findAll(query: { page?: number; limit?: number; companyId?: string; keyword?: string } = {}): Promise<{ items: User[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, companyId, keyword } = query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    const qb = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.userCompanies', 'userCompanies')
      .leftJoinAndSelect('userCompanies.company', 'company')
      .leftJoinAndSelect('userCompanies.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions');

    if (companyId && companyId !== 'ALL') {
      qb.where('userCompanies.companyId = :companyId', { companyId });
    }

    if (keyword) {
      const keywordCondition = '(user.name ILIKE :keyword OR user.email ILIKE :keyword)';
      if (companyId && companyId !== 'ALL') {
        qb.andWhere(keywordCondition, { keyword: `%${keyword}%` });
      } else {
        qb.where(keywordCondition, { keyword: `%${keyword}%` });
      }
    }

    qb.orderBy('user.createdAt', 'DESC')
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

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['userCompanies', 'userCompanies.company', 'userCompanies.role', 'userCompanies.role.permissions'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const emailHash = this.encryptionService.hash(email);
    return this.usersRepository.findOne({
      where: { emailHash },
      relations: ['userCompanies', 'userCompanies.company', 'userCompanies.role', 'userCompanies.role.permissions'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }
    return this.usersRepository.update(id, updateUserDto);
  }

  async remove(id: string) {
    return this.usersRepository.delete(id);
  }
}
