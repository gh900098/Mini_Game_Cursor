# MiniGame Project

DJ's Game Platform Project 🎮

## Quick Links

- **Project Overview:** You are here.
- **Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md) — How to deploy to the server.
- **Server Configuration:** [SERVER.md](./SERVER.md) — 1Panel and Docker configuration details.
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — Common issues and SOPs (Important!).
- **UI Standards:** [UI-STANDARDS.md](./UI-STANDARDS.md) — Component specifications and design standards (Required reading!).
- **JK Integration:** [JK-INTEGRATION.md](./JK-INTEGRATION.md) — Complete proposal for third-party platform integration (Pending implementation).

---

## Project Structure

### Local Development
- **Path:** `~/Documents/MiniGame/`
- **Repository:** `gh900098/Mini_Game` (GitHub private)

### Production Server
- **Server:** 154.26.136.139 (1Panel Ubuntu)
- **Path:** `/opt/minigame/`
- **Domains:**
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

For more commands, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## GitHub

- **Account:** gh900098
- **Repo:** `gh900098/Mini_Game` (private)
- **PAT:** See `memory/credentials.enc`

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

Need more details? Refer to:
- 📦 **Deployment Workflow** → [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🖥️ **Server Configuration** → [SERVER.md](./SERVER.md)
