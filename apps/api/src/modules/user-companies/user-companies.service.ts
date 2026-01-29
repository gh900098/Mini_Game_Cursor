import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCompany } from './entities/user-company.entity';
import { AddUserCompanyDto } from './dto/add-user-company.dto';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Role } from '../roles/entities/role.entity';

@Injectable()
export class UserCompaniesService {
    constructor(
        @InjectRepository(UserCompany)
        private readonly userCompanyRepository: Repository<UserCompany>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Company)
        private readonly companyRepository: Repository<Company>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
    ) { }

    async addCompanyToUser(userId: string, dto: AddUserCompanyDto): Promise<UserCompany> {
        // Verify user exists
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify company exists
        const company = await this.companyRepository.findOne({ where: { id: dto.companyId } });
        if (!company) {
            throw new NotFoundException('Company not found');
        }

        // Verify role exists
        const role = await this.roleRepository.findOne({ where: { id: dto.roleId } });
        if (!role) {
            throw new NotFoundException('Role not found');
        }

        // Check if association already exists
        const existing = await this.userCompanyRepository.findOne({
            where: { userId, companyId: dto.companyId },
        });
        if (existing) {
            throw new ConflictException('User already has access to this company');
        }

        // If setting as primary, unset other primary companies
        if (dto.isPrimary) {
            await this.userCompanyRepository.update(
                { userId, isPrimary: true },
                { isPrimary: false },
            );
        }

        const userCompany = this.userCompanyRepository.create({
            userId,
            companyId: dto.companyId,
            roleId: dto.roleId,
            isPrimary: dto.isPrimary || false,
        });

        return await this.userCompanyRepository.save(userCompany);
    }

    async getUserCompanies(userId: string): Promise<UserCompany[]> {
        return await this.userCompanyRepository.find({
            where: { userId, isActive: true },
            relations: ['company', 'role'],
            order: { isPrimary: 'DESC', createdAt: 'ASC' },
        });
    }

    async removeCompanyFromUser(userId: string, companyId: string): Promise<void> {
        const userCompany = await this.userCompanyRepository.findOne({
            where: { userId, companyId },
        });

        if (!userCompany) {
            throw new NotFoundException('User company association not found');
        }

        await this.userCompanyRepository.remove(userCompany);
    }

    async updateUserCompanyRole(userId: string, companyId: string, roleId: string): Promise<UserCompany> {
        const userCompany = await this.userCompanyRepository.findOne({
            where: { userId, companyId },
        });

        if (!userCompany) {
            throw new NotFoundException('User company association not found');
        }

        const role = await this.roleRepository.findOne({ where: { id: roleId } });
        if (!role) {
            throw new NotFoundException('Role not found');
        }

        userCompany.roleId = roleId;
        return await this.userCompanyRepository.save(userCompany);
    }

    async setPrimaryCompany(userId: string, companyId: string): Promise<UserCompany> {
        const userCompany = await this.userCompanyRepository.findOne({
            where: { userId, companyId },
        });

        if (!userCompany) {
            throw new NotFoundException('User company association not found');
        }

        // Unset other primary companies
        await this.userCompanyRepository.update(
            { userId, isPrimary: true },
            { isPrimary: false },
        );

        userCompany.isPrimary = true;
        return await this.userCompanyRepository.save(userCompany);
    }
}
