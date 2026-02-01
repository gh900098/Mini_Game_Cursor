# MiniGame Server Configuration

1Panel 服务器配置和架构详情 🖥️

---

## 🏗️ 服务器架构（重要！必读）

**正确的架构（不要忘记！）：**

```
外部流量 (Internet)
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

**关键原则（永远不要忘记！）：**
1. ✅ **1Panel 的 OpenResty 已经在 port 80/443** — 这是唯一的前端反向代理
2. ✅ **Docker 容器只需要暴露内部端口** (127.0.0.1:3100, 3101, 3102)
3. ❌ **不需要 docker-compose 里的 nginx 容器** — 会冲突 port 80！
4. ✅ **所有域名通过 1Panel → 网站管理 → 反向代理配置**

**为什么不用 docker nginx：**
- 因为 1Panel 已经提供了 OpenResty（nginx）
- 我们通过 1Panel 的 Web UI 管理反向代理配置
- 更简单、更统一、不会 port 冲突

---

## 🖥️ 服务器信息

- **IP:** 154.26.136.139
- **Username:** root
- **Password:** `Abcd01923` *(encrypted in DEPLOYMENT.md, use sshpass)*
- **OS:** Ubuntu 24.04.3 LTS
- **Docker:** v29.1.3 ✅
- **RAM:** 23GB (20GB available)
- **Hostname:** vmi2991856

**SSH 连接方式：**
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139
```

### 🔐 1Panel 管理面板
- **Panel URL:** https://154.26.136.139:36699
- **Username:** *(see DEPLOYMENT.md)*
- **Password:** *(see DEPLOYMENT.md)*
- **用途:** 管理 Docker、OpenResty、SSL 证书、数据库等

---

## 📂 目录结构

```
/opt/minigame/                    # 主项目目录 (Git repo)
├── apps/
│   ├── api/                      # NestJS Backend API
│   ├── soybean-admin/            # Vue 3 Admin Panel
│   └── web-app/                  # Vue 3 Player Web App
├── docker-compose.prod.yml       # Docker Compose 配置 (无nginx!)
├── Dockerfile.api                # API Dockerfile
├── Dockerfile.admin              # Admin Dockerfile
├── Dockerfile.webapp             # WebApp Dockerfile
├── .env                          # 环境变量
└── deploy.sh                     # 快速部署脚本

/opt/1panel/www/conf.d/           # OpenResty 反向代理配置
├── admin.xseo.me.conf            # Admin 反向代理
├── api.xseo.me.conf              # API 反向代理 (已废弃?)
└── game.xseo.me.conf             # Game 反向代理

Docker Volumes:
├── postgres_data                 # PostgreSQL 数据持久化
└── api_uploads                   # API 上传文件存储
```

---

## 🐳 Docker Services

### Backend API
- **Container:** `minigame-api`
- **Build:** `Dockerfile.api`
- **Port:** 127.0.0.1:3100:3000 (内部端口3000映射到外部3100)
- **Environment:** 
  - NODE_ENV=production
  - DB_HOST=postgres
  - REDIS_HOST=redis
  - CORS_ORIGINS=https://admin.xseo.me,https://game.xseo.me
- **Depends on:** postgres, redis
- **Health check:** postgres & redis 必须 healthy

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
- **Port:** Internal only (5432 不对外暴露)
- **Database:** `minigame`
- **User:** `postgres`
- **Password:** 从 .env 读取
- **Volume:** `postgres_data:/var/lib/postgresql/data`

### Redis
- **Container:** `minigame-redis`
- **Image:** redis:7-alpine
- **Port:** Internal only (6379 不对外暴露)
- **Health check:** redis-cli ping

---

## 🌐 1Panel OpenResty 反向代理配置

**配置路径:** `/opt/1panel/www/conf.d/`

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

**如何修改配置：**
1. 登录 1Panel → 网站
2. 找到对应域名 → 配置
3. 编辑 Nginx 配置
4. 保存后自动 reload

---

## 🔐 Environment Variables

文件: `/opt/minigame/.env`

**重要字段：**
```env
DB_PASSWORD=postgres
JWT_SECRET=change_me_in_production
CORS_ORIGINS=https://admin.xseo.me,https://game.xseo.me
```

