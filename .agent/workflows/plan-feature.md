---
description: Project Manager planning phase — break down any feature/bug/enhancement before writing code.
---

# Plan Feature (PM Mode) 🗂️

> [!IMPORTANT]
> Run this workflow BEFORE `/start-feature` for any request. This is the Project Manager phase. Do NOT write any code until Step 5 is complete and the user approves the plan.

---

## Step 1: Understand the Request (Clarify Before Assuming)

Re-state the request in your own words. If ANY of the following are unclear, ASK the user before proceeding:
- What is the **exact end result** the user expects to see?
- Is this a **new feature**, **bug fix**, **enhancement to existing**, or **UI change only**?
- Are there **specific users/roles** this affects (Super Admin only? All tenants? Members? Guests)?
- Are there **edge cases or error conditions** the user has in mind?
- Is there a **deadline or priority** relative to other backlog items?

> **Rule:** One ambiguous assumption = one rework cycle. Ask first, code once.

---

## Step 2: Full Layer Impact Analysis

Map EVERY layer that this request touches. Check each one:

| Layer | Affected? | What changes? |
|---|---|---|
| **Database** | Yes / No | New table? New column? Migration needed? Index needed? |
| **Backend API** | Yes / No | New endpoint? Modified DTO? New service method? |
| **Admin Panel (soybean-admin)** | Yes / No | New page? Modified form? New table column? |
| **Web App (member-facing)** | Yes / No | Player sees this? Game behavior changes? |
| **Game Engine (spin-wheel template)** | Yes / No | Wheel logic, prizes, or game rules affected? |
| **Worker / Queue (BullMQ)** | Yes / No | Background job changes? New scheduled task? |
| **Permissions / Roles** | Yes / No | New permission required? Role access changes? |
| **i18n (translations)** | Yes / No | New UI text? Both `zh-cn.ts` and `en-us.ts` needed? |
| **External Integration (JK, webhook)** | Yes / No | External API call? Webhook handler? |
| **Docker / Infra** | Yes / No | New env var? New service? Config file change? |

---

## Step 2b: Load Specialist Skills for Affected Layers

> [!IMPORTANT]
> For each layer marked **"Yes"** above, you MUST read the corresponding skill file BEFORE writing the task breakdown in Step 3. These skills contain project-specific patterns, known pitfalls, and standards that a generic analysis will miss.

| Layer / Concern | Skill to Load |
|---|---|
| Database (schema, migration, indexes) | `.agent/skills/postgresql-database-developer/SKILL.md` |
| Backend API (NestJS controller/service/DTO) | `.agent/skills/nestjs-backend-developer/SKILL.md` |
| Admin Panel (Vue pages, tables, forms) | `.agent/skills/vue-frontend-developer/SKILL.md` + `.agent/skills/soybean-admin-developer/SKILL.md` |
| Web App (member-facing game UI) | `.agent/skills/mobile-pwa-developer/SKILL.md` |
| Game Engine (canvas, wheel, prizes, templates) | `.agent/skills/game-designer/SKILL.md` |
| Full platform feature (touches all layers) | `.agent/skills/full-stack-game-developer/SKILL.md` |
| Worker / Queue (BullMQ, scheduling) | `.agent/skills/nestjs-backend-developer/SKILL.md` |
| Permissions / Multi-tenancy isolation | `.agent/skills/multi-tenancy-architect/SKILL.md` |
| External Integration (webhook, 3rd-party API) | `.agent/skills/api-integration-developer/SKILL.md` |
| Security concern identified | `.agent/skills/security-consultant/SKILL.md` |
| UI/UX quality or new page design | `.agent/skills/ui-ux-pro-max/SKILL.md` |
| Docker / Infra / Deployment / CI-CD | `.agent/skills/devops-engineer/SKILL.md` |
| Prize types / Fulfillment logic | `.agent/skills/enterprise-prize-architecture/SKILL.md` |
| i18n / Multi-language / RTL support | `.agent/skills/localization-specialist/SKILL.md` |
| Performance (slow queries, caching, CDN) | `.agent/skills/performance-engineer/SKILL.md` |
| Testing / QA / Automation | `.agent/skills/qa-specialist/SKILL.md` |
| Documentation / API docs / Guides | `.agent/skills/technical-writer/SKILL.md` |
| Skill gap detected (no existing skill covers it) | Run `/request-new-skill` workflow → propose new skill to user |
| Skill content seems outdated or wrong | `.agent/skills/skills-maintainer/SKILL.md` → run audit |

**How to use:**
1. Use `view_file` to read each relevant `SKILL.md` in parallel.
2. Extract patterns, anti-patterns, and known pitfalls specific to this project.
3. Apply them in the Step 3 task breakdown.
4. If a skill reveals a constraint or risk, add it to Step 4 Risks.
5. If **no skill exists** for the area you need → run `/request-new-skill` before proceeding.

> **Note:** During Step 6 (execution), the implementing agent must re-read the same skill files to follow the documented patterns during actual coding — not just at planning time.

---

## Step 3: Dependency Order & Task Breakdown

List the sub-tasks in the order they MUST be done (dependencies first):

```
Example breakdown for "Add prize expiry feature":

1. [DB] Add `expiresAt` column to `prizes` table → generate migration
2. [API] Update `PrizeDto` to accept `expiresAt` field with validation
3. [API] Update `PrizesService.findAll()` to filter out expired prizes
4. [API] Update `PrizesService.create()` to save `expiresAt`
5. [Admin UI] Add date picker field to prize creation form
6. [Admin UI] Add "Expires" column to prize list table
7. [i18n] Add `expiresAt` translation keys to zh-cn.ts + en-us.ts
8. [Docs] Update FEATURES.md with expiry logic
9. [Test] Verify expired prizes don't appear in member view
```

---

## Step 4: Risk & Security Assessment

Before coding, explicitly answer:

- **What breaks if this goes wrong?** (e.g., "Members can't play games", "Financial records corrupted")
- **Security risks?** Does this expose any data? Does it bypass `companyId` isolation?
- **Rollback plan?** Can we undo this without a full DB restore? (Especially for migrations)
- **Performance risk?** Will this query run on a large table without an index?
- **Is this permanent or reversible?** (e.g., deleting data is not reversible)

---

## Step 5: Present Plan to User

Output a concise plan in this format before starting any work:

```
📋 PLAN: [Feature/Fix Name]
Branch: feat/xxx or fix/xxx

LAYERS AFFECTED:
- Database: [what changes]
- Backend: [what changes]  
- Admin UI: [what changes]
- Web App: [what changes, or "Not affected"]

TASK ORDER:
1. [task 1]
2. [task 2]
...

RISKS:
- [risk 1 and mitigation]
- [risk 2 and mitigation]

DEFINITION OF DONE:
- [acceptance criterion 1]
- [acceptance criterion 2]
```

**WAIT for user confirmation before proceeding to `/start-feature`.**

---

## Step 6: Hand Off to Execution

Once user confirms:
1. Run `/start-feature` to create the branch
2. Execute tasks in the order defined in Step 3
3. After each major sub-task (e.g., after DB migration, after API, after UI), do a mini-verification before proceeding to the next
4. Run `/finish-feature` when all acceptance criteria in Step 5 are met
