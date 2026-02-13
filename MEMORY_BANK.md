# AI Memory Bank: Reusable Patterns 🧠

**Goal:** Stop rewriting the wheel. Copy-paste these proven patterns.

## 1. Multi-Tenancy (NestJS)
**Pattern:** Inject Tenant ID
```typescript
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  findAll(@CurrentTenant() companyId: string) {
    return this.gamesService.findAll(companyId);
  }
}
```

**Pattern:** Service Method
```typescript
async findAll(companyId: string) {
  return this.repo.find({ where: { companyId } });
}
```

## 2. Dynamic Colors (Vue 3)
**Pattern:** Computed Inline Style
```typescript
const color = computed(() => {
  if (props.count === 0) return '#ef4444'; // Red
  if (props.count === 1) return '#facc15'; // Yellow
  return 'white';
});
```
**Usage:** `<span :style="{ color }">{{ count }}</span>`

## 3. Game Rules Validation
**Pattern:** Service Call
```typescript
// Don't write raw logic here. Delegate to GameRulesService.
await this.gameRulesService.validatePlay(memberId, instance, companyId);
```

## 4. Error Handling
**Pattern:** Standard Exception
```typescript
throw new BadRequestException({
  code: 'DAILY_LIMIT_REACHED',
  message: 'Daily limit reached',
  // ... extra data
});
```

## 5. i18n Keys (Frontend)
**Pattern:** `$t` Usage
```typescript
// Don't: 'Please try again'
// Do:
$t('page.game.error.tryAgain')
```
