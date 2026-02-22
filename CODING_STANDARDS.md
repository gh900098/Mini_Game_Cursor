# AI Agent Coding Standards & "Memory" Protocol

**Goal:** Stop "forgetting" existing logic. Stop "deleting" useful code.
**Rule #0:** **READ BEFORE YOU WRITE.**

## 1. The "Read-First" Protocol
Before writing ANY code, you MUST read these files to understand the current state:
1.  **`PROJECT_STATUS.md`**: The current mission and server state.
2.  **`MEMORY_BANK.md`**: Proven reusable patterns. Check here BEFORE writing any service/controller/component.
3.  **`docs/CODEMAP.md`**: Where all files live. Check here BEFORE creating any new file.
4.  **`docs/ARCHITECTURE_DECISIONS.md`**: WHY key decisions were made. Check here BEFORE changing anything structural.
5.  **`docs/FEATURES.md`**: The detailed logic of existing features.
6.  **`AGENTS.md`**: The behavior rules and pre-flight checklist (Section 0 is critical).

## 2. Git Workflow (Strict)
**Rule: NO DIRECT COMMITS TO MAIN.**
- **Start Feature:**
    - Is it a bug? -> `fix/description`
    - Is it a feature? -> `feat/description`
    - Use workflow: `/start-feature`
- **Finish Feature:**
    - Verify first (Rule #5).
    - Merge to main only when complete.
    - Use workflow: `/finish-feature`

## 3. "Do Not Harm" Policy
- **Never delete** a function unless you are 100% sure it is unused.
- **Never rewrite** a working module from scratch just to change one line.
- **Always extend**, rarely replace.
    - Use `...existingCode` patterns.
    - **Side-Effect Audit:** Before pushing, you MUST review the `git diff` to ensure you didn't accidentally touch unrelated lines.
    - If you see a comment `// strict/vital logic`, DO NOT TOUCH IT without explicit user permission.

## 4. Security First (🛡️ NO EXCEPTIONS)
**Goal:** Prevent backdoors, leaks, and exploits.
- **Input Validation:**
    - **Back:** Trust NOBODY. Use `class-validator` DTOs for EVERYTHING.
    - **Front:** Validate forms, but assume the user can bypass it.
- **Authentication & AuthZ:**
    - **Never** roll your own crypto. Use standard libraries.
    - **RBAC:** Use `@RequirePermission()` or `@Roles()`.
    - **Isolation:** Always verify `companyId` matches the token.
- **Data Safety & Integrity:**
    -   **SQL Injection:** NEVER use string concatenation in queries. Use TypeORM parameters.
    -   **Transactions:** ALWAYS use `runner.manager.transaction` for multi-step writes (e.g., deducting credit + awarding prize).
    -   **Foreign Keys:** NEVER rely on code to maintain relations. Use DB constraints (`onDelete: 'CASCADE'`).
    -   **Secrets:** NEVER hardcode secrets. Use `ConfigService`.
    -   **Logs:** NEVER log passwords, tokens, or PII.

## 5. Reusable Skills & Patterns (The "Muscle Memory")

### Backend (NestJS)
- **Multi-tenancy:** ALWAYS inject `@CurrentTenant() companyId: string`.
    - Query: `where: { companyId }`.
    - Entity: `@Index(['companyId'])`.
- **Game Rules:** ALWAYS use `GameRulesService` for validation.
    - Don't write raw `if (count > limit)` checks in controllers.
- **i18n:** NEVER return raw English strings in `message`. Use error codes (`DAILY_LIMIT_REACHED`).

### Frontend (Vue/Soybean)
- **Status Display:** Use the **Status Card** pattern (see `views/game/index.vue`).
- **Styles:** Use **Computed Inline Styles** for dynamic colors (red/yellow/blue).
    - `style="{ color: isWarning ? '#facc15' : 'white' }"`
- **API calls:** Use `src/service/api/*.ts`. Do not use `axios` directly in components.

## 6. High Performance Data Pattern (Tables)
**Goal:** Sub-100ms load times for any dataset size.
- **Rule:** ANY table with potential > 100 rows MUST use **Server-Side Pagination**.
- **Backend Requirements:**
    -   Use `findAndCount` or `createQueryBuilder` with `skip()` and `take()`.
    -   **Indexing:** ALWAYS index columns used in `where` (e.g., `companyId`) and `orderBy` (e.g., `createdAt`).
    -   **Search:** Implement search on the backend using `LIKE` or database indexes.
- **Frontend Requirements:**
    -   Use `NDataTable` with the `remote` prop.
    -   Explicitly show pagination controls (`showSizePicker: true`).
    -   Use a `watch` on filter/search parameters to reset pagination and refresh data.

## 7. Documentation is Code (The "Audit Trail")
- **If Feature:** Update `docs/FEATURES.md` (How it works - In English).
- **If Bug:** Update `docs/TROUBLESHOOTING.md` (Issue -> Cause -> Solution - In English).
- **Always:** Update `docs/CHANGELOG.md` (Summary of changes - In English).
- **Language Policy:** All markdown records, status updates, and comments in documentation MUST be in English.
- **Rule:** No PR merge without docs update.

## 5. Verification (The "Double Check")
- **Mandatory:** You must run the `.agent/workflows/verification-loop.md`.
- **Auto-Deploy:** You **MUST** run `docker compose -f docker-compose.prod.yml up -d --build <service>` before testing.
- **Backend:** `curl` it.
- **Frontend:** Click it.
- **Database:** Query it.
- **Diff:** Run `git diff` and explain EVERY change to yourself. If any line is unrelated to the task, REVERT IT before completing.
*("I think it works" is not an acceptable status.)*
