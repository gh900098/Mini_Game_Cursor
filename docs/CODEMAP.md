# MiniGame Code Map

**Last Updated:** 2026-02-22

A reference guide for quickly finding code locations.

---

## 🎯 Quick Navigation

### Want to modify gameplay?
→ `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts`

### Want to modify the configuration interface?
→ `apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue`

### Want to add new configuration items?
→ `apps/api/src/modules/seed/seed.service.ts` (Schema definition)

### Want to modify translations?
→ `apps/soybean-admin/src/locales/langs/zh-cn.ts` (Chinese)  
→ `apps/soybean-admin/src/locales/langs/en-us.ts` (English)

---

## 📂 Find by Function

### 🎮 Game Frontend (web-app)

**Game Container and Loading**
- Main Container: `apps/web-app/src/views/game/index.vue`
- Audio Store: `apps/web-app/src/store/settings.ts`
- Auth Store: `apps/web-app/src/store/auth.ts`

**Routing**
- Route Configuration: `apps/web-app/src/router/index.ts`
- Primary Routes:
  - `/` - Home/Lobby
  - `/game/:slug` - Game Page
  - `/login` - Login
  - `/profile` - User Profile

**API Service**
- API Wrapper: `apps/web-app/src/service/api.ts`

---

### 🎛️ Admin Panel (soybean-admin)

**Game Management**
- Game List: `apps/soybean-admin/src/views/management/game-instance/index.vue`
- Config Form: `apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue`
- Game Form: `apps/soybean-admin/src/views/management/games/components/GameForm.vue`
- Games List: `apps/soybean-admin/src/views/management/games/index.vue`

**Member Management**
- Member List: `apps/soybean-admin/src/views/management/member/index.vue`
- Member Details: `apps/soybean-admin/src/views/management/member/detail.vue`
- API Service: `apps/soybean-admin/src/service/api/management.ts`

**User Management**
- User List: `apps/soybean-admin/src/views/management/user/index.vue`

**Company Management**
- Company List: `apps/soybean-admin/src/views/management/company/index.vue`

**Sync Settings**
- Sync Config UI: `apps/soybean-admin/src/views/management/sync-settings/index.vue`
  - Controls: cron expression, incremental mode, per-type parameters

**Audit & Permissions**
- Audit Log: `apps/soybean-admin/src/views/management/audit-log/index.vue`
- Permissions: `apps/soybean-admin/src/views/management/permission/index.vue`
- Roles: `apps/soybean-admin/src/views/management/role/index.vue`

**Email Settings**
- Email Config: `apps/soybean-admin/src/views/management/email-settings/index.vue`

**Translation System**
- i18n Configuration: `apps/soybean-admin/src/locales/index.ts`
- Chinese Translation: `apps/soybean-admin/src/locales/langs/zh-cn.ts`
- English Translation: `apps/soybean-admin/src/locales/langs/en-us.ts`
- Locale Definition: `apps/soybean-admin/src/locales/locale.ts`

**Layout and Components**
- Admin Layout: `apps/soybean-admin/packages/materials/src/libs/admin-layout/`
- Tab Component: `apps/soybean-admin/packages/materials/src/libs/page-tab/`

---

### ⚙️ Backend API (api)

**Core Modules**
- Entry Point: `apps/api/src/main.ts`
- App Module: `apps/api/src/app.module.ts`

**Game Related**
- Game Instance Module: `apps/api/src/modules/game-instances/`
  - Controller: `game-instances.controller.ts`
  - Service: `game-instances.service.ts`
  - Entity: `entities/game-instance.entity.ts`
  - **Spin Wheel Template:** `templates/spin-wheel.template.ts` (Most important!)

**Game Templates**
- Seed System: `apps/api/src/modules/seed/seed.service.ts`
- Game List: `apps/api/src/modules/games/`

**Authentication System**
- Auth Module: `apps/api/src/modules/auth/`
  - Controller: `auth.controller.ts`
  - Service: `auth.service.ts`
  - JWT Strategy: `jwt.strategy.ts`
  - Guards: `jwt-auth.guard.ts`

**User Management**
- Users Module: `apps/api/src/modules/users/`
  - Entity: `entities/user.entity.ts`

**Member Management**
- Members Module: `apps/api/src/modules/members/`
  - Controller: `admin-members.controller.ts` (Admin only)
  - Service: `members.service.ts`
  - Entity: `entities/member.entity.ts`
  - Entity: `entities/credit-transaction.entity.ts`

**Permissions System**
- Roles Module: `apps/api/src/modules/roles/`
- Permissions Module: `apps/api/src/modules/permissions/`

