# MiniGame 系统架构

**最后更新：** 2026-01-31

本文档描述MiniGame项目的整体架构、技术栈和设计决策。

---

## 🏗️ 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Nginx (Reverse Proxy)                      │
│                    Port 80/443                               │
└────┬────────────────┬────────────────┬──────────────────────┘
     │                │                │
     │                │                │
┌────▼─────────┐ ┌───▼──────────┐ ┌──▼─────────────┐
│   Web App    │ │ Admin Panel  │ │   API Server   │
│   (Vue 3)    │ │   (Vue 3)    │ │   (NestJS)     │
│ Port 3102    │ │  Port 3101   │ │  Port 3100     │
│              │ │              │ │                │
│ Static Files │ │ Static Files │ │  REST API      │
└──────────────┘ └──────────────┘ └───┬────────────┘
                                      │
                              ┌───────┴────────┐
                              │                │
                         ┌────▼─────┐    ┌────▼─────┐
                         │PostgreSQL│    │  Redis   │
                         │  Port    │    │  Port    │
                         │  5432    │    │  6379    │
                         └──────────┘    └──────────┘
```

---

## 📦 技术栈

### Frontend

**Web App (游戏前端)**
- **Framework:** Vue 3 + Composition API
- **Language:** TypeScript
- **Build:** Vite
- **UI Library:** Naive UI
- **State Management:** Pinia
- **Router:** Vue Router
- **HTTP Client:** Axios

**Admin Panel (管理后台)**
- **Framework:** Vue 3 + Composition API
- **Language:** TypeScript
- **Build:** Vite
- **UI Library:** Naive UI
- **i18n:** vue-i18n
- **State Management:** Pinia
- **Router:** Vue Router (with Elegant Router)

### Backend

**API Server**
- **Framework:** NestJS
- **Language:** TypeScript
- **ORM:** TypeORM
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Auth:** JWT (Passport.js)
- **Validation:** class-validator
- **File Upload:** Multer

### Infrastructure

**Deployment**
- **Containerization:** Docker + Docker Compose
- **Reverse Proxy:** Nginx
- **Process Manager:** PM2 (backup)
- **CI/CD:** Git + Manual deployment

**Hosting**
- **Server:** VPS (154.26.136.139)
- **OS:** Linux
- **Panel:** 1Panel

---

## 🔄 数据流

### 用户玩游戏流程

```
1. User visits https://game.xseo.me/spin-wheel-premium
   ↓
2. Nginx routes to Web App (port 3102)
   ↓
3. Web App loads, fetches game config
   GET /api/game-instances/spin-wheel-premium
   ↓
4. API verifies game exists and is published
   ↓
5. API generates game HTML (spin-wheel.template.ts)
   ↓
6. Web App loads game in iframe
   ↓
7. User clicks SPIN button
   ↓
8. Game engine calculates result (client-side)
   ↓
9. Display result + play sound effects
   ↓
10. (Optional) Call API to record result
```

### Admin配置游戏流程

```
1. Admin visits https://admin.xseo.me
   ↓
2. Nginx routes to Admin Panel (port 3101)
   ↓
3. Admin logs in
   POST /api/auth/login → JWT token
   ↓
4. Admin navigates to game management
   ↓
5. Admin clicks "Edit Game"
   GET /api/game-instances/:id
   ↓
6. ConfigForm dynamically renders based on schema
   (Schema comes from seed.service.ts)
   ↓
7. Admin modifies config (color, prizes, etc.)
   ↓
8. Admin saves
   PATCH /api/game-instances/:id
   ↓
9. API validates and updates database
   ↓
10. Game updated! Next time user plays, uses new config
```

### 文件上传流程

```
1. Admin clicks "Upload" in ConfigForm
   ↓
2. File input dialog opens
   ↓
3. Admin selects file (image/audio)
   ↓
4. ConfigForm sends file via FormData
   POST /api/game-instances/upload
   ↓
5. Multer middleware processes upload
   ↓
6. API saves file to uploads/ directory
   ↓
7. API returns file URL
   ↓
8. ConfigForm updates config field with URL
   ↓
9. Game will use this URL to load the asset
```

---

## 🗄️ 数据库设计

### 核心表

**game_templates**
- 游戏模板定义
- 包含schema (配置项定义)
- 由seed.service.ts初始化

**game_instances**
- 具体的游戏实例
- 包含config (JSON，存储所有配置)
- 关联到game_template

**users**
- 管理员用户
- 用于登录Admin Panel

**members**
- 游戏玩家/会员
- 包含token余额

**companies**
- 多租户支持
- 每个公司有独立的游戏和会员

**roles & permissions**
- RBAC权限控制

**audit_logs**
- 操作审计日志

**scores / game_history**
- 游戏历史记录

### 关系图

```
companies (1) ──┬── (N) game_instances
                │
                ├── (N) members
                │
                └── (N) users

game_templates (1) ── (N) game_instances

users (N) ── (N) roles (N) ── (N) permissions

