# MiniGame Change Log
 
 Records all important feature updates, bug fixes, and architectural changes.
 
## [2026-02-23] Credit Transaction Ledger & Flexible Search

### 💰 Feature Addition

**Problem:** Administrators lacked a global view of all member credit transactions, making it difficult to audit manual adjustments, game wins, and costs across the entire platform.
**Fix:** Implemented a high-performance "Credit Transaction Ledger" providing a centralized audit trail for all financial movements.

**Implementation Details:**
- **Backend**: Added `GET /api/admin/members/credit-history-all` with paginated and isolated results.
- **Frontend**: Created the ledger view in the Admin Panel under "Game Center" using the High Performance Data Pattern.
- **Search**: Built a smart search engine that automatically resolves **Username**, **External ID**, or **UUID** identifiers to find members.
- **UI**: Added color-coded transaction tags, amount highlighting (Credit vs Debit), and balance tracking.

**Bug Fixes:**
- **Route Precedence**: Resolved a 500 error where string-based routes were being incorrectly matched against UUID patterns in `AdminMembersController`.
- **Search Robustness**: Optimized the backend to handle non-UUID searches in the `memberId` parameter to prevent database query failures.
- **Layout Repair**: Fixed `flex-height` collapse issues ensuring the pagination bar remains visible on all resolutions.

**File Modified:** `apps/api/src/modules/members/*`, `apps/soybean-admin/src/views/games/credit-transactions/*`, `apps/soybean-admin/src/locales/langs/*`

**Follow-up Fixes:**
- **Menu Icon**: Resolved a missing icon for the "Credit Transactions" sidebar item by correctly registering the route in all 6 required Elegant Router files (`elegant/routes.ts`, `elegant/imports.ts`, `elegant/transform.ts`, `elegant-router.d.ts`, `routes/index.ts`, locale files).
- **MEMORY_BANK.md**: Documented the Elegant Router 6-file pattern with a canonical example and critical warning about underscore vs. hyphen naming rules.

---

## [2026-02-23] Enterprise Deposit Integration Feature

### 💰 Feature Addition

**Problem:** The platform lacked a built-in method to handle game token deposits natively via the user balance without risking idempotency issues or missing currency conversion multipliers.
**Fix:** Added an end-to-end deposit flow from the third-party provider to the platform user balance. 

**Implementation Details:**
- **Database:** Added `referenceId` unique constraint to `credit_transactions` to natively enforce transactional idempotency on incoming webhooks to prevent double-crediting.
- **Backend:** Created `processDeposit` inside `MembersService` wrapped in a TypeORM query runner.
- **Sync System:** Implemented `case 'deposit'` under the integration strategy handler.
- **Admin UI:** Added a "Deposit Conversion Rate" configuration block on the tenant Sync Settings modal. 

**File Modified:** `api/src/modules/members/*`, `api/src/modules/sync/strategies/*`, `soybean-admin/src/views/management/company/index.vue`

---

## [2026-02-23] Deposit Point Rules Engine Architecture

### 🛡️ Economy Security

**Problem:** Standard deposits blindly apply conversion rates leading to severe inflation vulnerabilities or unlimited promotional farming by isolated users.
**Fix:** Created an internal rule verification layer that intercepts deposit math truncating awards when daily, monthly, or structural ceilings are hit.

**Implementation Details:**
- **Database:** Added `eligibilityReason` to `credit_transactions` mapping point rejections.
- **Backend:** Rewrote `processDeposit` mathematics applying `SUM(amount)` bounded checking.
- **UI Exposure:** Admin Panel now tracks `maxPointsPerDay`, `maxPointsPerMonth`, and `maxEligibleDeposits`.

**File Modified:** `api/src/modules/members/*`, `soybean-admin/src/views/management/company/index.vue`, `api/src/modules/companies/entities/company.entity.ts`

### 🔄 Reliability Fallback

**Problem:** Complete reliance on external webhooks for deposits leaves the system vulnerable to network failures or dropped requests.
**Fix:** Created an hourly batch-pull fallback mechanism (`syncBatchDeposits`) that safely imports missed transactions using the Idempotency constraints guarantees.

**Implementation Details:**
- **API Fetching:** Added `getAllTransactions` mapping to `jk-backend.service.ts`.
- **Batch Processing:** Updated `jk.strategy.ts` to paginate maximum pages into `sync-deposit` BullMQ jobs.
- **Hourly Dispatch:** Modified `sync.processor.ts` `handleHourlySyncOrchestration()` to fire off deposit syncs alongside parallel member syncs.
- **UX Controls:** Admin UI updated to expose "Max Pages" and "Schedule" inputs explicitly for deposits.

**File Modified:** `api/src/modules/sync/jk-backend.service.ts`, `api/src/modules/sync/strategies/jk.strategy.ts`, `api/src/modules/sync/sync.processor.ts`

---

## [2026-02-23] UX Fix: Sync Settings Menu Restoration & Dynamic Providers

### 🎨 UX Improvement

**Problem:** Following the Strategy Pattern refactor, the admin panel menu was altered to a generic "Integration Settings," causing user confusion. Additionally, the Integration Providers dropdown was hardcoded in the frontend.
**Fix:** Restored the "Sync Settings" menu name, routing, and localization keys. Created a new backend endpoint `GET /api/companies/integration-providers` to dynamically supply the supported Sync Strategies (e.g. `JK`, `GENERIC`) to the frontend dropdown.

---

## [2026-02-23] UX Fix: Conditional Integration Sync Guard

### 🎨 UX Improvement

**Problem:** Activating a new Integration dynamically opened the Sync Settings and Webhook tabs before a valid `apiUrl` was supplied, causing administrators to configure broken cron jobs that looped error states locally.
**Fix:** Introduced the `isIntegrationConfigured` computed property into the company modal that strictly sets `:disabled="true"` on the tab panels until API credentials exist.

**File Modified:** `apps/soybean-admin/src/views/management/company/index.vue`

---

## [2026-02-23] Bug Fix: BullMQ Infinite Duplicate Jobs

### 🐛 Backend Integrity

**Problem:** Whenever an Administrator saved the "Company" settings pane, the backend recreated duplicate cron jobs in Redis instead of overwriting the previous schedule, leading to massive memory bloat and runaway sync procedures.
**Fix:** Refactored `sync.scheduler.ts`. The third parameter `opts` in `bullmq`'s `this.syncQueue.add()` was incorrectly formatting custom IDs at the root level instead of identically nested within the `repeat` block. Passing `repeat: { pattern, jobId }` enforces correct unique hashing updates.

**File Modified:** `apps/api/src/modules/sync/sync.scheduler.ts`

---

## [2026-02-22] Generic Integration Architecture & Strategy Pattern Refactor

### 🏗️ Architectural Enhancement

**Problem:** The synchronization system was hardcoded for the "JK Platform", making it impossible to add new third-party integrations (like Shopify, WooCommerce, or custom Webhooks).
**Fix:** Refactored the internal entity properties and standard Sync engine to use the **Strategy Pattern**.

**Implementation Details:**
- **Database:** Renamed the `jk_config` JSONB column on the `Company` entity to `integration_config`, decoupling the schema from a specific vendor. Added `provider` field.
- **Backend:** Created `SyncStrategy` interface and `SyncStrategyFactory` to dynamically resolve integration handlers (e.g., `JkSyncStrategy`).
- **Admin UI:** Migrated `sync-settings` views and routing to generic `integration-settings`. Modal includes a "Provider" dropdown.
- **Migration:** Schema synchronization handles the column renaming locally.

**File Modified:** `apps/api/src/modules/sync/*`, `apps/soybean-admin/src/views/management/company/index.vue`

### ✅ Deployment
- ✅ API, Admin, and WebApp containers rebuilt and deployed to test environment.

---

## [2026-02-22] UX Fix: Theme Preset Auto-Switch to Custom

### 🎨 UX Improvement

**Problem:** When a user selected a theme preset (e.g., "Christmas Joy") in the Game Instance Config, all theme settings were applied instantly. However, if the user then manually edited any field (e.g., changed a color, uploaded a new image), the Theme Preset dropdown still showed the original theme name — misleading the admin into thinking the full theme was still active.

**Fix:** Added logic in `ConfigForm.vue` to automatically reset the `themePreset` dropdown to `"Custom"` whenever the user manually edits any setting after a theme is applied.

**Implementation Details:**
- Added `const isApplyingPreset = ref(false)` flag.
- The `themePreset` watcher now sets this flag `true` before bulk-applying fields and resets it after 300ms via `setTimeout()`.
- The existing `formModel` deep watcher now checks `isApplyingPreset` before switching to Custom, ensuring theme bulk-apply itself does not accidentally retrigger the switch.
- The `handleFieldChange()` function was also updated with the same guard for legacy presets and schema-defined presets.

**File Modified:** `apps/soybean-admin/src/views/games/game-instance/components/ConfigForm.vue`

### ✅ Deployment
- ✅ Admin container rebuilt and verified on port 3101.

---

## [2026-02-22] Fix: BullMQ Stale Job Infinite 404 Loop

### 🐛 Bug Fix

