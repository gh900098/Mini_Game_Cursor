import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameInstancesService } from './game-instances.service';
import { GameInstancesController } from './game-instances.controller';
import { GameInstance } from './entities/game-instance.entity';

@Module({
    imports: [TypeOrmModule.forFeature([GameInstance])],
    controllers: [GameInstancesController],
    providers: [GameInstancesService],
    exports: [GameInstancesService],
})
export class GameInstancesModule { }
