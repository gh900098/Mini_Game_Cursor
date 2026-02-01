# MiniGame 代码位置映射

**最后更新：** 2026-01-31

快速查找代码位置的参考指南。

---

## 🎯 快速导航

### 想要修改游戏玩法？
→ `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts`

### 想要修改配置界面？
→ `apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue`

### 想要添加新配置项？
→ `apps/api/src/modules/seed/seed.service.ts` (schema定义)

### 想要修改翻译？
→ `apps/soybean-admin/src/locales/langs/zh-cn.ts` (中文)  
→ `apps/soybean-admin/src/locales/langs/en-us.ts` (英文)

---

## 📂 按功能查找

### 🎮 游戏前端 (web-app)

**游戏容器和加载**
- 主容器：`apps/web-app/src/views/game/index.vue`
- 音效store：`apps/web-app/src/store/settings.ts`
- 认证store：`apps/web-app/src/store/auth.ts`

**路由**
- 路由配置：`apps/web-app/src/router/index.ts`
- 主要路由：
  - `/` - 首页/大厅
  - `/game/:slug` - 游戏页面
  - `/login` - 登录
  - `/profile` - 用户资料

**API服务**
- API封装：`apps/web-app/src/service/api.ts`

---

### 🎛️ Admin Panel (soybean-admin)

**游戏管理**
- 游戏列表：`apps/soybean-admin/src/views/management/game-instance/index.vue`
- 配置表单：`apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue`

**会员管理**
- 会员列表：`apps/soybean-admin/src/views/management/member/`

**用户管理**
- 用户列表：`apps/soybean-admin/src/views/management/user/`

**公司管理**
- 公司列表：`apps/soybean-admin/src/views/management/company/`

**翻译系统**
- i18n配置：`apps/soybean-admin/src/locales/index.ts`
- 中文翻译：`apps/soybean-admin/src/locales/langs/zh-cn.ts`
- 英文翻译：`apps/soybean-admin/src/locales/langs/en-us.ts`
- locale定义：`apps/soybean-admin/src/locales/locale.ts`

**布局和组件**
- Admin布局：`apps/soybean-admin/packages/materials/src/libs/admin-layout/`
- Tab组件：`apps/soybean-admin/packages/materials/src/libs/page-tab/`

---

### ⚙️ 后端API (api)

**核心模块**
- 入口：`apps/api/src/main.ts`
- App模块：`apps/api/src/app.module.ts`

**游戏相关**
- 游戏实例模块：`apps/api/src/modules/game-instances/`
  - Controller：`game-instances.controller.ts`
  - Service：`game-instances.service.ts`
  - Entity：`entities/game-instance.entity.ts`
  - **转盘模板：** `templates/spin-wheel.template.ts` (最重要！)

**游戏模板**
- Seed系统：`apps/api/src/modules/seed/seed.service.ts`
- 游戏列表：`apps/api/src/modules/games/`

**认证系统**
- Auth模块：`apps/api/src/modules/auth/`
  - Controller：`auth.controller.ts`
  - Service：`auth.service.ts`
  - JWT策略：`jwt.strategy.ts`
  - Guards：`jwt-auth.guard.ts`

**用户管理**
- Users模块：`apps/api/src/modules/users/`
  - Entity：`entities/user.entity.ts`

**会员管理**
- Members模块：`apps/api/src/modules/members/`
  - Entity：`entities/member.entity.ts`

**权限系统**
- Roles模块：`apps/api/src/modules/roles/`
- Permissions模块：`apps/api/src/modules/permissions/`

**公司/多租户**
- Companies模块：`apps/api/src/modules/companies/`
  - Entity：`entities/company.entity.ts`

**审计日志**
- Audit Log模块：`apps/api/src/modules/audit-log/`

**系统设置**
- System Settings模块：`apps/api/src/modules/system-settings/`

**邮件服务**
- Email模块：`apps/api/src/modules/email/`

**游戏历史/统计**
- Scores模块：`apps/api/src/modules/scores/`

---

## 📝 按文件类型查找

### Configuration Files

**环境变量**
- `.env.development` - 开发环境
- `.env.production` - 生产环境