**Problem:** Bull Board was flooding the browser console with `404 Not Found` errors by polling a ghost repeatable job (`repeat:e370466d3ff5286116c48ca8b951119a`) that no longer had a valid body in Redis. This occurred because a previous hourly cron was replaced but its legacy Redis sorted-set entry was never cleaned up.

**Root Cause:** `SyncScheduler.refreshScheduler()` used BullMQ's `getRepeatableJobs()` + `removeRepeatableByKey()` for cleanup. This only removes the newer `cron_` format entries. Old `repeat:HASH` entries in the `bull:sync-queue:repeat` sorted set survived every restart.

**Fix:**
- Added a second cleanup pass in `refreshScheduler()` using the raw Redis client to `ZRANGE` + `ZREM` any remaining members from the repeat sorted set before registering new jobs.
- Applied an immediate one-time Redis key deletion to stop the 404 loop without a rebuild.

**File Modified:** `apps/api/src/modules/sync/sync.scheduler.ts`

---


## [2026-02-21] Theme Upload Bugfixes & Server-Side File Deletion

### 🐛 Bug Fixes

#### 1. Fixed UUID Filenames on Upload
- **Problem:** Files uploaded from the Theme Editor always got random UUID names (e.g. `af0bbd24...png`) instead of descriptive names like `resultLoseBackground.png`.
- **Root Cause:** `FormData` fields were appended in the wrong order — the `file` chunk was sent to Multer **before** the `customName` field, so Multer fell back to UUID generation.
- **Fix:** Reordered `FormData.append()` calls in `theme-detail/index.vue` so that all text fields (including `customName`) are appended **before** the file binary.

#### 2. Server-Side File Deletion
- **Problem:** The 🗑️ (trash) button only cleared the URL reference in the config form — it did **not** remove the physical file from the server's `uploads/` directory.
- **Fix:**
  - **Backend:** Added `DELETE /api/game-instances/upload` endpoint in `game-instances.controller.ts`. Accepts a `{ url }` body, strips the `/api/uploads/` prefix, resolves the physical path with path-traversal protection, and calls `fs.unlinkSync()`.
  - **Frontend:** Updated `clearAsset()` in both `theme-detail/index.vue` and `ConfigForm.vue` to call the DELETE endpoint before clearing the local config reference.

#### 3. Added Cache-Busting to GET Endpoints
- **Problem:** Browsers cached theme/game-instance GET API responses, causing deleted images to reappear after page navigation.
- **Fix:** Added `_t: Date.now()` timestamp parameter to `fetchThemes()`, `fetchThemeDetail()`, and `fetchGetGameInstances()`.

### ✅ Deployment
- ✅ API and Admin containers rebuilt and verified.
- ✅ DELETE endpoint tested and confirmed working.

---

## [2026-02-21] Theme Editor Visuals Alignment

### 🎨 Customization Enhancement
**Core Requirements:**
- Make the Theme Editor visual styles match the Game Instance configuration.
- Add missing game assets (Result prompts, center hubs, dividers, token bars) to the Theme schema.
- Standardize the upload interface for game assets and audio in the Theme Editor.

### 📝 Features Implemented

#### 1. Standardized Asset Upload Pattern
- **Path Standardization**: Rewrote the upload API (`game-instances.controller.ts`) to treat `common-themes` as a core globals directory. Theme assets are now consistently placed in `uploads/common-themes/[themeSlug]/[category]/[customName.ext]` avoiding company ID tangling.
- **UI Refactoring**: Replaced legacy upload fields across `theme-detail/index.vue` with a consistent `readonly string + 📁 Upload` pattern, submitting the properly namespaced `instanceId` and structured `customName`.
- **Suffix Interactions**: Added standard `Preview (👁️)`, `Clear (🗑️)`, and `Upload (📁)` actions to all visual and audio properties, mimicking `ConfigForm.vue`.
- **Gradient Standardization**: Replaced explicit degree string inputs (`135deg`) with a user-friendly dropdown (`NSelect`) matching the Game Instance UI (Top to Bottom, Radial Center, etc.).

#### 2. Expanded Visual Schema
- **Game Assets Added**: Included `tokenBarImage`, `centerImage`, and `dividerImage` configurations directly into Theme presets.
- **Result Prompts Added**: Grouped and added the 3 distinct multi-image grids for **Win**, **Lose**, and **Jackpot** visual outcomes.
- **Audio Added**: `bgmUrl`, `winSound`, `loseSound`, and `jackpotSound` are now first-class configurable properties.

### 📊 Technical Details
- **Backend**: Flattened `config.visuals` schema in `seed.service.ts` to accommodate the unified assets.
- **Frontend**: Expanded `ThemeConfig` interface and default `formData` inside `apps/soybean-admin/src/views/games/theme-detail/index.vue`.
- **Layout Repair**: Restructured the flexbox hierarchy of the `NTabs` and `NCard` components to guarantee that long configuration forms scrolling independently does not force the "LIVE PREVIEW" container off-screen. Fixed missing scrollbars on form panels.

### ✅ Deployment
- ✅ Admin container rebuilt and visually verified.
- ✅ Upload functionality tested and standardized.

---

## [2026-02-20] Strict Impersonation Protection & Environment Isolation

### 🛡️ Security Enhancement
**Core Requirements:**
- Allow administrators to safely impersonate users and test games without affecting real balances or statistics.
- Fix API connection and routing issues that prevented successful impersonation in local environments.
- Resolve missing image assets caused by docker volume mismatches and aggressive caching.

### 📝 Features Implemented

#### 1. Strict Impersonation Bypass
- **Game Rules Override**: `ScoresService` and `GameRulesService` now bypass budget, balance, and cooldown checks when `isImpersonated` is true.
- **No Persistence**: Score submissions during impersonation return a mock ID (`impersonated-test-id`) and do not deduct points or pollute the global history.
- **UI Warning**: Added a prominent pulsing red "ADMIN IMPERSONATION MODE" banner to the frontend to remind admins of the read-only state.

#### 2. Environment Isolation & Fixes
- **Test Environment**: Created `docker-compose.test.yml` strictly for `localhost` development with proper volume mounts for uploads.
- **Route Shadowing Fix**: Reordered endpoints in `MembersController` to ensure `/profile` takes precedence over `/:id`, resolving 403 Forbidden errors during impersonation.
- **URL Fallback Logic**: Improved `AdminMembersController.impersonate` to dynamically detect ports or fallback appropriately when `VITE_WEBAPP_BASE_URL` is absent.

#### 3. Game Asset Caching Fix
- **Uploads Volume**: Added the `uploads` volume mount to the test API container so locally seeded assets resolve correctly.
- **Data Migration**: Successfully migrated persistent image uploads from the production Docker named volume (`mini_game_api_uploads`) to the local host bind mount to restore broken images in the test environment.
- **Cache-Control Headers**: Applied `no-store, no-cache` headers to the `/play` endpoints, preventing the browser from caching stale HTML templates containing outdated config UUIDs.

### ✅ Deployment
- ✅ Verified strict bypass rules via automated scripts.
- ✅ Rebuilt API and updated test environment configuration.
- ✅ Fixed missing game assets and 403 errors.

---

## [2026-02-20] High Performance Data Standards & Global Rollout

### 🏗️ Architectural Enhancement
**Core Requirements:**
- Standardize all management views with the "High Performance Data Pattern".
- Implement server-side pagination and keyword search for high-volume modules.
- Ensure layout consistency and visibility of navigation controls across all devices.

### 📝 Features Implemented

#### 1. Standardized Remote Pagination
- **Full Coverage**: Rolled out server-side pagination to **Companies**, **Permissions**, **Users (Staff)**, **Roles**, **Scores**, **Prizes**, and **Play Attempts**.
- **Unified Search**: Added Name/Slug/Keyword search to all management modules.
- **Performance**: Added database indexes to `createdAt`, `companyId`, etc., to support efficient sorting and filtering.

#### 2. Robust UI Layout (High Performance Data Pattern)
- **Fixed Footers**: Implemented a standardized flexbox layout that ensures the pagination bar is always visible at the bottom of the screen.
- **Internal Scrolling**: Data tables now scroll internally using `flex-height`, preventing page-level overflow and improving UX.

#### 3. Background Sync Stabilization
- **API Resilience**: Updated `SyncScheduler` and `SyncProcessor` to handle the new paginated `CompaniesService.findAll()` response.
- **Refined Scheduling**: Background sync routines now fetch up to 1000 companies to ensure all active schedules are properly managed.

### 📊 Technical Details
- **Backend**: Modified `findAll` across multiple services; added TypeORM `findAndCount` logic.
- **Frontend**: Standardized `NDataTable` configuration with `remote: true` and `flex-height`.

### ✅ Deployment
- ✅ Rebuilt API and Admin containers.
- ✅ Verified pagination UX across all modules.
- ✅ Verified background sync scheduling remains functional.

### 🐞 Bug Fixes
- **Duplicate User Resolution**: Resolved issue where multiple user records could be created for the same email due to missing unique constraints on deterministic hashes (`emailHash`). Enforced uniqueness at the entity level and merged existing duplicates.

---

## [2026-02-19] PII Protection & Data Privacy

### 🛡️ Security Enhancement
**Core Requirements:**
- Implement Role-Based Access Control (RBAC) for sensitive user data (Email, Phone).
- Mask PII in all list views to prevent mass data leakage.
- Prevent accidental overwriting of masked data during user editing.

