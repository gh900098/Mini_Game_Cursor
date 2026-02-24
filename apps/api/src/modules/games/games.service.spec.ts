/**
 * EXAMPLE: Unit Test Pattern for Services
 *
 * This file demonstrates how to test a NestJS service with:
 * - TypeORM repository mocking
 * - CRUD operation testing
 * - Error case testing (NotFoundException, ConflictException)
 * - QueryBuilder mocking
 *
 * Copy this pattern for any new service test.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { GamesService } from './games.service';
import { Game } from './entities/game.entity';

const mockGame: Partial<Game> = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Spin Wheel',
  slug: 'spin-wheel',
  description: 'A spin wheel game',
  type: 'arcade',
  isActive: true,
  baseWidth: 360,
  baseHeight: 640,
};

const mockQueryBuilder = {
  loadRelationCountAndMap: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([mockGame]),
};

const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

describe('GamesService', () => {
  let service: GamesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        {
          provide: getRepositoryToken(Game),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new game when slug is unique', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockGame);
      mockRepository.save.mockResolvedValue(mockGame);

      const result = await service.create({
        name: 'Spin Wheel',
        slug: 'spin-wheel',
      });

      expect(result).toEqual(mockGame);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'spin-wheel' },
      });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when slug already exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockGame);

      await expect(
        service.create({ name: 'Duplicate', slug: 'spin-wheel' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return active games by default', async () => {
      const result = await service.findAll();

      expect(result).toEqual([mockGame]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'game.isActive = :isActive',
        { isActive: true },
      );
    });

    it('should return all games when activeOnly is false', async () => {
      await service.findAll(false);

      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find a game by UUID', async () => {
      mockRepository.findOne.mockResolvedValue(mockGame);

      const result = await service.findOne(mockGame.id!);

      expect(result).toEqual(mockGame);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockGame.id },
      });
    });

    it('should find a game by slug', async () => {
      mockRepository.findOne.mockResolvedValue(mockGame);

      const result = await service.findOne('spin-wheel');

      expect(result).toEqual(mockGame);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'spin-wheel' },
      });
    });

    it('should throw NotFoundException when game does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an existing game', async () => {
      const updated = { ...mockGame, name: 'Updated Wheel' };
      mockRepository.findOne.mockResolvedValue({ ...mockGame });
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update(mockGame.id!, {
        name: 'Updated Wheel',
      });

      expect(result.name).toBe('Updated Wheel');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating nonexistent game', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', { name: 'Fail' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an existing game', async () => {
      mockRepository.findOne.mockResolvedValue(mockGame);
      mockRepository.remove.mockResolvedValue(undefined);

      await service.remove(mockGame.id!);

      expect(mockRepository.remove).toHaveBeenCalledWith(mockGame);
    });

    it('should throw NotFoundException when removing nonexistent game', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
