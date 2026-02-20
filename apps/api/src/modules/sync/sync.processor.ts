import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JKBackendService } from './jk-backend.service';
import { MembersService } from '../members/members.service';
import { CompaniesService } from '../companies/companies.service';

@Processor('sync-queue', { concurrency: 10 })
export class SyncProcessor extends WorkerHost {
    private readonly logger = new Logger(SyncProcessor.name);

    constructor(
        private readonly jkService: JKBackendService,
        private readonly membersService: MembersService,
        @Inject(forwardRef(() => CompaniesService))
        private readonly companiesService: CompaniesService,
        @InjectQueue('sync-queue') private readonly syncQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { type: dataType, companyId, payload, source } = job.data;
        // Use job.data.type or job.name as fallback
        const type = dataType || job.name;

        // Verbose logging for debugging field mappings (v2.1)
        this.logger.log(`[v2.1] Processing ${type} sync for company ${companyId} (Source: ${source || 'unknown'})`);

        try {
            // 1. Handle global orchestration jobs (Legacy/Global fallback)
            if (type === 'hourly-sync' || type === 'master_trigger') {
                this.logger.log('Starting hourly full sync orchestration (Master Trigger)...');
                return this.handleHourlySyncOrchestration();
            }

            // 2. Handle specific company batch sync (New Granular System)
            if (type === 'company-batch' && companyId) {
                const company = await this.companiesService.findOne(companyId);
                if (!company || !company.jk_config?.enabled) {
                    this.logger.warn(`Specific company sync failed: Company ${companyId} not found or disabled.`);
                    return { success: false, reason: 'Inactive or Missing' };
                }
                const syncType = job.data.syncType || 'member';
                this.logger.log(`Starting granular ${syncType} sync for company: ${company.name} (${companyId})`);
                return this.syncCompany(company, syncType);
            }

            // 2. Get Company Config for specific jobs
            const company = await this.companiesService.findOne(companyId);
            if (!company || !company.jk_config?.enabled) {
                this.logger.warn(`JK Integration disabled or company not found: ${companyId}`);
                return { skipped: true, reason: 'Disabled' };
            }

            // 3. Branch based on type
            switch (type) {
                case 'member':
                case 'sync-player': // Legacy support
                    const externalUserId = job.data.externalUserId || payload?.userId || payload?.id || payload?.user_id;
                    if (!externalUserId) throw new Error('Missing externalUserId in payload');

                    // Optimization: If payload contains profile fields (like username), use it directly
                    const hasProfile = payload?.username || payload?.id; // If it's a full object from getAllUsers
                    return this.syncMember(company, externalUserId, hasProfile ? payload : null);

                case 'deposit':
                    this.logger.log(`Received deposit webhook for company ${companyId}: ${JSON.stringify(payload)}`);
                    // TODO: Implement deposit specific logic (e.g. adjust balance immediately if needed)
                    return { success: true, processed: 'deposit' };

                case 'withdraw':
                    this.logger.log(`Received withdraw webhook for company ${companyId}: ${JSON.stringify(payload)}`);
                    // TODO: Implement withdraw specific logic
                    return { success: true, processed: 'withdraw' };

                default:
                    this.logger.warn(`Unknown sync type: ${type}`);
                    return { success: false, reason: 'Unknown type' };
            }

        } catch (error) {
            this.logger.error(`Sync failed for type ${type} in company ${companyId}: ${error.message}`, error.stack);
            throw error; // Trigger BullMQ retry
        }
    }

    private async syncMember(company: any, externalUserId: string, cachedData?: any) {
        let jkUser = cachedData;

        if (!jkUser) {
            // Fetch User from JK if no cached data provided
            const response = await this.jkService.getUserDetail(company.jk_config, externalUserId);
            if (response.status !== 'SUCCESS' || !response.data?.users?.[0]) {
                throw new Error(`User not found in JK: ${externalUserId}`);
            }
            jkUser = response.data.users[0];
        } else {
            this.logger.log(`[Optimization] Using provided payload for member sync: ${externalUserId}`);
        }

        // Upsert into MiniGame DB
        const member = await this.membersService.upsertJKMember(
            company.id,
            jkUser.id, // externalId
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

    private async handleHourlySyncOrchestration() {
        const { items: companies } = await this.companiesService.findAll({ limit: 1000 });
        const enabledCompanies = companies.filter(c => c.jk_config?.enabled);

        this.logger.log(`Starting dynamic sync orchestration for ${enabledCompanies.length} enabled companies...`);

        let totalQueued = 0;
        // Batch size of 30 as requested for parallel efficiency
        const batchSize = 30;

        for (let i = 0; i < enabledCompanies.length; i += batchSize) {
            const batch = enabledCompanies.slice(i, i + batchSize);
            this.logger.debug(`Processing batch of ${batch.length} companies...`);

            const results = await Promise.all(batch.map(company => this.syncCompany(company)));
            totalQueued += results.reduce((a, b) => a + b, 0);
        }

        this.logger.log(`Dynamic sync orchestration completed. Total jobs queued across all companies: ${totalQueued}`);
        return { success: true, totalCompanies: enabledCompanies.length, totalQueued };
    }

    private async syncCompany(company: any, type: string = 'member'): Promise<number> {
        this.logger.log(`Queueing ${type} sync jobs for company ${company.id} (${company.name})`);

        let page = 0;
        let hasMore = true;
        let queuedCount = 0;

        // Get type-specific config or fallback
        const typeConfig = company.jk_config?.syncConfigs?.[type];
        const syncMode = typeConfig?.syncMode || company.jk_config?.syncMode || 'incremental';
        const maxPages = syncMode === 'full' ? 999999 : (typeConfig?.maxPages || company.jk_config?.maxPages || 200);
        const syncParams = typeConfig?.syncParams || company.jk_config?.syncParams || {};

        while (hasMore && page < maxPages) {
            try {
                this.logger.debug(`Fetching ${type} page ${page} for company ${company.id}...`);

                let response;
                if (type === 'member') {
                    response = await this.jkService.getAllUsers({ ...company.jk_config, syncParams }, page, 'ACTIVE');
                } else {
                    // TODO: Implement deposit/withdraw API calls in jkService
                    this.logger.warn(`Sync for type ${type} requested but not yet implemented in jkService.`);
                    return 0;
                }

                if (response.status === 'SUCCESS' && response.data.users && response.data.users.length > 0) {
                    if (page === 0) {
                        this.logger.log(`Company ${company.id} total users approx: ${response.data.totalPage * response.data.users.length} (Pages: ${response.data.totalPage})`);
                    }
                    const users = response.data.users;

                    // Add jobs to queue
                    const jobs = users.map((user: any) => ({
                        name: 'sync-player',
                        data: {
                            type: 'member',
                            companyId: company.id,
                            externalUserId: user.id,
                            payload: user, // Optimization: Pass full profile directly
                            source: 'cron_hourly',
                            timestamp: Date.now(),
                        },
                        opts: {
                            jobId: `cron_${company.id}_${user.id}`, // Stable ID for deduplication
                            removeOnComplete: 500, // Keep last 500 for visibility
                        }
                    }));

                    await this.syncQueue.addBulk(jobs);
                    queuedCount += jobs.length;

                    page++;
                    if (page >= response.data.totalPage || page >= maxPages) {
                        hasMore = false;
                        if (page >= maxPages) {
                            this.logger.log(`Company ${company.id} incremental sync limit reached at page ${page}`);
                        }
                    }
                } else {
                    this.logger.warn(`Ending sync for company ${company.id} at page ${page}. Status: ${response.status}, User count: ${response.data?.users?.length || 0}`);
                    hasMore = false;
                }
            } catch (error) {
                this.logger.error(`Failed to fetch page ${page} for company ${company.id}`, error);
                hasMore = false;
            }
        }
        return queuedCount;
    }
}
