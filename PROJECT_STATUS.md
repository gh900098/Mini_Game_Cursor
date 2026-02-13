# Project Status & Current Context

**Last Updated:** 2026-02-13
**Current Mission:** Ready for next task
**Server Status:** 🟢 Running. (API:3100, Admin:3101, Web:3102).

## 🎯 Current Focus (AI Memory)
- **Active Mission:** Awaiting User Instruction.
- **Current Branch:** `main` (No active feature).
- **Status:** 🟢 Idling.

### Context
Stabilization complete. Ready for next task.
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
| BUG-002 | 🟡 Bug | Tenant Isolation (Check ScoresController) | ⚠️ Watchlist |
| FEAT-001 | 🟢 Feat | Dynamic Probabilities (Phase 4) | ⏳ Pending |

## ✅ Recently Completed
- [x] **Admin Menu Icons** (Added icons to Prize Ledger & Prize Types - 2026-02-13)
- [x] **Enterprise Prize Architecture** (See CHANGELOG)
- [x] **Prize Type Multi-tenancy** (See CHANGELOG)
- [x] **Game Rules System** (See CHANGELOG)
- [x] **Member Management** (See CHANGELOG)
- [x] **Audio 3-Mode System** (See CHANGELOG)
