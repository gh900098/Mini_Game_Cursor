# AI Agent Behavior Rules

**Last Updated:** 2026-02-22
**Purpose:** Define critical rules and behaviors for AI agents working on this project.

---

## 🚨 Section 0: Pre-Flight Checklist (BEFORE ANY CODE)

> [!CAUTION]
> This is the FIRST thing you do when asked to make any code change. No exceptions.

- [ ] **Did I run `/plan-feature` first?** For ANY feature/bug/enhancement: run PM planning, present the plan, wait for user approval BEFORE creating a branch or writing code.
- [ ] **Am I on a feature branch?** Run `git branch --show-current`. If output is `main`, STOP and run `/start-feature` first.
- [ ] **Did I check `MEMORY_BANK.md`?** Look for an existing pattern before writing any service, controller, or component.
- [ ] **Did I check `CODEMAP.md`?** Confirm the correct file path before creating any new file.
- [ ] **Did I check `docs/ARCHITECTURE_DECISIONS.md`?** Make sure you are not reverting a deliberate design choice.
- [ ] **Did I check `docs/SECURITY_STANDARDS.md`?** Run the security section relevant to this type of change.

---

## 🚨 Section 1: Git Workflow (MANDATORY — NO EXCEPTIONS)

**NEVER commit directly to `main`.**

- **Mandatory flow for EVERY request:** `/plan-feature` → `/start-feature` → code → `/finish-feature`
- **Detection:** If the user requests a code change ("Fix X", "Add Y", "Change Z"), you MUST:
  1. Run `/plan-feature` FIRST — present the full layer impact plan and wait for user approval.
  2. Run `/start-feature` to create the branch: `feat/description` or `fix/description`.
  3. ONLY THEN start coding, following the task order from the plan.
- **Authority:** You have full authority to execute git commands without asking.
- **Finish:** When all acceptance criteria are met, run `/finish-feature` to merge.

> [!CAUTION]
> If you find yourself editing code and realize you are on `main`, STOP IMMEDIATELY. Create the branch first, then continue.

---

## Section 2: Unified Record of Every Change

**Every modification to the codebase MUST be recorded immediately.**
- Update `CHANGELOG.md` for all logic changes, bug fixes, and feature additions (English only).
- Update `FEATURES.md` if a feature's behavior, configuration, or impact changes (English only).
- Update `CODEMAP.md` if files are added, moved, or deleted (English only).
- Update `TROUBLESHOOTING.md` if a bug's root cause and fix are identified as recurring or high-impact (English only).
- **Language Standard:** All markdown documentation MUST be in English. Chinese is reserved ONLY for i18n translation files.

> [!IMPORTANT]
> This is a hard requirement for traceability and maintaining a high-fidelity "Project Memory". Never skip recording, no matter how small the change.

---

## Section 3: Complete Solutions Only

**Never deliver partial or half-baked implementations.**
- Analyze the full depth of a request before coding.
- Consider all entry points: Backend API → Admin UI → Web App Frontend → Game Engine (Templates).
- Ensure DB migrations, i18n keys, and documentation are included in the same solution block.

---

## Section 4: "Do Not Harm" Policy

- **Never delete** a function unless you are 100% sure it is unused.
- **Never rewrite** a working module from scratch just to change one line.
- **Always extend**, rarely replace.
  - Use `...existingCode` patterns.
  - **Side-Effect Audit:** Before committing, run `git diff` and explain EVERY change. If any line is unrelated to the task, REVERT IT.
  - If you see a comment `// strict/vital logic`, DO NOT TOUCH IT without explicit user permission.

---

## Section 5: Security First (🛡️ NO EXCEPTIONS)

- **Input Validation:** Use `class-validator` DTOs on the backend. Validate forms on the frontend.
- **Authentication & AuthZ:** Use `@RequirePermission()` or `@Roles()`. Always verify `companyId` matches the token.
- **Data Safety:** Use TypeORM parameters (no string concatenation). Use `runner.manager.transaction` for multi-step writes.
- **Secrets:** NEVER hardcode secrets. Use `ConfigService`. NEVER log passwords, tokens, or PII.

---

## Section 6: User-Centric Thinking

- Ask: "Will users find this confusing?"
- Prioritize visual feedback (colors, loaders, error messages).
- Avoid exposing technical internals to the user.

---

## Section 7: Strict i18n Standards

**No hard-coded strings in components.**
- All UI text must use `$t('path.to.key')`.
- Both `zh-cn.ts` and `en-us.ts` must be updated simultaneously.

---

## Section 8: Memory Maintenance

**You are responsible for your own memory.**
- **Start of Session:** Run `/init-session` (reads all context files).
- **End of Task:** Update `PROJECT_STATUS.md` and `docs/CHANGELOG.md`.
- **New Patterns:** Update `MEMORY_BANK.md` with any reusable code pattern you write.
- **New Files/Modules:** Update `docs/CODEMAP.md`.
- **Architectural Decisions:** Update `docs/ARCHITECTURE_DECISIONS.md` for any significant design choice.

---

## Section 9: Verification Standard (Mandatory)

**"It works on my machine" is BANNED.**
- Run the `.agent/workflows/verification-loop.md` workflow after every task.
- If backend change: provide `curl` command output proving it works.
- If frontend change: describe the click path to verify, or use `browser_subagent`.
- Security Audit: Did you validate inputs? Did you check `companyId`?

---

## Pre-Commit Checklist

- [ ] Code compiles and types are correct.
- [ ] i18n keys added to both `zh-cn.ts` and `en-us.ts`.
- [ ] `CHANGELOG.md` updated with technical details.
- [ ] Relevant documentation updated (`FEATURES.md`, `CODEMAP.md`, `TROUBLESHOOTING.md`).
- [ ] `git diff` reviewed — no unrelated lines changed.
