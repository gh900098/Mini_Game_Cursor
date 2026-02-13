import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { SeedModule } from './modules/seed/seed.module';
import { UserCompaniesModule } from './modules/user-companies/user-companies.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { EmailModule } from './modules/email/email.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { RouteModule } from './route/route.module';
import { GamesModule } from './modules/games/games.module';
import { ScoresModule } from './modules/scores/scores.module';
import { MembersModule } from './modules/members/members.module';
import { GameInstancesModule } from './modules/game-instances/game-instances.module';
import { PrizesModule } from './modules/prizes/prizes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'minigame'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CompaniesModule,
    RolesModule,
    PermissionsModule,
    SeedModule,
    UserCompaniesModule,
    SystemSettingsModule,
    EmailModule,
    EmailModule,
    AuditLogModule,
    RouteModule,
    GamesModule,
    ScoresModule,
    MembersModule,
    GameInstancesModule,
    PrizesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule { }
