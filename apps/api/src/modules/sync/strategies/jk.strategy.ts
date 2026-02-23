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
  ) {}

  async execute(
    companyId: string,
    config: any,
    syncParams?: Record<string, any>,
  ): Promise<any> {
    const type = syncParams?.type || 'member';

    switch (type) {
      case 'member':
      case 'sync-player':
        if (syncParams?.externalUserId) {
          return this.syncSingleMember(
            companyId,
            config,
            syncParams.externalUserId,
            syncParams?.payload,
          );
        } else {
          return this.syncBatchMembers(companyId, config);
        }
      case 'deposit': {
        if (syncParams?.payload) {
          try {
            let payload = syncParams?.payload || {};
            const source = syncParams?.source;

            // If triggered by a webhook (which provides only a summary), fetch the actual transaction via API
            if (source === 'webhook' || Object.keys(payload).length <= 7) {
              const transactionId =
                payload.id || payload.orderId || payload.transactionId;

              if (transactionId) {
                this.logger.debug(
                  `Webhook payload identified. Fetching full transaction details for deposit ${transactionId} via API...`,
                );
                const response = await this.jkService.getAllTransactions(
                  config,
                  0,
                  { id: transactionId },
                );
                const data = response.data || {};
                const transactions =
                  data.transactions ||
                  data.list ||
                  data.data ||
                  (Array.isArray(data) ? data : []);

                const fullTxn = transactions.find(
                  (t: any) =>
                    t.id == transactionId ||
                    t.orderId == transactionId ||
                    t.transactionId == transactionId,
                );

                if (fullTxn) {
                  payload = fullTxn;
                } else {
                  this.logger.warn(
                    `Transaction ${transactionId} not found in JK API. Cannot verify webhook deposit.`,
                  );
                  return {
                    success: false,
                    reason: 'Transaction verification failed',
                  };
                }
              }
            }

            // Handle both webhook ("userId") and getAllTransaction API ("user.id" or "userId")
            const externalUserId =
              payload.userId ||
              payload.member_id ||
              payload.user?.id ||
              payload.uid;
            // Handle money ("amount" vs "cash")
            const depositAmount = parseFloat(payload.amount || payload.cash);
            // Handle reference ("id" in both webhook and API usually)
            const referenceId =
              payload.id ||
              payload.orderId ||
              payload.transactionId ||
              syncParams?.opts?.jobId;

            if (
              !externalUserId ||
              isNaN(depositAmount) ||
              depositAmount <= 0 ||
              !referenceId
            ) {
              this.logger.warn(
                `Invalid deposit payload for company ${companyId}: ${JSON.stringify(payload)}`,
              );
              return { success: false, reason: 'Invalid payload' };
            }

            const depositConfig = config.syncConfigs?.['deposit'] || {};
            const conversionRate = parseFloat(
              depositConfig.depositConversionRate || '0',
            );

            const result = await this.membersService.processDeposit(
              companyId,
              externalUserId,
              depositAmount,
              conversionRate,
              referenceId,
              payload,
            );

            return result;
          } catch (error) {
            this.logger.error(
              `Error processing deposit for company ${companyId}: ${error.message}`,
            );
            return { success: false, reason: error.message };
          }
        } else {
          return this.syncBatchDeposits(companyId, config);
        }
      }
      case 'withdraw':
        this.logger.log(
          `Received withdraw webhook for company ${companyId}: ${JSON.stringify(syncParams?.payload)}`,
        );
        // Implementation for withdraw
        return { success: true, processed: 'withdraw' };
      default:
        this.logger.warn(`Unknown sync type for JK: ${type}`);
        return { success: false, reason: 'Unknown type' };
    }
  }

  private async syncSingleMember(
    companyId: string,
    config: any,
    externalUserId: string,
    cachedData?: any,
  ) {
    let jkUser = cachedData;

    if (!jkUser) {
      const response = await this.jkService.getUserDetail(
        config,
        externalUserId,
      );
      if (response.status !== 'SUCCESS' || !response.data?.users?.[0]) {
        throw new Error(`User not found in JK: ${externalUserId}`);
      }
      jkUser = response.data.users[0];
    } else {
      this.logger.log(
        `[Optimization] Using provided payload for member sync: ${externalUserId}`,
      );
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
          ...jkUser,
        },
      },
    );

    this.logger.log(
      `Successfully synced member ${member.id} (${jkUser.username})`,
    );
    return { success: true, memberId: member.id };
  }

  private async syncBatchMembers(
    companyId: string,
    config: any,
  ): Promise<number> {
    this.logger.log(`Queueing batch member sync jobs for company ${companyId}`);

    let page = 0;
    let hasMore = true;
    let queuedCount = 0;

    const typeConfig = config.syncConfigs?.['member'];
    const syncMode = typeConfig?.syncMode || config.syncMode || 'incremental';
    const maxPages =
      syncMode === 'full'
        ? 999999
        : typeConfig?.maxPages || config.maxPages || 200;
    const params = typeConfig?.syncParams || config.syncParams || {};

    while (hasMore && page < maxPages) {
      try {
        this.logger.debug(
          `Fetching member page ${page} for company ${companyId}...`,
        );

        const response = await this.jkService.getAllUsers(
          { ...config, syncParams: params },
          page,
          'ACTIVE',
        );

        if (
          response.status === 'SUCCESS' &&
          response.data.users &&
          response.data.users.length > 0
        ) {
          if (page === 0) {
            this.logger.log(
              `Company ${companyId} total users approx: ${response.data.totalPage * response.data.users.length} (Pages: ${response.data.totalPage})`,
            );
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
            },
          }));

          await this.syncQueue.addBulk(jobs);
          queuedCount += jobs.length;

          page++;
          if (page >= response.data.totalPage || page >= maxPages) {
            hasMore = false;
            if (page >= maxPages) {
              this.logger.log(
                `Company ${companyId} incremental sync limit reached at page ${page}`,
              );
            }
          }
        } else {
          this.logger.warn(
            `Ending sync for company ${companyId} at page ${page}. Status: ${response.status}, User count: ${response.data?.users?.length || 0}`,
          );
          hasMore = false;
        }
      } catch (error) {
        this.logger.error(
          `Failed to fetch page ${page} for company ${companyId}`,
          error,
        );
        hasMore = false;
      }
    }
    return queuedCount;
  }

  private async syncBatchDeposits(
    companyId: string,
    config: any,
  ): Promise<number> {
    this.logger.log(
      `Queueing batch deposit sync jobs for company ${companyId}`,
    );

    // JK Platform uses 0-based pagination: Assume API starts at page 0.
    let page = 0;
    let hasMore = true;
    let queuedCount = 0;

    const depositConfig = config.syncConfigs?.['deposit'] || {};
    const params = depositConfig.syncParams || {};

    // Hard cap at 500 pages to avoid infinite loops if totalPage is corrupted
    while (hasMore && page <= 500) {
      try {
        this.logger.debug(
          `Fetching deposit page ${page} for company ${companyId}...`,
        );

        const response = await this.jkService.getAllTransactions(
          { ...config, syncParams: params },
          page,
        );

        const data = response.data || {};
        const transactions =
          data.transactions ||
          data.list ||
          data.data ||
          (Array.isArray(data) ? data : []);
        const totalPage = parseInt(data.totalPage || data.totalPages || 1);

        if (
          response.status === 'SUCCESS' &&
          Array.isArray(transactions) &&
          transactions.length > 0
        ) {
          const jobs = transactions.map((txn: any) => ({
            name: 'sync-deposit',
            data: {
              type: 'deposit',
              companyId: companyId,
              externalUserId:
                txn.userId || txn.user?.id || txn.uid || txn.member_id,
              payload: txn,
              source: 'cron_hourly',
              timestamp: Date.now(),
            },
            opts: {
              jobId: `cron_dep_${companyId}_${txn.id || txn.orderId || txn.transactionId}`,
              removeOnComplete: 500,
            },
          }));

          await this.syncQueue.addBulk(jobs);
          queuedCount += jobs.length;

          page++;
          // If the NEXT page index we are about to fetch exceeds totalPage, we are done.
          // JK API pages start at 0 and can include the totalPage index itself.
          if (page > totalPage) {
            hasMore = false;
            this.logger.log(
              `Company ${companyId} deposit sync finished at page ${page - 1}/${totalPage}`,
            );
          }
        } else {
          hasMore = false;
          this.logger.log(
            `Company ${companyId} deposit sync received empty or invalid items at page ${page}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error in batch deposit sync for company ${companyId}, page ${page}: ${error.message}`,
        );
        hasMore = false;
      }
    }

    this.logger.log(
      `Finished queueing ${queuedCount} deposit sync jobs for company ${companyId}`,
    );
    return queuedCount;
  }
}
