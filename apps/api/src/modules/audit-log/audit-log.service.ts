import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
    constructor(
        @InjectRepository(AuditLog)
        private auditLogRepository: Repository<AuditLog>,
    ) { }

    async create(data: Partial<AuditLog>): Promise<AuditLog> {
        const auditLog = this.auditLogRepository.create(data);
        return this.auditLogRepository.save(auditLog);
    }

    async findAll(query: any) {
        const { page = 1, limit = 10, module, action, userId, userName, companyId, ownUserId } = query;
        const qb = this.auditLogRepository.createQueryBuilder('auditLog');

        if (module) {
            qb.andWhere('auditLog.module = :module', { module });
        }

        if (action) {
            qb.andWhere('auditLog.action ILIKE :action', { action: `%${action}%` });
        }

        if (userId) {
            qb.andWhere('auditLog.userId = :userId', { userId });
        }

        if (userName) {
            qb.andWhere('auditLog.userName ILIKE :userName', { userName: `%${userName}%` });
        }

        if (companyId || ownUserId) {
            if (companyId && ownUserId) {
                // If both are provided, the user sees everything in the company OR their own logs
                qb.andWhere('(auditLog.companyId = :companyId OR auditLog.userId = :ownUserId)', { companyId, ownUserId });
            } else if (companyId) {
                qb.andWhere('auditLog.companyId = :companyId', { companyId });
            } else if (ownUserId) {
                qb.andWhere('auditLog.userId = :ownUserId', { ownUserId });
            }
        }

        qb.orderBy('auditLog.createdAt', 'DESC');
        qb.skip((page - 1) * limit);
        qb.take(limit);

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page: Number(page),
            limit: Number(limit),
        };
    }

    async findOne(id: string): Promise<AuditLog | null> {
        return this.auditLogRepository.findOne({ where: { id } });
    }

    async getOptions(companyId?: string, ownUserId?: string) {
        const moduleQb = this.auditLogRepository
            .createQueryBuilder('auditLog')
            .select('DISTINCT auditLog.module', 'module')
            .where('auditLog.module IS NOT NULL');

        const actionQb = this.auditLogRepository
            .createQueryBuilder('auditLog')
            .select('DISTINCT auditLog.action', 'action')
            .where('auditLog.action IS NOT NULL');

        if (companyId || ownUserId) {
            if (companyId && ownUserId) {
                const condition = '(auditLog.companyId = :companyId OR auditLog.userId = :ownUserId)';
                moduleQb.andWhere(condition, { companyId, ownUserId });
                actionQb.andWhere(condition, { companyId, ownUserId });
            } else if (companyId) {
                moduleQb.andWhere('auditLog.companyId = :companyId', { companyId });
                actionQb.andWhere('auditLog.companyId = :companyId', { companyId });
            } else if (ownUserId) {
                moduleQb.andWhere('auditLog.userId = :ownUserId', { ownUserId });
                actionQb.andWhere('auditLog.userId = :ownUserId', { ownUserId });
            }
        }

        const modules = await moduleQb.getRawMany();
        const actions = await actionQb.getRawMany();

        return {
            modules: modules.map(m => m.module),
            actions: actions.map(a => a.action)
        };
    }
}
