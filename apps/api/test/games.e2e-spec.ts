/**
 * EXAMPLE: E2E Integration Test Pattern
 *
 * This file demonstrates how to test HTTP endpoints with:
 * - Supertest against a NestJS test module
 * - Isolated module setup (no full AppModule, no real DB)
 * - Mocked repository for fast, deterministic tests
 * - Testing HTTP status codes and response shapes
 * - Testing guarded routes return 401/403 without auth
 *
 * For tests that need a real database, set up a test DB
 * in docker-compose.test.yml and use TypeOrmModule.forRoot()
 * with test-specific connection settings.
 *
 * Copy this pattern for any new e2e test.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GamesController } from '../src/modules/games/games.controller';
import { GamesService } from '../src/modules/games/games.service';
import { Game } from '../src/modules/games/entities/game.entity';

const mockGame = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Spin Wheel',
  slug: 'spin-wheel',
  description: 'A spin wheel game',
  type: 'arcade',
  isActive: true,
  baseWidth: 360,
  baseHeight: 640,
  isPortrait: true,
  createdAt: new Date(),
  updatedAt: new Date(),
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

describe('Games Endpoints (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [GamesController],
      providers: [
        GamesService,
        {
          provide: getRepositoryToken(Game),
          useValue: mockRepository,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /games', () => {
    it('should return 200 with list of games', async () => {
      const response = await request(app.getHttpServer())
        .get('/games')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('name', 'Spin Wheel');
      expect(response.body[0]).toHaveProperty('slug', 'spin-wheel');
    });
  });

  describe('GET /games/:idOrSlug', () => {
    it('should return 200 with a game when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockGame);

      const response = await request(app.getHttpServer())
        .get('/games/spin-wheel')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Spin Wheel');
    });

    it('should return 404 when game not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/games/nonexistent')
        .expect(404);
    });
  });

  describe('POST /games (guarded)', () => {
    it('should return 403 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/games')
        .send({ name: 'New Game', slug: 'new-game' })
        .expect(403);
    });
  });

  describe('PATCH /games/:id (guarded)', () => {
    it('should return 403 without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/games/${mockGame.id}`)
        .send({ name: 'Updated' })
        .expect(403);
    });
  });

  describe('DELETE /games/:id (guarded)', () => {
    it('should return 403 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/games/${mockGame.id}`)
        .expect(403);
    });
  });
});
