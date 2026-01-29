import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
    constructor(private readonly seedService: SeedService) { }

    @Post('run')
    @ApiOperation({ summary: 'Run database seeding (dev only)' })
    @ApiResponse({ status: 201, description: 'Database seeded successfully' })
    async runSeed() {
        return await this.seedService.seedAll();
    }
}
