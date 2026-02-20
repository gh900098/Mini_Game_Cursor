# Project Status & Current Context

**Last Updated:** 2026-02-20 09:15
**Current Mission:** High Performance Data Standards ✅
**Server Status:** 🟢 Running. (API:3100, Admin:3101, Web:3102, Worker:3100).

## 🎯 Current Focus (AI Memory)
- **Active Mission:** High Performance Rollout (Phase 2: Global Standardization) ✅
- **Current Branch:** `main`
- **Status**: 🟢 Live. Standardized "High Performance Data Pattern" (Remote Pagination + Fixed Footers) deployed across all management modules.

### Context
The administrative suite is now fully optimized. Performance bottlenecks in large lists (Users, Roles, Companies, Scores, Prizes) have been resolved via server-side pagination and database indexing.
- **Goal:** Completed global pattern rollout. Waiting for next instruction.

## 🏗️ Architectural Context (The "Must Knows")
- **Local Testing Environment:**
  - **Source of Truth:** `.agent/workflows/deploy-to-docker.md`
  - **Command:** `docker compose -f docker-compose.prod.yml up -d --build` (See workflow)
  - **Ports:** API(3100), Admin(3101), Web(3102).
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
- [x] **High Performance Data Standards Rollout** (Standardized Pagination + Fixed Layout + Database Indexing across all modules - 2026-02-20)
- [x] **PII Masking & Privacy** (Masked List Views + RBAC for Details + Safe Edit - 2026-02-19)
- [x] **Dynamic Sync Scheduler Refresh & API Parameter Recovery** (EventEmitter decoupled architecture + Fixed per-type parameter settings - 2026-02-16)
- [x] **Sync System Optimization & UI Configuration** (Parallel Sync + Incremental Mode + Dynamic Cron + Admin UI - 2026-02-16)
- [x] **Cron Job Visibility & Monitoring** (BullMQ 4-hour Repeatable Jobs + Concurrency Fix + Deduplication - 2026-02-15)
- [x] **Impersonation Feature Fix** (Unified JWT Payload fields - 2026-02-15)
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

