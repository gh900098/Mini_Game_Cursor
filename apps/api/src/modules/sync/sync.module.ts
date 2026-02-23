import { Module, forwardRef } from '@nestjs/common';
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
import { SyncStrategyFactory } from './strategies/sync-strategy.factory';
import { JkSyncStrategy } from './strategies/jk.strategy';

@Module({
  imports: [
    HttpModule,
    MembersModule,
    MembersModule,
    CompaniesModule,
    ConfigModule,
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
  providers: [
    SyncProcessor,
    JKBackendService,
    SyncScheduler,
    SyncStrategyFactory,
    JkSyncStrategy,
  ],
  exports: [BullModule, JKBackendService, SyncScheduler],
})
export class SyncModule {}
