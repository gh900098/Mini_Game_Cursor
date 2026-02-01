# MiniGame Project

DJ 的游戏平台项目 🎮

## Quick Links

- **项目概览:** 你现在就在这里
- **部署指南:** [DEPLOYMENT.md](./DEPLOYMENT.md) — 如何部署到服务器
- **服务器配置:** [SERVER.md](./SERVER.md) — 1Panel 和 Docker 配置细节
- **故障排查:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — 常见问题和 SOP（重要！）
- **UI 标准:** [UI-STANDARDS.md](./UI-STANDARDS.md) — 组件规范和设计标准（必读！）
- **JK 集成:** [JK-INTEGRATION.md](./JK-INTEGRATION.md) — 第三方平台集成完整方案（未实施）

---

## Project Structure

### Local Development
- **路径:** `~/Documents/MiniGame/`
- **Repository:** `gh900098/Mini_Game` (GitHub private)

### Production Server
- **服务器:** 154.26.136.139 (1Panel Ubuntu)
- **路径:** `/opt/minigame/`
- **域名:**
  - https://admin.xseo.me — Admin Panel
  - https://api.xseo.me — API Backend
  - https://game.xseo.me — Player Web App

---

## Tech Stack

### Backend (API)
- **Framework:** NestJS
- **Database:** PostgreSQL
- **Cache:** Redis
- **Port:** 3100

### Admin Panel
- **Framework:** Vue 3 (Soybean Admin)
- **Port:** 3101

### Web App (Player)
- **Framework:** Vue 3
- **Port:** 3102

---

## Quick Commands

```bash
# Local development
cd ~/Documents/MiniGame && pnpm dev:api      # Start API
cd ~/Documents/MiniGame && pnpm dev:admin    # Start Admin Panel
cd ~/Documents/MiniGame && pnpm build        # Build all

# Check production status
curl -s http://api.xseo.me/api | head -c 100

# View logs
sshpass -p 'Abcd01923' ssh root@154.26.136.139 "docker logs minigame-api --tail 50"
```

更多命令见 [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## GitHub

- **Account:** gh900098
- **Repo:** `gh900098/Mini_Game` (private)
- **PAT:** 见 `memory/credentials.enc`

Git setup:
- Local: `~/Documents/MiniGame/` → origin = Mini_Game repo
- Server: `/opt/minigame/` → origin = Mini_Game repo

---

## Cloudflare (xseo.me)

- **Zone ID:** 243cfc60ae367147aae321a4d7768103
- **API Token:** 9rzbOWeY0RuGV2ntbBzOs77T2CeG_AMhKYoHUFCT
- **DNS Records:**
  - admin.xseo.me → 154.26.136.139
  - api.xseo.me → 154.26.136.139
  - game.xseo.me → 154.26.136.139

---

需要更多细节？看：
- 📦 **部署流程** → [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🖥️ **服务器配置** → [SERVER.md](./SERVER.md)