### 📝 Features Implemented

#### 1. PII Masking System
- **Default Masking**: `email` (u***@domain.com) and `phoneNumber` (*******1234) are masked by default in all API responses.
- **Conditional Unmasking**: Only users with `members:view_sensitive` permission (or Super Admins) can see full data in Detail views.
- **Controllers Updated**: 
    - `MembersController` (Client)
    - `AdminMembersController` (Admin) (List/Detail)
    - `AdminScoresController` (Scores/Attempts)

#### 2. Safe Edit Protection
- **Problem**: Editing a user with masked data could mistakenly save "*******" back to the database.
- **Solution**: 
    - **Fresh Fetch**: `operate-drawer.vue` fetches a fresh, unmasked copy of the member data (if authorized) when opening the edit form.
    - **Submission Guard**: Frontend detects if a field contains "****" and removes it from the update payload, ensuring the backend data remains untouched.

### 📊 Technical Details
- **Utils**: `apps/api/src/common/utils/masking.utils.ts`
- **Frontend**: `apps/soybean-admin/src/views/games/members/modules/operate-drawer.vue`
- **Permissions**: Added `members:view_sensitive` to Seed Service.

### ✅ Deployment
- ✅ API and Admin services rebuilt.
- ✅ Verified masking in List Views.
- ✅ Verified unmasking in Detail View (with permission).
- ✅ Verified Safe Edit logic (preventing asterisk submission).

---

## [2026-02-16] Dynamic Sync Scheduler & API Parameter Recovery

### 🏗️ Architectural Enhancement
**Core Requirements:**
- Resolve circular dependencies between `SyncModule`, `CompaniesModule`, and `MembersModule` without using `forwardRef`.
- Implement a decoupled notification system to refresh the sync scheduler when company settings change.
- Restore the "Custom API Parameters" UI that was omitted during recent tab refactoring.

### 📝 Features Implemented

#### 1. Event-Driven Sync Scheduler
- **EventEmitter Integration**: Switched from direct service calls to NestJS `EventEmitter2`.
- **Decoupled Refresh**: `CompaniesService` now emits `sync.refresh` events. `SyncScheduler` listens and re-initializes BullMQ jobs without direct coupling.
- **Dynamic Scheduling**: Changes to Cron patterns in the UI are applied immediately with zero downtime.

#### 2. Per-Type API Parameter Management
- **Custom Parameters UI**: Restored the dynamic key-value editor for sync parameters.
- **Granular Control**: Parameters can now be configured uniquely for **Members**, **Deposits**, and **Withdrawals**.
- **Data Persistence**: Ensured `syncParams` are correctly saved into the `jk_config.syncConfigs` JSONB structure.

#### 3. Full Production Deployment
- **Rebuilt Stack**: Full rebuild of API, Worker, Admin, and WebApp services.
- **Improved Build Process**: Updated Dockerfiles to handle pnpm lockfile synchronization during dependency updates.

### 📊 Technical Details
- **Backend**: `@nestjs/event-emitter`, `SyncScheduler.refreshScheduler()`, `CompaniesService.update()`.
- **Frontend**: `apps/soybean-admin/src/views/management/company/index.vue`.
- **Infrastructure**: `docker-compose.prod.yml`, `Dockerfile.api`, `Dockerfile.worker`.

### ✅ Deployment
- ✅ Verified live refresh logic (EventEmitter logs).
- ✅ Verified 200-page incremental sync performance (~6 mins).
- ✅ Verified parameter propagation to JK API requests.

---

## [2026-02-16] Sync System Optimization & UI Configuration

### ✨ New Features
**Core Requirements:**
- Optimize the JK Sync system for high-volume data (35k+ users).
- Implement granular scheduling control for administrators.

### 📝 Features Implemented
#### 1. Parallel Sync Orchestration
- **Batch Processing**: Implemented parallel page fetching (30 pages per batch) in `SyncProcessor`.
- **Incremental Mode**: Added `maxPages` limit to prevent infinite loops and control sync depth.

#### 2. Tabbed Admin UI
- **Organization**: Refactored Company edit form into a clean Tabbed interface (Basic, Sync, Auth).
- **Per-Type Config**: Individual toggles and Cron inputs for different sync targets.

### ✅ Deployment
- ✅ Successfully synced 35,000 users in production mode.
- ✅ Granular scheduling verified across multiple companies.

---


### 🎨 UI/UX Improvement

**Core Requirements:**
- Enhance the "Score History" table to be more "reliable" and transparent.
- Split ambiguous "Points" into "Base Value", "Multiplier", and "Final Award".
- Visually distinguish between Costs (Red) and Rewards (Green/Blue).

### 📝 Features Implemented

#### 1. Financial Transparency
- **Split Columns**:
    - **Base Value**: The raw score from the game engine.
    - **Multiplier**: Shows `x2`, `x5` etc. (or `-` if x1).
    - **Final Award**: The actual net points added to the user's wallet.
    - **Cost**: Explicitly shows the token cost (e.g., `-20`) in Red.

#### 2. Visual Hierarchy
- **Cost**: Styled with `text-error` (Red).
- **Final Award**: Styled with `text-primary` (Bold Blue) for positive values.
- **Prize Details**: 
    - **Big Win/Jackpot**: Gold/Orange tags with 🏆 icon.
    - **Physical Items**: Green/Success tags with 📦 icon.
    - **Try Again**: Gray/Default tags to reduce visual noise.

### 📊 Technical Details
- **File**: `apps/soybean-admin/src/views/games/scores/index.vue`
- **Typing**: Validated against `Api.Management.Score` interface.

### ✅ Deployment
- ✅ Admin service rebuilt & deployed.
- ✅ Verified in production mode.

---

## [2026-02-14 Afternoon] Tenant Isolation Integrity (BUG-002)

### 🛡️ Security Enhancement

**Core Requirements:**
- Ensure complete data isolation between different companies.
- Prevent administrators from accessing other companies' data via URL or parameter manipulation.
- Fix multiple isolation vulnerabilities in Scores, Prizes, and Members modules.

### 📝 Features Implemented

#### 1. Controller-Level Ownership Checks
- **AdminMembersController**: Protects all member CRUD operations. Manual access to other companies' Member IDs now throws a `ForbiddenException`.
- **AdminPrizesController**: Fixed global prize leakage issues, enforcing company-based filtering.
- **AdminScoresController**: Enforced filtering for all entries and statistical information, blocking illegal `companyId` parameter injection.
- **ScoresController**: Players can now only submit scores for game instances belonging to their company, strictly prohibiting cross-store score manipulation via slug modification.

#### 2. JWT Strategy Standardization
- Unified the logic for Admin users to use `currentCompanyId` instead of `companyId`.
- Ensured consistency of isolation attributes across all Admin backend controllers, eliminating permission bypass due to attribute reading errors.

#### 3. Super Admin Flexibility
- Retained global visibility for system administrators. The `isSuperAdmin` flag allows developers and maintenance personnel to bypass isolation restrictions while ensuring regular merchant administrators remain strictly locked.

### 📊 Technical Details
- **File Locations**: Consistency restructuring performed on all `admin-*.controller.ts`.
- **Verification Script**: Created `tools/repro/isolation-leak-proof.js` to log and reproduce potential vulnerabilities.

### ✅ Deployment
- ✅ API service rebuilt & verified
- ✅ Core documentation updated (`FEATURES.md`, `TROUBLESHOOTING.md`).
- ✅ Testing and verification finalized.

## [2026-02-14 Morning] Flexible Prize Type Configuration & UI Refinement

### ✨ New Features

**Core Requirements:**
- Distinguish between "Points" and other prize types (Cash, Items, E-Gifts).
- Resolve Admin UI table issues including date wrapping and imbalanced column layouts.
- Fix missing item prize metadata (`metadata.prize`).

### 📝 Features Implemented

#### 1. Flexible Prize Type Logic
- **PrizeType Entity Enhancement**: Added `isPoints` (boolean) field.
- **Seed Data Update**: Default Item, Cash, and E-Gift types set to `isPoints: false`.
- **ScoresService Refactoring**:
    - `submit()` method now uses `isPoints` to determine whether to award `finalPoints`.
    - Award actual score for Points type; otherwise, award 0 points.
- **Statistical Calibration**: Global and member statistics now base on `finalPoints` instead of raw score, preventing non-monetary prizes from artificially inflating point totals.

#### 2. Admin UI Professional Layout
- **Time Column Stabilization**: Width increased to **200px**, added `whitespace-nowrap` and `fixed: "left"`.
- **Column Layout Restructuring**: 
    - Compacted Points and Deduction columns.
    - Generalized Player and Game Instance columns with tooltips for long text.
- **Cross-Page Portability**: Improvements applied to global "Score Records" and "Scores" tabs in member details.

#### 3. Prize Metadata Enrichment
- **Multi-layer Fallback Mechanism**: Even if the client fails to send a prize name, the backend automatically generates one based on `label` -> `prizeName` -> `type` -> `prizeType` -> "Win".
- **Template Fix**: Updated Spin Wheel **Premium V2** and **Legacy V1** templates to ensure descriptive names are always sent upon winning.

