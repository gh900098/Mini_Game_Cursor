import { Injectable, Logger } from '@nestjs/common';
import { PrizeStrategy, PrizeType } from './entities/prize-type.entity';
import { MembersService } from '../members/members.service';

@Injectable()
export class PrizeStrategyService {
    private readonly logger = new Logger(PrizeStrategyService.name);

    constructor(
        private readonly membersService: MembersService,
    ) { }

    /**
     * Executes the strategy associated with a won prize.
     * @param memberId The ID of the winning member
     * @param prizeType The PrizeType entity containing strategy and config
     * @param prizeValue The value won (credit/points)
     * @param prizeRecordId The ID of the member_prizes record (for status updates)
     */
    async executeStrategy(
        memberId: string,
        prizeType: PrizeType,
        prizeValue: number,
        metadata: any
    ): Promise<{ status: string; note?: string }> {
        const { strategy, config } = prizeType;

        this.logger.log(`Executing strategy ${strategy} for member ${memberId}`);

        switch (strategy) {
            case PrizeStrategy.BALANCE_CREDIT:
                return this.handleBalanceCredit(memberId, prizeValue);

            case PrizeStrategy.EXTERNAL_HOOK:
                return this.handleExternalHook(memberId, prizeType, metadata);

            case PrizeStrategy.VIRTUAL_CODE:
                return { status: 'pending', note: 'Awaiting virtual code assignment' };

            case PrizeStrategy.MANUAL_FULFILL:
            default:
                return { status: 'pending' };
        }
    }

    private async handleBalanceCredit(memberId: string, amount: number) {
        try {
            await this.membersService.updatePoints(memberId, amount);
            return { status: 'fulfilled', note: `Automatically credited ${amount} points/balance.` };
        } catch (error) {
            this.logger.error(`Balance credit failed for member ${memberId}: ${error.message}`);
            return { status: 'pending', note: `Auto-credit failed: ${error.message}. Manual retry needed.` };
        }
    }

    private async handleExternalHook(memberId: string, prizeType: PrizeType, metadata: any) {
        const webhookUrl = prizeType.config?.webhookUrl;
        if (!webhookUrl) {
            return { status: 'pending', note: 'External activation failed: Webhook URL not configured.' };
        }

        try {
            // Replace placeholders in config template if exists
            let payload = prizeType.config?.payload || { memberId, prizeName: prizeType.name };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                return { status: 'fulfilled', note: 'Activated via external system successfully.' };
            } else {
                const errorText = await response.text();
                return { status: 'pending', note: `External system returned error: ${errorText}` };
            }
        } catch (error) {
            this.logger.error(`Webhook failed: ${error.message}`);
            return { status: 'pending', note: `Connection to external system failed: ${error.message}` };
        }
    }
}
