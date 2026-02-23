import { Injectable, Logger } from '@nestjs/common';
import { SyncStrategy } from './sync.strategy.interface';
import { JKBackendService } from '../jk-backend.service';
import { MembersService } from '../../members/members.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class JkSyncStrategy implements SyncStrategy {
    private readonly logger = new Logger(JkSyncStrategy.name);

    constructor(
        private readonly jkService: JKBackendService,
        private readonly membersService: MembersService,
        @InjectQueue('sync-queue') private readonly syncQueue: Queue,
    ) { }

    async execute(companyId: string, config: any, syncParams?: Record<string, any>): Promise<any> {
        const type = syncParams?.type || 'member';

        switch (type) {
            case 'member':
            case 'sync-player':
                if (syncParams?.externalUserId) {
                    return this.syncSingleMember(companyId, config, syncParams.externalUserId, syncParams?.payload);
                } else {
                    return this.syncBatchMembers(companyId, config);
                }
            case 'deposit': {
                try {
                    const payload = syncParams?.payload || {};
                    const externalUserId = payload.uid || payload.userId;
                    const depositAmount = parseFloat(payload.amount);
                    const referenceId = payload.orderId || payload.transactionId || syncParams?.opts?.jobId;

                    if (!externalUserId || isNaN(depositAmount) || depositAmount <= 0 || !referenceId) {
                        this.logger.warn(`Invalid deposit payload for company ${companyId}: ${JSON.stringify(payload)}`);
                        return { success: false, reason: 'Invalid payload' };
                    }

                    const depositConfig = config.syncConfigs?.['deposit'] || {};
                    const conversionRate = parseFloat(depositConfig.depositConversionRate || '0');

                    const result = await this.membersService.processDeposit(
                        companyId,
                        externalUserId,
                        depositAmount,
                        conversionRate,
                        referenceId,
                        payload
                    );

                    return result;

                } catch (error) {
                    this.logger.error(`Error processing deposit for company ${companyId}: ${error.message}`);
                    return { success: false, reason: error.message };
                }
            }
            case 'withdraw':
                this.logger.log(`Received withdraw webhook for company ${companyId}: ${JSON.stringify(syncParams?.payload)}`);
                // Implementation for withdraw
                return { success: true, processed: 'withdraw' };
            default:
                this.logger.warn(`Unknown sync type for JK: ${type}`);
                return { success: false, reason: 'Unknown type' };
        }
    }

    private async syncSingleMember(companyId: string, config: any, externalUserId: string, cachedData?: any) {
        let jkUser = cachedData;

        if (!jkUser) {
            const response = await this.jkService.getUserDetail(config, externalUserId);
            if (response.status !== 'SUCCESS' || !response.data?.users?.[0]) {
                throw new Error(`User not found in JK: ${externalUserId}`);
            }
            jkUser = response.data.users[0];
        } else {
            this.logger.log(`[Optimization] Using provided payload for member sync: ${externalUserId}`);
        }

        const member = await this.membersService.upsertJKMember(
            companyId,
            jkUser.id,
            {
                username: jkUser.username,
                realName: jkUser.name,
                phoneNumber: jkUser.mobile,
                email: jkUser.email,
                metadata: {
                    cash: jkUser.cash,
                    ...jkUser
                }
            }
        );

        this.logger.log(`Successfully synced member ${member.id} (${jkUser.username})`);
        return { success: true, memberId: member.id };
    }

    private async syncBatchMembers(companyId: string, config: any): Promise<number> {
        this.logger.log(`Queueing batch member sync jobs for company ${companyId}`);

        let page = 0;
        let hasMore = true;
        let queuedCount = 0;

        const typeConfig = config.syncConfigs?.['member'];
        const syncMode = typeConfig?.syncMode || config.syncMode || 'incremental';
        const maxPages = syncMode === 'full' ? 999999 : (typeConfig?.maxPages || config.maxPages || 200);
        const params = typeConfig?.syncParams || config.syncParams || {};

        while (hasMore && page < maxPages) {
            try {
                this.logger.debug(`Fetching member page ${page} for company ${companyId}...`);

                const response = await this.jkService.getAllUsers({ ...config, syncParams: params }, page, 'ACTIVE');

                if (response.status === 'SUCCESS' && response.data.users && response.data.users.length > 0) {
                    if (page === 0) {
                        this.logger.log(`Company ${companyId} total users approx: ${response.data.totalPage * response.data.users.length} (Pages: ${response.data.totalPage})`);
                    }
                    const users = response.data.users;

                    const jobs = users.map((user: any) => ({
                        name: 'sync-player',
                        data: {
                            type: 'member',
                            companyId: companyId,
                            externalUserId: user.id,
                            payload: user,
                            source: 'cron_hourly',
                            timestamp: Date.now(),
                        },
                        opts: {
                            jobId: `cron_${companyId}_${user.id}`,
                            removeOnComplete: 500,
                        }
                    }));

                    await this.syncQueue.addBulk(jobs);
                    queuedCount += jobs.length;

                    page++;
                    if (page >= response.data.totalPage || page >= maxPages) {
                        hasMore = false;
                        if (page >= maxPages) {
                            this.logger.log(`Company ${companyId} incremental sync limit reached at page ${page}`);
                        }
                    }
                } else {
                    this.logger.warn(`Ending sync for company ${companyId} at page ${page}. Status: ${response.status}, User count: ${response.data?.users?.length || 0}`);
                    hasMore = false;
                }
            } catch (error) {
                this.logger.error(`Failed to fetch page ${page} for company ${companyId}`, error);
                hasMore = false;
            }
        }
        return queuedCount;
    }
}
