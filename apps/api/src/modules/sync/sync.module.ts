import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncController } from './sync.controller';
import { SyncProcessor } from './sync.processor';
import { HttpModule } from '@nestjs/axios';
import { MembersModule } from '../members/members.module';
import { CompaniesModule } from '../companies/companies.module';
import { JKBackendService } from './jk-backend.service';
import { ConfigModule } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { SyncScheduler } from './sync.scheduler';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
    imports: [
        HttpModule,
        MembersModule,
        CompaniesModule,
        ConfigModule,
        SystemSettingsModule,
        BullModule.registerQueue({
            name: 'sync-queue',
            defaultJobOptions: {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        }),
        BullBoardModule.forFeature({
            name: 'sync-queue',
            adapter: BullMQAdapter,
        }),
    ],
    controllers: [SyncController],
    providers: [SyncProcessor, JKBackendService, SyncScheduler],
    exports: [BullModule, JKBackendService],
})
export class SyncModule { }
