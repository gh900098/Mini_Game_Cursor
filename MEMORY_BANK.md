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

---

## 11. Strategy Pattern for Multi-Tenant Integrations

**Use when:** You need different behavior per tenant, integration type, or external platform.
**Rule:** NEVER use `if (companyId === 'X')` or `if (syncType === 'JK')` in service logic. Use a strategy factory instead.
**Guide:** Whenever a new integration is needed, follow the steps in [docs/HOWTO_ADD_SYNC_PROVIDER.md](file:///d:/Google_Antigravity_project/Mini_Game/Mini_Game/docs/HOWTO_ADD_SYNC_PROVIDER.md).

```typescript
// Define the interface
interface SyncStrategy {
  execute(payload: SyncPayload): Promise<SyncResult>;
}

// Implement per integration
@Injectable()
class JKSyncStrategy implements SyncStrategy { ... }

@Injectable()
class XXXSyncStrategy implements SyncStrategy { ... }

// Factory resolves the right one from config
@Injectable()
export class SyncStrategyFactory {
  getStrategy(syncType: string): SyncStrategy {
    const map = { 'JK': this.jkStrategy, 'XXX': this.xxxStrategy };
    const strategy = map[syncType];
    if (!strategy) throw new BadRequestException({ code: 'UNKNOWN_SYNC_TYPE' });
    return strategy;
  }
}

// Caller — zero conditionals, fully extensible
const strategy = this.syncStrategyFactory.getStrategy(company.syncType);
await strategy.execute(payload);
```

**Adding a new integration** = add a new Strategy class + register in factory. Zero changes to existing code.

---

## 12. Dynamic Configuration via ConfigService

**Rule:** NEVER hardcode URLs, limits, secrets, or feature values. Always use `ConfigService`.

```typescript
// ✅ backend — import ConfigModule in module, inject ConfigService
constructor(private readonly config: ConfigService) {}

const apiUrl = this.config.get<string>('EXTERNAL_API_URL');
const uploadDir = this.config.get<string>('UPLOAD_DIR', 'uploads'); // with default
const maxFileSize = this.config.get<number>('MAX_FILE_SIZE_MB', 5) * 1024 * 1024;
```

```typescript
// ✅ frontend env vars — use import.meta.env (Vite)
const apiBase = import.meta.env.VITE_API_BASE_URL;
const appName = import.meta.env.VITE_APP_NAME;
```

**Never do:**
```typescript
// ❌ Hardcoded URL
const res = await fetch('http://localhost:3100/api/sync');

// ❌ Hardcoded limit
if (files.length > 5) { throw error; }

// ❌ Tenant-specific flag in code
if (companyId === 'abc-123') { showSpecialFeature(); }
```

---

## 13. Vue Enterprise UI Pattern (Loading + Empty + Error + Confirm)

**Use for:** EVERY admin table or form page. A complete page must handle all 4 states.

```vue
<template>
  <!-- Loading state -->
  <NSpin v-if="loading" />

  <!-- Error state -->
  <NAlert v-else-if="error" type="error">{{ $t('common.loadFailed') }}</NAlert>

  <!-- Empty state -->
  <NEmpty v-else-if="!data?.length" :description="$t('common.noData')" />

  <!-- Data state -->
  <NDataTable v-else :columns="columns" :data="data" :remote="true" :pagination="pagination" />

  <!-- Destructive action — always confirm -->
  <NPopconfirm @positive-click="handleDelete(row.id)">
    <template #trigger>
      <NButton type="error" size="small">{{ $t('common.delete') }}</NButton>
    </template>
    {{ $t('common.deleteConfirm') }}
  </NPopconfirm>
</template>

<script setup lang="ts">
const loading = ref(false);
const error = ref<string | null>(null);

async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetchApi();
    data.value = res.data;
    pagination.itemCount = res.total;
  } catch (e) {
    error.value = 'Load failed';
  } finally {
    loading.value = false;
  }
}
</script>
```

**Enterprise checklist for every page:**
- [ ] Loading spinner while fetching
- [ ] Error message if fetch fails  
- [ ] Empty state with helpful message
- [ ] Submit button disabled during request (`loading` bound to `:disabled`)
- [ ] Delete/reset uses `NPopconfirm` (never a direct action)
- [ ] Success toast after save via `window.$message.success()`
