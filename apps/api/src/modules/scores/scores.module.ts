import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoresService } from './scores.service';
import { ScoresController } from './scores.controller';
import { Score } from './entities/score.entity';
import { GameInstancesModule } from '../game-instances/game-instances.module';
import { MembersModule } from '../members/members.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Score]),
        GameInstancesModule,
        MembersModule,
    ],
    controllers: [ScoresController],
    providers: [ScoresService],
    exports: [ScoresService],
})
export class ScoresModule { }
