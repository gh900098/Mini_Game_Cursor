import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CompaniesService } from '../companies/companies.service';
import { JKBackendService } from './jk-backend.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class SyncScheduler implements OnModuleInit {
    private readonly logger = new Logger(SyncScheduler.name);

    constructor(
        @InjectQueue('sync-queue') private syncQueue: Queue,
        private readonly companiesService: CompaniesService,
        private readonly jkService: JKBackendService,
        private readonly settingsService: SystemSettingsService,
    ) { }

    async onModuleInit() {
        await this.refreshScheduler();
    }

    /**
     * Listens for company configuration changes and refreshes the scheduler.
     */
    @OnEvent('sync.refresh')
    async handleSyncRefresh() {
        this.logger.log('Received sync.refresh event. Re-initializing schedule...');
        await this.refreshScheduler();
    }

    /**
     * Public method to re-initialize all repeatable jobs from the database.
     * Can be triggered on company configuration changes to update CRON patterns without restart.
     */
    async refreshScheduler() {
        this.logger.log('Refreshing granular sync repeatable jobs...');

        // 1. Fetch Global Default Cron
        const globalCron = await this.settingsService.getSetting('sync_hourly_cron') || '0 */4 * * *';

        // 2. Fetch all enabled companies (fetch up to 1000 to ensure we get all for scheduling)
        const { items: companies } = await this.companiesService.findAll({ limit: 1000 });
        const enabledCompanies = companies.filter(c => c.jk_config?.enabled);

        // 3. Clear existing repeatable jobs to ensure clean state
        const repeatableJobs = await this.syncQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await this.syncQueue.removeRepeatableByKey(job.key);
            this.logger.debug(`Removed old repeatable job: ${job.key}`);
        }

        // 3b. Purge any legacy-format repeat entries that getRepeatableJobs() misses.
        // These are old `repeat:HASH` keys left in the sorted set from previous BullMQ
        // scheduler versions. Bull Board polls them and gets an infinite 404 loop.
        const queueName = this.syncQueue.name;
        const redisKey = `bull:${queueName}:repeat`;
        const client = await this.syncQueue.client;
        const legacyMembers = await client.zrange(redisKey, 0, -1);
        if (legacyMembers.length > 0) {
            this.logger.warn(`Found ${legacyMembers.length} legacy repeat entry(ies) in Redis. Cleaning up...`);
            for (const member of legacyMembers) {
                await client.zrem(redisKey, member);
                await client.del(`bull:${queueName}:repeat:${member}`);
                this.logger.debug(`Cleaned up legacy repeat key: ${member}`);
            }
        }

        // 4. Register individual jobs for each company and EACH supported sync type
        const SYNC_TYPES = ['member', 'deposit', 'withdraw'];

        for (const company of enabledCompanies) {
            const configs = company.jk_config?.syncConfigs || {};

            for (const type of SYNC_TYPES) {
                // Determine if this specific type is enabled, fallback to global company "enabled" if config missing
                const typeConfig = configs[type];
                const isTypeEnabled = typeConfig ? typeConfig.enabled : (type === 'member'); // Default member enabled if root is enabled

                if (!isTypeEnabled) continue;

                const typeCron = typeConfig?.syncCron || company.jk_config?.syncCron || globalCron;

                this.logger.log(`Registering ${type} sync for company ${company.id} (${company.name}) with schedule: ${typeCron}`);

                await this.syncQueue.add(
                    'sync-company-batch',
                    {
                        type: 'company-batch',
                        companyId: company.id,
                        syncType: type
                    },
                    {
                        repeat: {
                            pattern: typeCron,
                        },
                        jobId: `sync_${type}_${company.id}`,
                        removeOnComplete: 100,
                    },
                );
            }
        }

        this.logger.log(`Granular scheduler refreshed for ${enabledCompanies.length} companies.`);
    }
}
