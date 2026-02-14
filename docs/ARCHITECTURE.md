# MiniGame System Architecture

**Last Updated:** 2026-01-31

This document describes the overall architecture, tech stack, and design decisions of the MiniGame project.

---

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
│└─────────────────────┬───────────────────────────────────────┘
│                      │
│                      │ HTTPS
│                      ▼
│┌─────────────────────────────────────────────────────────────┐
││                   Nginx (Reverse Proxy)                      │
││                    Port 80/443                               │
│└────┬────────────────┬────────────────┬──────────────────────┘
│     │                │                │
│     │                │                │
│┌────▼─────────┐ ┌───▼──────────┐ ┌──▼─────────────┐
││   Web App    │ │ Admin Panel  │ │   API Server   │
││   (Vue 3)    │ │   (Vue 3)    │ │   (NestJS)     │
││ Port 3102    │ │  Port 3101   │ │  Port 3100     │
││              │ │              │ │                │
││ Static Files │ │ Static Files │ │  REST API      │
│└──────────────┘ └──────────────┘ └───┬────────────┘
│                                       │
│                               ┌───────┴────────┐
│                               │                │
│                          ┌────▼─────┐    ┌────▼─────┐
│                          │PostgreSQL│    │  Redis   │
│                          │  Port    │    │  Port    │
│                          │  5432    │    │  6379    │
│                          └──────────┘    └──────────┘
```

---

## 📦 Tech Stack

### Frontend

**Web App (Game Frontend)**
- **Framework:** Vue 3 + Composition API
- **Language:** TypeScript
- **Build:** Vite
- **UI Library:** Naive UI
- **State Management:** Pinia
- **Router:** Vue Router
- **HTTP Client:** Axios

**Admin Panel (Management Backend)**
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

## 🔄 Data Flows

### Player Gameplay Flow

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

### Admin Game Configuration Flow

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

### File Upload Flow

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

## 🗄️ Database Design

### Core Tables

**game_templates**
- Game template definitions
- Contains schema (config item definitions)
- Initialized by `seed.service.ts`

**game_instances**
- Specific game instances
- Contains config (JSON, stores all settings)
- Associated with `game_template`

**users**
- Admin users
- Used for Admin Panel login

**members**
- Game players/members
- Contains token balance

**companies**
- Multi-tenancy support
- Each company has independent games and members

**roles & permissions**
- RBAC permission control

**audit_logs**
- Operation audit logs

**scores / game_history**
- Game historical records

### Relationship Diagram

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

## 🔐 Security Mechanisms

### Authentication
- JWT token based
- Token stored in localStorage
- Every request carries `Authorization: Bearer <token>`
- Token expiration: 24 hours (configurable)

### Authorization
- Role-Based Access Control (RBAC)
- Roles: admin, editor, viewer
- Permissions: game:create, member:edit, etc.
- Guards verify permissions at the controller level

### Data Isolation (Multi-tenancy)
- Every request automatically filters by `companyId`
- Users can only see data from their own company
- Mandatory isolation at the database layer

### Input Validation
- `class-validator` validates at the DTO layer
- SQL injection protection (TypeORM)
- XSS protection (Vue automatic escaping)

### CORS
- Configured allowed origins
- Production environment only allows specific domains

---

## 🎯 Design Decisions

### Why use NestJS?
- ✅ Native TypeScript support
- ✅ Modular architecture
- ✅ Built-in dependency injection
- ✅ Good integration with TypeORM
- ✅ Enterprise-grade framework

### Why is the game engine server-side generated HTML?
- ✅ Centralized configuration management (no need to rebuild frontend)
- ✅ Can dynamically generate different games
- ✅ Security (logic stays on the server)
- ✅ Simplified deployment (only need to update API)

### Why use iframes to load games?
- ✅ Isolation between the game and the main application
- ✅ Prevents style conflicts
- ✅ Can be independently loaded/unloaded
- ✅ Security sandbox

### Why is ConfigForm dynamically rendered?
- ✅ Schema-driven, easy to extend
- ✅ Adding new configuration items doesn't require UI changes
- ✅ Different game types can have different configurations
- ✅ DRY (Don't Repeat Yourself) principle

### Why use PostgreSQL?
- ✅ Powerful JSON support (stores config)
- ✅ ACID transactions
- ✅ Mature and stable
- ✅ Suitable for complex queries

### Why use Redis?
- ✅ Caches game config (reduces DB queries)
- ✅ Session storage
- ✅ Rate limiting
- ✅ High performance

---

## 📈 Performance Optimization

### Frontend
- ✅ Vite fast build
- ✅ Code splitting
- ✅ Lazy loading routes
- ✅ Image lazy loading
- ✅ Asset CDN (optional)

### Backend
- ✅ Redis caching
- ✅ Database indexing
- ✅ Connection pooling
- ✅ Query optimization
- ✅ Gzip compression

### Database
- ✅ Indexes: `userId`, `companyId`, `slug`
- ✅ JSON field indexing (GIN)
- ✅ Query optimization
- ✅ Connection pooling

---

## 🔄 Deployment Architecture

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

## 🧩 Module Dependencies

### Frontend Dependencies
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

### Backend Dependencies
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

## 🚀 Scalability Considerations

### Adding New Game Types
1. Create a new template in `games/` (e.g., `scratch-card.template.ts`)
2. Define the schema in `seed.service.ts`
3. ConfigForm adapts automatically (schema-driven)
4. No other code changes needed

### Supporting More Languages
1. Add a new language file in `locales/langs/`
2. Register in `locale.ts`
3. Update `LangType` type definition
4. All i18n is automatically supported

### Horizontal Scaling (Scale Out)
- ✅ API can be deployed in multiple instances (stateless)
- ✅ Redis handles session sharing
- ✅ Database supports read-write splitting
- ✅ Static assets on CDN

---

## 📝 Technical Debt

**Known Issues:**
1. Game result recording is optional (should be mandatory)
2. Lacks comprehensive error tracking (e.g., Sentry)
3. Lacks automated testing
4. Lacks API rate limiting
5. Lacks a complete logging system

**Future Improvements:**
- [ ] Add unit and E2E testing
- [ ] Integrate Sentry error tracking
- [ ] Implement full audit logging
- [ ] Add API rate limiting
- [ ] Implement mandatory game result recording
- [ ] Add monitoring and alerting (e.g., Prometheus + Grafana)

---

## 🔗 Related Documents

- **Feature Details:** [FEATURES.md](./FEATURES.md)
- **Code Map:** [CODEMAP.md](./CODEMAP.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Deployment Process:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**This document helps you understand the overall architecture and design of MiniGame!**
