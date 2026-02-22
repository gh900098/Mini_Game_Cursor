import { Controller, Post, Body, Param, HttpCode, Injectable, Req, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CompaniesService } from '../companies/companies.service';
import type { Request } from 'express';

@Controller('webhooks/sync')
export class SyncController {
    private readonly logger = new Logger(SyncController.name);

    constructor(
        @InjectQueue('sync-queue') private syncQueue: Queue,
        private readonly companiesService: CompaniesService
    ) { }

    @Post(':type/:companyId')
    @HttpCode(200)
    async handleWebhook(
        @Param('type') type: string,
        @Param('companyId') companyId: string,
        @Body() payload: any,
        @Req() req: Request
    ) {
        this.logger.log(`Received ${type} webhook for company ${companyId}`);

        const company = await this.companiesService.findOne(companyId);
        if (!company) {
            throw new NotFoundException(`Company ${companyId} not found`);
        }

        // IP Whitelisting check
        if (company.integration_config?.enabled && company.integration_config?.ipWhitelistEnabled) {
            const clientIp = req.ip || (req as any).socket?.remoteAddress || (req as any).connection?.remoteAddress || '';
            const whitelistedIps = (company.integration_config.ipWhitelist || '').split(',').map(ip => ip.trim());

            if (!this.isIpWhitelisted(clientIp, whitelistedIps)) {
                this.logger.warn(`Rejected webhook from non-whitelisted IP: ${clientIp} for company ${companyId}`);
                throw new ForbiddenException(`IP ${clientIp} not whitelisted`);
            }
        }

        // Add to queue and return immediately
        await this.syncQueue.add('sync-webhook', {
            type,
            companyId,
            payload,
            source: 'webhook',
            timestamp: Date.now(),
        });

        return { status: 'queued', type, message: 'Sync job accepted' };
    }

    private isIpWhitelisted(clientIp: string, whitelist: string[]): boolean {
        // Clean IPv6 variations like ::ffff:1.2.3.4
        const cleanedIp = clientIp.replace('::ffff:', '');
        return whitelist.includes(cleanedIp) || whitelist.includes('*');
    }
}
