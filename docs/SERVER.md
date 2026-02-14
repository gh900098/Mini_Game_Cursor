# MiniGame Server Configuration

1Panel server configuration and architecture details 🖥️

---

## 🏗️ Server Architecture (Important! Must Read)

**Correct Architecture (Do not forget!):**

```
External traffic (Internet)
      ↓
[Port 80/443] OpenResty (1Panel Nginx)
      ├─→ admin.xseo.me → http://127.0.0.1:3101 (Admin Panel)
      ├─→ game.xseo.me  → http://127.0.0.1:3102 (Game Frontend)
      └─→ /api          → http://127.0.0.1:3100 (Backend API)
            ↓
      Docker Containers:
      ├─ minigame-admin  (port 3101)
      ├─ minigame-webapp (port 3102)
      ├─ minigame-api    (port 3100)
      ├─ minigame-postgres (internal only)
      └─ minigame-redis    (internal only)
```

**Key Principles (Never Forget!):**
1. ✅ **1Panel's OpenResty is already on port 80/443** — This is the only frontend reverse proxy.
2. ✅ **Docker containers ONLY need to expose internal ports** (127.0.0.1:3100, 3101, 3102).
3. ❌ **No nginx container is needed in docker-compose** — It will conflict on port 80!
4. ✅ **All domains are configured via 1Panel → Website Management → Reverse Proxy.**

**Why not use docker nginx:**
- Because 1Panel already provides OpenResty (nginx).
- We manage reverse proxy configurations through the 1Panel Web UI.
- Simpler, more unified, and no port conflicts.

---

## 🖥️ Server Information

- **IP:** 154.26.136.139
- **Username:** root
- **Password:** `Abcd01923` *(encrypted in DEPLOYMENT.md, use sshpass)*
- **OS:** Ubuntu 24.04.3 LTS
- **Docker:** v29.1.3 ✅
- **RAM:** 23GB (20GB available)
- **Hostname:** vmi2991856

**SSH Connection:**
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139
```

### 🔐 1Panel Management Panel
- **Panel URL:** https://154.26.136.139:36699
- **Username:** *(see DEPLOYMENT.md)*
- **Password:** *(see DEPLOYMENT.md)*
- **Purpose:** Manage Docker, OpenResty, SSL certificates, databases, etc.

---

## 📂 Directory Structure

```
/opt/minigame/                    # Main project directory (Git repo)
├── apps/
│   ├── api/                      # NestJS Backend API
│   ├── soybean-admin/            # Vue 3 Admin Panel
│   └── web-app/                  # Vue 3 Player Web App
├── docker-compose.prod.yml       # Docker Compose configuration (No nginx!)
├── Dockerfile.api                # API Dockerfile
├── Dockerfile.admin              # Admin Dockerfile
├── Dockerfile.webapp             # WebApp Dockerfile
├── .env                          # Environment variables
└── deploy.sh                     # Quick deployment script

/opt/1panel/www/conf.d/           # OpenResty reverse proxy configuration
├── admin.xseo.me.conf            # Admin reverse proxy
├── api.xseo.me.conf              # API reverse proxy (Deprecated?)
└── game.xseo.me.conf             # Game reverse proxy

Docker Volumes:
├── postgres_data                 # PostgreSQL data persistence
└── api_uploads                   # API upload file storage
```

---

## 🐳 Docker Services

### Backend API
- **Container:** `minigame-api`
- **Build:** `Dockerfile.api`
- **Port:** 127.0.0.1:3100:3000 (Internal port 3000 mapped to external 3100)
- **Environment:** 
  - NODE_ENV=production
  - DB_HOST=postgres
  - REDIS_HOST=redis
  - CORS_ORIGINS=https://admin.xseo.me,https://game.xseo.me
- **Depends on:** postgres, redis
- **Health check:** postgres & redis must be healthy

### Admin Panel
- **Container:** `minigame-admin`
- **Build:** `Dockerfile.admin` (Nginx + built Vue SPA)
- **Port:** 127.0.0.1:3101:80
- **Build Args:** VITE_API_URL=/api
- **Depends on:** api

### Game Frontend (Web App)
- **Container:** `minigame-webapp`
- **Build:** `Dockerfile.webapp` (Nginx + built Vue SPA)
- **Port:** 127.0.0.1:3102:80
- **Build Args:** VITE_API_URL=/api
- **Depends on:** api

### PostgreSQL
- **Container:** `minigame-postgres`
- **Image:** postgres:15-alpine
- **Port:** Internal only (5432 not exposed externally)
- **Database:** `minigame`
- **User:** `postgres`
- **Password:** Read from .env
- **Volume:** `postgres_data:/var/lib/postgresql/data`

### Redis
- **Container:** `minigame-redis`
- **Image:** redis:7-alpine
- **Port:** Internal only (6379 not exposed externally)
- **Health check:** redis-cli ping

---

## 🌐 1Panel OpenResty Reverse Proxy Configuration

**Configuration Path:** `/opt/1panel/www/conf.d/`

### admin.xseo.me
```nginx
server {
    listen 80;
    server_name admin.xseo.me;
    
    # Proxy /api requests to the API server
    location /api {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Serve admin panel for everything else
    location / {
        proxy_pass http://127.0.0.1:3101;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### game.xseo.me
```nginx
server {
    listen 80;
    server_name game.xseo.me;
    
    # Proxy /api requests to the API server
    location /api {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Serve game webapp for everything else
    location / {
        proxy_pass http://127.0.0.1:3102;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**How to Modify Configuration:**
1. Login to 1Panel → Websites.
2. Find corresponding domain → Configuration.
3. Edit Nginx configuration.
4. Save to automatically reload.

---

## 🔐 Environment Variables

File: `/opt/minigame/.env`

**Important Fields:**
```env
DB_PASSWORD=postgres
JWT_SECRET=change_me_in_production
CORS_ORIGINS=https://admin.xseo.me,https://game.xseo.me
```

**Note:** Sensitive information should NOT be committed to Git! The `.env` on the server has the actual values.

---

## 🛠️ Common Management Commands

### Check Container Status
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep minigame"
```

### View Logs
```bash
# API Logs
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-api --tail 50 -f"

# Admin Logs
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-admin --tail 50"

# WebApp Logs
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-webapp --tail 50"
```

### Restart Services
```bash
# Restart all MiniGame containers
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "cd /opt/minigame && docker compose -f docker-compose.prod.yml restart"

# Restart single service
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker restart minigame-api"
```

### Enter Containers
```bash
# Enter API container
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker exec -it minigame-api sh"

# Enter PostgreSQL
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker exec -it minigame-postgres psql -U postgres -d minigame"
```

### OpenResty Management
```bash
# Check OpenResty processes
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "ps aux | grep openresty"

# Check OpenResty configuration
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "ls -la /opt/1panel/www/conf.d/ | grep xseo"

# Test configuration syntax
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "openresty -t"

# Reload configuration
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "systemctl reload openresty"
```

---

## 🔍 Troubleshooting Checklist

### 1. Docker Service Check
```bash
docker ps | grep minigame
# Should see 5 containers: api, admin, webapp, postgres, redis
# All statuses should be "Up X minutes/hours"
```

### 2. Port Mapping Check
```bash
# Confirm port bindings are correct
netstat -tlnp | grep -E '3100|3101|3102'
# Should display:
# 127.0.0.1:3100 (API)
# 127.0.0.1:3101 (Admin)
# 127.0.0.1:3102 (WebApp)
```

### 3. OpenResty Check
```bash
# Confirm OpenResty is on port 80
lsof -i :80
# Should display openresty process

# Check configuration files exist
ls /opt/1panel/www/conf.d/ | grep xseo
# Should see admin.xseo.me.conf and game.xseo.me.conf
```

### 4. Reverse Proxy Test
```bash
# Test admin panel
curl -I http://localhost:3101
curl -I http://admin.xseo.me

# Test API
curl http://localhost:3100/health
curl http://admin.xseo.me/api/health
```

### 5. Database Connection Test
```bash
# Test from API container
docker exec minigame-api node -e "console.log('DB_HOST:', process.env.DB_HOST)"
```

---

## 🚨 Common Issues

### Issue 1: Port 80 is Occupied (docker nginx conflict)
**Symptoms:** `failed to bind host port 0.0.0.0:80/tcp: address already in use`

**Cause:** `docker-compose.prod.yml` has an nginx service, which conflicts with OpenResty.

**Solution:**
1. Confirm `docker-compose.prod.yml` **DOES NOT** have an nginx service.
2. Manage all reverse proxies through 1Panel OpenResty.
3. Redeploy: `docker compose -f docker-compose.prod.yml up -d`

### Issue 2: 502 Bad Gateway
**Possible Causes:**
- Docker container not started.
- Incorrect port mapping.
- OpenResty configuration error.

**Resolution Steps:**
```bash
# 1. Check container status
docker ps | grep minigame

# 2. Check ports
netstat -tlnp | grep -E '3100|3101|3102'

# 3. Check logs
docker logs minigame-api --tail 50

# 4. Restart container
docker restart minigame-api
```

### Issue 3: CORS Error
**Symptoms:** Frontend cannot call the API, browser console shows CORS error.

**Resolution:**
Check the `CORS_ORIGINS` environment variable of the API container:
```bash
docker exec minigame-api sh -c 'echo $CORS_ORIGINS'
# Should contain: https://admin.xseo.me,https://game.xseo.me
```

If incorrect, modify `docker-compose.prod.yml` and restart.

### Issue 4: No changes after code update
**Possible Cause:** Docker image cache.

**Resolution:**
```bash
cd /opt/minigame
git pull origin main
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

---

## 🔗 Related Documents

- **Deployment Flow:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Features:** [FEATURES.md](./FEATURES.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 📝 Notes

- This server also runs other services (ERPNext, n8n, DomainMod).
- All HTTPS certificates are managed via Cloudflare.
- 1Panel provides a unified Web management interface.
- Regularly backup databases and uploaded files!
```
