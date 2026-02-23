# AI Memory Bank: Reusable Patterns 🧠

**Last Updated:** 2026-02-23
**Goal:** Stop rewriting the wheel. Copy-paste these proven patterns before writing any new service/controller/component.

> [!IMPORTANT]
> **Always check here FIRST before writing new code.** If a pattern exists below, use it exactly. Do not improvise variations.

---

## 0. ⚠️ CRITICAL: Adding a New Admin Menu Page (Elegant Router Pattern)

> [!CAUTION]
> **NEVER rename routes to use underscores between words (e.g. `games_credit_transactions`). The Elegant Router uses `_` as the HIERARCHY SEPARATOR. `games_credit_transactions` creates a phantom parent group `games_credit` with a child `transactions`, breaking the flat menu structure. ALWAYS use hyphens for multi-word segments (e.g. `games_credit-transactions`).**

### The 6-File Checklist — touch ALL of them or the route breaks

When adding a new page under `games/` or `management/`, update **every** file below. Missing any one causes: no icon, no i18n, broken menu, or a submenu being created.

| # | File | What to add |
|---|------|-------------|
| 1 | `src/router/elegant/routes.ts` | Route object inside the parent `children` array |
| 2 | `src/router/elegant/imports.ts` | Lazy import entry in the `views` record |
| 3 | `src/router/elegant/transform.ts` | Entry in the `routeMap` const |
| 4 | `src/typings/elegant-router.d.ts` | Entry in `RouteMap` type AND in `LastLevelRouteKey` union |
| 5 | `src/router/routes/index.ts` | `overrideRoles` branch — sets `roles`, `permission`, `icon`, `order` |
| 6 | `src/locales/langs/zh-cn.ts` + `en-us.ts` | i18n key under `route:` section |

### Canonical Example — copy `games_budget-tracking` exactly

**Step 1: `elegant/routes.ts`** — add inside `games` children array (NO icon here, it comes from step 5)
```typescript
{
  name: 'games_budget-tracking',
  path: '/games/budget-tracking',
  component: 'view.games_budget-tracking',
  meta: {
    title: 'games_budget-tracking',
    i18nKey: 'route.games_budget-tracking'
    // ← NO icon/order here. Set them in routes/index.ts overrideRoles instead.
  }
},
```

**Step 2: `elegant/imports.ts`** — add to `views` record
```typescript
"games_budget-tracking": () => import("@/views/games/budget-tracking/index.vue"),
```

**Step 3: `elegant/transform.ts`** — add to `routeMap`
```typescript
"games_budget-tracking": "/games/budget-tracking",
```

**Step 4: `elegant-router.d.ts`** — two places
```typescript
// In RouteMap:
"games_budget-tracking": "/games/budget-tracking";

// In LastLevelRouteKey union:
| "games_budget-tracking"
```

**Step 5: `routes/index.ts`** — add branch inside `overrideRoles`
```typescript
} else if (r.name === 'games_budget-tracking') {
  r.meta.roles = ['R_SUPER', 'R_ADMIN'];
  r.meta.permission = 'budget-tracking:read';
  r.meta.icon = 'carbon:money';   // ← icon goes HERE
  r.meta.order = 10;              // ← order goes HERE
}
```

**Step 6: `locales/langs/zh-cn.ts` AND `en-us.ts`** — add under `route:` key (use HYPHEN, wrapped in quotes)
```typescript
// zh-cn.ts
'games_budget-tracking': '预算追踪',

// en-us.ts
'games_budget-tracking': 'Budget Tracking',
```

### View Folder Naming
- Folder name: `apps/soybean-admin/src/views/games/budget-tracking/index.vue`
- Folder name uses **hyphens** to match the route segment after `games_` prefix.

### Icon Source — confirmed working icons
```
carbon:money        ← Budget Tracking
carbon:activity     ← Play History
carbon:trophy       ← Score Records
mdi:clipboard-text-outline  ← Prize Ledger
mdi:gift            ← Prize Types
material-symbols:person-pin-rounded  ← Members
material-symbols:qr-code-2-rounded   ← Game Instances
ic:outline-color-lens  ← Themes
```

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

**Pattern:** Idempotent Transaction (Webhook Integration)
**Use for:** Handling external webhooks to ensure operations (like deposits) aren't processed twice.
```typescript
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  // 1. Save reference log (requires @Column({ unique: true }) referenceId)
  await queryRunner.manager.save(CreditTransaction, { referenceId, amount });
  
  // 2. Perform business logic
  await queryRunner.manager.update(Member, member.id, { balance: newBalance });
  
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  
  // Handle unique constraint violation gracefully (Postgres code 23505)
  if (error.code === '23505') {
    return { success: true, message: 'Already processed (Idempotency)' };
  }
  throw error;
} finally {
  await queryRunner.release();
}
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

---

## 15. BullMQ — Repeatable Job Deduplication (CRITICAL)

**Use for:** Any scheduler that registers repeatable cron jobs in BullMQ.

**Rule:** `jobId` MUST be nested inside the `repeat` object, NOT at the root opts level. BullMQ hashes `name + repeat.pattern + repeat.jobId` to deduplicate. A root-level `jobId` is ignored during this check.

```typescript
// ❌ WRONG — creates a new entry every time refreshScheduler() runs
await this.syncQueue.add('sync-company-batch', payload, {
  jobId: `sync_${type}_${companyId}`,
  repeat: { pattern: cronExpression },
  removeOnComplete: 100,
});

