import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ThemesService } from './themes.service';
import { Theme } from './entities/theme.entity';

const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('ThemesService', () => {
  let service: ThemesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemesService,
        {
          provide: getRepositoryToken(Theme),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ThemesService>(ThemesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
