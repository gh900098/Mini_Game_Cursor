# AI Agent Behavior Rules

**Last Updated:** 2026-02-01
**Purpose:** Define critical rules and behaviors for AI agents working on this project.

---

## 🚨 Critical Rules (MUST FOLLOW)

### 1. Unified Record of Every Change
**Every modification to the codebase MUST be recorded immediately.** 
- Update `CHANGELOG.md` for all logic changes, bug fixes, and feature additions.
- Update `FEATURES.md` if a feature's behavior, configuration, or impact changes.
- Update `CODEMAP.md` if files are added, moved, or deleted.
- Update `TROUBLESHOOTING.md` if a bug's root cause and fix are identified as recurring or high-impact.

> [!IMPORTANT]
> This is a hard requirement for traceability and maintaining a high-fidelity "Project Memory". Never skip recording, no matter how small the change.

### 2. Complete Solutions Only
**Never deliver partial or half-baked implementations.**
- Analyze the full depth of a request before coding.
- Consider all entry points: Backend API → Admin UI → Web App Frontend → Game Engine (Templates).
- Ensure DB migrations, i18n keys, and documentation are included in the same solution block.

### 3. User-Centric Thinking
**Design for the human, not just the machine.**
- Ask: "Will users find this confusing?"
- Prioritize visual feedback (colors, loaders, error messages).
- Avoid exposing technical internals (like raw JSON keys) to the user.

### 4. Strict i18n Standards
**No hard-coded strings in components.**
- All UI text must use `$t('path.to.key')`.
- Both `zh-cn.ts` and `en-us.ts` must be updated simultaneously.

---

## 🛠️ Operational Workflow

### The "DJ + Jarvis" Paradigm
- **DJ (Antigravity):** The master of code. Focuses on architecture, complex logic, and deep implementation.
- **Jarvis (Maintenance/Ops):** The master of deployment and documentation. Focuses on pulling code, rebuilding containers, and ensuring the documentation matches the reality of the code.

### Pre-Commit Checklist
- [ ] Code compiles and types are correct.
- [ ] i18n keys added to both languages.
- [ ] `CHANGELOG.md` updated with technical details.
- [ ] Relevant documentation updated (FEATURES, CODEMAP, etc.).

### 5. Verification Standard (Mandatory)
**"It works on my machine" is not enough.**
- **Context:** We operate in a Dockerized environment.
- **Verification Standard (Mandatory):**
    - "It works on my machine" is BANNED.
    - If backend change: `curl` command output proving it works.
    - If frontend change: Description of the click path to verify.
    - **Security Audit:** Did you validate inputs? Did you check `companyId`?

## 7. Git Workflow (STRICT, NO EXCEPTIONS)
- **NEVER** commit directly to `main`.
- **Start:** Use `/start-feature` workflow (Branch: `feat/` or `fix/`).
- **Finish:** Use `/finish-feature` workflow (Merge explicitly).
- **Rule:** If you are editing code, you MUST be on a feature branch.
- **Authority:** You have full authority to execute these git commands.

### 6. Memory Maintenance
**You are responsible for your own memory.**
- **Start of Session:** Read `PROJECT_STATUS.md` and `CODING_STANDARDS.md`.
- **End of Task:** Update `PROJECT_STATUS.md` and `docs/CHANGELOG.md`.
- **New Patterns:** Update `MEMORY_BANK.md`.
- **Write:** Update `PROJECT_STATUS.md` if you complete a mission or find a new bug.
- **Map:** Update `PROJECT-MAP.md` if you add a new module.
