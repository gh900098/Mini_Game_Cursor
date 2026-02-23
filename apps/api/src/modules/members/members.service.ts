import { Injectable, NotFoundException, UnauthorizedException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Member } from './entities/member.entity';
import { LoginHistory } from './entities/login-history.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { CompaniesService } from '../companies/companies.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class MembersService {
    private readonly logger = new Logger(MembersService.name);

    constructor(
        @InjectRepository(Member)
        private readonly memberRepository: Repository<Member>,
        @InjectRepository(CreditTransaction)
        private readonly transactionRepository: Repository<CreditTransaction>,
        @InjectRepository(LoginHistory)
        private readonly loginHistoryRepo: Repository<LoginHistory>,
        private readonly jwtService: JwtService,
        @Inject(forwardRef(() => CompaniesService))
        private readonly companiesService: CompaniesService,
        private readonly auditLogService: AuditLogService,
        private readonly dataSource: DataSource,
    ) { }

    async validateMember(username: string, pass: string): Promise<any> {
        const member = await this.memberRepository.findOne({
            where: { username },
            select: ['id', 'username', 'password', 'companyId', 'isActive', 'isAnonymous']
        });

        if (!member) {
            return null;
        }

        if (!member.password) {
            // If no password set, can't login via password
            return null;
        }

        const isMatch = await bcrypt.compare(pass, member.password);
        if (isMatch) {
            if (!member.isActive) {
                // Should record failed login? For now just success
                throw new UnauthorizedException('Account is disabled');
            }
            const { password, ...result } = member;
            return result;
        }
        return null;
    }

    async login(member: any, ipAddress?: string, userAgent?: string) {
        // Record login history
        await this.loginHistoryRepo.save({
            memberId: member.id,
            ipAddress,
            userAgent,
            success: true,
        });

        // Update last login
        await this.memberRepository.update(member.id, {
            lastLoginAt: new Date()
        });

        const payload = {
            username: member.username,
            sub: member.id,
            companyId: member.companyId,
            role: 'member',
            isMember: true,
            isImpersonated: false
        };
        return {
            token: this.jwtService.sign(payload),
            user: member,
        };
    }

    async getImpersonationToken(id: string) {
        const member = await this.findById(id);
        const payload = {
            username: member.username,
            sub: member.id,
            companyId: member.companyId,
            role: 'member',
            isMember: true,
            isImpersonated: true
        };
        return {
            token: this.jwtService.sign(payload),
            user: member,
        };
    }

    async findOrCreateExternalMember(companyId: string, externalId: string, username?: string): Promise<Member> {
        let member = await this.memberRepository.findOne({
            where: { companyId, externalId }
        });

        if (!member) {
            member = this.memberRepository.create({
                companyId,
                externalId,
                username: username || `player_${externalId.slice(-4)} `,
                isAnonymous: false,
            });
            await this.memberRepository.save(member);
        } else if (username && member.username !== username) {
            member.username = username;
            await this.memberRepository.save(member);
        }

        return member;
    }

    async createAnonymousMember(companyId: string): Promise<Member> {
        const member = this.memberRepository.create({
            companyId,
            username: 'Guest',
            isAnonymous: true,
        });
        return this.memberRepository.save(member);
    }

    async findById(id: string): Promise<Member> {
        const member = await this.memberRepository.findOne({ where: { id }, relations: ['company'] });
        if (!member) {
            throw new NotFoundException(`Member with ID ${id} not found`);
        }
        return member;
    }

    async updatePoints(id: string, points: number): Promise<Member> {
        const member = await this.findById(id);
        member.pointsBalance += points;
        return this.memberRepository.save(member);
    }

    async linkExternalAccount(anonymousId: string, externalId: string, username?: string): Promise<Member> {
        const member = await this.findById(anonymousId);
        if (!member.isAnonymous) {
            throw new Error('Member is already linked to an account');
        }

        // Check if this external ID is already used in this company
        const existing = await this.memberRepository.findOne({ where: { companyId: member.companyId, externalId } });
        if (existing) {
            // MERGE logic: Transfer points from guest to existing account
            existing.pointsBalance += member.pointsBalance;
            await this.memberRepository.save(existing);
            await this.memberRepository.remove(member);
            return existing;
        }

        member.externalId = externalId;
        member.isAnonymous = false;
        if (username) member.username = username;
        return this.memberRepository.save(member);
    }

    async findAll(): Promise<Member[]> {
        return this.memberRepository.find({
            relations: ['company']
        });
    }

    async findAllPaginated(params: {
        companyId: string;
        page: number;
        limit: number;
        username?: string;
        externalId?: string;
    }): Promise<{ items: Member[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
        const { companyId, page, limit, username, externalId } = params;
        const query = this.memberRepository.createQueryBuilder('member')
            .leftJoinAndSelect('member.company', 'company')
            .orderBy('member.createdAt', 'DESC');

        if (companyId) {
            query.where('member.companyId = :companyId', { companyId });
        }

        if (username) {
            query.andWhere('member.username LIKE :username', { username: `%${username}%` });
        }

        if (externalId) {
            query.andWhere('member.externalId LIKE :externalId', { externalId: `%${externalId}%` });
        }

        const [items, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        };
    }

    async upsertJKMember(
        companyId: string,
        externalId: string,
        data: {
            username: string;
            realName?: string;
            phoneNumber?: string;
            email?: string;
            metadata?: any;
        }
    ): Promise<Member> {
        let member = await this.memberRepository.findOne({
            where: { companyId, externalId }
        });

        if (member) {
            // Update if changed
            let changed = false;
            if (member.username !== data.username) { member.username = data.username; changed = true; }
            if (data.realName && member.realName !== data.realName) { member.realName = data.realName; changed = true; }
            if (data.phoneNumber && member.phoneNumber !== data.phoneNumber) { member.phoneNumber = data.phoneNumber; changed = true; }
            if (data.email && member.email !== data.email) { member.email = data.email; changed = true; }

            // Merge metadata logic could be complex, for now simple override or merge
            // member.metadata = { ...member.metadata, ...data.metadata };

            if (data.metadata && member.metadata) {
                const mergedMeta = { ...member.metadata, ...data.metadata };
                // Sanitize PII from metadata
                delete mergedMeta.email;
                delete mergedMeta.mobile;
                delete mergedMeta.phone;
                delete mergedMeta.phoneNumber;
                delete mergedMeta.address;
                member.metadata = mergedMeta;
                changed = true;
            }

            if (changed) {
                await this.memberRepository.save(member);
            }
        } else {
            // Sanitize metadata
            const meta = { ...data.metadata, source: 'JK_SYNC' };
            delete meta.email;
            delete meta.mobile;
            delete meta.phone;
            delete meta.phoneNumber;
            delete meta.address;

            // Create
            member = this.memberRepository.create({
                companyId,
                externalId,
                username: data.username,
                realName: data.realName,
                phoneNumber: data.phoneNumber,
                email: data.email,
                metadata: meta,
                isAnonymous: false,
                isActive: true,
            });
            await this.memberRepository.save(member);
        }
        return member;
    }

    async processDeposit(
        companyId: string,
        externalUserId: string,
        depositAmount: number,
        exchangeRate: number,
        referenceId: string,
        metadata?: any
    ): Promise<{ success: boolean; pointsAdded: number; message?: string }> {

        if (exchangeRate <= 0) {
            this.logger.warn(`Skipping deposit for ${externalUserId} (Company: ${companyId}): depositConversionRate is 0 or invalid.`);
            return { success: false, pointsAdded: 0, message: 'Deposit conversion is not correctly configured.' };
        }

        const member = await this.memberRepository.findOne({
            where: { companyId, externalId: externalUserId }
        });

        if (!member) {
            this.logger.error(`Cannot process deposit: Member ${externalUserId} not found in company ${companyId}.`);
            throw new NotFoundException(`Member ${externalUserId} not found.`);
        }

        const pointsToAdd = Math.floor(depositAmount * exchangeRate);

        if (pointsToAdd <= 0) {
            return { success: true, pointsAdded: 0, message: 'Calculated points is 0.' };
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const newBalanceAfter = member.pointsBalance + pointsToAdd;

            const transactionLog = this.transactionRepository.create({
                memberId: member.id,
                amount: pointsToAdd,
                balanceBefore: member.pointsBalance,
                balanceAfter: newBalanceAfter,
                type: 'DEPOSIT_CONVERSION',
                reason: `Converted deposit of ${depositAmount} (Rate: ${exchangeRate})`,
                referenceId,
                metadata: {
                    ...metadata,
                    depositAmount,
                    exchangeRate
                }
            });

            await queryRunner.manager.save(CreditTransaction, transactionLog);

            await queryRunner.manager.update(Member, member.id, {
                pointsBalance: newBalanceAfter
            });

            await queryRunner.commitTransaction();

            this.logger.log(`Deposit processed: ${pointsToAdd} points added to member ${member.id} (Company: ${companyId}) from deposit amount ${depositAmount}. Ref: ${referenceId}`);
            return { success: true, pointsAdded: pointsToAdd };

        } catch (error) {
            await queryRunner.rollbackTransaction();

            // Handle unique constraint violation gracefully (Postgres code 23505)
            if (error.code === '23505' && error.message.includes('UQ_credit_transactions_referenceId')) {
                this.logger.log(`Idempotency skip: Deposit with referenceId ${referenceId} already processed for member ${member.id}.`);
                return { success: true, pointsAdded: 0, message: 'Already processed (Idempotency)' };
            }

            this.logger.error(`Failed to process deposit for member ${member.id} (Ref: ${referenceId}): ${error.message}`, error.stack);
            throw error;

        } finally {
            await queryRunner.release();
        }
    }
}
