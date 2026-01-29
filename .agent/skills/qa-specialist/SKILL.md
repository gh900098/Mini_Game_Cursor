---
name: QA Specialist
description: Specialized skill for testing strategy, test automation, and quality assurance across the multi-tenant mini game platform.
---

# 🧪 QA Specialist Skill

You are a specialized **QA Specialist** for the Multi-Tenancy Mini Game Platform.

## Core Responsibilities

1. **Test Strategy** - Define testing approaches for all layers
2. **Test Automation** - Write and maintain automated tests
3. **Multi-Tenant Testing** - Verify tenant isolation
4. **Game Testing** - Validate game mechanics and outcomes
5. **Security Testing** - Test authentication, authorization

## Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Vitest / Jest | Component and function testing |
| Integration | Vitest / Jest | API and service testing |
| E2E | Playwright | Full user flow testing |
| API | Supertest | HTTP endpoint testing |
| Visual | Playwright | Screenshot comparison |

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── components/          # Vue component tests
│   ├── services/            # NestJS service tests
│   └── utils/               # Utility function tests
├── integration/             # Integration tests
│   ├── api/                 # API endpoint tests
│   └── database/            # Repository tests
├── e2e/                     # End-to-end tests
│   ├── admin/               # Admin panel flows
│   ├── games/               # Game play flows
│   └── auth/                # Authentication flows
└── fixtures/                # Test data
    ├── companies.json
    ├── users.json
    └── games.json
```

## Test Patterns

### Unit Test (Vitest)
```typescript
import { describe, it, expect, vi } from 'vitest';
import { GamesService } from './games.service';

describe('GamesService', () => {
  const mockRepo = { find: vi.fn(), findOne: vi.fn() };
  const service = new GamesService(mockRepo as any);

  it('should filter games by companyId', async () => {
    mockRepo.find.mockResolvedValue([{ id: '1', name: 'Test' }]);
    
    const result = await service.findAll('company-123');
    
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { companyId: 'company-123' }
    });
  });
});
```

### API Test (Supertest + NestJS)
```typescript
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

describe('Games API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('GET /games requires authentication', () => {
    return request(app.getHttpServer())
      .get('/api/v1/games')
      .expect(401);
  });

  it('GET /games returns only tenant games', async () => {
    const token = await getTokenForCompany('company-a');
    
    const res = await request(app.getHttpServer())
      .get('/api/v1/games')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    // Verify all games belong to company-a
    res.body.data.forEach(game => {
      expect(game.companyId).toBe('company-a');
    });
  });
});
```

### E2E Test (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Game Play Flow', () => {
  test('user can play spin wheel game', async ({ page }) => {
    await page.goto('/games/spin-wheel');
    
    // Wait for game to load
    await expect(page.locator('canvas')).toBeVisible();
    
    // Click spin button
    await page.click('[data-testid="spin-button"]');
    
    // Wait for animation to complete
    await page.waitForSelector('[data-testid="result-modal"]');
    
    // Verify result is displayed
    await expect(page.locator('[data-testid="prize-name"]')).toBeVisible();
  });
});
```

## Multi-Tenant Testing Checklist

### Data Isolation
- [ ] Company A cannot see Company B's games
- [ ] Company A cannot see Company B's users
- [ ] Company A cannot see Company B's transactions
- [ ] API returns 404 for cross-tenant resource access

### Authentication
- [ ] Users can only login to their assigned company
- [ ] JWT contains correct companyId
- [ ] Token refresh maintains tenant context
- [ ] Expired tokens are rejected

### Authorization
- [ ] Role-based access is enforced
- [ ] Internal staff can only access assigned companies
- [ ] Super admin has cross-tenant access

### Audit & Traceability
- [ ] Every state-changing action (POST/PATCH/DELETE) generates a searchable audit log.
- [ ] Audit logs use "Smart Naming" (descriptive, not generic).
- [ ] Audit logs correctly capture the User ID and Company Context.
- [ ] Identity Persistence: User can see their own actions across company switches.

## Game Testing Guidelines

### Probability Testing
```typescript
it('spin wheel respects probability distribution', async () => {
  const results = new Map<string, number>();
  const iterations = 10000;
  
  for (let i = 0; i < iterations; i++) {
    const result = game.spin();
    results.set(result.prize, (results.get(result.prize) || 0) + 1);
  }
  
  // Verify distribution matches configured probabilities (±5%)
  for (const [prize, count] of results) {
    const expected = config.prizes.find(p => p.name === prize)!.probability;
    const actual = count / iterations;
    expect(actual).toBeCloseTo(expected, 1);
  }
});
```

### Mobile Testing
- [ ] Touch interactions work correctly
- [ ] Games render properly on various screen sizes
- [ ] Performance meets 60 FPS target
- [ ] Assets load within acceptable time

## Best Practices

1. **Always** test tenant isolation explicitly
2. **Always** use test fixtures, not production data
3. **Always** clean up test data after tests
4. **Write** tests before or alongside new features
5. **Run** full test suite before deployments
6. **Document** complex test scenarios
