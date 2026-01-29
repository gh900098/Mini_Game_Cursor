import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';

@Injectable()
export class GamesService {
    constructor(
        @InjectRepository(Game)
        private readonly gameRepository: Repository<Game>,
    ) { }

    async create(createGameDto: CreateGameDto): Promise<Game> {
        const existingGame = await this.gameRepository.findOne({ where: { slug: createGameDto.slug } });
        if (existingGame) {
            throw new ConflictException('Game with this slug already exists');
        }
        const game = this.gameRepository.create(createGameDto);
        return this.gameRepository.save(game);
    }

    async findAll(activeOnly = true): Promise<Game[]> {
        if (activeOnly) {
            return this.gameRepository.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
        }
        return this.gameRepository.find({ order: { createdAt: 'DESC' } });
    }

    async findOne(idOrSlug: string): Promise<Game> {
        let game: Game | null;
        if (idOrSlug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            game = await this.gameRepository.findOne({ where: { id: idOrSlug } });
        } else {
            game = await this.gameRepository.findOne({ where: { slug: idOrSlug } });
        }

        if (!game) {
            throw new NotFoundException(`Game with ID or Slug "${idOrSlug}" not found`);
        }
        return game;
    }

    async update(id: string, updateGameDto: UpdateGameDto): Promise<Game> {
        const game = await this.findOne(id);
        Object.assign(game, updateGameDto);
        return this.gameRepository.save(game);
    }

    async remove(id: string): Promise<void> {
        const game = await this.findOne(id);
        await this.gameRepository.remove(game);
    }
}
