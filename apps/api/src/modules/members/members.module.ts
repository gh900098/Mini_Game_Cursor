import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MembersService } from './members.service';
import { ExternalAuthService } from './external-auth.service';
import { ExternalAuthController } from './external-auth.controller';
import { MembersController } from './members.controller';
import { AdminMembersController } from './admin-members.controller';
import { Member } from './entities/member.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { LoginHistory } from './entities/login-history.entity';
import { MemberPrize } from '../scores/entities/member-prize.entity';
import { CompaniesModule } from '../companies/companies.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { PlayAttempt } from '../scores/entities/play-attempt.entity';
import { Score } from '../scores/entities/score.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Member, CreditTransaction, LoginHistory, PlayAttempt, Score, MemberPrize]),
        CompaniesModule,
        AuditLogModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'secret',
                signOptions: {
                    expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '7d') as any
                },
            }),
        }),
    ],
    controllers: [ExternalAuthController, MembersController, AdminMembersController],
    providers: [MembersService, ExternalAuthService],
    exports: [MembersService, ExternalAuthService],
})
export class MembersModule { }
