# MiniGame Documentation Index

**Last Updated:** 2026-02-01

---

## 🚀 Quick Start

**New developers start here:**
1. [MASTER-GUIDE.md](./MASTER-GUIDE.md) - **READ THIS FIRST!** Complete guide for AI IDE development
2. [WORKFLOW.md](./WORKFLOW.md) - Development & deployment workflow
3. [README.md](./README.md) - Project overview

---

## 📚 Core Documentation

### Essential Reading
- **[MASTER-GUIDE.md](./MASTER-GUIDE.md)** - Complete knowledge package for Antigravity/Cursor
- **[WORKFLOW.md](./WORKFLOW.md)** - DJ + Jarvis workflow (code → deploy)
- **[FEATURES.md](./FEATURES.md)** - Complete feature documentation (76KB!)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture & data flow
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment procedures

### Quick Reference
- **[CODEMAP.md](./CODEMAP.md)** - File location quick reference
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues & solutions
- **[CHANGELOG.md](./CHANGELOG.md)** - Change history

---

## 📖 Feature Documentation

### Implemented Features
- **[FEATURES.md](./FEATURES.md)** - All features (categories, game rules, admin, etc.)

### Future Plans
- **[JK-INTEGRATION.md](./JK-INTEGRATION.md)** - JK backend integration design
- **[TODO.md](./TODO.md)** - Pending tasks

### Implementation Details
- **[RULES_IMPLEMENTATION_PLAN.md](./RULES_IMPLEMENTATION_PLAN.md)** - Game rules system design
- **[OPTION-B-IMPLEMENTATION.md](./OPTION-B-IMPLEMENTATION.md)** - Game status display

---

## 🧪 Testing & Quality

- **[TESTING-PLAN.md](./TESTING-PLAN.md)** - Testing strategy & test cases
- **[TEST-REPORT-2026-02-01.md](./TEST-REPORT-2026-02-01.md)** - Test execution summary
- **[FULL-TEST-RESULTS-2026-02-01.md](./FULL-TEST-RESULTS-2026-02-01.md)** - Detailed test results
- **[RULES_CHECK_REPORT.md](./RULES_CHECK_REPORT.md)** - Game rules validation report

---

## 🎨 Standards & Guidelines

- **[UI-STANDARDS.md](./UI-STANDARDS.md)** - UI/UX design standards
- **AGENTS.md** (in root `clawd/`) - AI agent behavior rules

---

## 🖥️ Infrastructure

- **[SERVER.md](./SERVER.md)** - 1Panel server configuration
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment procedures & commands

---

## 📊 Documentation Map

```
docs/
├── INDEX.md (this file)
│
├── 🚀 Getting Started
│   ├── MASTER-GUIDE.md      ← Start here!
│   ├── WORKFLOW.md          ← How to work with DJ + Jarvis
│   └── README.md            ← Project overview
│
├── 📚 Core Docs
│   ├── ARCHITECTURE.md      ← System design
│   ├── FEATURES.md          ← Feature documentation (MOST IMPORTANT)
│   ├── CODEMAP.md           ← File locations
│   └── CHANGELOG.md         ← Change history
│
├── 🔧 Operational
│   ├── DEPLOYMENT.md        ← How to deploy
│   ├── SERVER.md            ← Server config
│   └── TROUBLESHOOTING.md   ← Problem solving
│
├── 🎯 Feature Design
│   ├── JK-INTEGRATION.md
│   ├── RULES_IMPLEMENTATION_PLAN.md
│   └── OPTION-B-IMPLEMENTATION.md
│
├── 🧪 Testing
│   ├── TESTING-PLAN.md
│   ├── TEST-REPORT-*.md
│   └── FULL-TEST-RESULTS-*.md
│
└── 📏 Standards
    └── UI-STANDARDS.md
```

---

## 🎯 Documentation by Role

### For Developers (DJ using Antigravity)
**Read in this order:**
1. [MASTER-GUIDE.md](./MASTER-GUIDE.md)
2. [WORKFLOW.md](./WORKFLOW.md)
3. [FEATURES.md](./FEATURES.md)
4. [ARCHITECTURE.md](./ARCHITECTURE.md)
5. [CODEMAP.md](./CODEMAP.md)

