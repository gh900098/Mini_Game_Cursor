# MiniGame Development Workflow

**Effective Date:** 2026-02-01  
**Status:** Active

---

## 🎯 Overview

**New Development Model:**
- **DJ** writes code using Google Antigravity (AI IDE similar to Cursor)
- **Jarvis** handles deployment and infrastructure
- **GitHub** is the central source of truth

**Why this change:**
1. ✅ More cost-effective (Antigravity more efficient than Jarvis for coding)
2. ✅ Better code quality (DJ has direct control)
3. ✅ Faster iteration (no token limits for code generation)
4. ✅ Jarvis focuses on what he's good at (deployment, status checks)

---

## 👥 Roles & Responsibilities

### DJ's Responsibilities
1. **Code Development**
   - Write all code using Google Antigravity
   - Follow project standards (see MASTER-GUIDE.md)
   - Test locally before committing
   - Write clear commit messages

2. **Documentation**
   - Update relevant docs when changing features
   - Keep CHANGELOG.md current
   - Add to TROUBLESHOOTING.md when solving bugs

3. **Git Management**
   - Commit and push to GitHub main branch
   - Keep commit history clean

### Jarvis's Responsibilities
1. **Deployment**
   - Pull latest code from GitHub
   - Build and restart services
   - Verify deployment success
   - Monitor logs for errors

2. **Status Monitoring**
   - Check service health
   - Review logs when asked
   - Report issues

3. **Code Review (when asked)**
   - Read current implementation
   - Explain how features work
   - Suggest based on documentation

4. **Documentation Maintenance**
   - Keep docs in sync (when DJ forgets)
   - Update deployment logs
   - Maintain TROUBLESHOOTING.md

---

## 🔄 Standard Workflows

### Workflow 1: New Feature Development

**Step 1: DJ Develops**
```bash
# In Antigravity workspace
cd ~/antigravity-workspace/Mini_Game

# Ask Antigravity to implement feature
# (Antigravity reads FEATURES.md, implements code)

# Test locally
pnpm dev  # or npm run dev

# Commit
git add -A
git commit -m "feat: new feature description"
git push origin main
```

**Step 2: DJ Asks Jarvis to Deploy**
```
DJ: "Deploy the new feature to production"
```

**Step 3: Jarvis Deploys**
```bash
# Jarvis executes:
ssh root@154.26.136.139 "cd /opt/minigame && \
  git pull origin main && \
  docker compose -f docker-compose.prod.yml build <service> && \
  docker compose -f docker-compose.prod.yml up -d <service>"

# Jarvis reports:
"✅ Deployed! <service> rebuilt and restarted.
 Check: https://<url>"
```

**Step 4: DJ Tests Production**
- Visit production URL
- Test the feature
- Check if everything works

### Workflow 2: Bug Fix

**Step 1: DJ Identifies Bug**
```
DJ: "There's a bug in member credit adjustment"
```

**Step 2: Jarvis Checks Status (if needed)**
```bash
# Jarvis reviews:
- Current code implementation
- Recent changes (git log)
- Service logs

Jarvis: "I see in FEATURES.md that credit adjustment..."
```

**Step 3: DJ Fixes with Antigravity**
```bash
# Fix the bug
# Test locally
git commit -m "fix: member credit adjustment bug"
git push origin main
```

**Step 4: Deploy**
```
DJ: "Deploy the fix"
Jarvis: (executes deployment)
```

### Workflow 3: Emergency Hotfix

**If production is broken:**

```
DJ: "API is down, check logs"

Jarvis: (checks logs immediately)
"Error: Database connection failed
Last log: [error message]"

DJ: (fixes in Antigravity)
DJ: "Deploy immediately"

Jarvis: (fast-track deploy, no rebuild if possible)
"✅ Deployed! Service restarted."
```

### Workflow 4: Documentation Update Only

**No deployment needed:**

```bash
# DJ updates docs
git commit -m "docs: update FEATURES.md with new field"
git push origin main
```

**No need to tell Jarvis unless you want docs synced to server.**

---

## 📝 Commit Message Standards

### Format
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting (no code logic change)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance, dependencies
- `perf` - Performance improvement

### Examples
```bash
# Good commit messages:
git commit -m "feat(admin): add member management UI"
git commit -m "fix(api): resolve credit transaction race condition"
git commit -m "docs: update DEPLOYMENT.md with new workflow"
git commit -m "refactor(game-rules): simplify validation logic"

# Bad commit messages (avoid):
git commit -m "update"
git commit -m "fix bug"
git commit -m "changes"
```

---

## 🚀 Deployment Commands Reference

### Full Rebuild & Restart
```bash
ssh root@154.26.136.139 "cd /opt/minigame && \
  git pull origin main && \
  docker compose -f docker-compose.prod.yml build <service> && \
  docker compose -f docker-compose.prod.yml up -d <service>"
```

**When to use:** Code changes, dependency updates, Dockerfile changes

### Quick Restart (no rebuild)
```bash
ssh root@154.26.136.139 "cd /opt/minigame && \
  git pull origin main && \
  docker compose -f docker-compose.prod.yml restart <service>"
```

**When to use:** Config changes only, environment variable updates

### Service Options
- `api` - Backend API
- `admin` - Admin panel (soybean-admin)
- `web-app` - Player UI

### All Services at Once
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**Use with caution!** Usually better to update one service at a time.

---

## 🔍 Status Check Commands

### Check Running Services
```bash
ssh root@154.26.136.139 "docker ps | grep minigame"
```