// ✅ CORRECT — overwrites the existing repeat entry
await this.syncQueue.add('sync-company-batch', payload, {
  repeat: {
    pattern: cronExpression,
    jobId: `sync_${type}_${companyId}`,  // <-- here, inside repeat
  },
  removeOnComplete: 100,
});
```

**Cleanup Before Re-registering:**
```typescript
// Always purge before re-registering to avoid stale keys
const existing = await this.syncQueue.getRepeatableJobs();
for (const job of existing) {
  await this.syncQueue.removeRepeatableByKey(job.key);
}
// Then re-add with correct format
```

**File reference:** `apps/api/src/modules/sync/sync.scheduler.ts`

---

## 16. Deposit Point Rules Engine (Per-Period Point Caps)

**Use for:** Any feature that needs to cap user earnings per day/month or by total count.

**Pattern (TypeORM SUM queries for time-bounded limits):**
```typescript
// Check how many points a member already earned today
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

const { pointsToday } = await this.creditTxRepo
  .createQueryBuilder('tx')
  .select('SUM(tx.amount)', 'pointsToday')
  .where('tx.memberId = :memberId', { memberId })
  .andWhere('tx.companyId = :companyId', { companyId })
  .andWhere('tx.type = :type', { type: 'DEPOSIT' })
  .andWhere('tx.createdAt >= :todayStart', { todayStart })
  .getRawOne();

const alreadyEarnedToday = parseInt(pointsToday ?? '0', 10);

// Truncate points to not exceed the daily cap
const remainingAllowance = maxPointsPerDay - alreadyEarnedToday;
if (pointsToAdd > remainingAllowance) {
  pointsToAdd = Math.max(0, remainingAllowance);
  eligibilityReason = 'DAILY_LIMIT_TRUNCATED';
}
```

**EligibilityReason enum values used:**
| Value | Meaning |
|---|---|
| `ELIGIBLE` | Full points awarded |
| `DAILY_LIMIT_TRUNCATED` | Partial award — daily cap reached |
| `MONTHLY_LIMIT_TRUNCATED` | Partial award — monthly cap reached |
| `MAX_ELIGIBLE_DEPOSITS_EXCEEDED` | Zero awarded — lifetime deposit count exceeded |

**File reference:** `apps/api/src/modules/members/members.service.ts` (`processDeposit` method)

---

## 17. Vue — Conditional Tab Gating via Computed Property

**Use for:** Any admin form where certain tabs must be locked until prerequisites are met.

```typescript
// In script setup
const isIntegrationConfigured = computed(() =>
  formModel.integration_config.enabled && !!formModel.integration_config.apiUrl
);
```

```html
<!-- In template -->
<NTabPane name="sync" tab="Sync Settings" :disabled="!isIntegrationConfigured">
  <div v-if="!isIntegrationConfigured" class="py-10 text-center text-gray-400">
    Please configure the Integration Provider and API URL first.
  </div>
  <div v-else>
    <!-- Actual tab content -->
  </div>
</NTabPane>
```

**Why this pattern:**
- Prevents saving incomplete configurations that cause backend errors.
- Provides UX feedback without a modal or error notice.
- Works reactively — unlocks instantly when the prerequisite field is filled.

**File reference:** `apps/soybean-admin/src/views/management/company/index.vue`
---

## 18. NestJS Route Precedence (UUID Collision Pattern)

**Use for:** Any controller that has both static sub-routes (e.g., `credit-history-all`) and generic ID routes (e.g., `:id`) under the same prefix.

**The Problem:** NestJS matches routes in order. If a generic `:id` route with a UUID validation check is placed before a static route, accessing the static route will fail with a 500 error because the string (e.g., "credit-history-all") is not a valid UUID.

**Pattern:** Always place static endpoints ABOVE generic param endpoints.

```typescript
@Controller('admin/members')
export class AdminMembersController {
  
  // ✅ 1. Static route first
  @Get('credit-history-all')
  async getAllCreditHistory(@Query() dto: GetCreditTransactionsDto) {
    return this.service.findAllTransactions(dto);
  }

  // ✅ 2. Generic param route last
  @Get(':id')
  async getMember(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
```

**Why this pattern:**
- Prevents "Invalid input syntax for type uuid" database errors.
- Ensures clean URL structure without redundant prefixes like `/all/history`.
- Follows standard REST routing best practices in NestJS.

**File reference:** `apps/api/src/modules/members/admin-members.controller.ts`