#### 4. Human-Readable Metadata Display
- **Tag-based Display**: Converts raw JSON into visible color-coded tags (e.g., "Winner", "Multiplier", "Item").
- **Hover Details**: Hover over tags to view full JSON details.

### 📊 Technical Details

**File Locations:**
- Backend: `apps/api/src/modules/scores/scores.service.ts` (Core Logic)
- Backend: `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts` (V2 Template)
- Backend: `apps/api/src/modules/game-instances/game-instances.controller.ts` (V1 Template)
- Frontend: `apps/soybean-admin/src/views/games/scores/index.vue` (Layout/Tags)
- Frontend: `apps/soybean-admin/src/views/games/member-detail/[id].vue` (Layout/Tags)

### ✅ Deployment
- ✅ API service rebuilt & redeployed.
- ✅ Admin service rebuilt & redeployed.
- ✅ Web App service rebuilt & redeployed.
- ✅ Verification complete: Item prizes no longer inflate points; metadata displays correctly.

---


### ✨ New Features

**Implementation Time:** 2026-02-13 22:57-23:13 (16 minutes)

**Core Requirements:**
- Admin needs to see full prize information for confirmation before updating status.
- Admin needs to upload evidence (receipts, delivery notes) as fulfillment proof.
- Physical prizes should not display incorrect numeric prices.

### 📝 Features Implemented

#### 1. Prize Details Display

**New UI Design:**
- Modern gradient background (Blue to Purple).
- Large prize icon box (80x80px) with shadow.
- Structured grid layout for information display.
- Color-coded status badges.

**Display Content:**
- ✅ Prize icon/image (support previewing).
- ✅ Prize name (Large title, XL font).
- ✅ Prize type badge (Color-coded tag with icon).
- ✅ Prize description (Full text).
- ✅ Prize value (Only displayed for monetary prizes, with 💰 icon).
- ✅ Member username (UUID display removed).
- ✅ Game instance name.
- ✅ Current status (Color-coded badge).
- ✅ Winning time (Date + Time).

**File Locations:**
- `apps/soybean-admin/src/views/games/prizes/index.vue` (Lines 28-98)

#### 2. Receipt Upload

**Features:**
- Conditional Display: Only shows when status is "fulfilled" or "shipped".
- File Types: JPG, PNG, PDF.
- File Size Limit: 5MB.
- Pre-upload Validation (Type + Size).
- Success/Failure Feedback.
- View/Remove uploaded receipts.
- Display existing receipts (when re-opening modal).

**New API Endpoint:**
```typescript
POST /admin/prizes/:id/receipt
- Uses multer `FileInterceptor`.
- Storage path: `./uploads/{companyId}/receipts/{prizeId}/`.
- Filename format: `receipt_{timestamp}_{random}.ext`.
- Returns: `{ url: string }`.
```

**Metadata Storage:**
- Stored in `MemberPrize.metadata.receipt` field.
- No schema changes required (uses existing JSONB field).
- Automatically preserves existing receipts (if no new one is uploaded).

**File Locations:**
- Backend: `apps/api/src/modules/scores/admin-prizes.controller.ts` (Lines 18-67)
- Frontend: `apps/soybean-admin/src/views/games/prizes/index.vue` (Lines 69-107, 451-505)

#### 3. Prize Value Fix

**Problem:**
Physical prizes (item, physical, egift) displayed incorrect values (e.g., "Value: 10.00").

**Root Cause:**
```typescript
// Old code - Incorrect
prizeValue: prizeConfig.value || scoreValue  
// For physical prizes without a value, it falls back to scoreValue (game score)
```

**Solution:**
Added `getPrizeValue()` helper method:
```typescript
private getPrizeValue(prizeType: string, configValue: number | undefined, scoreValue: number): number {
    const typeSlug = String(prizeType).toLowerCase();
    
    // Non-monetary prizes default to 0
    const nonMonetaryTypes = ['item', 'physical', 'egift', 'e-gift', 'voucher'];
    if (nonMonetaryTypes.includes(typeSlug)) {
        return configValue ?? 0;  // Do not use scoreValue
    }
    
    // Monetary prizes use scoreValue as fallback
    return configValue ?? scoreValue;
}
```

**Impact:**
- ✅ New physical prizes: Value = 0.
- ✅ Frontend automatically hides the value=0 badge (`shouldShowValue()` function).
- ⚠️ Existing prizes in the database: Maintain original value (Optional SQL cleanup).

**File Locations:**
- `apps/api/src/modules/scores/scores.service.ts` (Lines 30-46, 115)

### 📊 Technical Details

**Backend Changes:**
1. **Receipt Upload Endpoint**
   - File validation (type + size)
   - Multi-tenant storage (company-specific directories)
   - Timestamped unique filenames
   - Returns URL for frontend storage.

2. **Prize Value Logic**
   - Type-based value calculation
   - Distinguishes between monetary and non-monetary prize types.
   - Prevents score values from polluting physical prize data.

**Frontend Changes:**
1. **Modal Width**: 600px → 650px (Accommodates more content).
2. **Prize Details Section**: Gradient background + grid layout.
3. **Helper Functions**:
   - `getPrizeIcon()` - Icon/Image determination.
   - `getPrizeName()` - Handles image-based prizes.
   - `renderPrizeType()` - Type badge rendering.
   - `shouldShowValue()` - Value display logic.
   - `renderStatusBadge()` - Status badge rendering.
   - `formatDate()` - Date formatting.
4. **Receipt Handlers**:
   - `beforeReceiptUpload()` - Pre-upload validation.
   - `handleReceiptUpload()` - Actual upload process.
   - `viewReceipt()` / `removeReceipt()` - Management operations.
   - `viewExistingReceipt()` - Viewing existing receipts.

### 🗄️ File Storage Structure

```
./uploads/
  └── {companyId}/
      └── receipts/
          └── {prizeId}/
              ├── receipt_1707844123456_a3f2e1d8....jpg
              ├── receipt_1707844234567_b4c3f2e9....png
              └── receipt_1707844345678_c5d4a3b1....pdf
```

**Advantages:**
- Company isolation (multi-tenancy).
- Prize-specific organization (easy cleanup).
- Unique filenames (conflict prevention).

### 🔄 Commits

```
241d314 - feat: add prize ledger enhancements with receipt upload
b440b2a - refactor: enhance prize details modal UI design
4627b00 - fix: set prize value to 0 for physical items without explicit value
```

### 📝 File Changes

**Backend:**
- `apps/api/src/modules/scores/admin-prizes.controller.ts` - Added receipt upload endpoint.
- `apps/api/src/modules/scores/scores.service.ts` - Added `getPrizeValue` method.

**Frontend:**
- `apps/soybean-admin/src/views/games/prizes/index.vue` - Completely redesigned modal

### ✅ Deployment

- ✅ API service deployed successfully
- ✅ Admin service deployed successfully
- ✅ Changes committed to branch `feat/prize-ledger-receipt-upload`

### 📖 Usage Instructions

**Admin Workflow:**
1. Open Prize Ledger (Games → Prize Ledger).
2. Click the "Operate" button for any prize.
3. View detailed prize information (Confirmation).
4. Select new status (Fulfilled / Shipped).
5. (Optional) Upload receipt/proof.
6. Add notes (Optional).
7. Save.

**Viewing Receipts:**
- Uploaded: Green check + "View" and "Remove" buttons.
- Existing: "Existing receipt on file" + "View" button.

---


## [2026-02-13 Evening] UI/UX Pro Max Skill Installation

### 🎨 Infrastructure Enhancement

**Implementation Time:** 2026-02-13 21:35-21:41 (6 minutes)

**Core Requirements:**
- Integrate professional UI/UX design intelligence system.
- Provide support for landing page and game interface design.
- Automate design system generation.

**Installation Content:**

1. **CLI Tool Installation**
   - Globally install `uipro-cli` npm package.
   - Use `uipro init --ai antigravity` to initialize the skill.

2. **Design Intelligence Database**
   - 67 UI Styles (Glassmorphism, Minimalism, Retro-Futurism, etc.).
   - 96 Color Palettes (Industry-specific, mood-oriented).
   - 57 Font Pairings (Google Fonts).
   - 99 UX Guidelines (Best practices, anti-patterns).
   - 25 Chart Types (Data visualization).
   - 13 Tech Stack Guides (React, Vue, Next.js, etc.).

3. **Auto-activation Mechanism**
   - Automatically activates when UI/UX design tasks are mentioned.
   - Keyword triggers: \"build\", \"create\", \"design\", \"landing page\", \"dashboard\", etc.
   - Works in synergy with existing skills (Game Designer, Vue Developer, etc.).

**Technical Implementation:**

**Installation Path:**
```
.agent/skills/ui-ux-pro-max/
├── SKILL.md          # Skill instruction document.
├── data/             # Design database (CSV files).
└── scripts/          # Python search engine.
```

**Features:**
- **Design System Generator** - AI inference engine analyzes project requirements to generate a complete design system.
  - Pattern recommendations (Landing page structure, CTA layout).
  - Style selection (Visual aesthetics matching the brand).
  - Color palettes (Primary, secondary, CTA, background).
  - Typography (Heading + Body font pairing).
  - Effects (Shadows, transitions, animations).
  - Anti-patterns (Avoidable design mistakes).

