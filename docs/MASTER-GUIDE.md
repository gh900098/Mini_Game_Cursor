# MiniGame Master Guide for AI IDE (Antigravity/Cursor)

**Last Updated:** 2026-02-01  
**Purpose:** Complete knowledge package for AI-assisted development

---

## 🎯 Quick Start

**This is a complete game platform with:**
- Multi-tenant game instance management
- Member system with game rules (cooldowns, limits, VIP tiers)
- Admin panel (soybean-admin)
- Web app (player-facing game UI)
- API backend (NestJS)

**Tech Stack:**
- Backend: NestJS + TypeScript + PostgreSQL + Redis
- Admin: Vue 3 + TypeScript + Naive UI + soybean-admin
- Web App: Vue 3 + TypeScript + Vite
- Deployment: Docker Compose on 1Panel (OpenResty reverse proxy)

**Important Files to Read FIRST:**
1. [README.md](./README.md) - Project overview
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
3. [FEATURES.md](./FEATURES.md) - Complete feature documentation (70+ KB!)
4. [DEPLOYMENT.md](./DEPLOYMENT.md) - Deploy workflow
5. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

---

## 📁 Project Structure

```
MiniGame/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules
│   │   │   ├── common/   # Shared code
│   │   │   └── main.ts
│   │   └── Dockerfile.api
│   ├── soybean-admin/    # Admin panel (Vue 3 + soybean)
│   │   ├── src/
│   │   │   ├── views/    # Pages
│   │   │   ├── service/  # API calls
│   │   │   └── router/   # elegant-router
│   │   └── Dockerfile.admin
│   └── web-app/          # Player game UI (Vue 3)
│       ├── src/
│       │   ├── views/    # Game pages
│       │   └── templates/ # Game templates
│       └── Dockerfile.webapp
├── docker-compose.prod.yml  # Production compose
└── docs/                     # (if exists)
```

**See [CODEMAP.md](./CODEMAP.md) for detailed file locations.**

---

## 🔧 Development Setup

### Prerequisites
- Node.js 20+
- pnpm (corepack enabled)
- Docker & Docker Compose
- PostgreSQL 15 (or use Docker)
- Redis 7 (or use Docker)

### Local Development
```bash
# Install dependencies
pnpm install

# Start backend API (dev mode)
cd apps/api
pnpm dev

# Start admin panel (dev mode)
cd apps/soybean-admin
pnpm dev

# Start web app (dev mode)
cd apps/web-app
pnpm dev
```

### Environment Variables
Copy `.env.example` to `.env` in each app folder and configure.

**Key variables:**
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - Auth secret
- `VITE_API_URL` - Frontend API endpoint

---

## 🚀 Deployment Workflow (NEW)

**With DJ using Antigravity for code:**

### 1. DJ Develops with Antigravity
```bash
# Clone repo
git clone https://github.com/gh900098/Mini_Game.git
cd Mini_Game

# Make changes with Antigravity...

# Commit & push
git add -A
git commit -m "feat: description"
git push origin main
```

### 2. Jarvis Deploys to Server
DJ tells Jarvis: "Deploy the latest code"

Jarvis does:
```bash
# Pull from GitHub
ssh root@154.26.136.139 "cd /opt/minigame && git pull origin main"

# Rebuild & restart (if needed)
ssh root@154.26.136.139 "cd /opt/minigame && \
  docker compose -f docker-compose.prod.yml build <service> && \
  docker compose -f docker-compose.prod.yml up -d <service>"
```

**Services:**
- `api` - Backend API
- `admin` - Admin panel
- `web-app` - Player UI

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.**

---

## 📚 Key Documentation Files

### Core Docs (READ THESE)
- **README.md** - Project overview, quick links
- **ARCHITECTURE.md** - System architecture, data flow
- **FEATURES.md** - Complete feature documentation (MOST IMPORTANT!)
- **CODEMAP.md** - File location quick reference

### Operational Docs
- **DEPLOYMENT.md** - Deploy workflow, commands, troubleshooting
- **SERVER.md** - 1Panel server config, OpenResty setup
- **TROUBLESHOOTING.md** - Common issues + solutions

### Feature Design Docs
- **JK-INTEGRATION.md** - Future JK backend integration plan
- **RULES_IMPLEMENTATION_PLAN.md** - Game rules system design
- **OPTION-B-IMPLEMENTATION.md** - Game status display implementation

