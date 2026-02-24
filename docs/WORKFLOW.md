# AI Agent Workflow Guide

**Effective Date:** 2026-02-24
**Status:** Active & Automating
**IDE:** Cursor

This guide defines the standard operating procedures for the User and the AI Agent. Workflows are implemented as Cursor rules in `.cursor/rules/` and are automatically consulted by the agent when relevant.

---

## 1. Scenario: Starting a Session
**When:** You open a new chat window or resume work after a break.
**Goal:** Load the "Brain" so the Agent knows where we left off.

**How to trigger:** Ask the agent to "initialize session" or "load context". The agent follows the `workflow-init-session` rule.

**What Happens:**
1.  Agent reads `PROJECT_STATUS.md` (Mission context).
2.  Agent reads `CODING_STANDARDS.md` (Rules).
3.  Agent reports "Ready" and lists active tasks.

---

## 2. Scenario: New Feature / Improvement
**When:** You want to add something new (e.g., "Add a search bar").
**Goal:** Create a safe space to work without breaking `main`.

**How to trigger:** Ask the agent to "plan and start a new feature". The agent follows `workflow-plan-feature` then `workflow-start-feature` rules.

**What Happens:**
1.  Agent asks: "Is this a feature or bug?"
2.  Agent runs `git checkout -b feat/search-bar` (from `main`).
3.  Agent updates `PROJECT_STATUS.md` to set "Active Task".
4.  **Coding Phase:** Agent writes code, creates files, etc.

---

## 3. Scenario: Fixing a Bug
**When:** You find an issue (e.g., "Login button is broken").
**Goal:** Fix it quickly and document the solution.

**How to trigger:** Tell the agent "Fix the login button" or ask to "start a bug fix". The agent follows `workflow-start-feature` rule with `fix/` prefix.

**What Happens:**
1.  Agent runs `git checkout -b fix/login-button`.
2.  **Coding Phase:** Agent fixes the code.
3.  **Verification:** Agent runs the verification workflow.

---

## 4. Scenario: Verifying & Deploying
**When:** The code is written, and we need to check it.
**Goal:** Prove it works in Docker.

**How to trigger:** Ask the agent to "verify" or "run verification". The agent follows the `workflow-verification` rule.

**What Happens (Automated):**
1.  **Auto-Deploy:** `docker compose -f docker-compose.prod.yml up -d --build <service>`
2.  **Check:** Agent runs `curl` or verifies functionality.
3.  **Result:** "Verification Passed".

---

## 5. Scenario: Finishing & Merging
**When:** The feature works, and you want to save it.
**Goal:** Merge to `main`, update docs, and cleanup.

**How to trigger:** Ask the agent to "finish and merge" or "wrap up this feature". The agent follows the `workflow-finish-feature` rule.

**What Happens:**
1.  **Documentation Update (Strict Rule):**
    - Agent updates `docs/CHANGELOG.md` (What changed).
    - Agent updates `docs/FEATURES.md` (If new feature).
    - Agent updates `docs/TROUBLESHOOTING.md` (If bug fix).
2.  **Git Merge:** Agent merges branch into `main`.
3.  **Cleanup:** Agent deletes the feature branch.

---

## 6. Scenario: Saving Progress (End of Day)
**When:** You are done for the day or closing the tab.
**Goal:** Update the "Brain" for the next session.

**How to trigger:** Ask the agent to "save progress" or "update status". The agent follows the `workflow-update-status` rule.

**What Happens:**
1.  Agent saves the current state to `PROJECT_STATUS.md`.
2.  Agent notes any open bugs or pending tasks.

---

## 7. Scenario: Complex Requests (Multiple Features)
**When:** You ask for a big goal (e.g., "Build the Referral System") that includes UI, API, and DB changes.
**Goal:** Avoid chaos. Do it step-by-step.

**The Protocol:**
1.  **Break it down:** The agent will list the sub-features as tasks.
2.  **Sequential Execution (Strict):**
    -   **Step 1:** Start feature for Part A -> Code -> Verify -> Finish feature (Merge).
    -   **Step 2:** Start feature for Part B -> Code -> Verify -> Finish feature (Merge).
3.  **Why?** This keeps `main` stable. If Part B fails, Part A is already safe.

**Context Warning:**
If the conversation gets too long (e.g., > 30 tasks), the agent might start "forgetting".
**Rule:** If a complex task is 50% done but the chat is lagging, ask the agent to "save status" and start a new conversation with "initialize session".

---

## 8. Scenario: The "Drive-By" Bug
**When:** You receive a request or the agent finds a bug *unrelated* to the current feature (e.g., building "Search" but find "Login" is broken).

**The Protocol:**
1.  **Assess Severity:**
    -   **Critical (Blocker):** Pause current feature -> Start fix branch -> Fix -> Merge -> Resume "Search".
    -   **Minor (Non-Blocking):** Do **NOT** fix it yet.
        -   **Action:** Log it in `PROJECT_STATUS.md` under "Known Issues" or `TODO.md`.
        -   **Why?** Context switching kills quality. Finish "Search" first.
2.  **Conversation:** Stay in the same chat. The agent will switch branches if needed.

---

## 9. Scenario: Just Talking (Natural Language)
**You don't HAVE to use specific commands.**
-   **You say:** "Fix the login page."
-   **Agent does:** Automatically follows the plan-feature and start-feature workflows, creates `fix/login-page`, and starts coding.

**Natural language works. The agent matches your intent to the appropriate workflow rule.**

---

## 10. Summary of Workflows

| Action | Cursor Rule | How to Trigger |
| :--- | :--- | :--- |
| **Start Session** | `workflow-init-session` | "Initialize session" / "Load context" |
| **Plan Feature** | `workflow-plan-feature` | "Plan this feature" / Automatic before coding |
| **New Work** | `workflow-start-feature` | "Start a new feature" / Automatic after plan |
| **Finish Work** | `workflow-finish-feature` | "Finish and merge" / "Wrap up" |
| **Verify** | `workflow-verification` | "Verify changes" / "Run verification" |
| **Save State** | `workflow-update-status` | "Save progress" / "Update status" |
| **Deploy Test** | `workflow-deploy-test` | "Deploy to test" |
| **Deploy Prod** | `workflow-deploy-prod` | "Deploy to production" |
| **New Skill** | `workflow-new-skill` | "Create a new skill" |