**注意：** 敏感信息不要提交到 Git！服务器上的 .env 有实际值。

---

## 🛠️ 常用管理命令

### 查看容器状态
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep minigame"
```

### 查看日志
```bash
# API 日志
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-api --tail 50 -f"

# Admin 日志
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-admin --tail 50"

# WebApp 日志
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-webapp --tail 50"
```

### 重启服务
```bash
# 重启所有 MiniGame 容器
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "cd /opt/minigame && docker compose -f docker-compose.prod.yml restart"

# 重启单个服务
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker restart minigame-api"
```

### 进入容器
```bash
# 进入 API 容器
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker exec -it minigame-api sh"

# 进入 PostgreSQL
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker exec -it minigame-postgres psql -U postgres -d minigame"
```

### OpenResty 管理
```bash
# 查看 OpenResty 进程
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "ps aux | grep openresty"

# 查看 OpenResty 配置
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "ls -la /opt/1panel/www/conf.d/ | grep xseo"

# 测试配置语法
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "openresty -t"

# 重新加载配置
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "systemctl reload openresty"
```

---

## 🔍 故障排查 Checklist

### 1. Docker 服务检查
```bash
docker ps | grep minigame
# 应该看到 5 个容器：api, admin, webapp, postgres, redis
# 所有状态应该是 "Up X minutes/hours"
```

### 2. 端口映射检查
```bash
# 确认端口绑定正确
netstat -tlnp | grep -E '3100|3101|3102'
# 应该显示:
# 127.0.0.1:3100 (API)
# 127.0.0.1:3101 (Admin)
# 127.0.0.1:3102 (WebApp)
```

### 3. OpenResty 检查
```bash
# 确认 OpenResty 在 port 80
lsof -i :80
# 应该显示 openresty 进程

# 检查配置文件存在
ls /opt/1panel/www/conf.d/ | grep xseo
# 应该看到 admin.xseo.me.conf 和 game.xseo.me.conf
```

### 4. 反向代理测试
```bash
# 测试 admin panel
curl -I http://localhost:3101
curl -I http://admin.xseo.me

# 测试 API
curl http://localhost:3100/health
curl http://admin.xseo.me/api/health
```

### 5. 数据库连接测试
```bash
# 从 API 容器测试
docker exec minigame-api node -e "console.log('DB_HOST:', process.env.DB_HOST)"
```

---

## 🚨 常见问题

### 问题 1: Port 80 被占用 (docker nginx 冲突)
**症状:** `failed to bind host port 0.0.0.0:80/tcp: address already in use`

**原因:** docker-compose.prod.yml 里有 nginx 服务，和 OpenResty 冲突

**解决方案:**
1. 确认 docker-compose.prod.yml **没有** nginx 服务
2. 所有反向代理通过 1Panel OpenResty 管理
3. 重新部署: `docker compose -f docker-compose.prod.yml up -d`

### 问题 2: 502 Bad Gateway
**可能原因:**
- Docker 容器没启动
- 端口映射错误
- OpenResty 配置错误

**解决步骤:**
```bash
# 1. 检查容器状态
docker ps | grep minigame

# 2. 检查端口
netstat -tlnp | grep -E '3100|3101|3102'

# 3. 检查日志
docker logs minigame-api --tail 50

# 4. 重启容器
docker restart minigame-api
```

### 问题 3: CORS 错误
**症状:** 前端无法调用 API，浏览器 console 显示 CORS error

**解决:**
检查 API 容器的 CORS_ORIGINS 环境变量:
```bash
docker exec minigame-api sh -c 'echo $CORS_ORIGINS'
# 应该包含: https://admin.xseo.me,https://game.xseo.me
```

如果不对，修改 docker-compose.prod.yml 然后重启。

### 问题 4: 代码更新后没变化
**可能原因:** Docker image cache

**解决:**
```bash
cd /opt/minigame
git pull origin main
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

---

## 🔗 相关文档

- **部署流程:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **功能文档:** [FEATURES.md](./FEATURES.md)
- **故障排查:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 📝 Notes

- 该服务器还运行其他服务（ERPNext, n8n, DomainMod）
- 所有 HTTPS 证书通过 Cloudflare 管理
- 1Panel 提供统一的 Web 管理界面
- 定期备份数据库和上传文件！