**Usage Examples:**
```bash
# Auto-generate design system
python .agent/skills/ui-ux-pro-max/scripts/search.py "gaming platform entertainment" --design-system -p "Mini Game Platform"

# Domain-specific search
python .agent/skills/ui-ux-pro-max/scripts/search.py "vibrant playful" --domain style
python .agent/skills/ui-ux-pro-max/scripts/search.py "elegant modern" --domain typography
python .agent/skills/ui-ux-pro-max/scripts/search.py "dashboard" --domain chart

# Tech stack guide
python .agent/skills/ui-ux-pro-max/scripts/search.py "responsive layout" --stack vue
```

**Testing & Verification:**
```
✅ CLI installation successful (uipro-cli).
✅ Skill initialization successful (.agent/skills/ui-ux-pro-max/).
✅ Python 3.14.3 available.
✅ Test query successful (Generated gaming platform design system).
  - Pattern: App Store Style Landing
  - Style: Retro-Futurism (Ideal for games).
  - Colors: Neon Purple + Rose Red + Dark Background.
  - Typography: Russo One / Chakra Petch.
  - Effects: CRT scanlines, neon glows, glitch effects.
```

**File Changes:**
- `.agent/skills/ui-ux-pro-max/` - Added the entire skill directory (31 files).

**Deployment:**
- ✅ Skill installed and available.
- ✅ Python environment verification passed.
- ✅ Auto-activation mechanism in place.

**Impact:**
- Professional guidance for all future UI/UX design work.
- Landing page designs follow industry best practices.
- Game interface designs receive professional recommendations.
- Significant improvement in design consistency and quality.

**Documentation Updates:**
- ✅ Created `walkthrough.md` - Complete usage guide.
- ✅ Updated `CHANGELOG.md` - This entry.

**Future Use Cases:**
- Landing page design (Spin Wheel, Slot Machine, etc.).
- Admin dashboard redesign.
- Mobile game selection interface.
- Prize display page optimization.
- Member center UI improvements.

---

## [2026-02-13 Evening] Member Detail UI Improvements

### 🎨 UI Enhancement

**Implementation Time:** 2026-02-13 21:05-21:30 (25 minutes)

**Core Requirements:**
- Improve usability and information display on the member details page.
- Reorder tabs to enhance user experience.
- Enrich prize information display.

**Improvements:**

1. **Tab Reordering**
   - Moved "Login History" to the last position.
   - New Order: Credits → Plays → Scores → **Prizes** → Logins.
   - Logic: Prize information is more critical and frequently accessed than login history.

2. **Prize Table Enhancements**
   - Added **Type** column: Color-coded tags display prize types (Physical/Cash/Points/Bonus/Virtual).
   - Added **Value** column: Displays context-aware information:
     - Physical prizes → Displays item description (read from `metadata.config.description`).
     - E-vouchers → Displays redemption codes.
     - Cash/Points → Displays numeric values (with color highlighting).
   - Added **Updated** column: Displays the last update timestamp.
   - Improved display and fallback handling for existing columns.

**Bug Fixes:**

1. **Prize Description Path Error**
   - **Problem:** Physical prizes displayed "JACKPOT" (prize name) instead of the actual prize description (e.g., "iPhone 15 Pro Max").
   - **Root Cause:** Prize metadata is nested under `metadata.config.description`, but the code was looking in the wrong location.
   - **Fix:** Updated the Value column to access the correct nested path.

**File Changes:**
- `apps/soybean-admin/src/views/games/member-detail/[id].vue` - Tab reordering and prize table enhancements.

**Deployment:**
- ✅ Admin service rebuilt successfully.

**Impact:**
- Administrators can more easily access prize information (advanced in tab order).
- Prize details at a glance (Type, Description, Value, Status).
- Easier tracking of prize fulfillment progress (Updated timestamp).
- High-value prizes are prominently highlighted (Color-coding).

---
 
## [2026-02-13 Evening] Admin Menu Icons - Prize Ledger & Prize Types


### 🎨 UI Enhancement

**Implementation Time:** 2026-02-13 21:05-21:10 (5 minutes)

**Core Requirements:**
- Prize Ledger and Prize Types menu items were missing icons.

**Fix Details:**
1. **Prize Ledger** → Added `mdi:clipboard-text-outline` icon 📋.
2. **Prize Types** → Added `mdi:gift` icon 🎁.

**File Changes:**
- `apps/soybean-admin/src/router/elegant/routes.ts` - Updated route definitions to add icons.
- `apps/soybean-admin/src/router/elegant/imports.ts` - Added missing view imports.
- `apps/soybean-admin/src/typings/elegant-router.d.ts` - Updated TypeScript type definitions.

**Deployment:**
- ✅ Admin service rebuilt successfully.

---
 
 ## [2026-02-01 Evening] Member Management Fixes: UUID Display Optimization & Status Toggle Fix

### 🎯 Member Management Module UI & Functional Fixes

**Implementation Time:** 2026-02-01 18:05-18:15 (10 minutes)  

**Core Requirements:**
- Member list ID display too long, causing messy wrapping.
- "Enable/Disable" button was ineffective.
- Member details page failing to load content.

**Fix Details:**
1. **UI Optimization**: Increased ID column width from 80 to 380 to prevent UUID wrapping and improve page layout.
2. **Type Correction**: Fixed an issue in the frontend Service and View where Member ID was incorrectly defined as a `number` (UUIDs should be `string`).
3. **Functionality Enhancement**: Updated the backend `toggle-status` interface to support explicit `isActive` value passing, ensuring status consistency between frontend and backend.
4. **Details Page Fix**: Removed incorrect `Number()` conversion in `detail.vue`, ensuring UUIDs are correctly passed and data is loaded.

---

 ## [2026-02-01 Evening] Game Status Display System: oneTimeOnly, Time Limits, Live Preview, & English-ization

### 🎯 Comprehensive Game Rules Display System

**Implementation Time:** 2026-02-01 12:20-12:57 (37 minutes)  
**Commits:** c56317a, 7628f99, 5d32982, ae62dda

**Core Requirements:**
- Admin needs to see configuration effects in Live Preview.
- Users need clear knowledge of game restrictions (One-Time, Time Limits, etc.).
- Standardize all frontend text to English.

### 📋 New Features

#### 1. One Time Only Display
- ✅ Display "⚠️ One Time Only" warning.
- ✅ Show "(Used)" tag (Red) if already played.
- ✅ **Hide daily attempts display** - because `oneTimeOnly` takes highest priority.
- ✅ Backend Check: Sets `canPlay=false` when `hasPlayedEver` is true.

**Implementation Location:**
- Backend: `game-rules.service.ts` - `getPlayerStatus()`
- Frontend: `index.vue` - Floating status card

**New API Response Fields:**
```json
{
  "oneTimeOnly": true,
  "hasPlayedEver": true
}
```

#### 2. Time Limit Display
- ✅ Display "📅 Mon, Tue, Wed 10:00-20:00".
- ✅ Outside open hours → **Red**.
- ✅ Within open hours → **Blue**.
- ✅ Supports displaying active days + time ranges.

**Implementation Location:**
- Backend: `game-rules.service.ts` - Added `isInActiveTime` check.
- Frontend: `index.vue` - `formatTimeLimit()` helper.

**New API Response Fields:**
```json
{
  "timeLimitConfig": {
    "enable": true,
    "startTime": "09:00",
    "endTime": "21:00",
    "activeDays": [1, 2, 3, 4, 5]
  },
  "isInActiveTime": false
}
```

**Day names English-ization:**
```javascript
// Old: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// New: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
```

#### 3. Live Preview Support
**Problem:** Admin couldn't see status info in preview mode, making it impossible to verify configurations.

**Solution:**
```javascript
// Old logic (Incorrect)
<div v-if="gameStatus && !isPreview">  // Not displayed

async function fetchGameStatus() {
  if (isPreview.value || !authStore.token) return;  // Doesn't fetch
}

// New logic (Correct)
<div v-if="gameStatus">  // Always displayed

async function fetchGameStatus() {
  if (!authStore.token || !instanceSlug.value) return;  // Fetches in Preview too
}
```

**Benefits:**
- ✅ Admin sees effects immediately in preview when editing configurations.
- ✅ Real-time verification for "One Time Only" and "Time Limit" changes.
- ✅ No need to publish before testing.

**Implementation Location:**
- `apps/web-app/src/views/game/index.vue`
- Removed `!isPreview` condition.
- Modified `fetchGameStatus()` logic.

#### 4. Frontend English-ization
**Requirement:** Users should see only English on the frontend, while the admin backend remains in Chinese.

**Text Mapping:**
```javascript
// Block reasons
'LEVEL_TOO_LOW': 'Level too low! Need Lv5'
'NOT_STARTED': 'Event not started yet'
'ENDED': 'Event has ended'
'INVALID_DAY': 'Not available today'
'ALREADY_PLAYED': 'Already played (one time only)'
'NO_ATTEMPTS_LEFT': 'No attempts left today'
'COOLDOWN_ACTIVE': 'Cooldown: 1m 30s'

// Status display
'⚠️ One Time Only (Used)' → '⚠️ One Time Only (Used)'
'📅 Mon, Tue, Wed' → '📅 Mon, Tue, Wed'
'Cooldown: 1m 30s' → 'Cooldown: 1m 30s'
```

