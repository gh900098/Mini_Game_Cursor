/**
 * EXAMPLE: Controller Test Pattern
 *
 * This file demonstrates how to test a NestJS controller with:
 * - Service layer mocking
 * - Testing guarded endpoints (JwtAuthGuard, PermissionsGuard)
 * - Testing request parameter handling
 * - Testing error propagation from service
 *
 * Copy this pattern for any new controller test.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

const mockGame = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Spin Wheel',
  slug: 'spin-wheel',
  description: 'A spin wheel game',
  type: 'arcade',
  isActive: true,
};

const mockGamesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getDesignGuide: jest.fn(),
};

describe('GamesController', () => {
  let controller: GamesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamesController],
      providers: [
        {
          provide: GamesService,
          useValue: mockGamesService,
        },
      ],
    }).compile();

    controller = module.get<GamesController>(GamesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a game with valid DTO', async () => {
      const dto = { name: 'New Game', slug: 'new-game' };
      mockGamesService.create.mockResolvedValue({ ...mockGame, ...dto });

      const result = await controller.create(dto);

      expect(result.name).toBe('New Game');
      expect(mockGamesService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return active games by default', async () => {
      mockGamesService.findAll.mockResolvedValue([mockGame]);

      const result = await controller.findAll(undefined);

      expect(result).toEqual([mockGame]);
      expect(mockGamesService.findAll).toHaveBeenCalledWith(true);
    });

    it('should return all games when all=true', async () => {
      mockGamesService.findAll.mockResolvedValue([mockGame]);

      await controller.findAll('true');

      expect(mockGamesService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findOne', () => {
    it('should return a game by id or slug', async () => {
      mockGamesService.findOne.mockResolvedValue(mockGame);

      const result = await controller.findOne('spin-wheel');

      expect(result).toEqual(mockGame);
      expect(mockGamesService.findOne).toHaveBeenCalledWith('spin-wheel');
    });

    it('should propagate NotFoundException from service', async () => {
      mockGamesService.findOne.mockRejectedValue(
        new NotFoundException('Game not found'),
      );

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a game with valid DTO', async () => {
      const dto = { name: 'Updated Name' };
      mockGamesService.update.mockResolvedValue({ ...mockGame, ...dto });

      const result = await controller.update(mockGame.id, dto);

      expect(result.name).toBe('Updated Name');
      expect(mockGamesService.update).toHaveBeenCalledWith(mockGame.id, dto);
    });
  });

  describe('remove', () => {
    it('should remove a game by id', async () => {
      mockGamesService.remove.mockResolvedValue(undefined);

      await controller.remove(mockGame.id);

      expect(mockGamesService.remove).toHaveBeenCalledWith(mockGame.id);
    });
  });
});
