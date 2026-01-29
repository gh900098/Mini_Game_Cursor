---
name: Performance Engineer
description: Specialized skill for performance optimization including caching, query optimization, CDN, and application performance monitoring.
---

# ⚡ Performance Engineer Skill

You are a specialized **Performance Engineer** for the Multi-Tenancy Mini Game Platform.

## Core Responsibilities

1. **Caching Strategy** - Redis, in-memory, browser caching
2. **Database Optimization** - Query tuning, indexing, connection pooling
3. **Asset Optimization** - CDN, image compression, lazy loading
4. **Monitoring** - APM, performance metrics, bottleneck detection

## Caching Strategy

### Redis Implementation
```typescript
// NestJS Redis Cache Module
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      ttl: 300, // 5 minutes default
    }),
  ],
})
export class AppModule {}
```

### Cache Patterns
```typescript
@Injectable()
export class GamesService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private gameRepo: Repository<Game>
  ) {}

  async findAll(companyId: string): Promise<Game[]> {
    const cacheKey = `games:${companyId}`;
    
    // Try cache first
    const cached = await this.cache.get<Game[]>(cacheKey);
    if (cached) return cached;
    
    // Fetch from DB
    const games = await this.gameRepo.find({ where: { companyId } });
    
    // Cache for 5 minutes
    await this.cache.set(cacheKey, games, 300);
    
    return games;
  }

  async invalidateCache(companyId: string): Promise<void> {
    await this.cache.del(`games:${companyId}`);
  }
}
```

### Cache Invalidation Strategy
| Event | Action |
|-------|--------|
| Game created | Invalidate company games list |
| Game updated | Invalidate specific game + list |
| Game deleted | Invalidate specific game + list |
| Config changed | Invalidate config cache |

## Database Optimization

### Query Optimization
```typescript
// BAD - N+1 problem
const games = await gameRepo.find({ where: { companyId } });
for (const game of games) {
  game.configs = await configRepo.find({ where: { gameId: game.id } });
}

// GOOD - Eager loading
const games = await gameRepo.find({
  where: { companyId },
  relations: ['configs']
});
```

### Indexing Strategy
```sql
-- Multi-tenant indexes (always include companyId)
CREATE INDEX idx_games_company ON games(company_id);
CREATE INDEX idx_games_company_active ON games(company_id, is_active);
CREATE INDEX idx_users_company_external ON users(company_id, external_id);

-- Partial indexes for common queries
CREATE INDEX idx_games_active ON games(company_id) WHERE is_active = true;
```

### Connection Pooling
```typescript
// TypeORM config
{
  type: 'postgres',
  extra: {
    max: 20,              // Max connections
    min: 5,               // Min connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
}
```

## Frontend Performance

### Lazy Loading
```typescript
// Route-level code splitting
const GamePage = defineAsyncComponent(() => 
  import('./views/GamePage.vue')
);

// Component lazy loading
const HeavyChart = defineAsyncComponent({
  loader: () => import('./HeavyChart.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200,
});
```

### Image Optimization
```html
<!-- Responsive images with WebP -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" loading="lazy" alt="Game preview">
</picture>
```

### Bundle Optimization
```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'pinia', 'vue-router'],
          'ui': ['naive-ui'],
          'games': ['./src/games/index.ts']
        }
      }
    }
  }
}
```

## Performance Metrics

### Key Metrics to Monitor
| Metric | Target | Tool |
|--------|--------|------|
| Time to First Byte (TTFB) | < 200ms | Lighthouse |
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| API Response Time (p95) | < 500ms | APM |
| Database Query Time (p95) | < 100ms | APM |

### NestJS Performance Interceptor
```typescript
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  intercept(context: ExecutionContext, next: CallHandler) {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > 1000) {
          this.logger.warn(
            `Slow request: ${request.method} ${request.url} - ${duration}ms`
          );
        }
      })
    );
  }
}
```

## Best Practices

1. **Cache** frequently accessed, rarely changed data
2. **Index** all columns used in WHERE clauses
3. **Lazy load** non-critical resources
4. **Monitor** before optimizing (data-driven decisions)
5. **Batch** database operations when possible
6. **CDN** for static assets (images, fonts, JS/CSS)
