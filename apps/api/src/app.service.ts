import { Injectable, OnModuleInit } from '@nestjs/common';
import { SeedService } from './modules/seed/seed.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly seedService: SeedService) { }

  async onModuleInit() {
    console.log('--- AUTO SEEDING ON STARTUP ---');
    try {
      await this.seedService.seedAll();
      console.log('--- AUTO SEEDING COMPLETED ---');
    } catch (error) {
      console.error('--- AUTO SEEDING FAILED (Likely duplicate seeding) ---', error.message);
      try {
        console.log('--- ATTEMPTING TO REFRESH GAME SCHEMAS DIRECTLY ---');
        await this.seedService.refreshGameSchemas();
      } catch (e) {
        console.error('--- REFRESHING GAME SCHEMAS ALSO FAILED ---', e.message);
      }
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
