# AI Memory Bank: Reusable Patterns 🧠

**Last Updated:** 2026-02-22
**Goal:** Stop rewriting the wheel. Copy-paste these proven patterns before writing any new service/controller/component.

> [!IMPORTANT]
> **Always check here FIRST before writing new code.** If a pattern exists below, use it exactly. Do not improvise variations.

---

## 1. Multi-Tenancy (NestJS)

**Pattern:** Controller — Inject Tenant ID
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

---

## 2. Server-Side Pagination (High Performance Data Pattern)

**Use for:** ANY table with potential > 100 rows. This is mandatory.

**Backend (NestJS Service):**
```typescript
async findAll(companyId: string, page = 1, pageSize = 20, search?: string) {
  const qb = this.repo.createQueryBuilder('entity')
    .where('entity.companyId = :companyId', { companyId })
    .orderBy('entity.createdAt', 'DESC')
    .skip((page - 1) * pageSize)
    .take(pageSize);

  if (search) {
    qb.andWhere('entity.name ILIKE :search', { search: `%${search}%` });
  }

  const [data, total] = await qb.getManyAndCount();
  return { data, total, page, pageSize };
}
```

**Frontend (Vue 3 + NDataTable):**
```typescript
const pagination = reactive({ page: 1, pageSize: 20, itemCount: 0, showSizePicker: true, pageSizes: [10, 20, 50] });

// Reset pagination on filter change
watch([searchQuery, filterValue], () => { pagination.page = 1; loadData(); });

// NDataTable setup
const tableProps = { remote: true, pagination, onUpdatePage: (p) => { pagination.page = p; loadData(); } };
```

---

## 3. TypeORM Transaction (Multi-Step Writes)

**Use for:** Any operation that makes 2+ database writes (e.g., deduct credit + award prize).
```typescript
await this.dataSource.transaction(async (manager) => {
  await manager.save(EntityA, recordA);
  await manager.decrement(EntityB, { id: entityBId }, 'balance', amount);
  // If any step fails, ALL steps are rolled back automatically.
});
```

---

## 4. Dynamic Colors (Vue 3)

**Pattern:** Computed Inline Style
```typescript
const color = computed(() => {
  if (props.count === 0) return '#ef4444'; // Red
  if (props.count === 1) return '#facc15'; // Yellow
  return 'white';
});
```
**Usage:** `<span :style="{ color }">{{ count }}</span>`

---

## 5. Game Rules Validation

**Pattern:** Always delegate — never write raw checks in controllers.
```typescript
// Don't write: if (count > limit) { throw ... }
// Do:
await this.gameRulesService.validatePlay(memberId, instance, companyId);
```

---

## 6. Error Handling (Standard i18n-Friendly Exception)

```typescript
throw new BadRequestException({
  code: 'DAILY_LIMIT_REACHED',   // machine-readable code for frontend i18n
  message: 'Daily limit reached', // fallback English message
});
```

---

## 7. BullMQ Repeatable Job (Register + Cleanup Pattern)

**Pattern:** Always remove stale jobs before re-adding. Prevents duplicate ghost jobs in Redis.
```typescript
async registerJob(queue: Queue, jobName: string, cronExpression: string, data: object) {
  // Step 1: Remove all existing repeatable jobs with the same name
  const existing = await queue.getRepeatableJobs();
  for (const job of existing.filter(j => j.name === jobName)) {
    await queue.removeRepeatableByKey(job.key);
  }

  // Step 2: Add the fresh job
  await queue.add(jobName, data, {
    repeat: { cron: cronExpression },
    removeOnComplete: { count: 10 },
    removeOnFail: false, // Keep for Bull Board visibility (AD-004)
  });
}
```

---

## 8. File Upload + Physical Delete Pattern

**On upload (replace):** Delete old file from disk before saving the new one.
```typescript
import * as fs from 'fs';
import * as path from 'path';

async replaceUpload(oldFilename: string, newFile: Express.Multer.File, uploadDir: string) {
  // Delete old file
  if (oldFilename) {
    const oldPath = path.join(uploadDir, oldFilename);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  // Return new filename to save to DB
  return newFile.filename;
}
```

**DELETE endpoint pattern:**
```typescript
@Delete('upload')
async deleteUpload(@Body() dto: DeleteUploadDto, @CurrentTenant() companyId: string) {
  await this.service.deleteUploadedFile(dto.filename, companyId);
  return { success: true };
}
```

---

## 9. Cache-Busting for Uploaded Assets

**Backend:** Append `?v=<timestamp>` to asset URLs when returning config.
```typescript
const bustCache = (url: string) => url ? `${url}?v=${Date.now()}` : url;
return { ...config, logoUrl: bustCache(config.logoUrl) };
```

**Why:** Without this, browsers serve stale images after upload. See AD-006.

---

## 10. i18n Keys (Frontend)

```typescript
// ❌ Don't:  'Please try again'
// ✅ Do:
$t('page.game.error.tryAgain')
```

Both `zh-cn.ts` and `en-us.ts` must always be updated together.
