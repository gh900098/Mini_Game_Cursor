# Architecture Decisions Log

**Last Updated:** 2026-02-22
**Purpose:** Record WHY key architectural decisions were made. Read this before assuming something is a bug.

> [!IMPORTANT]
> If you are about to change or revert something listed here, **STOP**. Ask the user first. These decisions were made deliberately to solve specific problems.

---

## Decision Log

| ID | Component | Decision | Why | Date |
|---|---|---|---|---|
| AD-001 | Docker | `docker-compose.test.yml` is separate from `docker-compose.prod.yml` | Test uses localhost ports (3100/3101/3102) and has different env vars. Prod uses `ADMIN_URL`/`GAME_URL` domain mapping with `127.0.0.1` binding only (no internal Nginx). Merging them caused port conflicts and accidental prod deployments. | 2026-02-20 |
| AD-002 | Admin Frontend | `isApplyingPreset` flag in `ConfigForm.vue` | When the user applies a theme preset, it triggers the deep watcher and auto-switched `themePreset` back to "Custom". The flag pauses the watcher during the bulk-apply operation so the preset name stays visible. **Do NOT remove this flag.** | 2026-02-22 |
| AD-003 | Database | `emailHash` is the unique column, not `email` | The `email` column is PII-masked (hashed/partial) in list views. The raw email is not stored in plain text. `emailHash` is used as the deduplication key to enforce uniqueness. | 2026-02-20 |
| AD-004 | Queue | BullMQ repeatable jobs use `removeOnFail: false` | We need visibility in Bull Board dashboard to diagnose failures. Setting `removeOnFail: true` silently removes failed jobs, making debugging impossible. | 2026-02-15 |
| AD-005 | File Storage | Physical file delete on `DELETE /api/game-instances/upload` | When uploading a replacement image, the old file must be deleted from disk to prevent unbounded storage growth on the server. The API handles this server-side — do not remove the `fs.unlink` call. | 2026-02-21 |
| AD-006 | API | Cache-busting `?v=timestamp` query param on asset `GET` responses | Without this, browsers serve stale uploaded images even after a new file is uploaded. The cache-busting param forces a fresh fetch. | 2026-02-21 |
| AD-007 | Sync Scheduler | EventEmitter-decoupled architecture for sync scheduler refresh | When sync settings are saved, an `EventEmitter` event triggers a full scheduler teardown and rebuild. Direct function calls caused race conditions where old job references lingered in Redis/BullMQ after a settings change. | 2026-02-16 |
| AD-008 | Multi-tenancy | `companyId` is required on nearly every entity | This is the primary isolation boundary. Every query MUST include `where: { companyId }`. Super Admins are the only exception (they bypass via `isSuperAdmin` check). Never remove `companyId` from an entity without explicit discussion. | 2026-02-01 |
| AD-009 | Scores | `AdminScoresController` uses `createQueryBuilder` not `find()` | The scores table joins multiple relations (`member`, `gameInstance`, `prize`) and needs complex filtering. TypeORM `find()` with many relations causes N+1 queries. `createQueryBuilder` with explicit `leftJoinAndSelect` is required for performance. | 2026-02-08 |
| AD-010 | Worker | `minigame-worker` is a separate Docker container from `minigame-api-test` | The BullMQ worker processes sync jobs in the background. Running it in the same process as the API caused job processing to block API request handling under load. They share the same Redis instance. | 2026-02-14 |

---

## How to Add a New Entry

When you make a significant architectural decision, add a row to the table above:
- **ID:** Next sequential `AD-NNN`
- **Component:** The system area (Backend, Frontend, Database, Docker, etc.)
- **Decision:** What was decided (keep it factual)
- **Why:** The reason — what problem it solves, what bug it prevents
- **Date:** When the decision was made