**Keep handy:**
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [UI-STANDARDS.md](./UI-STANDARDS.md)

### For DevOps (Jarvis deploying)
**Read in this order:**
1. [WORKFLOW.md](./WORKFLOW.md)
2. [DEPLOYMENT.md](./DEPLOYMENT.md)
3. [SERVER.md](./SERVER.md)
4. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

**Keep handy:**
- [CHANGELOG.md](./CHANGELOG.md) - What changed
- [FEATURES.md](./FEATURES.md) - How features work

### For Product Managers
**Read:**
- [README.md](./README.md) - What is this project
- [FEATURES.md](./FEATURES.md) - What can it do
- [JK-INTEGRATION.md](./JK-INTEGRATION.md) - Future plans
- [TODO.md](./TODO.md) - Pending tasks

### For QA/Testers
**Read:**
- [TESTING-PLAN.md](./TESTING-PLAN.md)
- [FEATURES.md](./FEATURES.md)
- Test reports (TEST-REPORT-*.md)

---

## 🔄 Keeping Docs Updated

**When code changes:**
1. ✅ Update [FEATURES.md](./FEATURES.md) if feature changed
2. ✅ Update [CHANGELOG.md](./CHANGELOG.md) always
3. ✅ Update [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) if fixed a bug
4. ✅ Update [CODEMAP.md](./CODEMAP.md) if added new files

**When workflow changes:**
- Update [WORKFLOW.md](./WORKFLOW.md)
- Update [DEPLOYMENT.md](./DEPLOYMENT.md)

**When architecture changes:**
- Update [ARCHITECTURE.md](./ARCHITECTURE.md)
- Update [MASTER-GUIDE.md](./MASTER-GUIDE.md)

---

## 📝 Documentation Standards

### File Naming
- Use UPPERCASE for major docs (README, FEATURES, etc.)
- Use descriptive names (GAME-RULES.md, not RULES.md)
- Use hyphens for multi-word (not underscores)
- Add dates for reports (TEST-REPORT-2026-02-01.md)

### Markdown Format
- Use `#` for main title (h1)
- Use `##` for sections (h2)
- Use `###` for subsections (h3)
- Use code blocks with language hints
- Use tables for structured data
- Use emojis for quick visual cues 📝 🚀 ✅ ❌

### Content Guidelines
- Write for humans (clear, concise)
- Include examples
- Link to related docs
- Update "Last Updated" date
- Add "Status" if applicable

---

## 🔗 External Resources

### Project
- **GitHub:** https://github.com/gh900098/Mini_Game
- **Production Admin:** https://admin.xseo.me
- **Production Game:** https://game.xseo.me

### Technologies
- **NestJS:** https://docs.nestjs.com/
- **Vue 3:** https://vuejs.org/
- **Naive UI:** https://www.naiveui.com/
- **soybean-admin:** https://github.com/soybeanjs/soybean-admin

### Server
- **1Panel:** http://154.26.136.139:62018
- **SSH:** 154.26.136.139

---

## ❓ FAQ

**Q: Which doc should I read first?**  
A: [MASTER-GUIDE.md](./MASTER-GUIDE.md) - it's the complete onboarding guide.

**Q: Where's the code?**  
A: GitHub repo, not in docs folder. Docs are in `docs/`, code is in `apps/`.

**Q: How do I deploy?**  
A: Follow [WORKFLOW.md](./WORKFLOW.md) + [DEPLOYMENT.md](./DEPLOYMENT.md).

**Q: Where are the API endpoints documented?**  
A: In [FEATURES.md](./FEATURES.md) for each feature, or check Swagger (if enabled).

**Q: How do I add a new feature?**  
A: Read [MASTER-GUIDE.md](./MASTER-GUIDE.md) "Common Tasks" section.

**Q: Something broke, what do I do?**  
A: Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) first.

---

## 📞 Support

**Questions about code?**  
→ Read [FEATURES.md](./FEATURES.md) or ask DJ

**Questions about deployment?**  
→ Read [DEPLOYMENT.md](./DEPLOYMENT.md) or ask Jarvis

**Found a doc error?**  
→ Fix it and commit!

---

**Last Updated:** 2026-02-01  
**Maintained by:** DJ + Jarvis  
**Status:** Complete ✅
