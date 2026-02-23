import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrizeType } from './entities/prize-type.entity';
import { PrizesService } from './prizes.service';
import { PrizesController } from './prizes.controller';
import { PrizeStrategyService } from './prize-strategy.service';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [TypeOrmModule.forFeature([PrizeType]), MembersModule],
  controllers: [PrizesController],
  providers: [PrizesService, PrizeStrategyService],
  exports: [PrizesService, PrizeStrategyService],
})
export class PrizesModule {}