### Testing & Maintenance
- **TESTING-PLAN.md** - Complete testing strategy
- **TEST-REPORT-*.md** - Test execution reports
- **FULL-TEST-RESULTS-*.md** - Detailed test results
- **CHANGELOG.md** - Change history

### Standards & Guidelines
- **UI-STANDARDS.md** - UI/UX design standards
- **TODO.md** - Pending tasks

---

## 🎮 Game Rules System

**One of the most complex features!** Must read before modifying:

**Documentation:**
- [FEATURES.md#Game-Rules-System](./FEATURES.md#Game-Rules-System)
- [RULES_IMPLEMENTATION_PLAN.md](./RULES_IMPLEMENTATION_PLAN.md)

**Key Rules:**
1. **dailyLimit** - Daily play limit (with VIP bonus)
2. **cooldown** - Wait time between plays
3. **oneTimeOnly** - Lifetime one-time play
4. **timeLimitConfig** - Active time windows
5. **minLevel** - Level requirement
6. **budgetConfig** - Budget tracking
7. **dynamicProbConfig** - Dynamic win probability
8. **vipTiers** - VIP multipliers

**Implementation:**
- Backend: `apps/api/src/modules/game-rules/game-rules.service.ts`
- Frontend: `apps/web-app/src/views/game/index.vue`
- Status display: Option A (admin) + Option B (player UI)

---

## 🛠️ Common Tasks

### Adding a New Game Instance Field

1. **Backend:**
   - Update `GameInstance` entity
   - Update DTO validation
   - Migration (if DB schema change)

2. **Admin Panel:**
   - Update type definitions (`typings/api/management.d.ts`)
   - Update ConfigForm component
   - Add i18n keys (zh-cn.ts + en-us.ts)

3. **Frontend:**
   - Update game template if field affects gameplay

4. **Documentation:**
   - Update FEATURES.md
   - Update CHANGELOG.md

**Example commits to reference:**
- Search `git log --grep="feat:"` for examples

### Fixing a Build Error

1. Check build logs: `docker logs <container>`
2. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Common issues:
   - Port conflicts (check 1Panel services)
   - Environment variables missing
   - Database migration not run
   - Redis connection failed

### Adding a New Admin Page

**soybean-admin uses elegant-router:**

1. Create Vue file: `apps/soybean-admin/src/views/management/<name>/index.vue`
2. Add route: `apps/soybean-admin/src/router/elegant/routes.ts`
3. Add import: `apps/soybean-admin/src/router/elegant/imports.ts`
4. Add i18n: `apps/soybean-admin/src/locales/langs/zh-cn.ts`

**Important:** Use `lang="tsx"` if using JSX syntax!

---

## 🚨 Critical Rules (MUST FOLLOW)

### 1. Complete Solutions Only
**Never half-baked implementations!**

❌ Wrong: Fix UI → Deploy → Fix backend → Deploy again  
✅ Right: Analyze all affected code → Fix everything → Deploy once

**See [AGENTS.md](../AGENTS.md) Rule #1 for details.**

### 2. Update Documentation Immediately
**After any code change:**
- Update FEATURES.md (if feature changed)
- Update CHANGELOG.md (always)
- Update TROUBLESHOOTING.md (if solved a bug)

**DJ's rule:** "Project must ALWAYS have latest updates!"

### 3. i18n Rule (Strict!)
**Any new UI text:**
- ✅ Use i18n keys: `$t('path.to.key')`
- ✅ Add to both zh-cn.ts and en-us.ts
- ❌ Never hard-code text in components

### 4. User-Centric Thinking
**Before implementing:**
- Think: "Will users be confused?"
- Consider complete interaction flow
- Test all edge cases
- Design for actual use, not just "it works"

### 5. UI/UX Pro Max Framework (Global)
**Apply to ALL projects (current + future):**
- 67 UI styles - Choose appropriate for context
- 96 color palettes - Industry-specific
- 57 font pairings - Mood-based
- Pre-delivery checklist - Mandatory
- Anti-patterns to avoid

**See [AGENTS.md](../AGENTS.md) for complete framework.**

---

## 🧪 Testing

**Before deploying:**
1. Run local tests (if available)
2. Check TypeScript compilation
3. Test critical user flows manually
4. Review TESTING-PLAN.md for feature-specific tests

**After deploying:**
1. Test on production URL
2. Check logs for errors
3. Verify database changes (if any)
4. Update TEST-REPORT if major feature

---

## 📝 Git Workflow

### Commit Message Format
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, no logic change)
- `refactor` - Code refactor
- `test` - Adding tests
- `chore` - Maintenance

