---
description: Standard workflow for verifying changes in the Mini Game project
---

# Verification Loop (The "Double-Check")

Run this workflow whenever you think you are "Done" with a task.

## 1. Identify the Component
- [ ] Is this a **Backend (API)** change?
- [ ] Is this a **Frontend (Admin/Web)** change?
- [ ] Is this a **Database (Schema)** change?

## 2. Backend Verification (If Applicable)
- [ ] **Compile Check:** Run `pnpm --filter api build` to ensure no TS errors.
- [ ] **Auto-Deploy (Local Docker):**
    - Run: `docker compose -f docker-compose.prod.yml up -d --build <service_name>`
    - Check: `docker ps` to ensure it is healthy.
- [ ] **Runtime Check:**
    1. Prepare a `curl` command or a minimal `.js` script in `tools/` directory.
    2. Run the script against the *Dockerized* API (`http://localhost:3000`).
    3. **CRITICAL:** Do NOT assume it works just because the code looks right.

## 3. Frontend Verification (If Applicable)
- [ ] **Type Check:** Run `pnpm --filter soybean-admin type:check` (or build).
- [ ] **Browser Simulation:**
    1. If simple logic: Use `browser_subagent` to click through the flow.
    2. If complex visual: Review `PROJECT-MAP.md` to ensure you didn't break related components.

## 4. Database Verification (If Applicable)
- [ ] **Migration Check:** Did you generate a migration?
- [ ] **Seed Check:** Did you update `seed.service.ts` if you added new config?

## 5. Artifact Update
- [ ] Have you updated `PROJECT_STATUS.md` with the outcome?
- [ ] Have you updated `task.md`?

// turbo
## 6. Cleanup
- Remove any temporary test scripts unless they are useful for the long term (in which case move them to `tests/`).
