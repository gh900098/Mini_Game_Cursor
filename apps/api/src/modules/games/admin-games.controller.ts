import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, RoleLevel } from '../../common/decorators/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';

@Controller('admin/games')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleLevel.STAFF)
export class AdminGamesController {
  constructor(
    @InjectRepository(Game)
    private gamesRepo: Repository<Game>,
  ) {}

  @Get('all')
  async getAllGames() {
    return this.gamesRepo
      .createQueryBuilder('game')
      .loadRelationCountAndMap(
        'game.usageCount',
        'game.instances',
        'instances',
        (qb) => qb.where('instances.isActive = :isActive', { isActive: true }),
      )
      .orderBy('game.createdAt', 'DESC')
      .getMany();
  }

  @Get('stats')
  async getGamesStats() {
    const total = await this.gamesRepo.count();
    const byType = await this.gamesRepo
      .createQueryBuilder('game')
      .select('game.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('game.type')
      .getRawMany();

    return {
      total,
      byType,
    };
  }
}