**Example:**
```
feat(admin): Add member management UI

- Created member list page with actions
- Added member detail page with tabs
- Integrated with AdminMembersController API

Closes #123
```

### Branch Strategy
**Main branch:** `main` (production-ready)

For now, commit directly to `main` since DJ is solo developer.  
If team grows, consider feature branches.

---

## 🔗 Important URLs

**Production:**
- Admin: https://admin.xseo.me
- Web App: https://game.xseo.me
- API: https://game.xseo.me/api (via OpenResty proxy)

**Repository:**
- GitHub: https://github.com/gh900098/Mini_Game

**Server:**
- IP: 154.26.136.139
- 1Panel: http://154.26.136.139:62018
- SSH: `ssh root@154.26.136.139`

---

## 💡 Tips for AI IDEs

### When Using Antigravity/Cursor

**Ask the AI to:**
1. Read FEATURES.md before modifying any feature
2. Check TROUBLESHOOTING.md before creating similar code patterns
3. Follow i18n rules strictly (never hard-code text)
4. Update documentation in same commit as code

**Good prompts:**
- "Read FEATURES.md section on game rules, then help me add..."
- "Following the pattern in TROUBLESHOOTING.md case #3..."
- "Update both code and FEATURES.md for this change"

**Avoid:**
- "Just fix this quickly" (leads to incomplete solutions)
- Making changes without reading documentation first
- Forgetting to update i18n files

---

## 🆘 When You're Stuck

1. **Check Documentation:**
   - TROUBLESHOOTING.md - Known issues
   - FEATURES.md - How features work
   - CHANGELOG.md - Recent changes

2. **Check Logs:**
   ```bash
   # API logs
   docker logs minigame-api --tail 100
   
   # Admin logs
   docker logs minigame-admin --tail 100
   
   # Web app logs
   docker logs minigame-webapp --tail 100
   ```

3. **Check Recent Commits:**
   ```bash
   git log -20 --oneline
   git show <commit-hash>
   ```

4. **Ask Jarvis:**
   DJ can ask me to check current code state, review logs, or explain how something works.

---

## 📋 Checklist Before Pushing

- [ ] Code compiles without errors
- [ ] TypeScript types correct
- [ ] i18n keys added (zh-cn + en-us)
- [ ] Documentation updated
- [ ] Commit message clear
- [ ] No debug console.logs left
- [ ] Tested locally (if possible)

---

## 🎓 Learning Resources

**Vue 3:**
- https://vuejs.org/guide/
- Composition API is used throughout

**NestJS:**
- https://docs.nestjs.com/
- Modular architecture, dependency injection

**soybean-admin:**
- https://github.com/soybeanjs/soybean-admin
- elegant-router for routing

**Naive UI:**
- https://www.naiveui.com/
- Component library for admin panel

---

## 🤝 Working with Jarvis

**Jarvis's New Role:**
- ✅ Deploy code from GitHub to server
- ✅ Check current code state
- ✅ Review logs for errors
- ✅ Maintain documentation
- ❌ No longer writes code directly

**How to Work Together:**

1. **DJ develops with Antigravity:**
   ```
   DJ: (makes changes in Antigravity)
   DJ: (commits & pushes to GitHub)
   ```

2. **DJ asks Jarvis to deploy:**
   ```
   DJ: "Deploy the latest code"
   Jarvis: (pulls from GitHub, rebuilds, restarts)
   ```

3. **DJ asks for status check:**
   ```
   DJ: "Check if API is running"
   Jarvis: (checks docker ps, logs, reports)
   ```

4. **DJ asks about code:**
   ```
   DJ: "What's the current game rules implementation?"
   Jarvis: (reads FEATURES.md, reports)
   ```

**This workflow is CHEAPER and MORE EFFICIENT!** 🎯

---

## 📞 Contact

**Project Owner:** DJ  
**Repository:** https://github.com/gh900098/Mini_Game  
**Server:** 154.26.136.139 (1Panel managed)

---

**Last Updated:** 2026-02-01  
**Version:** 1.0.0  
**Status:** Production Ready ✅
