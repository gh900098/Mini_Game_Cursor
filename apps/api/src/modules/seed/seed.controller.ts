import { Controller, Post, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run database seeding (dev only)' })
  @ApiResponse({ status: 201, description: 'Database seeded successfully' })
  async runSeed() {
    return await this.seedService.seedAll();
  }

  @Patch('refresh-schemas')
  @ApiOperation({
    summary: 'Update all existing game instances with latest schema',
  })
  @ApiResponse({ status: 200, description: 'Schemas refreshed successfully' })
  async refreshSchemas() {
    return await this.seedService.refreshGameSchemas();
  }
}
