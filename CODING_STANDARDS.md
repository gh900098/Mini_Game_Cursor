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

## 7. Anti-Hardcode & Dynamic Design (🚨 Multi-Tenant Non-Negotiable)

**Goal:** Every value that might differ between tenants, environments, or integrations MUST be configurable — not hardcoded.

> [!CAUTION]
> This project is multi-tenant and will have many future integrations. Hardcoding ANYTHING that a tenant or admin might need to change is a form of technical debt. Think: "If Tenant B needs a different value here, can they configure it without a code deploy?"

### What is NEVER allowed to be hardcoded:
| ❌ Hardcoded | ✅ Dynamic Alternative |
|---|---|
| URLs (`http://localhost:3100`, `https://api.xseo.me`) | `ConfigService.get('API_URL')` or env var |
| Tenant-specific IDs or slugs | `companyId` from JWT token |
| Color values in logic (only in CSS/config) | Theme config from `game_instance.config` |
| Limits (`if (count > 10)`) | Config from `system_settings` table or game instance config |
| Integration API keys or secrets | `.env` + `ConfigService` — never in code |
| Feature flags (`if (companyId === 'abc')`) | Role/permission system or per-tenant settings |
| Text strings in backend responses | i18n error codes only |
| File paths with env-specific segments | `path.join(process.cwd(), configuredUploadDir)` |

### Dynamic Design Checklist (run before writing any service or component):
- [ ] Can a **different tenant** use this with zero code changes?
- [ ] Can a **new integration** plug in without touching existing code? (Use strategy pattern, not `if/else` chains)
- [ ] Are all **limits, thresholds, and toggles** driven by database config or env vars?
- [ ] Are all **external URLs and API endpoints** driven by env vars or `ConfigService`?
- [ ] If this feature has **webhooks or callbacks**, are the URLs configurable per tenant?

### The Strategy Pattern (for integrations — ALWAYS use this over if/else):
```typescript
// ❌ Wrong — adding Tenant C requires code change:
if (tenant === 'A') { syncWithJK(); }
else if (tenant === 'B') { syncWithXXX(); }

// ✅ Right — adding Tenant C is config only:
const strategy = this.syncStrategyFactory.getStrategy(tenant.syncType);
await strategy.execute(payload);
```

---

## 8. Feature Definition of Done (Enterprise Standard)

**Goal:** A feature is NOT done until it passes ALL of the following.  
"It works when I try it" is not done.

### Backend Layer ✅
- [ ] All endpoints have proper **DTO validation** (`class-validator`)
- [ ] All endpoints enforce **`companyId` isolation** (no cross-tenant data leakage)
- [ ] All multi-step writes use **transactions** (no partial state on failure)
- [ ] Errors return **i18n error codes**, not raw English strings
- [ ] New columns/tables have **DB indexes** on query/sort columns
- [ ] **Edge cases handled:** What if the record doesn't exist? What if the list is empty? What if a required foreign key is null?

### Frontend Layer ✅
- [ ] **Loading state:** Does the UI show a skeleton/spinner while data loads?
- [ ] **Empty state:** Does the table/list show a clear "No data" message?
- [ ] **Error state:** Does the UI show a user-friendly message if the API call fails?
- [ ] **Form validation:** Are required fields validated before submission? Is the submit button disabled during the request?
- [ ] **Success feedback:** Does the user get confirmation after a save/delete?
- [ ] **Responsive/Mobile:** Does the UI render correctly on small screens (test at 375px width)?

### UI/UX Quality Check ✅
- [ ] Run the `ui-ux-pro-max` skill mental checklist:
  - Consistent with existing page layouts and color system?
  - No raw UUIDs or technical keys exposed to the user?
  - Destructive actions (delete, reset) have a **confirmation dialog**?
  - Status indicators use **color + icon** (not just text alone)?
  - Tables with >5 columns consider **column priority** (most important leftmost)?
- [ ] Does the feature feel **complete**, not like a placeholder?

### Integration & Multi-Tenancy Check ✅
- [ ] Would a **second tenant** with completely different data get the correct results?
- [ ] Are all values that might vary by tenant driven by **config, not code**?
- [ ] If this feature talks to an **external API**, is the integration isolated behind a service class (not inline in a controller)?

### Documentation ✅
- [ ] `FEATURES.md` updated with how the feature works
- [ ] `CHANGELOG.md` updated with what changed
- [ ] `ARCHITECTURE_DECISIONS.md` updated if a significant design choice was made
- [ ] `MEMORY_BANK.md` updated if a new reusable pattern was created

---

## 9. Documentation is Code (The "Audit Trail")
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
