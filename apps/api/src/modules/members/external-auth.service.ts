import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { CompaniesService } from '../companies/companies.service';
import { MembersService } from '../members/members.service';

@Injectable()
export class ExternalAuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly companiesService: CompaniesService,
        private readonly membersService: MembersService,
    ) { }

    async validateSignatureAndIssueToken(payload: {
        companySlug: string;
        externalId: string;
        username?: string;
        timestamp: number;
        signature: string;
    }) {
        const { companySlug, externalId, username, timestamp, signature } = payload;

        // 1. Find company and get secret
        const company = await this.companiesService.findBySlug(companySlug);
        if (!company || !company.apiSecret) {
            throw new UnauthorizedException('Invalid company or missing API Secret');
        }

        // 2. Validate timestamp (prevent replay attacks - e.g. 5 min window)
        const now = Date.now();
        if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
            throw new UnauthorizedException('Request expired');
        }

        // 3. Verify Signature
        const expectedData = `${externalId}:${companySlug}:${timestamp}`;
        const computedSignature = crypto
            .createHmac('sha256', company.apiSecret)
            .update(expectedData)
            .digest('hex');

        if (computedSignature !== signature) {
            throw new UnauthorizedException('Invalid signature');
        }

        // 4. Find or Create Member
        const member = await this.membersService.findOrCreateExternalMember(company.id, externalId, username);

        // 5. Issue Member JWT (distinct from Admin JWT)
        const jwtPayload = {
            sub: member.id,
            externalId: member.externalId,
            companyId: member.companyId,
            role: 'member',
        };

        return {
            access_token: this.jwtService.sign(jwtPayload),
            member: {
                id: member.id,
                username: member.username,
                points: member.pointsBalance,
            }
        };
    }
}