**Docker**
- `docker-compose.yml` - 本地开发
- `docker-compose.prod.yml` - 生产环境
- `Dockerfile.api` - API镜像
- `Dockerfile.admin` - Admin镜像
- `Dockerfile.web-app` - Web App镜像

**TypeScript配置**
- `tsconfig.json` - 根配置
- `apps/*/tsconfig.json` - 各app配置

**Build配置**
- `apps/web-app/vite.config.ts` - Web App build
- `apps/soybean-admin/vite.config.ts` - Admin build
- `apps/api/tsconfig.build.json` - API build

---

## 🔍 常见修改场景

### Scenario 1: 添加新的游戏配置选项

**步骤：**
1. 修改 `apps/api/src/modules/seed/seed.service.ts`
   - 在schema中添加新字段定义
2. 添加翻译：
   - `apps/soybean-admin/src/locales/langs/zh-cn.ts`
   - `apps/soybean-admin/src/locales/langs/en-us.ts`
3. (可选) 修改 `ConfigForm.vue` 如果需要特殊UI
4. 重新run seed：`POST /api/seed/run`
5. Rebuild：`api` + `admin`

**涉及文件：**
- `seed.service.ts`
- `zh-cn.ts`
- `en-us.ts`
- (可选) `ConfigForm.vue`

---

### Scenario 2: 修改游戏玩法/UI

**步骤：**
1. 修改 `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts`
   - 这是游戏引擎的核心
2. Rebuild：`api`
3. 测试：访问游戏URL验证改动

**涉及文件：**
- `spin-wheel.template.ts`

---

### Scenario 3: 修改Admin Panel UI

**步骤：**
1. 找到对应的Vue文件：
   - 游戏管理：`apps/soybean-admin/src/views/management/game-instance/`
   - 会员管理：`apps/soybean-admin/src/views/management/member/`
2. 修改Vue组件
3. Rebuild：`admin`

**涉及文件：**
- `apps/soybean-admin/src/views/management/*/`

---

### Scenario 4: 添加新API endpoint

**步骤：**
1. 找到对应的controller：
   - `apps/api/src/modules/[module]/[module].controller.ts`
2. 添加新的 `@Get()` / `@Post()` / `@Patch()` / `@Delete()`
3. 在service中实现逻辑
4. Rebuild：`api`

**涉及文件：**
- `[module].controller.ts`
- `[module].service.ts`

---

### Scenario 5: 修改数据库schema

**步骤：**
1. 修改entity：
   - `apps/api/src/modules/[module]/entities/[entity].entity.ts`
2. 生成migration（如果使用TypeORM migrations）
3. 运行migration
4. Rebuild：`api`

**涉及文件：**
- `entities/*.entity.ts`

---

### Scenario 6: 修改翻译文本

**步骤：**
1. 找到i18n key对应的文件：
   - 中文：`apps/soybean-admin/src/locales/langs/zh-cn.ts`
   - 英文：`apps/soybean-admin/src/locales/langs/en-us.ts`
2. 修改翻译文本
3. **⚠️ 检查没有重复的object key！**
4. Rebuild：`admin`

**涉及文件：**
- `zh-cn.ts`
- `en-us.ts`

**⚠️ 重要提醒（2026-01-31 lesson）：**
- 永远检查是否已有同名key
- 不要在同一个object里定义两个同名key
- 同时更新zh-cn和en-us

---

## 📊 文件统计

### 代码量估算
- **web-app:** ~5k lines
- **soybean-admin:** ~20k lines
- **api:** ~15k lines
- **Total:** ~40k lines

### 主要技术栈
- **Frontend:** Vue 3 + TypeScript + Vite + Naive UI
- **Backend:** NestJS + TypeScript + TypeORM
- **Database:** PostgreSQL + Redis
- **Deploy:** Docker + Nginx

---

## 🔗 相关文档

- **功能详细文档：** [FEATURES.md](./FEATURES.md)
- **系统架构：** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **故障排查：** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **部署流程：** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**这个文档帮助你快速找到要修改的代码位置！**

使用方法：
1. 知道要改什么功能 → 查"按功能查找"
2. 知道要改什么场景 → 查"常见修改场景"
3. 找到文件后 → 查FEATURES.md了解详细工作原理
