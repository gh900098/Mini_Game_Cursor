import { Test, TestingModule } from '@nestjs/testing';
import { ThemesController } from './themes.controller';
import { ThemesService } from './themes.service';

const mockThemesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ThemesController', () => {
  let controller: ThemesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThemesController],
      providers: [
        {
          provide: ThemesService,
          useValue: mockThemesService,
        },
      ],
    }).compile();

    controller = module.get<ThemesController>(ThemesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
