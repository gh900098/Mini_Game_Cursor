---
description: Start a new feature or bug fix by creating a git branch.
---

# Start Feature / Fix

1. **Analyze Request:**
   - Is it a **Bug Fix**? -> Prefix `fix/`
   - Is it a **New Feature**? -> Prefix `feat/`
   - Is it **Documentation**? -> Prefix `docs/`

2. **Check Current Status:**
   - Ensure `git status` is clean.
   - `git checkout main`
   - `git pull origin main`

3. **Create Branch:**
   - Generate a short, descriptive name (e.g., `feat/add-user-profile`, `fix/login-error`).
   - `git checkout -b <branch-name>`

4. **Update Context:**
   - Update `PROJECT_STATUS.md` -> Set `Active Task` to the new feature name.
   - Inform User: "Started work on branch `<branch-name>`."
