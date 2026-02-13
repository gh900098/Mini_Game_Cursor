# 🤖 AI Agent Workflow Guide

**Effective Date:** 2026-02-13
**Status:** Active & Automating

This guide defines the standard operating procedures for the User and the AI Agent.

---

## 1. 🌅 Scenario: Starting a Session
**When:** You open a new chat window or resume work after a break.
**Goal:** Load the "Brain" so the Agent knows where we left off.

**Command:**
```
/init-session
```

**What Happens:**
1.  Agent reads `PROJECT_STATUS.md` (Mission context).
2.  Agent reads `CODING_STANDARDS.md` (Rules).
3.  Agent reports "Ready" and lists active tasks.

---

## 2. 🚀 Scenario: New Feature / Improvement
**When:** You want to add something new (e.g., "Add a search bar").
**Goal:** Create a safe space to work without breaking `main`.

**Command:**
```
/start-feature
```

**What Happens:**
1.  Agent asks: "Is this a feature or bug?"
2.  Agent runs `git checkout -b feat/search-bar` (from `main`).
3.  Agent updates `PROJECT_STATUS.md` to set "Active Task".
4.  **Coding Phase:** Agent writes code, creates files, etc.

---

## 3. 🐛 Scenario: Fixing a Bug
**When:** You find an issue (e.g., "Login button is broken").
**Goal:** Fix it quickly and document the solution.

**Command:**
```
/start-feature
```
*(Agent will detect or ask to prefix as `fix/`)*

**What Happens:**
1.  Agent runs `git checkout -b fix/login-button`.
2.  **Coding Phase:** Agent fixes the code.
3.  **Verification:** Agent runs `verification-loop`.

---

## 4. ✅ Scenario: Verifying & Deploying
**When:** The code is written, and we need to check it.
**Goal:** Prove it works in Docker.

**Action:**
 Agent runs `.agent/workflows/verification-loop.md`.

**What Happens (Automated):**
1.  **Auto-Deploy:** `docker compose -f docker-compose.prod.yml up -d --build <service>`
2.  **Check:** Agent runs `curl` or verifies functionality.
3.  **Result:** "Verification Passed".

---

## 5. 🏁 Scenario: Finishing & Merging
**When:** The feature works, and you want to save it.
**Goal:** Merge to `main`, update docs, and cleanup.

**Command:**
```
/finish-feature
```

**What Happens:**
1.  **Documentation Update (Strict Rule):**
    - Agent updates `docs/CHANGELOG.md` (What changed).
    - Agent updates `docs/FEATURES.md` (If new feature).
    - Agent updates `docs/TROUBLESHOOTING.md` (If bug fix).
2.  **Git Merge:** Agent merges branch into `main`.
3.  **Cleanup:** Agent deletes the feature branch.

---

## 6. 💾 Scenario: Saving Progress (End of Day)
**When:** You are done for the day or closing the tab.
**Goal:** Update the "Brain" for the next session.

**Command:**
```
/update-status
```

**What Happens:**
1.  Agent saves the current state to `PROJECT_STATUS.md`.
2.  Agent notes any open bugs or pending tasks.

---

## 7. 🧩 Scenario: Complex Requests (Multiple Features)
**When:** You ask for a big goal (e.g., "Build the Referral System") that includes UI, API, and DB changes.
**Goal:** Avoid chaos. Do it step-by-step.

**The Protocol:**
1.  **Break it down:** I will list the sub-features in `task.md`.
2.  **Sequential Execution (Strict):**
    -   **Step 1:** `/start-feature` for Part A -> Code -> Verify -> `/finish-feature` (Merge).
    -   **Step 2:** `/start-feature` for Part B -> Code -> Verify -> `/finish-feature` (Merge).
3.  **Why?** This keeps `main` stable. If Part B fails, Part A is already safe.

**⚠️ Context Warning:**
If the conversation gets too long (e.g., > 30 tasks), I might start "forgetting".
**Rule:** If a complex task is 50% done but the chat is lagging, use `/update-status` and start a new conversation with `/init-session`.

---

## 8. 🚦 Scenario: The "Drive-By" Bug
**When:** You receive a request or I find a bug *unrelated* to the current feature (e.g., building "Search" but find "Login" is broken).

**The Protocol:**
1.  **Asses Severity:**
    -   **Critical (Blocker):** Pause current feature -> `/start-feature fix/login` -> Fix -> Merge -> Resume "Search".
    -   **Minor (Non-Blocking):** Do **NOT** fix it yet.
        -   **Action:** I will log it in `PROJECT_STATUS.md` under "Known Issues" or `TODO.md`.
        -   **Why?** Context switching kills quality. Finish "Search" first.
2.  **Conversation:** Stay in the same chat. I will switch branches for you if needed.

---

## 9. Summary of Commands
| Action | Command | Context |
| :--- | :--- | :--- |
| **Start** | `/init-session` | Always use first. |
| **New Work** | `/start-feature` | Creates `feat/` or `fix/` branch. |
| **Finish Work** | `/finish-feature` | Merges code + Updates Docs. |
| **Save State** | `/update-status` | Updates `PROJECT_STATUS.md`. |
