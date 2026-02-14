---
description: Initialize session context by reading status and standards.
---

# Initialize Session (v2 - Anti-Amnesia)

1. **Environmental Verification (CRITICAL):**
   - **Check Branch:** Run `git branch --show-current`.
     - *If output is `main`:* You **MUST** warn the user: "⚠️ Currently on `main` branch. Do NOT edit code directly. Use `/start-feature` to begin work."
   - **Check Docker:** Run `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`.
     - *If containers missing:* You **MUST** warn the user and suggest running `/deploy-to-docker`.

2. **Read Core Context:**
   - Read `PROJECT_STATUS.md` to get the current mission.
   - Read `CODING_STANDARDS.md` to refresh memory on rules.

3. **Report Status:**
   - **Current Branch:** (From git check)
   - **Server Status:** (From docker check)
   - **Active Mission:** (From PROJECT_STATUS.md)
   - **Next Action:** Ask the user for instructions.
