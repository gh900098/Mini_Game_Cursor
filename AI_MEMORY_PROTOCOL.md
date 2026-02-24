# AI Memory Protocol: How to Restore Context

**Goal:** Prevent "Agent Amnesia" when starting a new chat or switching models.

## 1. The "Golden Start" Prompt
When you start a new conversation, ask the agent to:

> "Initialize session" or "Load context"

**(The agent follows the `workflow-init-session` rule: reads `PROJECT_STATUS.md`, `CODING_STANDARDS.md`, `MEMORY_BANK.md`, `CODEMAP.md`, and `AGENTS.md`.)**

## 2. Does the Agent "Auto-Remember"?
- **No.** You must "feed" it these context files at the start of **every** new chat.
- **Why?** Each new chat session is a blank slate. It doesn't know what happened yesterday unless you tell it.

## 3. How to Update Memory?
- When a task is done, tell the Agent:
> "Save progress" or "Update status"

- If you find a new pattern that works well, tell the Agent:
> "Add this code pattern to `MEMORY_BANK.md` so we don't forget it."

## 4. What We Have Built (The "Context Layer")
- **`PROJECT_STATUS.md`**: The living document of *now*.
- **`CODING_STANDARDS.md`**: The rulebook of *how*.
- **`MEMORY_BANK.md`**: The reusable *patterns*.
