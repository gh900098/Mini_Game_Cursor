import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MembersService } from './members.service';
import { ExternalAuthService } from './external-auth.service';
import { ExternalAuthController } from './external-auth.controller';
import { MembersController } from './members.controller';
import { Member } from './entities/member.entity';
import { CompaniesModule } from '../companies/companies.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Member]),
        CompaniesModule,
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
    controllers: [ExternalAuthController, MembersController],
    providers: [MembersService, ExternalAuthService],
    exports: [MembersService, ExternalAuthService],
})
export class MembersModule { }
