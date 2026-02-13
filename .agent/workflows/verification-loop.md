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

## 5. Side-Effect Audit (🚨 CRITICAL)
- [ ] **Review Git Diff:** Run `git diff` and review EVERY single line changed.
- [ ] **Unintended Deletions?** Did you accidentally delete an unrelated function or import?
- [ ] **Unintended Logic Changes?** Did you accidentally modify code outside the feature scope?
- [ ] **Revert Cleanup:** If ANY unrelated code was changed, revert those specific lines before committing.

## 6. Artifact Update
- [ ] Have you updated `PROJECT_STATUS.md` with the outcome?
- [ ] Have you updated `task.md`?

## 7. Cleanup & Retention (The "Educational" Step)
- [ ] **Disposable Scripts:** Remove one-off `curl` commands or temp `.txt` files.
- [ ] **Meaningful Reproductions:** Did you write a script to prove the bug? 
    - **Action:** Move it to `tools/repro/` (e.g., `tools/repro/fix-BUG-002-isolation.js`).
    - **Why?** So we can "read back" how we solved it in the future.
- [ ] **Useful Tools:** If it's a permanent diagnostic tool, move it to `tools/`.
