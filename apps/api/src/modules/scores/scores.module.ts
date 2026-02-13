import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoresService } from './scores.service';
import { ScoresController } from './scores.controller';
import { AdminScoresController } from './admin-scores.controller';
import { AdminPrizesController } from './admin-prizes.controller';
import { GameRulesService } from './game-rules.service';
import { Score } from './entities/score.entity';
import { PlayAttempt } from './entities/play-attempt.entity';
import { BudgetTracking } from './entities/budget-tracking.entity';
import { MemberPrize } from './entities/member-prize.entity';
import { GameInstancesModule } from '../game-instances/game-instances.module';
import { MembersModule } from '../members/members.module';
import { Member } from '../members/entities/member.entity';
import { PrizesModule } from '../prizes/prizes.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Score, PlayAttempt, BudgetTracking, Member, MemberPrize]),
        GameInstancesModule,
        MembersModule,
        PrizesModule,
    ],
    controllers: [ScoresController, AdminScoresController, AdminPrizesController],
    providers: [ScoresService, GameRulesService],
    exports: [ScoresService, GameRulesService],
})
export class ScoresModule { }
