# MiniGame Deployment Guide

Complete deployment flows and common commands 🚀

---

## 🏗️ Architecture Overview (Must Read! Never Forget!)

**Correct Server Architecture:**
```
External traffic → OpenResty (1Panel, port 80/443) → Docker containers (Internal ports)
```

**Key Principles:**
1. ✅ **1Panel's OpenResty is the ONLY reverse proxy** (port 80/443)
2. ✅ **Docker containers ONLY expose internal ports** (127.0.0.1:3100, 3101, 3102)
3. ❌ **docker-compose.prod.yml should NOT have an nginx service** — it will conflict on port 80!
4. ✅ **All domain reverse proxies are configured in the 1Panel Web UI**

**Container Port Mapping:**
- minigame-api: 127.0.0.1:3100:3000
- minigame-admin: 127.0.0.1:3101:80
- minigame-webapp: 127.0.0.1:3102:80

**OpenResty Reverse Proxy:**
- admin.xseo.me → http://127.0.0.1:3101 + /api → http://127.0.0.1:3100
- game.xseo.me → http://127.0.0.1:3102 + /api → http://127.0.0.1:3100

**Detailed Architecture:** Refer to [SERVER.md](./SERVER.md)

---

## 🚀 Complete Deployment Flow (Important!)

### Step 1: Local Development and Modification
```bash
cd ~/Documents/MiniGame
# ... Edit code ...
```

### Step 2: Commit and Push to GitHub
```bash
cd ~/Documents/MiniGame && \
git add -A && \
git commit -m "Description of changes" && \
git push origin main
```

### Step 3: Deploy to Server

**Standard Update (Code changes):**
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml up -d --force-recreate"
```

**Using the deploy script (Simple pull):**
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "/opt/minigame/deploy.sh"
```

**⚠️ Rebuild required (Modified Dockerfile or dependencies):**
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml build --no-cache <service> && \
   docker compose -f docker-compose.prod.yml up -d"
```
Replace `<service>` with: `api`, `admin`, or `web-app`

---

## 📋 Common Commands

### Check Status
```bash
# Check all MiniGame containers
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker ps | grep minigame"

# Check specific service status
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker ps -f name=minigame-api"
```

### View Logs
```bash
# API logs (last 50 lines)
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-api --tail 50"

# Admin logs
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-admin --tail 50"

# Web App logs
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-webapp --tail 50"

# Real-time log tracking
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-api -f"
```

### Restart Services
```bash
# Restart API
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker restart minigame-api"

# Restart Admin Panel
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker restart minigame-admin"

# Restart Web App
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker restart minigame-webapp"

# Restart all MiniGame services
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && docker compose -f docker-compose.prod.yml restart"
```

### Enter Containers
```bash
# Enter API container
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker exec -it minigame-api sh"

# Enter PostgreSQL container
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker exec -it minigame-postgres psql -U minigame_user -d minigame_db"

# Enter Redis container
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker exec -it minigame-redis redis-cli"
```

### Test Interfaces
```bash
# Test API health check
curl -s http://api.xseo.me/api | head -c 100

# Test login interface
curl -s -X POST http://admin.xseo.me/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"super@admin.com","password":"Demo@12345"}' | head -c 200

# Test Admin Panel accessibility
curl -I https://admin.xseo.me

# Test Game Web App accessibility
curl -I https://game.xseo.me
```

---

## 🔧 Maintenance Commands

### Cleanup and Optimization
```bash
# Clean up unused Docker images
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker image prune -f"

# Clean up unused containers
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker container prune -f"

# View Docker disk usage
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker system df"
```

### Database Operations
```bash
# Backup database
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "docker exec minigame-postgres pg_dump -U minigame_user minigame_db > /opt/minigame_backup/db_$(date +%Y%m%d_%H%M%S).sql"

# Check database connections
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "docker exec minigame-postgres psql -U minigame_user -d minigame_db -c 'SELECT count(*) FROM pg_stat_activity;'"
```

### Network Checks
```bash
# Inspect Docker network
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker network inspect minigame_default"

# Test inter-container connection (ping postgres from API container)
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "docker exec minigame-api ping -c 3 minigame-postgres"
```

---

## 🆘 Troubleshooting Steps

Check in order:

1. **Are Docker services running?**
   ```bash
   sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker ps | grep minigame"
   ```

2. **Is port mapping correct?**
   ```bash
   sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker port minigame-api"
   ```

3. **Are there errors in the logs?**
   ```bash
   sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-api --tail 100"
   ```

4. **Is the database connection normal?**
   ```bash
   sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
     "docker exec minigame-api cat .env.production | grep DATABASE_URL"
   ```

5. **Is OpenResty configuration correct?**
   ```bash
   sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
     "cat /opt/1panel/apps/openresty/openresty/conf/conf.d/api.xseo.me.conf"
   ```

6. **Does Cloudflare DNS point to the correct IP?**
   ```bash
   nslookup api.xseo.me
   # Should display 154.26.136.139
   ```

7. **Is the SSL certificate valid?**
   ```bash
   curl -vI https://api.xseo.me 2>&1 | grep -i "ssl\|certificate"
   ```

---

## 📝 Notes

- **Backup Path:** `/opt/minigame_backup/`
- **Upload Archive:** `/opt/minigame_new.tar.gz`
- **Production Config:** `.env.production` (at the project root)
- **Docker Compose:** `docker-compose.prod.yml`

Need server configuration details? See [SERVER.md](./SERVER.md)

---

## 🔄 Rebuild a Single Service

**Purpose:** Use when updating code (like translation files) and the image needs to be rebuilt.

**Commands:**
```bash
# SSH to server
sshpass -p '<password>' ssh root@154.26.136.139

# Go to project directory
cd /opt/minigame

# Rebuild admin (or another service)
docker compose -f docker-compose.prod.yml down admin
docker compose -f docker-compose.prod.yml build --no-cache admin
docker compose -f docker-compose.prod.yml up -d admin
```

**Important:**
- ⚠️ Simply `restart` a container will NOT include code updates!
- ✅ You must `build --no-cache` for recompilation to occur.
- 📝 Service names: `admin`, `api`, `web-app` (NOT the container names).
- 📂 Correct compose file: `docker-compose.prod.yml`

**One-click rebuild script:**
```bash
./scripts/rebuild-service.sh admin
```
