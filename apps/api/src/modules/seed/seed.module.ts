import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { Company } from '../companies/entities/company.entity';
import { User } from '../users/entities/user.entity';
import { UserCompany } from '../user-companies/entities/user-company.entity';
import { Game } from '../games/entities/game.entity';
import { GameInstance } from '../game-instances/entities/game-instance.entity';
import { Score } from '../scores/entities/score.entity';
import { Theme } from '../themes/entities/theme.entity';
import { ThemesModule } from '../themes/themes.module';
import { PrizesModule } from '../prizes/prizes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, Company, User, UserCompany, Game, GameInstance, Score, Theme]),
    PrizesModule,
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule { }
