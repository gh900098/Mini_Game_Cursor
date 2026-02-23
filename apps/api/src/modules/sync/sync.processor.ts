import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { CompaniesService } from '../companies/companies.service';
import { SyncStrategyFactory } from './strategies/sync-strategy.factory';

@Processor('sync-queue', { concurrency: 10 })
export class SyncProcessor extends WorkerHost {
    private readonly logger = new Logger(SyncProcessor.name);

    constructor(
        private readonly strategyFactory: SyncStrategyFactory,
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
                if (!company || !company.integration_config?.enabled || !company.integration_config?.provider) {
                    this.logger.warn(`Specific company sync failed: Company ${companyId} not found or integration disabled/missing provider.`);
                    return { success: false, reason: 'Inactive or Missing' };
                }
                const syncType = job.data.syncType || 'member';
                this.logger.log(`Starting granular ${syncType} sync for company: ${company.name} (${companyId})`);

                const strategy = this.strategyFactory.getStrategy(company.integration_config.provider);
                return strategy.execute(companyId, company.integration_config, { type: syncType });
            }

            // 3. Get Company Config for specific jobs
            const company = await this.companiesService.findOne(companyId);
            if (!company || !company.integration_config?.enabled || !company.integration_config?.provider) {
                this.logger.warn(`Integration disabled or company/provider not found: ${companyId}`);
                return { skipped: true, reason: 'Disabled' };
            }

            // 4. Execute via strategy
            const externalUserId = job.data.externalUserId || payload?.userId || payload?.id || payload?.user_id;
            const strategy = this.strategyFactory.getStrategy(company.integration_config.provider);
            return strategy.execute(companyId, company.integration_config, {
                type,
                externalUserId,
                payload,
                source
            });

        } catch (error) {
            this.logger.error(`Sync failed for type ${type} in company ${companyId}: ${error.message}`, error.stack);
            throw error; // Trigger BullMQ retry
        }
    }

    private async handleHourlySyncOrchestration() {
        const { items: companies } = await this.companiesService.findAll({ limit: 1000 });
        const enabledCompanies = companies.filter(c => c.integration_config?.enabled && c.integration_config?.provider);

        this.logger.log(`Starting dynamic sync orchestration for ${enabledCompanies.length} enabled companies...`);

        let totalQueued = 0;
        // Batch size of 30 as requested for parallel efficiency
        const batchSize = 30;

        for (let i = 0; i < enabledCompanies.length; i += batchSize) {
            const batch = enabledCompanies.slice(i, i + batchSize);
            this.logger.debug(`Processing batch of ${batch.length} companies...`);

            const results = await Promise.all(batch.map(async company => {
                try {
                    const strategy = this.strategyFactory.getStrategy(company.integration_config.provider);
                    const memberResult = await strategy.execute(company.id, company.integration_config, { type: 'member' });
                    const depositResult = await strategy.execute(company.id, company.integration_config, { type: 'deposit' });

                    const memberJobs = typeof memberResult === 'number' ? memberResult : 0;
                    const depositJobs = typeof depositResult === 'number' ? depositResult : 0;

                    return memberJobs + depositJobs;
                } catch (e) {
                    this.logger.error(`Error orchestrating sync for company ${company.id}: ${e.message}`);
                    return 0;
                }
            }));

            // results here are numbers representing combined member + deposit jobs queued
            totalQueued += results.reduce((sum: number, res: number) => sum + res, 0);
        }

        this.logger.log(`Dynamic sync orchestration completed. Total jobs queued across all companies: ${totalQueued}`);
        return { success: true, totalCompanies: enabledCompanies.length, totalQueued };
    }
}
