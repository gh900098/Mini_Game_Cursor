---
description: Verify and merge a feature branch into main.
---

// turbo-all
# Finish Feature / Fix

1. **Verify (Mandatory):**
   - Run verification tests (Reference: `.agent/workflows/verification-loop.md`).
   - Confirm status: "Feature is complete and tested."

2. **Document (Mandatory):**
   - **Features:** Update `docs/FEATURES.md` with new logic.
   - **Bugs:** Update `docs/TROUBLESHOOTING.md` with "Issue -> Cause -> Solution".
   - **All:** Update `docs/CHANGELOG.md` with a summary.

3. **Commit:**
   - Write clear message: `feat(scope): completed feature X`.
   - `git add -A`
   - `git commit`

3. **Merge:**
   - `git checkout main`
   - `git pull origin main`
   - `git merge <feature-branch>`
   - `git push origin main`

4. **Auto-Memory Update (Mandatory):**
   - Update `PROJECT_STATUS.md`:
     - Move the feature from "Active Task" to "Recently Completed" table.
     - Log any "Drive-By Bugs" found but not fixed into "Backlog".
   - `git branch -d <feature-branch>`
   - Inform User: "Feature merged, Docs updated, Memory saved."
