import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameInstancesService } from './game-instances.service';
import { GameInstancesController } from './game-instances.controller';
import { GameInstance } from './entities/game-instance.entity';

import { Score } from '../scores/entities/score.entity';

@Module({
    imports: [TypeOrmModule.forFeature([GameInstance, Score])],
    controllers: [GameInstancesController],
    providers: [GameInstancesService],
    exports: [GameInstancesService],
})
export class GameInstancesModule { }
