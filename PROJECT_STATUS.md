# Project Status & Current Context

**Last Updated:** 2026-02-22 21:10
**Current Mission:** Theme Preset Auto-Switch to Custom ✅
**Server Status:** 🟢 Running. (API:3100, Admin:3101, Web:3102, Worker:3100).

## 🎯 Current Focus (AI Memory)
- **Active Mission:** Awaiting next instructions.
- **Current Branch:** `main`
- **Status**: 🟢 Live. Auto-switch themePreset to Custom when user manually edits any field after applying a theme preset. isApplyingPreset flag prevents the bulk-apply itself from triggering the switch.

### Context
The synchronization system has been successfully decoupled from the hardcoded JK Platform. It now uses a generic `integration_config` and the Strategy Pattern, allowing future vendors to plug into the engine seamlessly via the `SyncStrategyFactory`.
- **Goal:** Completed. Waiting for next instruction.

## 🏗️ Architectural Context (The "Must Knows")
- **Local Testing Environment:**
  - **Source of Truth:** `.agent/workflows/deploy-to-test.md`
  - **Command:** `docker compose -f docker-compose.test.yml up -d --build`
  - **Ports:** API(3100), Admin(3101), Web(3102).
- **Production Environment:**
  - **Source of Truth:** `.agent/workflows/deploy-to-prod.md`
  - **Command:** `docker compose -f docker-compose.prod.yml up -d --build` (See workflow)
  - **Variables:** Uses `ADMIN_URL` and `GAME_URL` for domain mapping.
- **Server Archi (Reference Only):** 
  - **1Panel OpenResty** handles Port 80/443 (Reverse Proxy).
  - **Docker Containers** (API:3100, Admin:3101, Web:3102) bind to **127.0.0.1** only.
  - **NO internal Nginx** in docker-compose.prod.yml.
- **Multi-tenancy:**
  - **Strict Isolation:** `companyId` is the key. Most entities must have it.
  - **Super Admin Exception:** `isSuperAdmin` bypasses some checks.
- **Game Rules (Implemented):**
  - **Daily Limit:** Per day count.
  - **Cooldown:** Time between plays.
  - **One Time Only:** Lifetime single play (highest priority).
  - **Time Limit:** Specific hours/days.

## 🐛 Issue Tracker & Backlog
| ID | Type | Description | Status |
| :--- | :--- | :--- | :--- |
| BUG-001 | 🔴 Bug | Agent Amnesia (Need to load context) | 🚧 In Progress |
| BUG-002 | 🟢 Bug | Tenant Isolation (Admin/Member endpoints) | ✅ Fixed |
| FEAT-001 | 🟢 Feat | Dynamic Probabilities (Phase 4) | ⏳ Pending |


## ✅ Recently Completed
- [x] **UX Fix: Sync Settings Menu & Dynamic Providers** (Restored Sync Settings menu routing and added GET /integration-providers endpoint for dynamic configuration - 2026-02-23)
- [x] **Generic Integration Architecture** (Refactored JK sync to use Strategy Pattern, renamed variables to integration_config - 2026-02-22)
- [x] **Theme Preset UX Fix — Auto-Switch to Custom** (ConfigForm.vue: isApplyingPreset flag + deep watcher auto-reset - 2026-02-22)
- [x] **Upload System Bugfixes & Server-Side File Deletion** (Fixed UUID filenames, added `DELETE /game-instances/upload` physical file removal, added cache-busting to GET endpoints - 2026-02-21)
- [x] **Theme Editor Visuals Alignment and Layout Overflow Fix** (Standardized upload UI, expanded schema to match Game Instances, added dropdowns for Gradients, fixed NaiveUI tab layout overflow mapping to ensure Live Preview remains on-screen and form panels get independent scrollbars - 2026-02-21)
- [x] **Test Environment Game Assets Fix** (Restored missing uploaded images from production Docker named volume to the local host directory - 2026-02-20)
- [x] **Strict Impersonation Protection & Environment Split** (Implemented read-only bypasses for admins, fixed 403 profile error, added docker-compose.test.yml, fixed asset caching - 2026-02-20)
- [x] **User List Duplication Resolution** (Enforced uniqueness on emailHash + Data Merge - 2026-02-20)
- [x] **Type Error Resolution after Performance Rollout** (Fixed structure mismatch in Audit Log and User management views - 2026-02-20)
- [x] **High Performance Data Standards Rollout** (Standardized Pagination + Fixed Layout + Database Indexing across all modules - 2026-02-20)
- [x] **PII Masking & Privacy** (Masked List Views + RBAC for Details + Safe Edit - 2026-02-19)
- [x] **Dynamic Sync Scheduler Refresh & API Parameter Recovery** (EventEmitter decoupled architecture + Fixed per-type parameter settings - 2026-02-16)
- [x] **Sync System Optimization & UI Configuration** (Parallel Sync + Incremental Mode + Dynamic Cron + Admin UI - 2026-02-16)
- [x] **Cron Job Visibility & Monitoring** (BullMQ 4-hour Repeatable Jobs + Concurrency Fix + Deduplication - 2026-02-15)
- [x] **Impersonation Feature Fix & Environment Split** (Fixed redirect logic + Created docker-compose.test.yml + Generalized prod config - 2026-02-20)
- [x] **JK Platform Synchronization System** (BullMQ + Webhook + Admin Integration + Docker Worker - 2026-02-14)
- [x] **Score History UI Enhancement** (Split columns + Financial Transparency - 2026-02-14)
- [x] **Budget Tracking & Social Mode** (Budget Ledger + Social Mode Prize Masking - 2026-02-14)
- [x] **Flexible Prize Type Configuration** (isPoints logic + UI layout refinements + Metadata enrichment - 2026-02-14)
- [x] **Prize Ledger Enhancements** (Receipt upload + Details display + Value fix - 2026-02-13)
- [x] **UI/UX Pro Max Skill Installation** (Design intelligence system - 2026-02-13)
- [x] **Member Detail UI Improvements** (Tab reordering + enhanced prize info - 2026-02-13)
- [x] **Admin Menu Icons** (Added icons to Prize Ledger & Prize Types - 2026-02-13)
- [x] **Enterprise Prize Architecture** (See CHANGELOG)
- [x] **Prize Type Multi-tenancy** (See CHANGELOG)
- [x] **Game Rules System** (See CHANGELOG)
- [x] **Member Management** (See CHANGELOG)
- [x] **Audio 3-Mode System** (See CHANGELOG)

