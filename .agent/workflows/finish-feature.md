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

3. **Pattern Extraction (Mandatory — The "Memory Bank" Step):**

   Ask yourself: *"Did I write something that other features will need again?"*

   **A pattern qualifies if it is:**
   - A new service/controller structure that will be reused (e.g., a new way to handle pagination, auth, or file handling)
   - A solution to a bug that could recur in similar modules
   - A guard, decorator, or utility that other modules should adopt
   - A Vue composable or component pattern used more than once

   **If YES — do ALL of the following:**
   - Add the reusable code snippet to `MEMORY_BANK.md` with a clear title and explanation.
   - Update `docs/CODEMAP.md` if any **new files or modules** were created.
   - Update `docs/ARCHITECTURE_DECISIONS.md` if a **significant design decision** was made (e.g., why a certain approach was chosen over alternatives).

   **If NO — explicitly state:** "No new reusable patterns identified. MEMORY_BANK.md unchanged."

4. **Commit:**
   - Write clear message: `feat(scope): completed feature X` or `fix(scope): fixed bug Y`.
   - `git add -A`
   - `git commit`

5. **Merge:**
   - `git checkout main`
   - `git pull origin main`
   - `git merge <feature-branch>`
   - `git push origin main`

6. **Auto-Memory Update (Mandatory):**
   - Update `PROJECT_STATUS.md`:
     - Move the feature from "Active Task" to "Recently Completed" table.
     - Log any "Drive-By Bugs" found but not fixed into "Backlog".
   - `git branch -d <feature-branch>`
   - Inform User: "Feature merged. Docs updated. Memory saved. Patterns extracted: [list or 'none']."
