# MiniGame Deployment Guide

完整的部署流程和常用命令 🚀

---

## 🏗️ 架构说明（必读！永远不要忘记！）

**正确的服务器架构：**
```
外部流量 → OpenResty (1Panel, port 80/443) → Docker 容器 (内部端口)
```

**关键原则：**
1. ✅ **1Panel 的 OpenResty 是唯一的反向代理** (port 80/443)
2. ✅ **Docker 容器只暴露内部端口** (127.0.0.1:3100, 3101, 3102)
3. ❌ **docker-compose.prod.yml 不应该有 nginx 服务** — 会冲突 port 80！
4. ✅ **所有域名反向代理在 1Panel Web UI 配置**

**容器端口映射：**
- minigame-api: 127.0.0.1:3100:3000
- minigame-admin: 127.0.0.1:3101:80
- minigame-webapp: 127.0.0.1:3102:80

**OpenResty 反向代理：**
- admin.xseo.me → http://127.0.0.1:3101 + /api → http://127.0.0.1:3100
- game.xseo.me → http://127.0.0.1:3102 + /api → http://127.0.0.1:3100

**详细架构:** 参考 [SERVER.md](./SERVER.md)

---

## 🚀 完整部署流程（重要！）

### Step 1: 本地开发和修改
```bash
cd ~/Documents/MiniGame
# ... 编辑代码 ...
```

### Step 2: Commit 并 Push 到 GitHub
```bash
cd ~/Documents/MiniGame && \
git add -A && \
git commit -m "描述改了什么" && \
git push origin main
```

### Step 3: 部署到服务器

**普通更新（代码改动）：**
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml up -d --force-recreate"
```

**使用 deploy 脚本（简单 pull）：**
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "/opt/minigame/deploy.sh"
```

**⚠️ 需要重新 build（改了 Dockerfile 或 dependencies）：**
```bash
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml build --no-cache <service> && \
   docker compose -f docker-compose.prod.yml up -d"
```
替换 `<service>` 为: `api`, `admin`, 或 `web-app`

---

## 📋 常用命令

### 检查状态
```bash
# 检查所有 MiniGame 容器
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker ps | grep minigame"

# 检查特定服务状态
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker ps -f name=minigame-api"
```

### 查看日志
```bash
# API 日志（最后 50 行）
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-api --tail 50"

# Admin 日志
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-admin --tail 50"

# Web App 日志
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-webapp --tail 50"

# 实时跟踪日志
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-api -f"
```

### 重启服务
```bash
# 重启 API
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker restart minigame-api"

# 重启 Admin Panel
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker restart minigame-admin"

# 重启 Web App
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker restart minigame-webapp"

# 重启所有 MiniGame 服务
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && docker compose -f docker-compose.prod.yml restart"
```

### 进入容器
```bash
# 进入 API 容器
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker exec -it minigame-api sh"

# 进入 PostgreSQL 容器
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker exec -it minigame-postgres psql -U minigame_user -d minigame_db"

# 进入 Redis 容器
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker exec -it minigame-redis redis-cli"
```

### 测试接口
```bash
# 测试 API 健康检查
curl -s http://api.xseo.me/api | head -c 100

# 测试登录接口
curl -s -X POST http://admin.xseo.me/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"super@admin.com","password":"Demo@12345"}' | head -c 200

# 测试 Admin Panel 可访问性
curl -I https://admin.xseo.me

# 测试 Game Web App 可访问性
curl -I https://game.xseo.me
```

---

## 🔧 维护命令

### 清理和优化
```bash
# 清理未使用的 Docker 镜像
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker image prune -f"

# 清理未使用的容器
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker container prune -f"

# 查看 Docker 磁盘使用
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker system df"
```

### 数据库操作
```bash
# 备份数据库
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "docker exec minigame-postgres pg_dump -U minigame_user minigame_db > /opt/minigame_backup/db_$(date +%Y%m%d_%H%M%S).sql"

# 查看数据库连接
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "docker exec minigame-postgres psql -U minigame_user -d minigame_db -c 'SELECT count(*) FROM pg_stat_activity;'"
```

### 网络检查
```bash
# 检查 Docker 网络
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker network inspect minigame_default"

# 测试容器间连接（从 API 容器 ping postgres）
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "docker exec minigame-api ping -c 3 minigame-postgres"
```

---

## 🆘 故障排查步骤

按顺序检查：

1. **Docker 服务都在跑吗？**
   ```bash
   sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker ps | grep minigame"
   ```

2. **端口映射对吗？**
   ```bash
   sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker port minigame-api"
   ```

3. **日志有报错吗？**
   ```bash
   sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-api --tail 100"
   ```

4. **数据库连接正常吗？**
   ```bash
   sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
     "docker exec minigame-api cat .env.production | grep DATABASE_URL"
   ```

5. **OpenResty 配置正确吗？**
   ```bash
   sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
     "cat /opt/1panel/apps/openresty/openresty/conf/conf.d/api.xseo.me.conf"
   ```

6. **Cloudflare DNS 指向正确吗？**
   ```bash
   nslookup api.xseo.me
   # 应该显示 154.26.136.139
   ```

7. **SSL 证书有效吗？**
   ```bash
   curl -vI https://api.xseo.me 2>&1 | grep -i "ssl\|certificate"
   ```

---

## 📝 Notes

- **备份路径:** `/opt/minigame_backup/`
- **上传归档:** `/opt/minigame_new.tar.gz`
- **生产配置:** `.env.production` (在项目根目录)
- **Docker Compose:** `docker-compose.prod.yml`

需要服务器配置细节？看 [SERVER.md](./SERVER.md)

---

## 🔄 重建单个 Service (Rebuild)

**用途：** 当更新代码（如翻译文件）后，需要重新 build image

**命令：**
```bash
# SSH 到服务器
sshpass -p '<password>' ssh root@154.26.136.139

# 进入项目目录
cd /opt/minigame

# 重建 admin（或其他 service）
docker compose -f docker-compose.prod.yml down admin
docker compose -f docker-compose.prod.yml build --no-cache admin
docker compose -f docker-compose.prod.yml up -d admin
```

**重要：**
- ⚠️ 只 `restart` container 不会包含代码更新！
- ✅ 必须 `build --no-cache` 才会重新编译
- 📝 Service 名字：`admin`, `api`, `web-app` (不是 container 名字)
- 📂 正确的 compose 文件：`docker-compose.prod.yml`

**一键 rebuild script:**
```bash
./scripts/rebuild-service.sh admin
```
