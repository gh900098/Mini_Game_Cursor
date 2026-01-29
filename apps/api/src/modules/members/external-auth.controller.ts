import { Controller, Post, Body } from '@nestjs/common';
import { ExternalAuthService } from './external-auth.service';

@Controller('auth/external')
export class ExternalAuthController {
    constructor(private readonly externalAuthService: ExternalAuthService) { }

    @Post('initialize')
    async initialize(@Body() payload: {
        companySlug: string;
        externalId: string;
        username?: string;
        timestamp: number;
        signature: string;
    }) {
        return this.externalAuthService.validateSignatureAndIssueToken(payload);
    }
}
