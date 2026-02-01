# MiniGame Project Map & Impact Atlas 🗺️

**Last Updated:** 2026-02-01
**Purpose:** A comprehensive reference for all project features, their technical location, data dependencies, and cross-component impact.

---

## 🏗️ Core System Components

### 1. Game Rules System (Logic Gatekeeper)
*   **Purpose:** Controls player behavior, prevents abuse, and manages costs through automated restrictions.
*   **Documentation:** [FEATURES.md#游戏规则系统 (Game Rules)](docs/FEATURES.md#游戏规则系统-game-rules) | [RULES_IMPLEMENTATION_PLAN.md](docs/RULES_IMPLEMENTATION_PLAN.md)
*   **Technical Location:**
    *   Backend: `apps/api/src/modules/scores/game-rules.service.ts`
    *   Entities: `play-attempt.entity.ts`, `budget-tracking.entity.ts`
*   **Data Impact:** 
    *   `play_attempts` table (records every try)
    *   `budget_tracking` table (tracks costs per instance/day)
    *   `members` table (level, vip_tier, experience)
*   **Impact on Other Components:** 
    *   **Web App:** Affects `index.vue` floating status card and spin button state.
    *   **Admin:** Configured via `ConfigForm.vue` in the "Rules" tab.
    *   **Scores:** Intercepts `submit()` to validate if a play is allowed.

### 2. Dynamic Configuration System (Schema-Driven)
*   **Purpose:** Allows zero-code customization of games by administrators.
*   **Documentation:** [ARCHITECTURE.md#为什么configform是动态渲染？](docs/ARCHITECTURE.md#为什么configform是动态渲染) | [CODEMAP.md#想要修改配置界面？](docs/CODEMAP.md#想要修改配置界面)
*   **Technical Location:**
    *   Schema Definition: `apps/api/src/modules/seed/seed.service.ts`
    *   Admin UI: `apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue`
*   **Data Impact:** 
    *   `game_templates` table (stores the schema)
    *   `game_instances` table (`config` JSON field stores resulting values)
*   **Impact on Other Components:** 
    *   **Game Engine:** Directly reads from `instance.config` to render visuals and logic.
    *   **i18n:** Depends on keys in `zh-cn.ts` and `en-us.ts` for field labels.

### 3. Game Engine (Template System)
*   **Purpose:** Server-side HTML generation for cross-platform, multi-instance game delivery.
*   **Documentation:** [ARCHITECTURE.md#为什么游戏引擎是server-side生成html？](docs/ARCHITECTURE.md#为什么游戏引擎是server-side生成html)
*   **Technical Location:**
    *   Main Template: `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts`
*   **Data Impact:** Reads `game_instances` config.
*   **Impact on Other Components:** 
    *   **Web App:** Receives generated HTML for the iframe.
    *   **Communication:** Uses `postMessage` for status sync and token relay.

### 4. Audio Management System (Triple Mode)
*   **Purpose:** Flexible audio control (Theme defaults, Custom uploads, or Mute).
*   **Documentation:** [FEATURES.md#音效系统](docs/FEATURES.md#音效系统) | [CHANGELOG.md (2026-01-31)](docs/CHANGELOG.md)
*   **Technical Location:**
    *   Logic: `ConfigForm.vue` (modes/preview)
    *   Resolving: `spin-wheel.template.ts` (`resolveAudioUrl`)
*   **Data Impact:** Stores URLs or `__THEME_DEFAULT__`/`__NONE__` in `instance.config`.
*   **Impact on Other Components:** 
    *   **Storage:** Impacts `uploads/` directory organization.
    *   **User Experience:** Impacts game atmosphere and feedback.

### 5. Visual Customization (Confetti & Emojis)
*   **Purpose:** Deep branding via color palettes and emoji-based celebratory effects.
*   **Documentation:** [CHANGELOG.md (2026-01-31 - Confetti)](docs/CHANGELOG.md)
*   **Technical Location:**
    *   Admin UI: `ConfigForm.vue` (color-list, emoji-list types)
    *   Game Engine: `spin-wheel.template.ts` (canvas-confetti integration)
*   **Data Impact:** Comma-separated strings in `instance.config`.
*   **Impact on Other Components:** 
    *   **UI Standards:** Aligns with `UI-STANDARDS.md`.

### 6. Member Management System (CRM)
*   **Purpose:** Managing player accounts, points balances, and status (Enable/Disable).
*   **Documentation:** [CHANGELOG.md (2026-02-01 - Member Management)](docs/CHANGELOG.md) | [TROUBLESHOOTING.md#1-会员管理详情页白屏无法加载](docs/TROUBLESHOOTING.md)
*   **Technical Location:**
    *   Backend: `admin-members.controller.ts`, `members.service.ts`
    *   Admin UI: `management/member/index.vue`, `management/member/detail.vue`
*   **Data Impact:** 
    *   `members` table (the source of truth for all players)
    *   `point_transactions` table (if points are adjusted)
*   **Impact on Other Components:** 
    *   **Login:** `isActive` flag can block a member from logging in (Game Rules).
    *   **API Auth:** `ExternalAuthService` uses `MembersService` for player mapping.

---

## 📈 Impact Assessment Matrix

| Change Area | High Impact Components | Data Sensitivity | Documentation to Update |
| :--- | :--- | :--- | :--- |
| **Member Management** | Admin UI, API Auth, Rules | High (User Data) | `PROJECT-MAP.md`, `TROUBLESHOOTING.md` |
| **Schema Changes** | Admin UI, API Seed, Game Engine | High (JSON structure) | `FEATURES.md`, `CODEMAP.md` |
| **Rule Logic** | API Service, Web App UI | Medium (History) | `RULES_IMPLEMENTATION_PLAN.md` |
| **Auth/Multi-tenant** | All (API/Admin/Web) | Critical (Security) | `ARCHITECTURE.md`, `JK-INTEGRATION.md` |
| **Asset Storage** | API Multer, File System | Medium (Disk Space) | `SERVER.md`, `CODEMAP.md` |

---

## 🔗 Quick Reference Links

- 📁 [Project Root](file:///c:/Users/admin/Documents/Google_Antigravity/Minigame_2/Mini_Game/)
- 📄 [Master Index](docs/INDEX.md)
- 📝 [Daily Log](docs/CHANGELOG.md)
- 🛠️ [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- 📋 [Feature Catalog](docs/FEATURES.md)