**Company/Multi-tenancy**
- Companies Module: `apps/api/src/modules/companies/`
  - Entity: `entities/company.entity.ts`

**Audit Logs**
- Audit Log Module: `apps/api/src/modules/audit-log/`

**System Settings**
- System Settings Module: `apps/api/src/modules/system-settings/`

**Email Service**
- Email Module: `apps/api/src/modules/email/`

**Game History/Statistics**
- Scores Module: `apps/api/src/modules/scores/`
  - `admin-scores.controller.ts` — Admin score list (uses `createQueryBuilder` for performance)
  - `admin-prizes.controller.ts` — Admin prize ledger view
  - `scores.controller.ts` — Member-facing score submission
  - `game-rules.service.ts` — Validation engine (daily limit, cooldown, one-time-only)

**Prizes & Prize Types**
- Prizes Module: `apps/api/src/modules/prizes/`
  - `prizes.controller.ts` — CRUD for prize instances
  - `prizes.service.ts`
  - `prize-strategy.service.ts` — Prize fulfillment strategies (cash, physical, e-gift, points)
- Prize Types: `apps/api/src/modules/prize-types/` (separate module)
- Prize Ledger: managed via `admin-prizes.controller.ts` in scores module

**Sync / Generic Integration Platform**
- Sync Module: `apps/api/src/modules/sync/`
  - `sync.scheduler.ts` — BullMQ repeatable job scheduler (dynamic cron, EventEmitter-decoupled)
  - `sync.processor.ts` — BullMQ processor that runs the actual sync
  - `sync.controller.ts` — Admin API for triggering manual sync & reading settings
  - `sync-strategy.factory.ts` — Factory resolving correct integration strategy
  - `strategies/jk.strategy.ts` — Implementation of syncing logic for JK Platform
  - `jk-backend.service.ts` — HTTP client for JK Platform external API
  - `sync.module.ts`

**Themes**
- Theme config is part of Game Instances module
  - Upload endpoint: `DELETE /api/game-instances/upload` (physical file delete)
  - Config stored in `game-instance.entity.ts` as JSON config blob
  - Config Form: `ConfigForm.vue` (includes `isApplyingPreset` flag — see AD-002)

**System Settings**
- System Settings Module: `apps/api/src/modules/system-settings/`

---

## 📝 Find by File Type

### Configuration Files

**Environment Variables**
- `.env.development` - Development environment
- `.env.production` - Production environment

**Docker**
- `docker-compose.test.yml` - Local test environment (ports 3100/3101/3102, localhost only)
- `docker-compose.prod.yml` - Production environment (uses `ADMIN_URL`/`GAME_URL`, 127.0.0.1 binding)
- `Dockerfile.api` - API image
- `Dockerfile.admin` - Admin image
- `Dockerfile.web-app` - Web App image
- `Dockerfile.worker` - BullMQ worker image (separate container — see AD-010)

**TypeScript Configuration**
- `tsconfig.json` - Root configuration
- `apps/*/tsconfig.json` - App-specific configuration

**Build Configuration**
- `apps/web-app/vite.config.ts` - Web App build
- `apps/soybean-admin/vite.config.ts` - Admin build
- `apps/api/tsconfig.build.json` - API build

---

## 🔍 Common Modification Scenarios

### Scenario 1: Adding a new game configuration option

**Steps:**
1. Modify `apps/api/src/modules/seed/seed.service.ts`
   - Add new field definition in the schema.
2. Add translations:
   - `apps/soybean-admin/src/locales/langs/zh-cn.ts`
   - `apps/soybean-admin/src/locales/langs/en-us.ts`
3. (Optional) Modify `ConfigForm.vue` if a custom UI is needed.
4. Rerun seed: `POST /api/seed/run`
5. Rebuild: `api` + `admin`

**Relevant Files:**
- `seed.service.ts`
- `zh-cn.ts`
- `en-us.ts`
- (Optional) `ConfigForm.vue`

---

### Scenario 2: Modifying gameplay/UI

**Steps:**
1. Modify `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts`
   - This is the core of the game engine.
2. Rebuild: `api`
3. Test: Visit the game URL to verify changes.

**Relevant Files:**
- `spin-wheel.template.ts`

---

### Scenario 3: Modifying Admin Panel UI

**Steps:**
1. Find the corresponding Vue file:
   - Game Management: `apps/soybean-admin/src/views/management/game-instance/`
   - Member Management: `apps/soybean-admin/src/views/management/member/`
2. Modify Vue components.
3. Rebuild: `admin`

**Relevant Files:**
- `apps/soybean-admin/src/views/management/*/`