**Modified Location:**
- `apps/web-app/src/views/game/index.vue` - Frontend status display.
- `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts` - Game engine error messages.

#### 5. Collapsed Button State Refinement
**New State Logic:**
```javascript
collapsedButtonStatus = computed(() => {
  // New: One Time Only exhausted - RED
  if (oneTimeOnly && hasPlayedEver) return 'danger';
  
  // New: Outside time range - RED
  if (timeLimitConfig?.enable && !isInActiveTime) return 'danger';
  
  // Original logic...
});
```

### 🐛 Bug Fixes

#### Bug #1: oneTimeOnly failed to block players
**Problem:** Backend's `getPlayerStatus()` returned `oneTimeOnly` and `hasPlayedEver`, but didn't set `canPlay=false`.

**Cause:** Only checked in `checkOneTimeOnly()`, which was only called during the play action.

**Solution:**
```typescript
// Added to getPlayerStatus()
if (oneTimeOnly && hasPlayedEver && canPlay) {
  canPlay = false;
  blockReason = 'ALREADY_PLAYED';
  blockDetails = { message: '...' };
}
```

#### Bug #2: Frontend didn't update after API rebuild
**Problem:** Modified the API but only rebuilt the API container; the frontend didn't rebuild.

**Cause:** Frontend had specialized cached JavaScript bundles.

**Solution:** Rebuild both API and web-app simultaneously.
```bash
docker compose build --no-cache api web-app
```

**Lesson:** When modifying API response structures, the frontend must also be rebuilt.

### 📊 Complete API Response Structure

**getPlayerStatus() Returns:**
```json
{
  "canPlay": false,
  "dailyLimit": 5,
  "played": 5,
  "remaining": 0,
  "resetAt": "2026-02-02T00:00:00.000Z",
  
  // Block info
  "blockReason": "ALREADY_PLAYED",
  "blockDetails": { "message": "..." },
  
  // NEW: One Time Only
  "oneTimeOnly": true,
  "hasPlayedEver": true,
  
  // NEW: Time Limit
  "timeLimitConfig": {
    "enable": true,
    "startTime": "09:00",
    "endTime": "21:00",
    "activeDays": [1, 2, 3]
  },
  "isInActiveTime": false,
  
  // Cooldown
  "cooldownRemaining": 45
}
```

### 🔄 Deployment Workflow

**Full Deployment (Simultaneous API + Frontend Rebuild):**
```bash
cd ~/Documents/MiniGame
git add -A
git commit -m "feat: Enhanced game status display..."
git push origin main

# On Server
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && \
   git pull origin main && \
   docker compose -f docker-compose.prod.yml build --no-cache api web-app && \
   docker compose -f docker-compose.prod.yml up -d"
```

**Note:** Both API and Frontend were modified; they MUST be rebuilt together!

### 🎓 Important Lessons

#### Lesson #1: Complete Solution Mindset (Re-emphasized)
- ❌ Don't modify only Backend or only Frontend.
- ✅ Think holistically: What does Backend return? → How does Frontend display it? → How does the game engine respond?
- ✅ API response changed → Frontend logic must change → Rebuild together.

#### Lesson #2: Preview is an Admin's Verification Tool
- ✅ Admin needs to see full effects in preview.
- ✅ Don't use `!isPreview` to hide critical information.
- ✅ Preview should match the production environment, just with test data.

#### Lesson #3: User-Centric Thinking
**Words from DJ:**
> "When you solution anything, always imagine the user's practicality. Don't just look at it from a technical perspective; put yourself in the user's shoes."

**Examples:**
- ✅ Hide attempts display when "One Time Only" - users get confused by "Why 5/5 remaining?".
- ✅ Show specific days and times for time limits - users know exactly when they can play.
- ✅ Show red when outside time ranges - users clearly understand they cannot play now.

#### Lesson #4: Internationalization Strategy
- ✅ Frontend standardized to English (User-facing).
- ✅ Backend remains in Chinese (Admin-facing).
- ✅ Implement via i18n frameworks when multi-language support is needed in the future.
- ✅ Do not mix languages - pick one and stay consistent.

### 📝 Documentation Updates

**Updated:**
- ✅ `FEATURES.md` - Added comprehensive documentation for "Game Status Display System".
- ✅ `CHANGELOG.md` - This entry.
- ✅ Git commits have clear descriptions.

**Needs Update (if issues arise):**
- `TROUBLESHOOTING.md` - If new common issues appear.

---

## [2026-02-01 Afternoon] Game Frontend: Attempt & Cooldown Color Indicator System

### 🎨 Comprehensive Visual Feedback System (Key Lesson: Proper CSS Implementation)

**Time Spent:** ~2 hours (Mostly debugging CSS override issues).

**Core Requirements:**
- Users need to see current game status at a glance.
- Color Indicators: Red (Danger), Yellow (Warning), Blue/Purple (Normal).

**Features Implemented:**

#### 1. Attempt Count Color System
- ✅ **0 Attempts** → 🔴 Red (No attempts left).
- ✅ **1 Attempt** → 🟡 Yellow (Warning: Last chance).
- ✅ **2+ Attempts** → 🔵 Blue (Normal).
- ✅ Attempts always visible (even if 0/X).

#### 2. Floating Button (Collapsed Circle Button) Colors
- ✅ **Red** - 0 attempts or blocked (Low level, event not started, etc.).
- ✅ **Yellow** - 1 attempt remaining or in cooldown (Warning status).
- ✅ **Purple** - 2+ attempts (Normal status).
- ✅ Includes pulse breathing animation.

#### 3. Cooldown Countdown
- ✅ Displays yellow text (Warning status).
- ✅ Format: Xm Ys or Xs.
- ✅ Updates every second.

#### 4. Spin Button Disabling
- ✅ Disables spin button during cooldown.
- ✅ Displays cooldown countdown in status message.
- ✅ Spin only allowed when cooldown is 0 and `canPlay` is true.

**Critical Technical Lesson: CSS Color Implementation Pitfalls**

❌ **Incorrect Approach (Cost 1.5 hours):**
```vue
<!-- Using :class binding - Overridden by parent elements! -->
<span :class="{ 'text-yellow-400': remaining === 1 }">

.parent { color: white; } /* Overrode the child element! */
```

✅ **Correct Approach (Final Solution):**
```vue
<!-- Computed property + inline style -->
const remainingColor = computed(() => {
  if (remaining === 0) return '#ef4444';
  if (remaining === 1) return '#facc15';
  return 'white';
});

<span :style="{ color: remainingColor }">
```

**Why Inline Styles Work:**
- Inline styles have the highest specificity.
- Not overridden by parent element CSS.
- Vue reactivity ensures dynamic updates.
- Not affected by browser caching.

**Files Modified:**
- `apps/web-app/src/views/game/index.vue`
  - Added `remainingColor` and `remainingSlashColor` computed properties.
  - Added `collapsedButtonStatus` computed property (3 states: danger/warning/normal).
  - Passed cooldown to the iframe with real-time updates.
  - Added debug `console.log` for troubleshooting.
- `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts`
  - Receives `cooldownRemaining` and disables buttons accordingly.
  - Displays cooldown countdown in the status message.

**CSS Additions:**
```css
.collapsed-button-danger { /* Red */ }
.collapsed-button-warning { /* Yellow + pulse */ }
@keyframes pulse-danger { ... }
@keyframes pulse-warning { ... }
```

**Commits:**
```
ec34d25 - feat: floating button yellow warning state
b70b6b3 - fix: use computed property + inline style to set attempt color
65716d2 - fix: use CSS classes with !important to force color override
39b826e - feat: improved attempt and cooldown display rules
2006a7e - feat: disable spin button during cooldown
f7c759f - feat: game frontend floating button red warning indicator
```

