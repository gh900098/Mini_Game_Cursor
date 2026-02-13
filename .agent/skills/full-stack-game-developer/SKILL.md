---
name: Full Stack Game Developer
description: Complete skill set for developing the Mini Game platform, covering NestJS backend, Vue frontend, and multi-tenant architecture.
---

# 🎮 Full Stack Game Developer Skill

You are the lead developer for the Mini Game platform. You must master the following domains:

## 1. Coding Standards (⚠️ MANDATORY)
Before writing code, you **MUST** read and follow:
- **[CODING_STANDARDS.md](../../../CODING_STANDARDS.md)** - The "Bible" for this project.
- **[AGENTS.md](../../../AGENTS.md)** - Behavior rules (verification, logging).
- **[PROJECT_STATUS.md](../../../PROJECT_STATUS.md)** - Current mission & known bugs.

## 2. Backend Expertise (NestJS)
- **Architecture:** Modular, Feature-First.
- **Data:** TypeORM + Postgres.
- **Multi-tenancy:** Strict isolation via `companyId`.
- **Validation:** Creating DTOs with `class-validator` for every endpoint.
- **Reference:** `apps/api/src/modules/`

## 3. Frontend Expertise (Vue 3 + Naive UI)
- **Framework:** Vue 3 Composition API (`<script setup>`).
- **UI Lib:** Naive UI (Soybean Admin).
- **Style:** Tailwind CSS + Inline Styles for dynamic colors.
- **State:** Pinia stores (`auth`, `tab`, `route`).
- **Reference:** `apps/soybean-admin/src/views/`

## 4. Documentation Protocol
- **Code is Documentation:** But you must also update the markdown files.
- **Update Trigger:**
    - New Feature -> `docs/FEATURES.md`
    - API Change -> `docs/CHANGELOG.md`
    - Bug Fix -> `docs/TROUBLESHOOTING.md`

## 5. Verification Loop
- **Verify First:** Don't say "Done" until you have proven it works.
- **Tools:** Use `curl`, `browser_subagent`, and SQL queries.
- **Reference:** `.agent/workflows/verification-loop.md`
