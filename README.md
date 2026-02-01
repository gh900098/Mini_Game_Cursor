# MiniGame Platform

A multi-tenant game platform with comprehensive game rules, member management, and analytics.

---

## 🚀 Quick Start

**For Developers (using Antigravity/Cursor):**
1. Read [docs/MASTER-GUIDE.md](./docs/MASTER-GUIDE.md)
2. Read [docs/WORKFLOW.md](./docs/WORKFLOW.md)
3. Clone this repo and start coding!

**For Deployment:**
- See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

**All Documentation:**
- See [docs/INDEX.md](./docs/INDEX.md)

---

## 📚 Documentation

**Complete documentation is in the `docs/` folder.**

**Start here:**
- [docs/MASTER-GUIDE.md](./docs/MASTER-GUIDE.md) - Complete guide for AI IDE development
- [docs/WORKFLOW.md](./docs/WORKFLOW.md) - Development & deployment workflow
- [docs/FEATURES.md](./docs/FEATURES.md) - Feature documentation
- [docs/INDEX.md](./docs/INDEX.md) - Full documentation index

---

## 🏗️ Architecture

```
MiniGame/
├── apps/
│   ├── api/              # NestJS Backend
│   ├── soybean-admin/    # Admin Panel (Vue 3)
│   └── web-app/          # Player UI (Vue 3)
├── docs/                 # All documentation
└── docker-compose.prod.yml
```

**Tech Stack:**
- Backend: NestJS + TypeScript + PostgreSQL + Redis
- Admin: Vue 3 + Naive UI + soybean-admin
- Web App: Vue 3 + Vite
- Deployment: Docker Compose on 1Panel

---

## 🔗 Links

**Production:**
- Admin: https://admin.xseo.me
- Web App: https://game.xseo.me
- API: https://game.xseo.me/api

**Repository:**
- GitHub: https://github.com/gh900098/Mini_Game

**Server:**
- IP: 154.26.136.139
- 1Panel: http://154.26.136.139:62018

---

## 🎯 Features

- ✅ Multi-tenant game instances
- ✅ Game rules system (daily limits, cooldowns, VIP tiers)
- ✅ Member management & analytics
- ✅ Admin panel with comprehensive controls
- ✅ Real-time game status display
- ✅ Credit/points system with audit logs
- ✅ Time-based restrictions
- ✅ Budget tracking

**Full feature list:** [docs/FEATURES.md](./docs/FEATURES.md)

---

## 🚀 Development

### Prerequisites
- Node.js 20+
- pnpm
- Docker & Docker Compose

### Local Setup
```bash
# Install dependencies
pnpm install

# Start services
cd apps/api && pnpm dev        # Backend
cd apps/soybean-admin && pnpm dev  # Admin
cd apps/web-app && pnpm dev    # Web app
```

### Deployment
```bash
# On production server
cd /opt/minigame
git pull origin main
docker compose -f docker-compose.prod.yml build <service>
docker compose -f docker-compose.prod.yml up -d <service>
```

**Full deployment guide:** [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## 📝 Workflow

**DJ develops with Antigravity → Commits to GitHub → Jarvis deploys to server**

See [docs/WORKFLOW.md](./docs/WORKFLOW.md) for complete workflow.

---

## 📖 Documentation

All documentation is in the `docs/` folder:

- **Getting Started:** MASTER-GUIDE.md, WORKFLOW.md
- **Architecture:** ARCHITECTURE.md, CODEMAP.md
- **Features:** FEATURES.md (76KB of detailed docs!)
- **Operations:** DEPLOYMENT.md, TROUBLESHOOTING.md
- **Testing:** TESTING-PLAN.md, test reports
- **Standards:** UI-STANDARDS.md

**Full index:** [docs/INDEX.md](./docs/INDEX.md)

---

## 🤝 Contributing

This is a private project. For questions or issues, contact DJ.

---

## 📄 License

Private - All Rights Reserved

---

**Last Updated:** 2026-02-01  
**Status:** Production Ready ✅