**Important Lessons (Recorded in AGENTS.md RULE #5):**
1. ✅ Inline style > CSS classes when dealing with dynamic colors
2. ✅ Computed properties ensure Vue reactivity
3. ✅ Think holistically - Consider ALL related UI elements
4. ✅ Debug with Console - Verify logic and rendering
5. ✅ Document immediately - Don't wait until "later"

**DJ's Advice:**
> "Why haven't you recorded these? You keep forgetting these rules. You must commit them to memory, otherwise you'll keep making the same mistakes later."

---

## [2026-02-01 Morning] Admin Panel: Tab Validation Visual Indicator

### ✨ New Feature: Tab Validation Status Display

**Features:**
- ✅ When a tab has a validation error, the tab label displays **red text** and a **❌ icon**.
- ✅ Prizes tab: Checks if the total probability equals 100%.
- ✅ Users can instantly identify which tab needs correction.

**Implementation Details:**
- Added `isTabValid(tabName)` function to check a tab's validation status.
- Tab header uses dynamic class binding: `:class="{ 'text-red-500': !isTabValid(tab.name) }"`.
- Displays ❌ icon when invalid.

**Files Modified:**
- apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue
  - Added `isTabValid()` function (line ~685)
  - Modified tab header template (line ~1033)

**Extensibility:**
- More validation rules can be added for other tabs.
- Example: Rules tab checking required fields, Visuals tab checking color counts, etc.

**Documentation Updates:**
- ✅ `FEATURES.md` - Added documentation for the Tab Validation feature.
- ✅ `CHANGELOG.md` - Recorded this change.

**Commit:**
```
00a8d5f - feat: display tab validation status - show red for tabs with errors
```

---

## [2026-02-01] Game Rules System Implementation + JK Integration Plan + i18n Fixes

### 🎯 Game Rules System (Phases 1-4, Completed)

**Phase 1+2: Backend Implementation (High Priority)**
- ✅ Created `GameRulesService` - Rule validation service.
- ✅ Implemented 4 high-priority rules:
  - `dailyLimit`: Daily play limit (includes VIP bonus).
  - `cooldown`: Cooldown timer.
  - `oneTimeOnly`: Lifetime single-play restriction.
  - `timeLimitConfig`: Time restrictions (date range + day of week).

**Database Changes:**
- ✅ Created `play_attempts` table - Records game attempts.
- ✅ Created `budget_tracking` table - Budget tracking (preparing for Phase 3).
- ✅ Added `level`, `vip_tier`, and `experience` fields to the `members` table.

**API Changes:**
- ✅ POST `/scores/:instanceSlug` - Integrated rule validation, passing IP addresses.
- ✅ GET `/scores/status/:instanceSlug` - Query player status (remaining attempts, etc.).

**Error Codes:**
- `DAILY_LIMIT_REACHED`
- `COOLDOWN_ACTIVE`
- `ALREADY_PLAYED`
- `NOT_STARTED` / `ENDED` / `INVALID_DAY`

**Files Modified:**
- `apps/api/src/modules/scores/game-rules.service.ts` (New)
- `apps/api/src/modules/scores/entities/play-attempt.entity.ts` (New)
- `apps/api/src/modules/scores/entities/budget-tracking.entity.ts` (New)
- `apps/api/src/modules/members/entities/member.entity.ts` (Added fields)
- `apps/api/src/modules/scores/scores.service.ts` (Integrated rules)
- `apps/api/src/modules/scores/scores.controller.ts` (Added status endpoint)
- `apps/api/src/modules/scores/scores.module.ts` (Registered entities and service)

**Documentation Updates:**
- ✅ `FEATURES.md` - Added comprehensive documentation for the game rules system.

**Phase 3+4: Completed All Rules**
- ✅ `minLevel` - Minimum level requirement check (Error code: `LEVEL_TOO_LOW`).
- ✅ `budgetConfig` - Budget control and tracking.
  - `updateBudget()` method records the cost for each prize.
  - Checks if daily/monthly budgets are exceeded.
- ✅ `dynamicProbConfig` - Dynamic probability adjustment (Pity mechanism).
  - Analyzes the most recent 10 game records.
  - Adjusts weights when a loss streak hits a threshold.
  - `getDynamicWeights()` method available for the frontend.
- ✅ `vipTiers.multiplier` - VIP Reward Multipliers.
  - Applies point multipliers based on VIP level.
  - Automatically calculates `final score = score × multiplier`.

**Implementation Details:**
- Budget tracking after prize distribution (based on prize.cost)
- VIP multiplier applied before updating member points
- Dynamic weights based on loss streak analysis
- All 8 rules integrated into validatePlay()

**Files Modified (Phase 3+4):**
- apps/api/src/modules/scores/game-rules.service.ts
  - Add getDynamicWeights() method
  - Add updateBudget() method
  - Enable minLevel and budgetConfig checks
  - Inject Score repository for loss streak analysis
- apps/api/src/modules/scores/scores.service.ts
  - Apply VIP multiplier to final score
  - Call updateBudget() after prize distribution
  - Use member.vipTier for calculations

**Testing Documentation:**
- ✅ `TESTING-PLAN.md` - Comprehensive testing plan (640+ lines).
  - 8 test suites (Each rule tested independently).
  - Prerequisites checklist.
  - Test data setup scripts.
  - Expected responses.
  - Gap analysis.

### New Documentation
- **JK-INTEGRATION.md** — Full design plan for third-party platform (JK Backend) integration.

### i18n Fixes
**Problem:** Audio mode labels were using hard-coded Chinese.

**Fix:**
- Added `audioModeTheme`, `audioModeCustom`, and `audioModeNone` to `zh-cn.ts` and `en-us.ts`.
- Updated `ConfigForm.vue` to use `$t()` instead of hard-coded text in two locations.

**Files Modified:**
- `apps/soybean-admin/src/locales/langs/zh-cn.ts`
- `apps/soybean-admin/src/locales/langs/en-us.ts`
- `apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue`

**Follow i18n rule:** All UI labels must use i18n keys; do not hard-code any language.

### Planned Features (Roadmap)
**User Integration:**
- Iframe seamless login (Encrypted token verification).
- Webhook real-time user data synchronization.
- Nightly full sync to ensure consistency (3 AM nightly).
- 1 player per company rule.

**Data Structure:**
- Extended fields for `Players` table (`external_platform`, `external_user_id`, etc.).
- Shipping info fields (Collected on demand).
- `Companies` table updated with JK config storage.
- `Prize configs` added `requires_shipping` configuration.

**Functional Extensions:**
- Prize type expansion: `bonus`/`physical`/`egift`/`voucher`.
- Shipping info collection modal (displayed only when needed).
- Admin UI showing data sources and sync status.

**Implementation Details:**
- Complete backend services (JK API client, sync service, webhook, cron).
- Complete frontend UI (prize config, player list, shipping modal).
- Complete i18n (zh-cn + en-us).
- Testing checklist and implementation steps.

**Status:** Design completed, not implemented (Future Feature).

---

## [2026-01-31] Audio Upload Three-Mode Functionality

### New Features

**Audio Three-Mode Upload System:**
- 🎵 Use theme default audio.
- 📤 Custom audio upload.
- 🔇 Disable audio.

**Applicable to:**
- Background Music (`bgmUrl`).
- Win Sound (`winSound`).
- Lose Sound (`loseSound`).
- Jackpot Sound (`jackpotSound`).

### Technical Implementation

**Frontend (ConfigForm.vue):**
- Added `audioModes` ref to store mode state.
- Added helper functions: `isAudioField()`, `getAudioMode()`, `setAudioMode()`, `getThemeAudioUrl()`.
- Implemented UI in two render sections:
  - Main section (lines 1229-1283).
  - Nested collapse-group (lines 1143-1199) ← **Actual location of Audio fields**.

**Backend (spin-wheel.template.ts):**
- Added `resolveAudioUrl()` function.
- Support for `__THEME_DEFAULT__` special value.
- Automatically selects the corresponding theme's audio based on `visualTemplate`.

**File Storage:**
- User files: `uploads/{companyId}/{instanceId}/audio/`.
- Theme files: `uploads/templates/{theme}/`.
- Fully isolated from each other.

### Bug Fixes

**Problem:** New UI not showing after deployment.

**Root Cause:**
- Audio fields are nested items within a collapse-group.
- Initial implementation only added logic to the main section.
- Nested render section used a fallback `<NInput v-else>`.
- Hard refresh didn't help (not a caching issue).

**Solution:**
- Cloned the full audio three-mode logic into the collapse-group's nested render section.
- Handled nested fields using `subItem.key`.
- Both render sections now have the full UI.

### Associated Commits

1. `0eb1c37` - feat: Added audio three-mode upload functionality.
2. `4ace515` - feat: Game engine support for audio three-mode.
3. `74ce0d7` - fix: Added audio three-mode to collapse-group nested fields.

### Documentation Updates

- ✅ `FEATURES.md` - Full documentation for audio three-mode.
- ✅ `TROUBLESHOOTING.md` - Case 3: ConfigForm new feature not appearing.
- ✅ `CHANGELOG.md` - This document.

### Testing & Verification

**Test Steps:**
1. Open Admin Panel → Edit game instance.
2. Expand the "Background Music Settings" collapse section.
3. Verify that three radio options are displayed.
4. Test all three modes:
   - Theme Default → displays current theme name + preview button.
   - Custom Upload → displays upload button + URL input + preview.
   - Disable Audio → clears the URL.
5. Save and preview the game.
6. Verify that the audio plays correctly.

**Verified:** 2026-01-31 19:30 GMT+8

---

## [Unreleased]

## [2026-02-13]
### Added
- **Enterprise Prize Architecture**: Dynamic prize type system allowing custom prize types with specific fulfillment strategies.
- **Prize Strategy Service**: Backend service to handle different prize behaviors (e.g., `balance_credit`, `manual_fulfill`, `virtual_code`).

### Fixed
- **Critical Score Bug**: Fixed an issue where winning a prize would incorrectly add the game score to the member's balance in addition to the prize value.
- **Prize Configuration Encoding**: Resolved character encoding issues (mojibake) in the `ConfigForm.vue` component.
- **Member Detail Error**: Fixed `ReferenceError: $t is not defined` on the Member Detail page.
- **Missing Credit History**: Fixed an issue where credit history passed to the frontend was empty.
- **Prize Ledger Display**: Fixed missing icons and inconsistent casing in the Admin Prize Ledger.
- **Cash Auto-Fulfillment**: "Cash" prizes now correctly default to `manual_fulfill` strategy instead of auto-crediting.

## [Earlier] Project Initialization

### i18n System Setup
- Chinese Translation (`zh-cn.ts`).
- English Translation (`en-us.ts`).
- Dynamic locale switching.

### Core Features
- Game Instance CRUD.
- Configuration Form System.
- File Upload.
- Multi-tenant Support.
- Permission System.

*(Detailed records in FEATURES.md)*

---

**Format Instructions:**
- Record every major change.
- Include: Date, Feature, Implementation, Issues, Commits, Testing.
- Sort in reverse chronological order (Latest at the top).

## 2026-01-31 - Audio System Three-Mode + Complete UX Improvements

### ✨ New Features
- **Audio Three-Mode System:**
  - Use theme default audio.
  - Custom upload (with preview support).
  - Disable audio.
- **Audio Preview Feature:**
  - Full play/stop toggle behavior.
  - Dynamic button text ("▶️ Preview" ↔ "⏸️ Stop").
  - Prevents overlapping playback.
  - Auto-reset upon playback end.
  - State tracking for each button.

### 🎨 UX Improvements
- **Conditional Option Display:**
  - Selected "Disable Audio" → Hides volume/loop options (User-Centric!).
  - Selected "Custom/Theme" → Shows relevant configuration options.
- **User-Friendly Placeholders:**
  - Hides internal values (e.g., `__CUSTOM_PENDING__`) from users.
  - Displays "Please upload audio file" placeholders to guide users.
- **Immediate Reactive UI:**
  - UI updates instantly upon Radio toggle.
  - No need to close and reopen the collapse section.

### 🐛 Bug Fixes
1. **Overlap playback of Preview button**
   - Issue: Audio overlaps when clicking multiple times, terrible UX.
   - Fix: State tracking + stop previous audio.
   
2. **Radio switch UI not updating**
   - Issue: Requires closing and reopening to display.
   - Fix: `getAudioMode()` derives directly from `formModel`, no caching.

3. **File picker showing wrong type**
   - Issue: Uploading audio but showing "Image Files".
   - Fix: Used `nextTick()` to wait for DOM updates before calling `click()`.
   - Root cause: Vue reactivity is asynchronous.

4. **Internal value exposed to users**
   - Issue: Displayed `__CUSTOM_PENDING__`.
   - Fix: Used computed `:value`, displaying empty string + placeholder.

5. **Conditional options not taking effect**
   - Issue: Seed schema added conditions, but existing instances were not updated.
   - Fix: Run data seeder refresh.

### 📝 File Changes
**Frontend (Admin Panel):**
- `ConfigForm.vue` - Audio three-mode UI + preview logic + file upload timing fix.

**Backend (API):**
- `spin-wheel.template.ts` - `resolveAudioUrl()` handles four scenarios.
- `seed.service.ts` - Schema conditional display.

**Project Documentation:**
- `FEATURES.md` - Complete audio system documentation.
- `TROUBLESHOOTING.md` - 5 new cases (audio-related bugs).
- `CHANGELOG.md` - This entry.

### 🎯 Complete User-Centric Implementation
This was implemented following the "Complete Solution" and "User-Centric Thinking" principles:
- ✅ Fully understood requirements.
- ✅ Analyzed all relevant code (frontend + backend).
- ✅ Modified all necessary parts at once.
- ✅ Verified experience from a user's perspective.
- ✅ Updated project documentation immediately.

**DJ's Teachings:**
- "When you build any solution, I need you to truly build the complete solution."
- "Always imagine the user's practicality, don't just use a technical perspective."
- "This is true user-centric thinking behavior."

### 📊 Impact
- Admin Panel configuration experience significantly improved.
- Users no longer confused by misleading UI.
- Preview functionality fully usable (not annoying).
- File upload correctly recognizes types.
- Documentation fully up-to-date.


## 2026-01-31 (Evening) - Confetti Color Picker + Emoji Support

### ✨ New Features
**Confetti Configuration System Completely Rebuilt - User-Centric!**

1. **🎨 Color Picker List (`color-list` type)**
   - Select colors via block clicks.
   - No need to manually type hex codes (previously required `#ff0000,#00ff00`).
   - Add/Remove colors dynamically.
   - Limit: 8 colors.
   - Delete button shown on hover.

2. **🎭 Emoji Shapes Support (`emoji-list` type)**
   - Radio Selection: Default Confetti / Emoji.
   - Preset with 20 party-themed emojis (🎉🎊🎈🎁⭐🌟💫✨❤️💙💚💛💜🧡🏆🥇👑💎🔥🎯).
   - Toggle emojis via selection.
   - Limit: 10 emojis.
   - Selected emojis feature a blue border + scaling effect.
   - Conditional Display: Shown only in Emoji mode.

3. **🎬 Real-Time Preview Feature**
   - Click preview button to see actual confetti effects.
   - Uses selected colors and emojis.
   - Auto-loads `canvas-confetti` library.

### 🎨 UX Improvements
**From "Hard-coded" to "Point-and-Click":**
- ❌ Before: Users had to manually type `#ff0000,#00ff00,#0000ff,#ffff00`.
- ✅ Now: Click color block → color picker opens.
- ❌ Before: Unknown hex code values.
- ✅ Now: Intuitive visual color picker.
- ❌ Before: No emoji options.
- ✅ Now: 20 preset emojis available for selection.

### 📝 File Changes
**Frontend (Admin Panel):**
- `ConfigForm.vue` - New types + helper functions.
  - `color-list` type rendering.
  - `emoji-list` type rendering.
  - Preview function with `canvas-confetti`.
  - Implemented in both render sections.

**Backend (API):**
- `seed.service.ts` - Schema definition.
  - `confettiColors` changed to `color-list`.
  - New fields: `confettiShapeType`, `confettiEmojis`.
- `spin-wheel.template.ts` - Emoji shapes support.
  - Using `confetti.shapeFromText()`.
  - Passing shapes to all bursts.

**i18n:**
- `zh-cn.ts` + `en-us.ts` - 9 new labels.

**Project Documentation:**
- `FEATURES.md` - Complete confetti system documentation.
- `CHANGELOG.md` - This entry.

### 🔧 Technical Details
**New Schema Types:**
- `color-list` - Array of colors (comma-separated string)
- `emoji-list` - Array of emojis (comma-separated string)

**Helper Functions (ConfigForm.vue):**
- Color management: getColorList/setColorList/addColor/removeColor/updateColor
- Emoji management: getEmojiList/setEmojiList/toggleEmoji/isEmojiSelected
- Preview: previewConfetti/triggerConfettiPreview

**Game Engine:**
- Detects `confettiShapeType`.
- If set to `emoji` → Uses `confetti.shapeFromText()` to create shapes.
- Scalar: 2 (Makes emojis larger and more visible).

**Data Format (Maintains Compatibility):**
- Colors: '#ff0000,#00ff00,#0000ff'
- Emojis: '🎉,⭐,❤️'

### 📊 Impact
- ✅ Significantly improved UX - Users no longer need to know hex codes.
- ✅ More customization options - Emoji shapes.
- ✅ Real-time preview - WYSIWYG (What You See Is What You Get).
- ✅ Clear restrictions and prompts.
- ✅ Backward compatible - Data format remains unchanged.

### 🎯 User-Centric Principles Applied
1. Don't let users manually write code.
2. Intuitive interaction (point-and-click selection).
3. Real-time feedback (previews + prompts).
4. Reasonable constraints (e.g., limit to 8 colors/10 emojis).
5. Reduce learning costs (preset options).

**Complete Solution:**
- Frontend + Backend + i18n completed simultaneously.
- Supported in both render sections.
- Comprehensive testing checklist included.
- Documentation updated in sync.


---

## [2026-02-14 Late Afternoon] Budget Tracking & Social Mode (Phase 3)

### 💰 Budget Protection System

**Core Requirements:**
- Prevent marketing budget overruns.
- Enable automatic "Soft Landing" when budget is exhausted to maintain user engagement without financial loss.

### 📝 Features Implemented

#### 1. Multi-Level Budget Tracking
- **Double-Entry Ledger:** Tracks every monetary prize issuance in `budget_tracking` table.
- **Real-time Checks:** Verifies Daily and Monthly budgets before every spin.
- **Cost vs Value:** Distinguishes between what a prize costs the company vs. its face value.

#### 2. Social Mode (Soft Landing)
- **Automatic Transition:** When budget is exhausted, the game seamlessly switches modes.
- **Visual Masking:**
  - Non-point prizes (Amazon Cards, iPhones) are visually transformed into "Score Rewards".
  - **Dynamic Labeling:** Uses the prize's budget cost (e.g., $50) as the point value (e.g., "500 PTS").
  - **Icon Replacement:** Gift boxes become Stars/Diamonds.
- **Behavior Change:**
  - Token deduction continues (Sinking tokens).
  - No real prizes are awarded.
  - Players compete for Leaderboard ranking.

### 📊 Technical Details
- **Backend:** `ScoresService` budget checks logic; `GameInstancesController` config masking.
- **Frontend:** `spin-wheel-premium-neon.html` template enhanced with `isPoints`-aware masking logic.
- **Database:** New `budget_tracking` table and `BudgetLedger` entity.

### ✅ Deployment
- ✅ API and WebApp services rebuilt.
- ✅ Verified: E-Gift prizes correctly mask to Points when budget is set to 0.