---

### Scenario 4: Adding a new API endpoint

**Steps:**
1. Find the corresponding controller:
   - `apps/api/src/modules/[module]/[module].controller.ts`
2. Add new `@Get()` / `@Post()` / `@Patch()` / `@Delete()` methods.
3. Implement logic in the service.
4. Rebuild: `api`

**Relevant Files:**
- `[module].controller.ts`
- `[module].service.ts`

---

### Scenario 5: Modifying Database Schema

**Steps:**
1. Modify entity:
   - `apps/api/src/modules/[module]/entities/[entity].entity.ts`
2. Generate migration (if using TypeORM migrations).
3. Run migration.
4. Rebuild: `api`

**Relevant Files:**
- `entities/*.entity.ts`

---

### Scenario 6: Modifying Translation Text

**Steps:**
1. Find the file corresponding to the i18n key:
   - Chinese: `apps/soybean-admin/src/locales/langs/zh-cn.ts`
   - English: `apps/soybean-admin/src/locales/langs/en-us.ts`
2. Modify translation text.
3. **⚠️ Check for duplicate object keys!**
4. Rebuild: `admin`

**Relevant Files:**
- `zh-cn.ts`
- `en-us.ts`

**⚠️ Important Reminder (2026-01-31 lesson):**
- Always check if a key with the same name already exists.
- Do not define two keys with the same name in the same object.
- Update both `zh-cn` and `en-us` simultaneously.

---

## AI Agent Configuration (.cursor/)

**Cursor Rules (Workflows)**
- `.cursor/rules/workflow-init-session.mdc` — Session initialization
- `.cursor/rules/workflow-plan-feature.mdc` — Feature planning (PM mode)
- `.cursor/rules/workflow-start-feature.mdc` — Branch creation + impact analysis
- `.cursor/rules/workflow-finish-feature.mdc` — Verify, document, merge
- `.cursor/rules/workflow-verification.mdc` — Quality verification loop
- `.cursor/rules/workflow-update-status.mdc` — Save progress to PROJECT_STATUS.md
- `.cursor/rules/workflow-deploy-test.mdc` — Local Docker test deployment
- `.cursor/rules/workflow-deploy-prod.mdc` — Production Docker deployment
- `.cursor/rules/workflow-new-skill.mdc` — Propose and create new skills

**Cursor Skills (Domain Knowledge)**
- `.cursor/skills/nestjs-backend-developer/` — NestJS patterns and standards
- `.cursor/skills/vue-frontend-developer/` — Vue 3 frontend patterns
- `.cursor/skills/game-designer/` — HTML5 Canvas game development
- `.cursor/skills/soybean-admin-developer/` — Soybean Admin customization
- `.cursor/skills/postgresql-database-developer/` — Database design and migrations
- `.cursor/skills/security-consultant/` — Security practices
- `.cursor/skills/multi-tenancy-architect/` — Tenant isolation patterns
- `.cursor/skills/api-integration-developer/` — API and webhook integration
- `.cursor/skills/enterprise-prize-architecture/` — Prize fulfillment system
- `.cursor/skills/full-stack-game-developer/` — Full platform overview
- `.cursor/skills/mobile-pwa-developer/` — PWA and mobile development
- `.cursor/skills/localization-specialist/` — i18n and localization
- `.cursor/skills/devops-engineer/` — Docker, CI/CD, deployment
- `.cursor/skills/performance-engineer/` — Performance optimization
- `.cursor/skills/qa-specialist/` — Testing and QA
- `.cursor/skills/technical-writer/` — Technical documentation
- `.cursor/skills/skills-maintainer/` — Skills audit and maintenance
- `.cursor/skills/ui-ux-pro-max/` — UI/UX design intelligence (includes scripts and data)

---

## 📊 File Statistics

### Code Volume Estimate
- **web-app:** ~5k lines
- **soybean-admin:** ~20k lines
- **api:** ~15k lines
- **Total:** ~40k lines

### Main Tech Stack
- **Frontend:** Vue 3 + TypeScript + Vite + Naive UI
- **Backend:** NestJS + TypeScript + TypeORM
- **Database:** PostgreSQL + Redis
- **Deployment:** Docker + Nginx

---

## 🔗 Related Documents

- **Feature Details:** [FEATURES.md](./FEATURES.md)
- **System Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Deployment Process:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**This document helps you quickly locate the code you need to modify!**

Usage:
1. Know which function to modify → Check "Find by Function"
2. Know which scenario to modify → Check "Common Modification Scenarios"
3. Once the file is found → Refer to `FEATURES.md` for detailed working principles.