### Check Logs
```bash
# Last 50 lines
ssh root@154.26.136.139 "docker logs minigame-api --tail 50"

# Follow logs (real-time)
ssh root@154.26.136.139 "docker logs minigame-api -f"

# Logs with timestamps
ssh root@154.26.136.139 "docker logs minigame-api --timestamps"
```

### Check Git Status
```bash
ssh root@154.26.136.139 "cd /opt/minigame && git status && git log -5 --oneline"
```

---

## 🎓 Best Practices

### For DJ (Using Antigravity)

1. **Before starting work:**
   ```bash
   git pull origin main  # Get latest
   ```

2. **Read documentation first:**
   - Check FEATURES.md for existing implementation
   - Check TROUBLESHOOTING.md for known issues
   - Check CHANGELOG.md for recent changes

3. **Ask Antigravity to read context:**
   ```
   "Read FEATURES.md section on game rules, then implement..."
   "Following the i18n pattern in admin panel, add..."
   ```

4. **Test locally before committing:**
   ```bash
   pnpm dev  # Start dev server
   # Test the feature
   # Check console for errors
   ```

5. **Write clear commits:**
   - What changed
   - Why it changed
   - What impact it has

6. **Update docs:**
   - FEATURES.md - if feature changed
   - CHANGELOG.md - always
   - TROUBLESHOOTING.md - if fixed a bug

### For Jarvis (Deployment)

1. **Always verify before acting:**
   ```bash
   # Check current status first
   docker ps
   git log -1
   ```

2. **Build with no-cache if dependency changed:**
   ```bash
   docker compose build --no-cache <service>
   ```

3. **Check logs after deployment:**
   ```bash
   docker logs <container> --tail 100
   ```

4. **Report status clearly:**
   ```
   ✅ Deployment successful
   - Service: admin
   - Commit: feat(admin): add member UI
   - Status: Running
   - URL: https://admin.xseo.me
   - Logs: No errors
   ```

5. **Update deployment docs if new issues found:**
   - Add to TROUBLESHOOTING.md
   - Update DEPLOYMENT.md if workflow changed

---

## 🚨 Emergency Procedures

### Production Down

1. **Immediate Response (Jarvis):**
   ```bash
   # Check service status
   docker ps
   
   # Check logs
   docker logs <container> --tail 100
   
   # Quick restart
   docker compose -f docker-compose.prod.yml restart <service>
   ```

2. **If restart doesn't work:**
   ```bash
   # Rebuild
   docker compose -f docker-compose.prod.yml build <service>
   docker compose -f docker-compose.prod.yml up -d <service>
   ```

3. **If still broken:**
   ```bash
   # Rollback to previous commit
   cd /opt/minigame
   git log -5 --oneline  # Find last working commit
   git reset --hard <commit-hash>
   docker compose -f docker-compose.prod.yml up -d --build
   ```

### Database Issue

1. **Check database health:**
   ```bash
   docker exec minigame-postgres pg_isready
   ```

2. **Check database logs:**
   ```bash
   docker logs minigame-postgres --tail 100
   ```

3. **If database is down:**
   ```bash
   docker compose -f docker-compose.prod.yml restart postgres
   ```

### Out of Disk Space

1. **Check disk usage:**
   ```bash
   df -h
   ```

2. **Clean Docker:**
   ```bash
   docker system prune -a --volumes
   ```

3. **Check logs size:**
   ```bash
   docker logs <container> 2>&1 | wc -l
   ```

---

## 📊 Monitoring & Logging

### Daily Health Checks

**What Jarvis should check (if asked):**
1. All services running: `docker ps`
2. No error spikes in logs
3. Database healthy: `pg_isready`
4. Redis healthy: `redis-cli ping`
5. URLs accessible (200 OK)

### Log Rotation

**Docker logs auto-rotate, but monitor size:**
```bash
# Check container log sizes
docker inspect --format='{{.LogPath}}' <container> | xargs ls -lh
```

### Metrics to Track

- API response times
- Database connection pool
- Memory usage per container
- Disk space available

**Note:** Detailed monitoring system to be implemented later.

---

## 🔗 Quick Links

### Documentation
- [MASTER-GUIDE.md](./MASTER-GUIDE.md) - Complete guide for AI IDEs
- [README.md](./README.md) - Project overview
- [FEATURES.md](./FEATURES.md) - Feature documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

### Production URLs
- Admin: https://admin.xseo.me
- Web App: https://game.xseo.me
- API: https://game.xseo.me/api

### Repository
- GitHub: https://github.com/gh900098/Mini_Game

### Server
- IP: 154.26.136.139
- 1Panel: http://154.26.136.139:62018
- SSH: `ssh root@154.26.136.139`

---

## ✅ Workflow Checklist

### Before Starting Work (DJ)
- [ ] `git pull origin main`
- [ ] Read relevant documentation
- [ ] Understand current implementation

### Before Committing (DJ)
- [ ] Code compiles
- [ ] Tests pass (if applicable)
- [ ] Documentation updated
- [ ] Clear commit message written

### Before Deploying (Jarvis)
- [ ] Check current service status
- [ ] Verify GitHub has latest code
- [ ] Know which service to rebuild

### After Deploying (Jarvis)
- [ ] Verify service restarted
- [ ] Check logs for errors
- [ ] Test production URL
- [ ] Report status to DJ

---

## 🔄 Continuous Improvement

**This workflow will evolve!**

If you find:
- Repetitive steps → Automate
- Unclear instructions → Update this doc
- New issues → Add to TROUBLESHOOTING.md
- Better practices → Update MASTER-GUIDE.md

**Update this document as the workflow improves.**

---

**Last Updated:** 2026-02-01  
**Version:** 1.0.0  
**Status:** Active ✅
