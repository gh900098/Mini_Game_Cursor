---
description: Initialize session context by reading status and standards.
---

# Initialize Session (v3 - Full Context Load)

> [!CAUTION]
> This workflow MUST be run at the start of EVERY conversation before any code changes. Do not skip any step.

---

## Step 1: Environmental Verification (CRITICAL GATES)

### 1a. Check Git Branch
Run: `git branch --show-current`

**IF output is `main`:**
- ⚠️ Warn the user: "You are on `main`. Direct edits are BANNED. You MUST run `/start-feature` before I can write any code."
- **DO NOT proceed to write any code until the user runs `/start-feature`.**
- You may still read files and answer questions.

**IF output is a feature branch:**
- ✅ Note the branch name. Continue.

### 1b. Check Docker Containers
Run: `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`

**IF containers are missing or unhealthy:**
- ⚠️ Warn the user: "One or more containers are down. Run `/deploy-to-test` to restore them before testing."

---

## Step 2: Full Context Load (READ ALL — no skipping)

Read these files **in parallel** to fully reconstruct project memory:

1. `PROJECT_STATUS.md` — Current mission, active branch, recent completions, and backlog.
2. `CODING_STANDARDS.md` — All enforced patterns and rules.
3. `MEMORY_BANK.md` — Proven code patterns to reuse. **Check here BEFORE writing any service/controller/component.**
4. `docs/CODEMAP.md` — Authoritative map of where all files live. **Check here BEFORE creating any new file.**
5. `AGENTS.md` — Behavior rules and the pre-flight checklist.

> [!IMPORTANT]
> If you skip reading any file above, you risk writing code that conflicts with existing patterns, places files in wrong locations, or re-introduces fixed bugs. This is the primary cause of agent amnesia.

---

## Step 3: Report Status

After reading all files, report to the user:

| Item | Value |
|---|---|
| **Current Branch** | (from Step 1a) |
| **Server Status** | (from Step 1b — all containers listed) |
| **Active Mission** | (from `PROJECT_STATUS.md`) |
| **Open Backlog** | (from `PROJECT_STATUS.md` issue tracker) |

Then ask: **"What would you like to work on?"**

---

## Step 4: Before Any Code Change (🚨 Mandatory Pre-Flight)

Before touching a single file, confirm:
- [ ] Are you on a **feature branch**? (Not `main`)
- [ ] Did you check `MEMORY_BANK.md` for an existing pattern?
- [ ] Did you check `CODEMAP.md` for the correct file location?
- [ ] Did you check `docs/ARCHITECTURE_DECISIONS.md` to avoid reverting deliberate decisions?
