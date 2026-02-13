import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GameInstancesService } from './game-instances.service';
import { GameInstance } from './entities/game-instance.entity';
import { Score } from '../scores/entities/score.entity';

describe('GameInstancesService', () => {
    let service: GameInstancesService;
    let repo: any;

    const mockRepo = {
        create: jest.fn(d => d),
        save: jest.fn(d => Promise.resolve({ id: 'uuid', ...d })),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockScoreRepo = {
        count: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameInstancesService,
                {
                    provide: getRepositoryToken(GameInstance),
                    useValue: mockRepo,
                },
                {
                    provide: getRepositoryToken(Score),
                    useValue: mockScoreRepo,
                },
            ],
        }).compile();

        service = module.get<GameInstancesService>(GameInstancesService);
        repo = module.get(getRepositoryToken(GameInstance));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('ensureUniqueSlug', () => {
        it('should return the same slug if it is unique', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            };
            repo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await (service as any).ensureUniqueSlug('test-slug', 'company-uuid');
            expect(result).toBe('test-slug');
        });

        it('should append suffix if slug is not unique', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn()
                    .mockResolvedValueOnce({ id: 'existing' }) // First check finds something
                    .mockResolvedValueOnce(null), // Second check (with suffix) finds nothing
            };
            repo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await (service as any).ensureUniqueSlug('test-slug', 'company-uuid');
            expect(result).toMatch(/^test-slug-[a-z0-9]{4}$/);
        });
    });

    describe('validateSlug', () => {
        it('should return available if slug is unique', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            };
            repo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.validateSlug('unique-slug', 'company-uuid');
            expect(result.isAvailable).toBe(true);
            expect(result.suggestedSlug).toBe('unique-slug');
        });

        it('should return not available and provide suggestion if slug is taken', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getOne: jest.fn()
                    .mockResolvedValueOnce({ id: 'existing' }) // First check (validateSlug check)
                    .mockResolvedValueOnce({ id: 'existing' }) // Second check (ensureUniqueSlug first attempt)
                    .mockResolvedValueOnce(null),           // Third check (ensureUniqueSlug second attempt)
            };
            repo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.validateSlug('taken-slug', 'company-uuid');
            expect(result.isAvailable).toBe(false);
            expect(result.suggestedSlug).toMatch(/^taken-slug-[a-z0-9]{4}$/);
        });
    });

    describe('create', () => {
        it('should apply smart slug on creation', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn()
                    .mockResolvedValueOnce({ id: 'existing' })
                    .mockResolvedValueOnce(null),
            };
            repo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const data = { name: 'Test', slug: 'test' };
            const result = await service.create(data);
            expect(result.slug).not.toBe('test');
            expect(result.slug).toMatch(/^test-[a-z0-9]{4}$/);
        });
    });

    describe('update', () => {
        it('should ignore slug changes on update', async () => {
            repo.findOne.mockResolvedValue({ id: 'uuid', slug: 'locked-slug' });

            const data = { slug: 'new-slug', name: 'Updated Name' };
            const result = await service.update('uuid', data);

            expect(repo.createQueryBuilder).not.toHaveBeenCalled();
            expect(result.slug).toBe('locked-slug');
            expect(result.name).toBe('Updated Name');
        });

        it('should still update other fields', async () => {
            repo.findOne.mockResolvedValue({ id: 'uuid', slug: 'same-slug', name: 'Old Name' });

            const data = { name: 'New Name' };
            const result = await service.update('uuid', data);

            expect(result.name).toBe('New Name');
            expect(result.slug).toBe('same-slug');
        });
    });
});
