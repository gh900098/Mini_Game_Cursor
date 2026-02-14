# Project Status & Current Context

**Last Updated:** 2026-02-13 23:14
**Current Mission:** Ready for next task
**Server Status:** 🟢 Running. (API:3100, Admin:3101, Web:3102).

## 🎯 Current Focus (AI Memory)
- **Active Mission:** Enterprise Budget System (Phase 2: Soft-Landing Refinement) ✅
- **Current Branch:** `main` (Merged)
- **Status:** 🟢 Universal Social Mode Protection Live.

### Context
Prize ledger enhancements completed and merged to main.
- **Goal:** Execute the next user feature request.

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