members (1) ── (N) game_history
game_instances (1) ── (N) game_history
```

---

## 🔐 安全机制

### 认证 (Authentication)
- JWT token based
- Token存储在localStorage
- 每次请求带上 `Authorization: Bearer <token>`
- Token过期时间：24小时（可配置）

### 授权 (Authorization)
- 基于角色的访问控制 (RBAC)
- Roles: admin, editor, viewer
- Permissions: game:create, member:edit, etc.
- Guards在controller层验证权限

### 数据隔离 (Multi-tenancy)
- 每个请求自动过滤 companyId
- 用户只能看到自己公司的数据
- Database层强制隔离

### 输入验证
- class-validator在DTO层验证
- SQL injection防护（TypeORM）
- XSS防护（Vue自动转义）

### CORS
- 配置允许的origin
- 生产环境只允许特定domain

---

## 🎯 设计决策

### 为什么用NestJS？
- ✅ TypeScript原生支持
- ✅ 模块化架构
- ✅ 内置依赖注入
- ✅ 与TypeORM集成好
- ✅ 企业级框架

### 为什么游戏引擎是server-side生成HTML？
- ✅ 配置集中管理（不需要rebuild前端）
- ✅ 可以动态生成不同游戏
- ✅ 安全（逻辑在服务器）
- ✅ 简化部署（只需更新API）

### 为什么用iframe加载游戏？
- ✅ 隔离游戏和主应用
- ✅ 防止样式冲突
- ✅ 可以独立加载/卸载
- ✅ 安全沙箱

### 为什么ConfigForm是动态渲染？
- ✅ Schema驱动，易于扩展
- ✅ 添加新配置项不需要改UI
- ✅ 不同游戏类型可以有不同配置
- ✅ DRY原则

### 为什么用PostgreSQL？
- ✅ 强大的JSON支持（存储config）
- ✅ ACID事务
- ✅ 成熟稳定
- ✅ 适合复杂查询

### 为什么用Redis？
- ✅ 缓存game config（减少DB查询）
- ✅ Session存储
- ✅ Rate limiting
- ✅ 高性能

---

## 📈 性能优化

### Frontend
- ✅ Vite快速build
- ✅ Code splitting
- ✅ Lazy loading routes
- ✅ 图片懒加载
- ✅ Asset CDN（可选）

### Backend
- ✅ Redis缓存
- ✅ Database indexing
- ✅ Connection pooling
- ✅ Query optimization
- ✅ Gzip compression

### Database
- ✅ 索引：userId, companyId, slug
- ✅ JSON字段索引（GIN）
- ✅ Query optimization
- ✅ Connection pooling

---

## 🔄 部署架构

### Development
```
Local Machine
├── web-app:9528
├── admin:9527
└── api:3000
```

### Production
```
VPS (154.26.136.139)
├── Nginx:80/443 (reverse proxy)
├── Docker Containers:
│   ├── web-app:3102
│   ├── admin:3101
│   ├── api:3100
│   ├── postgres:5432
│   └── redis:6379
└── Volumes:
    ├── postgres-data
    ├── redis-data
    └── uploads
```

### Domains
- **Web App:** https://game.xseo.me
- **Admin Panel:** https://admin.xseo.me
- **API:** https://api.xseo.me

---

## 🧩 模块依赖关系

### Frontend依赖
```
web-app
├── router → views
├── views → components
├── components → store
└── store → api service

admin
├── router → views
├── views → components
├── components → store
├── store → api service
└── locales → i18n
```

### Backend依赖
```
app.module
├── auth.module
├── users.module
├── members.module
├── companies.module
├── game-instances.module
│   └── games.module (templates)
├── seed.module
├── permissions.module
├── roles.module
├── audit-log.module
└── system-settings.module
```

---

## 🚀 扩展性考虑

### 添加新游戏类型
1. 在 `games/` 创建新template (如 `scratch-card.template.ts`)
2. 在 `seed.service.ts` 定义schema
3. ConfigForm自动适配（schema驱动）
4. 无需修改其他代码

### 支持更多语言
1. 在 `locales/langs/` 添加新语言文件
2. 在 `locale.ts` 注册
3. 更新 `LangType` 类型定义
4. 所有i18n自动支持

### 横向扩展 (Scale Out)
- ✅ API可以多实例部署（stateless）
- ✅ Redis做session共享
- ✅ Database做读写分离
- ✅ Static assets放CDN

---

## 📝 技术债务

**已知问题：**
1. 游戏结果记录是可选的（应该强制记录）
2. 缺少完整的error tracking（如Sentry）
3. 缺少automated testing
4. 缺少API rate limiting
5. 缺少完整的logging system

**未来改进：**
- [ ] 添加单元测试和E2E测试
- [ ] 集成Sentry error tracking
- [ ] 实现完整的audit logging
- [ ] 添加API rate limiting
- [ ] 实现game result强制记录
- [ ] 添加监控和告警（如Prometheus + Grafana）

---

## 🔗 相关文档

- **功能详细文档：** [FEATURES.md](./FEATURES.md)
- **代码位置映射：** [CODEMAP.md](./CODEMAP.md)
- **故障排查：** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **部署流程：** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**这个文档帮助你理解MiniGame的整体架构和设计！**
