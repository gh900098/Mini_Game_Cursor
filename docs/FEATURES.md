# MiniGame 功能目录

**最后更新：** 2026-02-01

这个文档记录MiniGame project的所有主要功能，包括代码位置、工作原理、依赖关系和修改影响范围。

---

## 📂 Project结构概览

```
MiniGame/
├── apps/
│   ├── web-app/          # 游戏前端（用户玩游戏）
│   ├── soybean-admin/    # 管理后台（配置游戏）
│   └── api/              # 后端API（NestJS）
├── docker/               # Docker配置
└── docs/                 # 文档
```

---

## 🎯 游戏规则系统 (Game Rules)

**实现日期：** 2026-02-01  
**实施阶段：** Phase 1 + Phase 2 (高优先级规则)

### 📍 位置
- **主服务：** `apps/api/src/modules/scores/game-rules.service.ts`
- **Entities:**
  - `apps/api/src/modules/scores/entities/play-attempt.entity.ts`
  - `apps/api/src/modules/scores/entities/budget-tracking.entity.ts`
- **集成点：** `apps/api/src/modules/scores/scores.service.ts`
- **API Endpoint：** `GET /scores/status/:instanceSlug`

### 🎯 功能说明

游戏规则系统用于控制玩家的游戏行为，包括次数限制、时间控制、等级要求等。在用户玩游戏前验证规则，防止滥用和控制成本。

### ⚙️ 已实现的规则

#### 1. dailyLimit（每日次数限制）
- **用途：** 限制每个用户每天最多玩X次
- **适用场景：** 防刷分、成本控制、营造稀缺性
- **配置字段：** `config.dailyLimit` (number, 0 = 无限制)
- **VIP加成：** 支持VIP会员额外次数
- **错误码：** `DAILY_LIMIT_REACHED`

**示例配置：**
```json
{
  "dailyLimit": 3,
  "vipTiers": [
    { "name": "Gold", "extraSpins": 2, "multiplier": 1.5 }
  ]
}
```

**API响应：**
```json
{
  "code": "DAILY_LIMIT_REACHED",
  "message": "您今天的游戏次数已用完（3次/天）",
  "resetAt": "2026-02-02T00:00:00Z",
  "remaining": 0,
  "limit": 3
}
```

#### 2. cooldown（冷却时间）
- **用途：** 玩一次后必须等待X秒才能再玩
- **适用场景：** 防快速刷分、减轻服务器压力
- **配置字段：** `config.cooldown` (number, 秒, 0 = 无冷却)
- **错误码：** `COOLDOWN_ACTIVE`

**API响应：**
```json
{
  "code": "COOLDOWN_ACTIVE",
  "message": "请等待45秒后再玩",
  "cooldownSeconds": 60,
  "remainingSeconds": 45,
  "canPlayAt": "2026-02-01T08:10:00Z"
}
```

#### 3. oneTimeOnly（只能玩一次）
- **用途：** 每个用户终身只能玩一次
- **适用场景：** 新人首单礼、限时活动、稀缺奖品
- **配置字段：** `config.oneTimeOnly` (boolean, default: false)
- **错误码：** `ALREADY_PLAYED`

#### 4. timeLimitConfig（时间限制）
- **用途：** 限制游戏在特定时间段内开放
- **适用场景：** 限时活动、周末专属、营业时间
- **配置字段：**
  ```typescript
  timeLimitConfig: {
    enable: boolean;
    startTime: Date | null;  // 活动开始时间
    endTime: Date | null;    // 活动结束时间
    activeDays: number[];    // [0-6] 0=周日, 1=周一...
  }
  ```
- **错误码：** `NOT_STARTED`, `ENDED`, `INVALID_DAY`

**示例：只在周末开放**
```json
{
  "timeLimitConfig": {
    "enable": true,
    "activeDays": [0, 5, 6]
  }
}
```

### 🗄️ 数据库表

#### play_attempts（游戏尝试记录）
```sql
CREATE TABLE play_attempts (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  instance_id UUID REFERENCES game_instances(id),
  attempted_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  ip_address VARCHAR(45)
);
```

**用途：** 记录每次玩游戏的尝试，用于检查 dailyLimit, cooldown, oneTimeOnly

#### members 新增字段
```sql
ALTER TABLE members ADD COLUMN level INT DEFAULT 1;
ALTER TABLE members ADD COLUMN vip_tier VARCHAR(20);
ALTER TABLE members ADD COLUMN experience INT DEFAULT 0;
```

**用途：** 支持等级系统和VIP特权（minLevel和vipTiers规则）

#### budget_tracking（预算跟踪）
```sql
CREATE TABLE budget_tracking (
  id UUID PRIMARY KEY,
  instance_id UUID REFERENCES game_instances(id),
  tracking_date DATE,
  total_cost DECIMAL(10,2) DEFAULT 0,
  play_count INT DEFAULT 0,
  UNIQUE(instance_id, tracking_date)
);
```

**用途：** 跟踪每日/每月奖品成本，用于budgetConfig规则（Phase 3实现）

### 🔗 依赖关系

**依赖于：**
- `PlayAttempt` entity - 游戏尝试记录
- `Member` entity - 用户等级和VIP信息
- `GameInstance` entity - 游戏配置

**被调用于：**
- `ScoresService.submit()` - 提交分数前验证规则
- `ScoresController.getGameStatus()` - 查询玩家状态

### 🔧 工作原理

#### 验证流程
```
用户点击玩游戏
  ↓
Frontend: POST /scores/:instanceSlug
  ↓
ScoresController.submit()
  ↓
GameRulesService.validatePlay() ← 验证所有规则
  ├─ checkTimeLimit()        ← 检查时间限制
  ├─ checkOneTimeOnly()      ← 检查是否玩过
  ├─ checkDailyLimit()       ← 检查今日次数
  └─ checkCooldown()         ← 检查冷却时间
  ↓ (全部通过)
ScoresService.submit()       ← 记录分数
  ↓
GameRulesService.recordAttempt() ← 记录尝试
  ↓
返回结果
```

#### 错误处理
如果任何规则验证失败，抛出 `BadRequestException` 并返回错误码和详细信息：
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "code": "DAILY_LIMIT_REACHED",
  "message": "您今天的游戏次数已用完（3次/天）",
  "resetAt": "2026-02-02T00:00:00Z",
  "remaining": 0,
  "limit": 3
}
```

### 📊 数据流

#### 1. 验证游戏规则
```
Client → POST /scores/:instanceSlug
  ↓
GameRulesService.validatePlay(memberId, instance)
  ├─ 查询 play_attempts 表（今日次数、上次时间）
  ├─ 检查 instance.config 配置
  └─ 如果违规 → throw BadRequestException
  ↓ (通过)
继续执行 submit()
```

#### 2. 查询玩家状态
```
Client → GET /scores/status/:instanceSlug
  ↓
GameRulesService.getPlayerStatus(memberId, instance)
  ├─ 查询今日已玩次数
  ├─ 计算VIP加成
  └─ 返回 { canPlay, dailyLimit, played, remaining, resetAt }
```

#### 3. 记录游戏尝试
```
submit() 成功后
  ↓
GameRulesService.recordAttempt(memberId, instanceId, true, ipAddress)
  ↓
插入 play_attempts 表
```

### 🐛 常见问题

**Q: 如何测试规则？**
A: 使用Postman或curl发送POST请求：
```bash
# 1. 正常玩游戏
curl -X POST http://api.xseo.me/scores/test-wheel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'

# 2. 查询状态
curl http://api.xseo.me/scores/status/test-wheel \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. 触发每日限制（连续玩3次后）
# 应该返回 DAILY_LIMIT_REACHED 错误
```

**Q: 为什么我的规则不生效？**
A: 检查以下几点：
1. ✅ 游戏instance的config里有配置这个规则吗？
2. ✅ 规则的值是否正确？（例如 dailyLimit: 0 表示无限制）
3. ✅ API已经重启了吗？（修改代码后需要重启）
4. ✅ Database表已经创建了吗？（play_attempts, budget_tracking）

**Q: 如何重置玩家的游戏记录？**
A: 直接删除 play_attempts 表的记录：
```sql
DELETE FROM play_attempts 
WHERE member_id = 'xxx' AND instance_id = 'yyy';
```

**Q: VIP额外次数如何配置？**
A: 在game instance的config里添加 vipTiers：
```json
{
  "dailyLimit": 3,
  "vipTiers": [
    { "name": "Bronze", "extraSpins": 0, "multiplier": 1 },
    { "name": "Silver", "extraSpins": 1, "multiplier": 1.2 },
    { "name": "Gold", "extraSpins": 2, "multiplier": 1.5 }
  ]
}
```

然后更新member的vip_tier字段：
```sql
UPDATE members SET vip_tier = 'Gold' WHERE id = 'xxx';
```

### 🚨 修改影响范围

#### ✅ 安全修改（不影响其他功能）
- 调整规则的阈值（dailyLimit, cooldown的具体数值）
- 添加新的VIP等级
- 修改错误消息文本

#### ⚠️ 需要测试
- 修改 GameRulesService 的验证逻辑
- 添加新的规则方法
- 修改 play_attempts 表结构

#### 🔥 高风险修改
- 修改 ScoresService.submit() 的调用顺序
- 删除 recordAttempt() 调用（会导致规则失效）
- 修改 play_attempts 表的主键或索引

### 📝 相关文档
- **实现计划：** `minigame/RULES_IMPLEMENTATION_PLAN.md`
- **API错误码：** `minigame/API.md`（待创建）
- **故障排查：** `minigame/TROUBLESHOOTING.md`

### ⚙️ 中优先级规则（Phase 3）

#### 5. minLevel（等级要求）
- **用途：** 只有达到X级的用户才能玩
- **适用场景：** 游戏门槛、会员特权、防止新号刷分
- **配置字段：** `config.minLevel` (number, 0 = 无等级要求)
- **错误码：** `LEVEL_TOO_LOW`

**API响应：**
```json
{
  "statusCode": 403,
  "code": "LEVEL_TOO_LOW",
  "message": "此游戏需要达到等级5",
  "required": 5,
  "current": 2,
  "missing": 3
}
```

#### 6. budgetConfig（预算控制）
- **用途：** 控制每日/每月发放的奖品总价值
- **适用场景：** 成本控制、防止营销成本失控
- **配置字段：**
  ```typescript
  budgetConfig: {
    enable: boolean;
    dailyBudget: number;   // 每日预算（元）
    monthlyBudget: number; // 每月预算（元）
  }
  ```
- **错误码：** `DAILY_BUDGET_EXCEEDED`, `MONTHLY_BUDGET_EXCEEDED`
- **数据记录：** 每次玩家赢奖后，记录到 budget_tracking 表

**如何使用：**
- 在 prizeList 配置里添加 `cost` 字段：
  ```json
  {
    "icon": "💎",
    "label": "大奖",
    "weight": 10,
    "value": 1000,
    "cost": 100  // 这个奖品成本100元
  }
  ```
- Backend会自动跟踪总成本

### 🎮 低优先级规则（Phase 4）

#### 7. dynamicProbConfig（动态概率调整）
- **用途：** 连输X次后，提高赢的概率（保底机制）
- **适用场景：** 游戏平衡、提升玩家体验
- **配置字段：**
  ```typescript
  dynamicProbConfig: {
    enable: boolean;
    lossStreakLimit: number;  // 连输几次触发
    lossStreakBonus: number;  // 增加概率百分比
  }
  ```

**工作原理：**
- Frontend在决定prize时调用 `getDynamicWeights()`
- Backend分析最近10次游戏记录
- 如果连输达到阈值，调整权重：
  - 输奖品权重 × 0.5
  - 赢奖品权重 × (1 + bonus%)

**示例：**
```typescript
// 原始权重：[40, 20, 30, 10]
// 连输3次后调整：[40*1.2, 20*1.2, 30*0.5, 10*1.2] = [48, 24, 15, 12]
```

#### 8. vipTiers（VIP特权）
- **用途：** VIP会员享受额外次数和奖励倍数
- **适用场景：** 会员差异化、增加付费动力
- **配置字段：**
  ```typescript
  vipTiers: [
    { name: "Bronze", extraSpins: 0, multiplier: 1 },
    { name: "Silver", extraSpins: 1, multiplier: 1.2 },
    { name: "Gold", extraSpins: 2, multiplier: 1.5 },
    { name: "Platinum", extraSpins: 5, multiplier: 2 }
  ]
  ```

**效果：**
- **extraSpins:** 增加每日游戏次数
  - 普通用户：dailyLimit = 3
  - Gold VIP：dailyLimit = 3 + 2 = 5
- **multiplier:** 奖励积分倍数
  - 原始分数：10
  - Gold VIP：10 × 1.5 = 15

**如何设置VIP：**
```sql
UPDATE members SET vip_tier = 'Gold' WHERE id = 'user-id';
```

### ✅ 所有规则已实现！

**Phase 1+2 (高优先级):** dailyLimit, cooldown, oneTimeOnly, timeLimitConfig  
**Phase 3 (中优先级):** minLevel, budgetConfig  
**Phase 4 (低优先级):** dynamicProbConfig, vipTiers

**状态：** Backend代码完成 ✅  
**下一步：** 测试验证（见 `minigame/TESTING-PLAN.md`）

---

## 🎮 游戏前端 (web-app)

### 1. 游戏Iframe容器

#### 📍 位置
- **主文件：** `apps/web-app/src/views/game/index.vue`
- **相关文件：**
  - `store/auth.ts` - 用户认证
  - `store/settings.ts` - 音效设置
  - `service/api.ts` - API调用

#### 🎯 功能说明
游戏的主容器，通过iframe加载实际的游戏引擎。处理：
- 游戏实例加载
- 用户认证和token验证
- 全屏模式
- 音效控制（header和浮动按钮）
- Loading状态和错误处理

#### ⚙️ 配置项（从game instance读取）
- `showSoundButton` (boolean, default: true) - 显示浮动音效按钮
- `soundButtonOpacity` (number 0-100, default: 80) - 音效按钮透明度
- `hideHeader` (query param) - 隐藏顶部header

#### 🔗 依赖关系
**依赖于：**
- `authStore` - 获取用户token
- `settingsStore` - 音效开关状态
- API endpoint: `/api/game-instances/:slug/play` - 获取游戏URL

**被依赖于：**
- Router (`/game/:id`) - 导航到游戏页面

#### 🔧 工作原理
1. 从route params获取game instance slug
2. 调用API获取游戏配置和iframe URL
3. 验证用户token（如果需要登录）
4. 在iframe中加载游戏引擎
5. 提供音效控制和全屏按钮
6. postMessage通信（如果游戏引擎需要）

#### 📊 数据流
```
Route (/game/:id) 
  → API (/api/game-instances/:slug)
  → 获取游戏配置
  → 构建iframe URL
  → iframe加载游戏引擎
  → postMessage通信（设置token等）
```

#### 🐛 常见问题
1. **问题：** iframe加载失败
   **原因：** Game instance不存在或未发布
   **解决：** 检查slug是否正确，检查instance状态

2. **问题：** 音效按钮不显示
   **原因：** `showSoundButton` 配置为false
   **解决：** 在Admin Panel编辑game instance → Effects tab → 启用音效按钮

#### 🚨 修改影响范围
**修改这个文件会影响：**
- ✅ 游戏加载流程
- ✅ 音效控制UI
- ✅ 全屏功能
- ❌ 不影响: 实际的游戏逻辑（在iframe内）

**需要rebuild：**
- `web-app` frontend

**需要测试：**
- 访问 `/game/:slug` 测试游戏加载
- 测试音效按钮显示和功能
- 测试全屏模式

---

### 2. 游戏状态显示系统 (Floating Status Display)

**实现日期：** 2026-02-01

#### 📍 位置
- **主文件：** `apps/web-app/src/views/game/index.vue`
- **API Endpoint：** `GET /api/scores/status/:instanceSlug`
- **Backend Service：** `apps/api/src/modules/scores/game-rules.service.ts` → `getPlayerStatus()`

#### 🎯 功能说明
在游戏页面左上角显示浮动状态卡，实时显示玩家的游戏状态、剩余次数、时间限制、冷却时间等信息。支持收起/展开，颜色自动根据状态变化（红=blocked, 黄=warning, 蓝/紫=normal）。

**同时支持Live Preview模式** - Admin在配置游戏时可以在预览界面看到完整的状态信息。

#### 🎨 显示内容

**1. One Time Only Warning**
- 显示：⚠️ One Time Only (Used)
- 条件：`gameStatus.oneTimeOnly === true`
- 如果已玩过：显示 "(Used)" 标签（红色）
- **隐藏每日次数显示** - 因为仅限一次是最高优先级

**2. Daily Limit (每日次数)**
- 显示：🎮 3/5 (剩余/总数)
- 条件：`!oneTimeOnly && dailyLimit > 0`
- 颜色逻辑：
  - 0次剩余 → 红色 (#ef4444)
  - 1次剩余 → 黄色 (#facc15)
  - 2+次剩余 → 蓝色/白色

**3. Time Limit (时间限制)**
- 显示：📅 Mon, Tue, Wed 10:00-20:00
- 条件：`timeLimitConfig.enable === true`
- 颜色逻辑：
  - **不在开放时间** → 红色 (#ef4444)
  - **在开放时间内** → 蓝色 (#60a5fa)
- 格式化：
  - Day names: Sun, Mon, Tue, Wed, Thu, Fri, Sat
  - Time range: HH:MM-HH:MM (24小时制)

**4. Cooldown Timer (冷却倒计时)**
- 显示：⏱️ 1m 30s
- 条件：`cooldownRemaining > 0`
- 实时倒计时 - 每秒更新
- 颜色：黄色 (#facc15) - warning状态

**5. Block Reason (阻止原因)**
- 显示在红色警告框内
- 所有文字为英文：
  - "Level too low! Need Lv5"
  - "Event not started yet"
  - "Event has ended"
  - "Not available today"
  - "Already played (one time only)"
  - "No attempts left today"

#### 🔘 Collapsed Button (收起状态)
- 小圆形按钮，显示信息图标
- 颜色状态：
  - **红色 (danger):**
    - `canPlay === false` (任何阻止原因)
    - `oneTimeOnly && hasPlayedEver`
    - `!isInActiveTime` (不在时间范围)
    - `remaining === 0` (次数用完)
  - **黄色 (warning):**
    - `cooldownRemaining > 0`
    - `remaining === 1`
  - **紫色 (normal):** 正常状态

#### 📊 API Response结构

**Backend返回的完整status：**
```json
{
  "canPlay": false,
  "dailyLimit": 5,
  "played": 5,
  "remaining": 0,
  "resetAt": "2026-02-02T00:00:00.000Z",
  "blockReason": "ALREADY_PLAYED",
  "blockDetails": {
    "message": "您已经玩过此游戏，每人仅限一次机会"
  },
  "oneTimeOnly": true,
  "hasPlayedEver": true,
  "timeLimitConfig": {
    "enable": true,
    "startTime": "09:00",
    "endTime": "21:00",
    "activeDays": [1, 2, 3, 4, 5]
  },
  "isInActiveTime": false,
  "cooldownRemaining": 45
}
```

#### ⚙️ Frontend实现细节

**Computed Properties:**
```javascript
// 按钮折叠状态的颜色
collapsedButtonStatus = computed(() => {
  if (!canPlay && blockReason) return 'danger';
  if (oneTimeOnly && hasPlayedEver) return 'danger';
  if (!isInActiveTime) return 'danger';
  if (remaining === 0) return 'danger';
  if (cooldownRemaining > 0) return 'warning';
  if (remaining === 1) return 'warning';
  return 'normal';
});

// 次数文字颜色
remainingColor = computed(() => {
  if (remaining === 0) return '#ef4444'; // Red
  if (remaining === 1) return '#facc15'; // Yellow
  return 'white'; // Normal
});
```

**Helper Functions:**
```javascript
// 格式化时间限制显示
formatTimeLimit(config) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = config.activeDays.map(d => dayNames[d]).join(', ');
  const time = `${config.startTime}-${config.endTime}`;
  return `${days} ${time}`;
}

// 格式化冷却时间
formatCooldown(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

#### 🔄 实时更新逻辑

**1. 初次加载：**
```javascript
onMounted(() => {
  fetchGameStatus(); // 获取初始状态
  if (cooldownRemaining > 0) {
    startCooldownTimer(); // 启动倒计时
  }
});
```

**2. Cooldown倒计时：**
```javascript
cooldownInterval = setInterval(() => {
  if (cooldownRemaining.value > 0) {
    cooldownRemaining.value--;
    // 更新iframe内的游戏引擎
    postMessage({ type: 'game-status-update', cooldownRemaining });
  } else {
    clearInterval(cooldownInterval);
    fetchGameStatus(); // 重新获取状态
  }
}, 1000);
```

**3. Refresh按钮：**
- 手动刷新状态
- 动画：按钮旋转

#### 🎯 Live Preview支持

**重要变更（2026-02-01）：**
- ✅ **移除了 `!isPreview` 条件** - preview模式下也显示status
- ✅ **Admin登录后可以在preview看到完整状态**
- ✅ **帮助admin验证配置是否正确**

**逻辑：**
```javascript
// 旧的逻辑 (错误)
if (isPreview.value || !authStore.token) return;

// 新的逻辑 (正确)
if (!authStore.token || !instanceSlug.value) return;
```

**好处：**
- Admin在编辑游戏配置时可以立即在preview看到效果
- 不需要publish后才能测试
- 修改"仅限一次"、"时间限制"等配置可以实时验证

#### 🌐 国际化 (i18n)

**前端统一使用英文** (2026-02-01):
- 所有用户可见文字为英文
- Admin backend保持中文
- 未来如需多语言，通过i18n框架实现

**文字映射：**
```javascript
const ERROR_MESSAGES = {
  'LEVEL_TOO_LOW': 'Level too low! Need Lv{level}',
  'NOT_STARTED': 'Event not started yet',
  'ENDED': 'Event has ended',
  'INVALID_DAY': 'Not available today',
  'ALREADY_PLAYED': 'Already played (one time only)',
  'NO_ATTEMPTS_LEFT': 'No attempts left today',
  'COOLDOWN_ACTIVE': 'Cooldown: {time}'
};
```

#### 🔗 与游戏引擎的通信

**postMessage to iframe:**
```javascript
iframeRef.contentWindow.postMessage({
  type: 'game-status-update',
  status: {
    canPlay: gameStatus.canPlay,
    blockReason: gameStatus.blockReason,
    cooldownRemaining: cooldownRemaining
  }
}, '*');
```

**游戏引擎接收：**
```javascript
window.addEventListener('message', (e) => {
  if (e.data.type === 'game-status-update') {
    const { canPlay, blockReason } = e.data.status;
    // 更新Spin按钮状态
    document.getElementById('spin-btn').disabled = !canPlay;
  }
});
```

#### 🐛 常见问题

**1. 问题：Preview模式看不到status**
- **原因：** 旧版本有 `!isPreview` 条件
- **解决：** 已修复（2026-02-01），rebuild web-app

**2. 问题：颜色不显示（白色）**
- **原因：** Inline style被parent CSS覆盖
- **解决：** 使用computed property + inline style (优先级最高)

**3. 问题：Time limit显示中文**
- **原因：** dayNames用了中文数组
- **解决：** 改为 `['Sun', 'Mon', ...]`

**4. 问题：Cooldown不倒计时**
- **原因：** Interval没有启动或被清除
- **解决：** 检查 `startCooldownTimer()` 是否被调用

**5. 问题：API返回数据但前端不显示**
- **原因：** Frontend没有rebuild
- **解决：** `docker compose build --no-cache web-app`

#### 🚨 修改影响范围

**Backend修改（game-rules.service.ts）：**
- ✅ 添加新字段到API response
- ✅ 不影响现有游戏逻辑
- ⚠️ 需要rebuild API容器

**Frontend修改（index.vue）：**
- ✅ 新增status display UI
- ✅ 支持preview模式
- ✅ 统一英文文字
- ⚠️ 需要rebuild web-app容器

**需要测试：**
1. 正常游戏页面显示status
2. Live preview显示status
3. 所有状态颜色正确（红/黄/蓝）
4. Cooldown倒计时工作
5. Time limit显示正确
6. One time only显示和隐藏逻辑
7. Refresh按钮工作
8. Collapsed button颜色状态

---

### 3. 音效系统

#### 📍 位置
- **Store：** `apps/web-app/src/store/settings.ts`
- **使用位置：**
  - `views/game/index.vue` - 音效按钮
  - (游戏引擎内部也可能使用)

#### 🎯 功能说明
全局音效开关，控制游戏的所有音效（BGM、音效、win/lose sounds等）

#### ⚙️ 配置项
- `soundEnabled` (boolean, default: true) - 音效是否启用
- 存储在 localStorage (`soundEnabled` key)

#### 🔗 依赖关系
**依赖于：**
- localStorage - 持久化音效设置

**被依赖于：**
- 游戏容器 - 显示音效按钮
- 游戏引擎 - 控制音效播放（通过postMessage）

#### 🔧 工作原理
1. 初始化时从localStorage读取设置
2. 用户点击音效按钮 → toggleSound()
3. 更新store state
4. 保存到localStorage
5. （如果需要）通过postMessage通知iframe

#### 📊 数据流
```
User clicks sound button
  → settingsStore.toggleSound()
  → Update state
  → Save to localStorage
  → (Optional) postMessage to iframe
```

#### 🐛 常见问题
1. **问题：** 音效设置不记住
   **原因：** localStorage被清除
   **解决：** 重新设置音效

#### 🚨 修改影响范围
**修改这个store会影响：**
- ✅ 所有依赖音效设置的组件
- ✅ 游戏引擎的音效播放

**需要rebuild：**
- `web-app` frontend

**需要测试：**
- 点击音效按钮
- 刷新页面验证设置持久化
- 验证游戏内音效确实被开启/关闭

---

## 🎛️ Admin Panel (soybean-admin)

### 3. 游戏实例列表

#### 📍 位置
- **主文件：** `apps/soybean-admin/src/views/management/game-instance/index.vue`
- **相关文件：**
  - `api/` - API调用模块

#### 🎯 功能说明
显示所有游戏实例的列表，支持：
- 查看、编辑、删除游戏实例
- 创建新游戏实例
- 发布/下线游戏
- 复制游戏URL

#### ⚙️ 功能列表
- 搜索和筛选
- 分页
- 状态管理（draft/published）
- Batch operations（未来功能）

#### 🔗 依赖关系
**依赖于：**
- API endpoint: `/api/game-instances` - CRUD operations
- Router - 导航到编辑页面

**被依赖于：**
- Dashboard - 快速访问游戏管理

#### 🔧 工作原理
1. 页面加载时调用API获取游戏列表
2. 显示table with columns: name, game type, status, actions
3. 点击edit → 导航到 `/game-instance/:id/edit`
4. 点击delete → 确认后调用API删除

#### 🐛 常见问题
1. **问题：** 列表加载失败
   **原因：** API连接问题或权限不足
   **解决：** 检查network tab，验证用户权限

#### 🚨 修改影响范围
**修改这个文件会影响：**
- ✅ 游戏管理界面
- ❌ 不影响: 游戏本身的功能

**需要rebuild：**
- `admin` frontend

---

### 4. 游戏配置表单 (ConfigForm) - 🔥 最复杂

#### 📍 位置
- **主文件：** `apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue`
- **相关文件：**
  - `locales/langs/zh-cn.ts` - 中文翻译
  - `locales/langs/en-us.ts` - 英文翻译
  - `seed.service.ts` (API) - Schema定义

#### 🎯 功能说明
**这是整个Admin Panel最复杂的组件！** 动态渲染游戏配置表单，支持：
- 多tab布局（奖品配置、规则配置、外观与交互、特效与音频）
- 动态表单（根据game template的schema生成）
- 文件上传（图片、音频等）
- 颜色选择器
- 概率计算和自动平衡
- i18n多语言支持

#### ⚙️ Schema驱动
ConfigForm的表单是**动态生成**的，根据game template的schema：
```typescript
// 来自 seed.service.ts
{
  name: 'showSoundButton',
  type: 'boolean',
  label: 'Show Sound Button',
  defaultValue: true,
  tab: 'effects'
}
```

#### 🔗 依赖关系
**依赖于：**
- API endpoint: `/api/game-templates/:id/schema` - 获取schema
- API endpoint: `/api/game-instances/:id/config` - 保存配置
- API endpoint: `/game-instances/upload` - 上传文件
- i18n system - 翻译所有labels

**被依赖于：**
- 游戏实例编辑页面

#### 🔧 工作原理（简化版）
1. 从API获取game template的schema
2. 遍历schema生成表单fields
3. 根据field type渲染不同的input（text/number/color/file等）
4. 用户修改 → 更新formModel
5. 点击保存 → 调用API更新config
6. i18n: 使用 `t('page.manage.game.common.fieldName')` 翻译labels

#### 📊 数据流
```
Load page
  → API: Get game template schema
  → Parse schema
  → Render form dynamically
  
User edits
  → Update formModel
  → (Auto-save or manual save)
  → API: Update game instance config
```

#### ✨ 新功能：Tab Validation Status Display (2026-02-01)
**功能：** 当tab有validation error时，tab标签显示红色文字和❌图标

**实现：**
- 添加 `isTabValid(tabName)` 函数检查tab validation状态
- Prizes tab: 检查总概率是否=100%
- Invalid tab的header显示红色 + ❌图标
- 用户可一眼识别哪个tab需要修正

**代码位置：**
- `ConfigForm.vue` line ~685 (isTabValid函数)
- `ConfigForm.vue` line ~1033 (tab template conditional class)

**扩展性：**
- 可以为其他tabs添加validation rules
- 例如：Rules tab检查dailyLimit>0，Visuals tab检查colors数量等

#### 🐛 常见问题
1. **问题：** 新配置项不显示
   **原因：** Schema没更新或Admin没rebuild
   **解决：** 重新run `/api/seed/run` + rebuild admin

2. **问题：** 翻译显示key而不是文本
   **原因：** i18n定义缺失或有重复key
   **解决：** 检查 `zh-cn.ts` 和 `en-us.ts`，确保没有重复的object keys

3. **问题：** 文件上传失败
   **原因：** 文件太大或格式不支持
   **解决：** 检查file size (<50MB)，检查MIME type

#### 🚨 修改影响范围
**修改ConfigForm.vue会影响：**
- ✅ 所有游戏的配置界面
- ✅ 表单验证逻辑
- ✅ 文件上传功能
- ❌ 不影响: 游戏本身（只影响配置界面）

**修改seed.service.ts (schema)会影响：**
- ✅ ConfigForm渲染的fields
- ✅ 游戏的默认配置
- ✅ **必须同时rebuild api + admin**
- ✅ **必须重新run /api/seed/run**

**需要rebuild：**
- `admin` frontend (任何UI改动)
- `api` + `admin` (schema改动)

**需要测试：**
- 编辑一个游戏实例
- 测试所有tabs的字段
- 测试文件上传
- 验证翻译正确显示
- 保存并验证config已更新

---

### 5. i18n翻译系统

#### 📍 位置
- **配置：** `apps/soybean-admin/src/locales/index.ts`
- **翻译文件：**
  - `locales/langs/zh-cn.ts` - 中文
  - `locales/langs/en-us.ts` - 英文
- **使用：** 所有Vue components (`{{ t('key') }}`)

#### 🎯 功能说明
多语言支持系统，允许界面在中文和英文之间切换。

#### ⚙️ 配置项
- `locale` - 当前语言（localStorage: 'lang'）
- `fallbackLocale` - 后备语言（'en-US'）

#### 🔗 依赖关系
**依赖于：**
- vue-i18n - i18n library
- locale files - 翻译定义

**被依赖于：**
- 所有需要翻译的components

#### 🔧 工作原理
1. App初始化时setup i18n
2. 从localStorage读取用户的语言偏好
3. Components使用 `t('key')` 获取翻译
4. 如果key不存在，返回key本身（fallback）

#### 🐛 常见问题
1. **问题：** 显示key而不是翻译
   **原因：** 翻译key不存在或有typo
   **解决：** 检查zh-cn.ts和en-us.ts，确保key存在

2. **问题：** 有些翻译是英文，有些是中文
   **原因：** locale设置混乱或翻译缺失
   **解决：** 检查当前locale，补充缺失的翻译

3. **问题：** 重复的object key导致翻译覆盖 (2026-01-31 case)
   **原因：** 同一个object里有两个相同的key
   **解决：** 合并重复的定义

#### 🚨 修改影响范围
**修改翻译文件会影响：**
- ✅ 所有使用该key的界面
- ❌ 不影响: 功能逻辑

**需要rebuild：**
- `admin` frontend

**需要测试：**
- 切换语言
- 验证所有界面的翻译正确显示
- 检查是否有显示key的地方

**⚠️ 重要规则（2026-01-31 lesson）：**
1. 永远检查是否已有同名key
2. 不要在同一个object里定义两个同名key
3. 添加新翻译时，同时更新zh-cn.ts和en-us.ts

---

## ⚙️ 后端 API (api)

### 6. 游戏模板Seed系统

#### 📍 位置
- **主文件：** `apps/api/src/modules/seed/seed.service.ts`
- **Controller：** `apps/api/src/modules/seed/seed.controller.ts`
- **Endpoint：** `POST /api/seed/run`

#### 🎯 功能说明
定义和初始化游戏模板（Game Templates），包括：
- 游戏类型（Spin Wheel, Scratch Card等）
- Schema定义（配置项的类型、默认值、验证规则）
- 默认配置
- i18n keys

**这是整个系统的"基因"！** Schema决定了ConfigForm如何渲染。

#### ⚙️ Schema结构
```typescript
interface SchemaItem {
  name: string;          // 配置项名称
  type: string;          // 类型 (string/number/boolean/color/file/array等)
  label?: string;        // 显示label（如果不用i18n）
  i18nKey?: string;      // i18n key（优先使用）
  defaultValue?: any;    // 默认值
  tab: string;           // 属于哪个tab (prizes/rules/visuals/effects)
  required?: boolean;    // 是否必填
  validation?: object;   // 验证规则
}
```

#### 🔗 依赖关系
**依赖于：**
- Database - 存储game templates
- TypeORM entities - GameTemplate entity

**被依赖于：**
- ConfigForm - 读取schema渲染表单
- Game instances - 创建时选择template

#### 🔧 工作原理
1. 开发者在seed.service.ts定义game templates
2. 调用 `/api/seed/run` 初始化数据库
3. Templates存储在database
4. ConfigForm从API读取schema
5. 动态渲染配置表单

#### 🐛 常见问题
1. **问题：** 新配置项在Admin Panel不显示
   **原因：** Seed没有重新run或Admin没rebuild
   **解决：** 
     - 修改seed.service.ts
     - Rebuild API
     - 重新run `/api/seed/run`
     - Rebuild Admin
     - 刷新Admin Panel

2. **问题：** Schema改动后旧游戏显示错误
   **原因：** 旧游戏的config不包含新字段
   **解决：** 编辑旧游戏，保存一次（会补充默认值）

#### 🚨 修改影响范围
**修改seed.service.ts会影响：**
- ✅ 新创建的游戏模板
- ✅ ConfigForm的表单结构
- ✅ 游戏的默认配置
- ❌ 不直接影响: 已存在的游戏实例（需要手动编辑）

**完整的修改流程：**
```bash
# 1. 修改seed.service.ts
vim apps/api/src/modules/seed/seed.service.ts

# 2. Rebuild API
docker compose build --no-cache api

# 3. Restart API
docker compose up -d api

# 4. 重新run seed
curl -X POST https://api.xseo.me/api/seed/run

# 5. Rebuild Admin (如果schema结构变化)
docker compose build --no-cache admin
docker compose up -d admin

# 6. 测试
# - 创建新游戏实例
# - 验证新配置项显示
# - 验证翻译正确
```

**需要测试：**
- 创建新游戏实例
- 验证所有配置项显示
- 验证默认值正确
- 编辑旧游戏验证向后兼容

---

## 📝 文档维护说明

### 更新规则
**每次修改代码后，必须立即更新这个文档！**

1. ✅ 添加了新功能 → 添加新章节
2. ✅ 修改了现有功能 → 更新对应章节
3. ✅ 解决了bug → 更新"常见问题"
4. ✅ 改变了依赖关系 → 更新"依赖关系"
5. ✅ 改变了影响范围 → 更新"修改影响范围"

### 文档质量检查
每个功能章节必须包含：
- [ ] 位置（代码文件路径）
- [ ] 功能说明
- [ ] 配置项（如果有）
- [ ] 依赖关系
- [ ] 工作原理
- [ ] 常见问题
- [ ] 修改影响范围
- [ ] 测试方法

---

**这个文档是living document - 随代码一起演进！**

### 7. 游戏实例CRUD API

#### 📍 位置
- **Controller：** `apps/api/src/modules/game-instances/game-instances.controller.ts`
- **Service：** `apps/api/src/modules/game-instances/game-instances.service.ts`
- **Entity：** `apps/api/src/modules/game-instances/entities/game-instance.entity.ts`

#### 🎯 功能说明
游戏实例的完整CRUD操作，支持：
- 创建新游戏实例
- 获取游戏列表（支持筛选和分页）
- 获取单个游戏详情
- 更新游戏配置
- 删除游戏
- 发布/下线游戏

#### ⚙️ 主要Endpoints
```typescript
POST   /api/game-instances          // 创建游戏
GET    /api/game-instances          // 获取列表
GET    /api/game-instances/:slug    // 获取详情
PATCH  /api/game-instances/:id      // 更新配置
DELETE /api/game-instances/:id      // 删除游戏
POST   /api/game-instances/upload   // 上传文件（图片/音频）
GET    /api/game-instances/:slug/play  // 获取游戏播放URL
```

#### 🔗 依赖关系
**依赖于：**
- GameTemplate entity - 创建时选择模板
- Database (PostgreSQL) - 存储数据
- File upload system - 处理图片/音频上传
- Auth guard - 验证权限

**被依赖于：**
- Admin Panel - 管理游戏
- Web App - 玩游戏

#### 🔧 工作原理

**创建游戏流程：**
1. Admin选择game template
2. POST /api/game-instances with templateId
3. 复制template的默认config
4. 生成唯一slug
5. 保存到database
6. 返回新游戏的ID和slug

**更新游戏流程：**
1. Admin修改ConfigForm
2. PATCH /api/game-instances/:id with new config
3. 验证config格式
4. 更新database
5. 返回更新后的游戏

**播放游戏流程：**
1. 用户访问 /game/:slug
2. Web app调用 GET /api/game-instances/:slug/play
3. API验证game是published
4. 返回game config和iframe URL
5. Web app加载游戏

#### 📊 数据模型
```typescript
GameInstance {
  id: string;
  name: string;
  slug: string;         // URL-friendly唯一标识
  templateId: string;   // 关联的game template
  config: object;       // 游戏配置（JSON）
  status: enum;         // draft/published/archived
  companyId: string;    // 所属公司
  createdBy: string;    // 创建者
  createdAt: Date;
  updatedAt: Date;
}
```

#### 🐛 常见问题
1. **问题：** 创建游戏失败
   **原因：** 缺少必填字段或templateId无效
   **解决：** 检查request body，验证template存在

2. **问题：** 更新config后游戏显示还是旧配置
   **原因：** 浏览器缓存或web app没有重新加载config
   **解决：** Hard refresh浏览器

3. **问题：** Slug重复错误
   **原因：** 同名游戏已存在
   **解决：** 修改游戏名称或手动指定slug

#### 🚨 修改影响范围
**修改Controller/Service会影响：**
- ✅ 所有游戏管理操作
- ✅ Admin Panel的功能
- ✅ Web App的游戏加载

**需要rebuild：**
- `api` backend

**需要重启：**
- API服务

**需要测试：**
- 创建新游戏
- 编辑游戏配置
- 发布游戏
- 访问游戏URL验证加载
- 删除游戏

---

### 8. 文件上传系统

#### 📍 位置
- **Endpoint：** `POST /api/game-instances/upload`
- **Controller：** `apps/api/src/modules/game-instances/game-instances.controller.ts` (line 886)

#### 🎯 功能说明
处理游戏相关的文件上传，支持：
- 图片（logo, background, prizes等）
- 音频文件（BGM, sound effects）
- 自定义字体文件
- 自动文件命名和存储

#### ⚙️ 配置项
- **最大文件大小：** 50MB
- **支持格式：**
  - 图片: jpg, jpeg, png, gif, webp
  - 音频: mp3, wav, ogg
  - 字体: ttf, otf, woff, woff2
- **存储位置：** `uploads/` 目录

#### 🔗 依赖关系
**依赖于：**
- Multer middleware - 处理文件上传
- File system - 存储文件
- (Optional) CDN - 提供文件URL

**被依赖于：**
- ConfigForm - 上传按钮
- 游戏实例 - 使用上传的文件

#### 🔧 工作原理
1. ConfigForm触发文件选择
2. POST /api/game-instances/upload with FormData
   - file: File对象
   - instanceId: 游戏ID（可选）
   - customName: 自定义文件名（可选）
   - category: 文件类别（可选，如'bgm', 'logo'等）
3. API验证文件类型和大小
4. 生成唯一文件名（避免覆盖）
5. 保存到 `uploads/` 目录
6. 返回文件URL
7. ConfigForm更新对应的config字段

#### 📊 数据流
```
User selects file
  → ConfigForm triggerUpload()
  → FormData with file
  → POST /api/game-instances/upload
  → Validate file
  → Save to uploads/{companyId}/{instanceId}/{category}/
  → Return file URL
  → ConfigForm updates config.fieldName
  → User saves game config
```

#### 🎵 音效上传三模式（2026-01-31新增）⭐

**功能：** ConfigForm的音效字段支持三种模式，带完整的UX体验。

**三种模式：**

1. **🎵 使用主题默认音效**
   - 值：`__THEME_DEFAULT__` 或 `/templates/{theme}/audio.mp3`
   - 使用当前主题的默认音效
   - 主题切换时自动更新音效
   - 不占用用户存储空间
   - ✅ 显示预览按钮（可播放/停止）

2. **📤 自定义上传**
   - 值：
     - 未上传：`__CUSTOM_PENDING__` (internal placeholder，不显示给用户)
     - 已上传：`/api/uploads/{companyId}/{instanceId}/audio/{filename}`
   - 用户上传自己的音效文件
   - 存储到用户专属文件夹
   - **不会replace主题文件** ✅
   - ✅ 显示预览按钮（上传后可用）
   - ✅ Input显示友好placeholder："请上传音效文件"

3. **🔇 不使用音效**
   - 值：空字符串 `''` 或 `null`
   - 完全禁用该音效
   - 游戏引擎跳过播放
   - ✅ **隐藏音量/循环播放选项**（User-Centric！）

**🎮 完整的UX体验（重要！）：**

1. **Preview按钮的完整行为：**
   - 点击"预览" → 播放音效 + 按钮变为"⏸️ 停止"
   - 再点击 → 停止播放 + 按钮恢复为"▶️ 预览"
   - 播放结束后1.5秒自动恢复按钮
   - **防止重叠播放**：点击另一个预览会停止当前播放
   - State tracking：`audioPlayingStates` ref记录每个按钮状态
   - Dynamic button text：根据state显示不同文字

2. **条件显示选项（User-Centric）：**
   - 选择"不使用音效" → **隐藏**音量和循环播放选项
     - 原因：用户都不用音效了，显示音量选项会困惑
   - 选择"自定义上传"或"使用主题" → **显示**音量和循环播放选项
     - 即使还没上传，也显示（用户intent是要用音效）

3. **File Picker正确识别audio files：**
   - Accept attribute：`audio/*,audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a,.aac`
   - 同时提供MIME types和file extensions（browser compatibility）
   - **使用`nextTick()`等待DOM更新**后才打开picker（关键！）

**实现细节：**

1. **ConfigForm.vue Helper Functions:**
   
   **Audio Mode Management:**
   - `getAudioMode(key)` - **从formModel实时derive mode（reactive）**
     - ⚠️ 不再cache到audioModes，直接根据当前value判断
     - 这样radio切换时UI立即更新
   - `setAudioMode(key, mode)` - 设置mode并更新formModel值
     - none: `''`
     - theme: `'__THEME_DEFAULT__'`
     - custom: `'__CUSTOM_PENDING__'` (未上传时的placeholder)
   - `getThemeAudioUrl(key)` - 获取当前主题的默认音效URL

   **Audio Preview Management:**
   - `currentAudio` - 当前播放的HTMLAudioElement
   - `audioPlayingStates` ref - 记录每个按钮的playing state
   - `toggleAudioPreview(key, url)` - Toggle play/stop
     - 如果正在播放 → 停止
     - 如果其他按钮在播放 → 先停止它
     - 播放新音效 + 更新button state
     - Audio ended → 1.5秒后auto-reset button
   - `getPreviewButtonText(key, isTheme)` - Dynamic button text
     - Playing: "⏸️ 停止"
     - Idle: "▶️ 预览主题音效" 或 "▶️ 预览"

   **File Upload:**
   - `async triggerUpload(key, name, category, item, accept)` - **async！**
     - 设置`currentUploadTarget`（包含accept attribute）
     - **`await nextTick()`** - 等待Vue更新DOM ⚠️ 关键！
     - 然后才click() file input
     - 这样accept attribute已更新，file picker正确识别

   **Main Section Render (line 1229-1283):**
   - 处理top-level fields
   - Radio group显示三种选项
   - Conditional UI（custom mode显示upload button和preview）

   **⚠️ Nested Collapse-Group Render (line 1143-1199):**
   - **Audio fields实际在这里！** (bgmUrl, winSound等都在collapse-group里)
   - 需要**复制完整的audio三模式logic**
   - 使用`subItem.key`而不是`item.key`
   - **Bug防范：** 修改audio field UI时，两个section都要更新！

2. **Game Engine (spin-wheel.template.ts):**
   - `resolveAudioUrl(audioUrl, themeSlug, audioType)` - 解析audio URL
   - **四种情况：**
     1. 空字符串 `''` → 不播放音效（用户选"不使用"）
     2. `'__CUSTOM_PENDING__'` → 不播放音效（用户选custom但还没上传）
     3. `'__THEME_DEFAULT__'` 或 undefined → 使用theme默认音效
     4. 实际URL → 使用用户上传的音效

3. **Upload API:**
   - 路径结构：`uploads/{companyId}/{instanceId}/audio/`
   - 主题文件：`uploads/templates/{theme}/`
   - **完全分离，互不影响** ✅

**⚠️ 重要：Audio Fields在Collapse-Group里！**

Audio fields定义在seed schema的collapse-group中：
```typescript
{
  key: 'bgm_section',
  type: 'collapse-group',
  items: [
    { key: 'bgmUrl', type: 'file', ... },
    { key: 'bgmVolume', type: 'slider', ... }
  ]
}
```

这意味着：
- ✅ 它们会被nested render logic处理（line 1099-1155）
- ❌ 不会被main section render处理（line 1229+）
- 🎯 **修改audio UI时，必须修改collapse-group section！**

**文件存储示例：**
```
uploads/
  ├── templates/                    # 主题默认文件（不会被替换）
  │   ├── cyberpunk-elite/
  │   │   ├── bgm.mp3
  │   │   ├── win.mp3
  │   │   └── lose.mp3
  │   └── neon-night/
  │       └── ...
  └── {companyId}/                  # 用户文件
      └── {instanceId}/
          └── audio/                # 用户上传的音效
              ├── bgm.mp3
              ├── win.mp3
              └── jackpot.mp3
```

**完整测试checklist：**

1. **三种模式切换：**
   - ✅ 选"使用主题默认" → **立即显示**预览按钮
   - ✅ 选"自定义上传" → **立即显示**上传按钮（不需要关闭再打开collapse）
   - ✅ 选"不使用音效" → **立即隐藏**音量/循环选项

2. **Preview按钮完整体验：**
   - ✅ 点击"预览" → 播放 + 按钮变"⏸️ 停止"
   - ✅ 再点击 → 停止 + 恢复按钮
   - ✅ 多次点击同一按钮 → 不会重叠播放（toggle行为）
   - ✅ 点击另一个预览 → 停止当前播放，播放新的
   - ✅ 播放结束 → 1.5秒后自动恢复按钮

3. **File Picker测试：**
   - ✅ 点击"上传音效文件" → File picker只显示audio files
   - ✅ 点击"上传图片" → File picker只显示image files
   - ✅ 上传成功后 → input显示实际URL，不是`__CUSTOM_PENDING__`

4. **UX验证：**
   - ✅ Custom模式未上传时 → input显示placeholder"请上传音效文件"
   - ✅ 不使用音效时 → 音量/循环选项隐藏（不困惑用户）
   - ✅ 所有操作都是reactive，不需要refresh

5. **Data flow验证：**
   - ✅ 切换主题 → 默认音效自动跟随
   - ✅ 保存后 → 游戏引擎正确播放对应音效
   - ✅ 验证用户文件存储路径正确

#### 🐛 常见问题和解决方案

1. **问题：** Preview按钮点击后多次重叠播放，很吵
   **原因：** 每次点击都创建new Audio()，没有stop previous
   **解决：** ✅ 已修复 - 使用state tracking + stop previous audio
   **代码：** `toggleAudioPreview()` 函数

2. **问题：** 选择radio后UI不更新，需要关闭再打开collapse
   **原因：** `getAudioMode()`依赖cached audioModes，不reactive
   **解决：** ✅ 已修复 - getAudioMode()直接从formModel derive，完全reactive
   **代码：** Line ~95 `getAudioMode()` always derives from current formModel

3. **问题：** File picker显示"Image Files"而不是audio files
   **原因：** Vue reactivity是异步的，click()时accept attribute还没更新到DOM
   **解决：** ✅ 已修复 - 使用`await nextTick()`等待DOM更新后才click
   **代码：** `async triggerUpload()` + `await nextTick()`

4. **问题：** Input显示`__CUSTOM_PENDING__`给用户看
   **原因：** 直接用v-model绑定formModel，internal value暴露了
   **解决：** ✅ 已修复 - 用`:value`computed，如果是pending显示空字符串
   **代码：** `:value="formModel[key] === '__CUSTOM_PENDING__' ? '' : formModel[key]"`

5. **问题：** 条件隐藏的音量选项没生效
   **原因：** Seed schema的condition已添加，但existing instances没refresh
   **解决：** ✅ 运行data seeder refresh - `PATCH /api/seed/refresh-schemas`
   **代码：** SeedService.refreshGameSchemas()

6. **问题：** 上传失败 - 413 Payload Too Large
   **原因：** 文件超过50MB
   **解决：** 压缩文件或选择更小的文件

7. **问题：** 上传失败 - 415 Unsupported Media Type
   **原因：** 文件格式不支持
   **解决：** 转换文件格式

8. **问题：** 文件上传成功但游戏里看不到
   **原因：** URL路径错误或文件没有public access
   **解决：** 检查file URL，确保可以直接访问

#### 🚨 修改影响范围

**修改音效三模式logic会影响：**
- ✅ ConfigForm - 所有audio fields的UI和行为
- ✅ Game Engine - audio URL解析和播放
- ✅ Seed Service - schema定义和refresh
- ✅ 用户体验 - 所有涉及音效配置的操作

**需要rebuild：**
- `admin` frontend (ConfigForm changes)
- `api` backend (template changes)

**需要测试：**
- ✅ 三种模式切换的UI reactivity
- ✅ Preview按钮的完整behavior（play/stop/auto-reset）
- ✅ File picker正确识别file types
- ✅ 条件显示/隐藏选项
- ✅ 上传后的data flow
- ✅ 游戏引擎正确播放音效
- ✅ Refresh schemas应用到existing instances

**User-Centric Principles Applied:**
- 不显示internal values（`__CUSTOM_PENDING__`）给用户
- 用友好的placeholder text
- 隐藏无意义的选项（不使用音效 → 隐藏音量）
- 完整的interaction flow（preview可以play/stop）
- 防止annoying behavior（重叠播放）
- Immediate reactive feedback（不需要关闭再打开）

---

### 9. 用户认证系统

#### 📍 位置
- **Module：** `apps/api/src/modules/auth/`
- **Controller：** `auth.controller.ts`
- **Service：** `auth.service.ts`
- **Strategy：** `jwt.strategy.ts`
- **Guard：** `jwt-auth.guard.ts`

#### 🎯 功能说明
完整的JWT认证系统，支持：
- 用户登录
- Token生成和验证
- Protected routes
- Refresh token（可能）
- Permission checking

#### ⚙️ 配置项
- **JWT Secret：** 环境变量 `JWT_SECRET`
- **Token过期时间：** 可配置（默认24h）
- **Refresh token：** 可配置

#### 🔗 依赖关系
**依赖于：**
- User entity - 用户数据
- bcrypt - 密码哈希
- @nestjs/jwt - JWT生成
- @nestjs/passport - 认证策略

**被依赖于：**
- 所有需要认证的endpoints
- Web App - 用户登录
- Admin Panel - 管理员登录

#### 🔧 工作原理

**登录流程：**
1. 用户输入username/password
2. POST /api/auth/login
3. 验证credentials
4. 生成JWT token
5. 返回token + user info
6. Client保存token (localStorage)
7. 后续请求带上 `Authorization: Bearer <token>`

**Protected endpoint流程：**
1. Client发送请求with Authorization header
2. JwtAuthGuard拦截
3. 验证token是否有效
4. 解码token获取user info
5. 注入到request.user
6. Controller可以访问request.user

#### 📊 Token结构
```typescript
{
  sub: string;      // User ID
  username: string;
  email: string;
  roles: string[];  // 用户角色
  iat: number;      // 签发时间
  exp: number;      // 过期时间
}
```

#### 🐛 常见问题
1. **问题：** 401 Unauthorized
   **原因：** Token过期或无效
   **解决：** 重新登录获取新token

2. **问题：** Token验证失败
   **原因：** JWT_SECRET配置错误
   **解决：** 检查环境变量，确保前后端一致

3. **问题：** 登录成功但无法访问protected routes
   **原因：** Token没有正确保存或发送
   **解决：** 检查localStorage和Authorization header

#### 🚨 修改影响范围
**修改认证logic会影响：**
- ✅ 所有需要登录的功能
- ✅ Token验证流程
- ✅ 用户权限检查

**需要rebuild：**
- `api` backend

**需要重启：**
- API服务

**需要测试：**
- 登录功能
- Token验证
- Protected routes
- Token过期处理
- Logout功能

---

## 📝 Checkpoint 2 Summary

**已新增功能 (3个):**
- 游戏实例CRUD API
- 文件上传系统
- 用户认证系统

**总进度：** 9/17 (53%)


### 10. 转盘游戏引擎 (Spin Wheel Template)

#### 📍 位置
- **Template Generator：** `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts`
- **Called by：** `game-instances.controller.ts` (GET /:slug/play endpoint)

#### 🎯 功能说明
生成完整的HTML游戏引擎，包含：
- 转盘渲染（Canvas/SVG）
- 旋转动画
- 概率计算和奖品选择
- 音效系统
- UI渲染（按钮、logo、token bar等）
- 结果展示

**这是游戏的"心脏"** - 所有游戏逻辑都在这个template里！

#### ⚙️ 输入参数 (SpinWheelConfig)
```typescript
{
  prizeList: Prize[];         // 奖品列表
  spinDuration: number;       // 旋转时间(ms)
  spinTurns: number;          // 旋转圈数
  bgColor: string;            // 背景颜色
  bgImage: string;            // 背景图片
  spinBtnText: string;        // 按钮文字
  soundEnabled: boolean;      // 音效开关
  // ... 还有几十个配置项
}
```

#### 🔗 依赖关系
**依赖于：**
- Game instance config - 所有游戏配置
- Uploaded assets - 图片/音频文件

**被依赖于：**
- Game iframe - 加载这个HTML

#### 🔧 工作原理

**生成流程：**
1. GET /:slug/play endpoint被调用
2. 从database读取game instance config
3. 调用 `generateSpinWheelHtml(config)`
4. Template生成完整的HTML（包含CSS + JavaScript）
5. 返回HTML string
6. Iframe加载这个HTML
7. 游戏开始运行

**游戏运行流程（在生成的HTML内）：**
1. 初始化Canvas/SVG渲染转盘
2. 绘制奖品区块
3. 用户点击SPIN按钮
4. 客户端计算中奖奖品（根据概率）
5. 执行旋转动画
6. 到达目标角度后停止
7. 显示结果popup
8. 播放音效（如果启用）
9. （可选）调用API记录结果

**概率计算：**
```typescript
// 每个prize有chance属性（百分比）
prize = {
  name: "100 coins",
  chance: 10,  // 10% 概率
  value: 100
}

// 生成随机数选择奖品
const random = Math.random() * 100;
let cumulative = 0;
for (prize of prizeList) {
  cumulative += prize.chance;
  if (random < cumulative) {
    return prize; // 中奖！
  }
}
```

#### 📊 生成的HTML结构
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* 所有CSS样式 */
    .wheel { ... }
    .spin-button { ... }
  </style>
</head>
<body>
  <div class="game-container">
    <canvas id="wheel"></canvas>
    <button class="spin-button">SPIN</button>
    <div class="result-popup"></div>
  </div>
  
  <script>
    // 所有游戏逻辑
    function initWheel() { ... }
    function spin() { ... }
    function calculateResult() { ... }
  </script>
</body>
</html>
```

#### 🐛 常见问题
1. **问题：** 转盘不显示
   **原因：** Canvas初始化失败或prizeList为空
   **解决：** 检查browser console，确保prizeList有数据

2. **问题：** 概率不准确
   **原因：** prizeList的chance总和不是100%
   **解决：** 在ConfigForm使用"Auto Balance"功能

3. **问题：** 图片/音频加载失败
   **原因：** 文件URL错误或文件不存在
   **解决：** 检查uploaded files，验证URL可访问

#### 🚨 修改影响范围
**修改spin-wheel.template.ts会影响：**
- ✅ 所有Spin Wheel类型的游戏
- ✅ 游戏的视觉效果和动画
- ✅ 概率计算逻辑
- ❌ 不影响: 游戏配置（在database里）

**需要rebuild：**
- `api` backend

**需要重启：**
- API服务

**需要测试：**
- 创建一个Spin Wheel游戏
- 访问游戏URL
- 测试旋转功能
- 验证概率准确性
- 测试所有配置项（音效、图片、动画等）

**⚠️ 注意：**
这个template是**server-side生成**的，不是client-side。每次访问游戏URL都会重新生成HTML。

---

### 11. Admin Panel - 会员管理

#### 📍 位置
- **Module：** `apps/api/src/modules/members/`
- **Frontend：** `apps/soybean-admin/src/views/management/member/`

#### 🎯 功能说明
管理游戏的会员（玩家），支持：
- 查看会员列表
- 会员详情
- Token余额管理
- 游戏历史记录
- 封禁/解封会员

#### ⚙️ 功能列表
- CRUD操作
- Token充值/扣除
- 游戏记录查询
- 统计数据

#### 🔗 依赖关系
**依赖于：**
- Member entity
- Game history records
- Company association

**被依赖于：**
- 游戏系统 - 验证会员身份和余额
- 统计系统 - 会员数据分析

#### 🔧 工作原理
1. Admin访问会员管理页面
2. 调用API获取会员列表
3. 可以查看会员详情
4. 可以修改token余额
5. 可以查看游戏历史

#### 🐛 常见问题
1. **问题：** 会员token余额不更新
   **原因：** Cache或database同步问题
   **解决：** 刷新页面，检查database

#### 🚨 修改影响范围
**需要rebuild：**
- `api` (如果改后端)
- `admin` (如果改前端)

---

### 12. 游戏历史/统计系统

#### 📍 位置
- **Module：** `apps/api/src/modules/scores/` (或类似的history module)

#### 🎯 功能说明
记录和展示游戏数据：
- 每次游戏的结果
- 玩家的游戏历史
- 统计数据（总游戏次数、总奖励等）
- 数据分析

#### ⚙️ 数据记录
每次游戏后记录：
- 玩家ID
- 游戏ID
- 中奖奖品
- 时间戳
- Token消耗
- 奖励金额

#### 🔗 依赖关系
**依赖于：**
- Game instances
- Members
- Prizes

**被依赖于：**
- 统计报表
- 会员游戏历史

#### 🔧 工作原理
1. 游戏结束后
2. （可选）调用API记录结果
3. 保存到database
4. 可在Admin Panel查看

#### 🐛 常见问题
1. **问题：** 游戏记录没有保存
   **原因：** API调用失败或没有配置记录功能
   **解决：** 检查network tab，验证API endpoint

#### 🚨 修改影响范围
**需要rebuild：**
- `api` backend

---

## 📝 Checkpoint 3 Summary

**已新增功能 (3个):**
- 转盘游戏引擎 (Spin Wheel Template) - 最核心
- Admin Panel - 会员管理
- 游戏历史/统计系统

**总进度：** 12/17 (71%)


### 13. Token/余额管理系统

#### 📍 位置
- **Frontend Store：** `apps/web-app/src/store/auth.ts`
- **Backend：** Member entity中的balance字段
- **API：** Members module

#### 🎯 功能说明
管理用户的游戏Token余额：
- 显示当前余额
- 充值Token（通过Admin或API）
- 扣除Token（玩游戏时）
- 余额不足时禁止游戏
- 交易历史记录

#### ⚙️ 工作流程

**玩游戏消耗Token：**
1. 用户点击SPIN按钮
2. 检查余额是否足够（costPerSpin）
3. 如果足够 → 扣除Token → 允许游戏
4. 如果不足 → 显示"余额不足"提示
5. 记录交易

**充值Token：**
1. Admin进入会员管理
2. 选择会员 → 编辑余额
3. 输入充值金额
4. 保存 → 更新database
5. 用户刷新后看到新余额

#### 🔗 依赖关系
**依赖于：**
- Member entity - 存储balance
- Auth system - 验证用户身份
- Transaction records - 记录交易

**被依赖于：**
- 游戏系统 - 验证余额
- 统计系统 - 分析消费

#### 📊 数据流
```
User starts game
  → Check balance
  → If sufficient: Deduct token → Play
  → If insufficient: Show error
  → Record transaction
```

#### 🐛 常见问题
1. **问题：** 余额扣除但游戏没开始
   **原因：** 网络中断或游戏加载失败
   **解决：** 实现transaction rollback或补偿机制

2. **问题：** 余额显示不准确
   **原因：** Cache没更新
   **解决：** 刷新页面重新获取余额

#### 🚨 修改影响范围
**修改余额logic会影响：**
- ✅ 游戏的可玩性
- ✅ 会员管理功能
- ✅ 交易记录

**需要rebuild：**
- `api` (如果改后端逻辑)
- `web-app` (如果改前端显示)

**需要测试：**
- 余额扣除
- 充值功能
- 余额不足的处理
- 交易记录准确性

---

### 14. 公司/多租户系统

#### 📍 位置
- **Module：** `apps/api/src/modules/companies/`
- **Entity：** Company entity
- **Frontend：** `apps/soybean-admin/src/views/management/company/`

#### 🎯 功能说明
支持多个公司/租户使用同一个系统：
- 每个公司有独立的游戏实例
- 每个公司有独立的会员
- 数据隔离（公司A看不到公司B的数据）
- 公司级别的配置和权限

#### ⚙️ 核心概念
```typescript
Company {
  id: string;
  name: string;
  slug: string;          // 公司唯一标识
  settings: object;      // 公司级别配置
  gameInstances: [];     // 该公司的游戏
  members: [];           // 该公司的会员
}
```

#### 🔗 依赖关系
**依赖于：**
- Database - 存储公司数据
- Auth system - 验证用户属于哪个公司

**被依赖于：**
- 所有数据entities - 通过companyId关联
- 游戏实例 - 属于某个公司
- 会员 - 属于某个公司

#### 🔧 工作原理

**数据隔离：**
1. 用户登录时获取companyId
2. 所有查询都带上 `WHERE companyId = current_user.companyId`
3. 创建资源时自动设置companyId
4. API自动过滤其他公司的数据

**多租户架构：**
```
User login
  → Get user.companyId
  → Store in JWT token
  → All API calls filter by companyId
  → Data isolation guaranteed
```

#### 🐛 常见问题
1. **问题：** 看到其他公司的数据
   **原因：** companyId过滤失效
   **解决：** 检查query，确保所有查询都有companyId条件

2. **问题：** 创建资源时companyId为空
   **原因：** 没有从JWT token获取companyId
   **解决：** 在service层自动注入companyId

#### 🚨 修改影响范围
**修改公司系统会影响：**
- ✅ 数据隔离逻辑
- ✅ 所有CRUD操作
- ✅ 用户权限

**需要rebuild：**
- `api` backend

**需要测试：**
- 数据隔离（公司A看不到公司B）
- 跨公司访问被阻止
- 公司管理功能

---

### 15. 权限管理系统

#### 📍 位置
- **Module：** `apps/api/src/modules/permissions/` + `roles/`
- **Guards：** Permission guards
- **Decorators：** `@RequirePermission()`, `@Roles()`

#### 🎯 功能说明
基于角色的权限控制（RBAC）：
- 定义角色（Admin, Editor, Viewer等）
- 每个角色有不同的权限
- 用户分配角色
- API endpoints根据权限保护

#### ⚙️ 权限模型
```typescript
Role {
  id: string;
  name: string;         // 'admin', 'editor', 'viewer'
  permissions: [];      // ['game:create', 'game:edit', 'member:view']
}

User {
  id: string;
  roles: Role[];        // 一个用户可以有多个角色
}
```

#### 🔗 依赖关系
**依赖于：**
- Auth system - 验证用户身份
- Role/Permission entities
- JWT token - 包含用户角色

**被依赖于：**
- Protected API endpoints
- Admin Panel - 显示/隐藏功能

#### 🔧 工作原理

**权限检查流程：**
1. 用户访问protected endpoint
2. AuthGuard验证token有效
3. PermissionGuard检查用户权限
4. 如果有权限 → 允许访问
5. 如果没权限 → 返回403 Forbidden

**使用方式：**
```typescript
@Post()
@Roles('admin', 'editor')
@RequirePermission('game:create')
async createGame() {
  // Only admin and editor with game:create permission can access
}
```

#### 📊 常见权限类型
- `game:*` - 游戏管理（create/edit/delete/view）
- `member:*` - 会员管理
- `company:*` - 公司管理
- `user:*` - 用户管理
- `system:*` - 系统配置

#### 🐛 常见问题
1. **问题：** 403 Forbidden但用户应该有权限
   **原因：** 角色或权限配置错误
   **解决：** 检查用户的roles和对应的permissions

2. **问题：** Super admin被阻止
   **原因：** Permission check太严格
   **解决：** 添加super admin bypass逻辑

#### 🚨 修改影响范围
**修改权限系统会影响：**
- ✅ 所有protected endpoints
- ✅ Admin Panel功能显示
- ✅ 用户可执行的操作

**需要rebuild：**
- `api` backend
- `admin` frontend (如果改UI)

**需要测试：**
- 不同角色的权限
- 权限继承
- Super admin权限
- 403错误处理

---

## 📝 Checkpoint 4 Summary

**已新增功能 (3个):**
- Token/余额管理系统
- 公司/多租户系统
- 权限管理系统

**总进度：** 15/17 (88%) 🎉

**剩余工作（明天）：**
- 2个辅助功能
- CODEMAP.md
- ARCHITECTURE.md


### 16. 审计日志系统 (Audit Log)

#### 📍 位置
- **Module：** `apps/api/src/modules/audit-log/`
- **Entity：** AuditLog entity
- **Frontend：** `apps/soybean-admin/src/views/management/audit-log/` (如果有)

#### 🎯 功能说明
记录系统中的重要操作，用于：
- 安全审计和合规
- 追踪谁做了什么
- 问题排查和调查
- 操作历史回溯

**记录的操作类型：**
- 用户登录/登出
- 游戏创建/编辑/删除
- 会员余额变动
- 配置修改
- 权限变更
- 敏感操作

#### ⚙️ 日志数据结构
```typescript
AuditLog {
  id: string;
  timestamp: Date;           // 操作时间
  userId: string;            // 操作者
  userName: string;          // 操作者名称
  action: string;            // 操作类型 (CREATE/UPDATE/DELETE/LOGIN等)
  resource: string;          // 资源类型 (game/member/user等)
  resourceId: string;        // 资源ID
  details: object;           // 详细信息（变更前后对比等）
  ipAddress: string;         // IP地址
  userAgent: string;         // 浏览器/设备信息
  companyId: string;         // 所属公司（多租户）
  status: string;            // SUCCESS/FAILED
  errorMessage?: string;     // 如果失败，错误信息
}
```

#### 🔗 依赖关系
**依赖于：**
- Auth system - 获取当前用户
- Request context - 获取IP/UserAgent
- Database - 存储日志

**被依赖于：**
- 合规报告
- 安全调查
- Admin Panel - 查看日志

#### 🔧 工作原理

**自动记录流程：**
1. 用户执行操作（如编辑游戏）
2. Interceptor拦截请求
3. 提取操作信息（user, action, resource）
4. 记录到audit_log表
5. 继续执行原操作

**手动记录：**
```typescript
// 在service中手动记录
await this.auditLogService.log({
  action: 'MEMBER_BALANCE_UPDATE',
  resource: 'member',
  resourceId: member.id,
  details: {
    oldBalance: oldBalance,
    newBalance: newBalance,
    amount: amount,
    reason: 'manual_adjustment'
  }
});
```

**查询日志：**
- 按用户筛选
- 按时间范围筛选
- 按操作类型筛选
- 按资源筛选
- 全文搜索

#### 📊 重要的审计场景

**1. 余额变动追踪：**
```
[2026-01-31 18:00] User:admin
Action: MEMBER_BALANCE_UPDATE
Member: john@example.com
Old: 1000 tokens → New: 1500 tokens
Reason: Manual top-up
```

**2. 配置修改：**
```
[2026-01-31 17:00] User:editor
Action: GAME_CONFIG_UPDATE
Game: spin-wheel-premium
Changed: showSoundButton: true → false
```

**3. 敏感操作：**
```
[2026-01-31 16:00] User:admin
Action: USER_DELETE
User: old_account@example.com
IP: 192.168.1.100
```

#### 🐛 常见问题
1. **问题：** 日志太多，查询慢
   **原因：** 没有索引或保留时间太长
   **解决：** 添加数据库索引，定期归档旧日志

2. **问题：** 日志缺失
   **原因：** 某些操作没有加audit logging
   **解决：** 检查interceptor覆盖范围，补充手动记录

3. **问题：** 日志信息不够详细
   **原因：** details字段没有记录足够信息
   **解决：** 增强details，包含before/after对比

#### 🚨 修改影响范围
**修改audit log会影响：**
- ✅ 合规性
- ✅ 安全调查能力
- ✅ 问题排查效率

**需要rebuild：**
- `api` backend (如果改logic)
- `admin` frontend (如果改UI)

**需要测试：**
- 执行各种操作验证日志生成
- 查询日志功能
- 日志筛选和搜索
- 性能（大量日志时）

**⚠️ 最佳实践：**
1. ✅ 记录敏感操作（余额、权限、删除）
2. ✅ 记录变更前后对比
3. ✅ 定期归档旧日志（如90天后）
4. ✅ 添加数据库索引优化查询
5. ✅ 异步记录避免影响性能

---

## 📝 Checkpoint 5 - FINAL Summary

**已新增功能 (1个):**
- 审计日志系统

**🎉 今天最终进度：** 16/17 (94%)

**剩余工作（明天）：**
- 1个辅助功能（邮件/系统设置等）
- CODEMAP.md
- ARCHITECTURE.md

**Token使用：** ~127k/200k (还剩73k)

---

## 🏆 今天成就解锁

✅ **94%完成** - 超越目标！  
✅ **5个solid checkpoints** - 工作安全！  
✅ **16个详细功能文档** - 质量高！  
✅ **最核心功能全覆盖** - 游戏引擎、ConfigForm、Seed、i18n  
✅ **明天轻松finishing** - 只剩6%！

**这是一个productive day！** 💪🔥


### 17. 系统设置管理

#### 📍 位置
- **Module：** `apps/api/src/modules/system-settings/`
- **Entity：** SystemSettings entity
- **Frontend：** Admin Panel settings page

#### 🎯 功能说明
全局系统配置管理，支持：
- 系统级别的配置选项
- 邮件服务器配置
- 支付网关配置（如果有）
- 全局开关（维护模式等）
- 品牌设置（logo、名称等）

#### ⚙️ 常见配置项
```typescript
SystemSettings {
  siteName: string;
  siteLogo: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  
  // Email配置
  emailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  emailFrom: string;
  
  // 其他配置
  defaultLanguage: string;
  timezone: string;
  maxUploadSize: number;
}
```

#### 🔗 依赖关系
**依赖于：**
- Database - 存储配置
- Admin auth - 只有admin可修改

**被依赖于：**
- 所有需要系统配置的模块
- Email service
- File upload

#### 🔧 工作原理
1. 系统启动时加载配置
2. Admin可以在后台修改配置
3. 保存后立即生效（或重启后生效）
4. 可以设置环境变量覆盖

#### 🐛 常见问题
1. **问题：** 修改配置后不生效
   **原因：** 需要重启服务
   **解决：** 重启API服务或使用hot-reload

2. **问题：** Email发送失败
   **原因：** SMTP配置错误
   **解决：** 检查SMTP设置，测试连接

#### 🚨 修改影响范围
**修改系统设置会影响：**
- ✅ 整个系统的行为
- ✅ 用户体验
- ✅ 功能可用性

**需要rebuild：**
- `api` (如果改代码)
- `admin` (如果改UI)

---

## 🎉 FEATURES.md 完成！

**最终统计：**
- ✅ 17/17功能 (100%)
- ✅ 每个功能都有完整文档
- ✅ 包含位置、说明、依赖、常见问题、影响范围

**这个文档是MiniGame project的permanent memory card！**


---

## 🎨 彩纸效果配置系统 (2026-01-31新增)

**⚠️ IMPORTANT: Emoji + Paper Layering (2026-01-31 修复)**

Emoji和彩纸是**叠加显示**，不是二选一！

**正确行为：**
- 选择"默认纸片" → 只显示彩色纸片
- 选择"Emoji" → 彩色纸片 + Emoji（两者一起！）

**实现逻辑：**
```javascript
// ALWAYS fire paper confetti (base layer)
confetti({ colors: colors, particleCount: 150 });

// IF emoji mode, ALSO fire emoji (overlay - 40% particles)
if (emojiMode) {
    confetti({ shapes: emojiShapes, particleCount: 60 });
}
```

**Why layering:**
- Paper = 主体效果（丰富、饱满）
- Emoji = 装饰效果（主题、趣味）
- 一起显示 = 最佳视觉效果


### 📍 位置
**Admin Panel:**
- `ConfigForm.vue` - color-list和emoji-list types渲染
- Helper functions: Line ~207-305

**Backend:**
- `seed.service.ts` - Schema定义 (Line ~972)
- `spin-wheel.template.ts` - Confetti shapes支持 (Line ~1263)

**i18n:**
- `zh-cn.ts` + `en-us.ts` - 彩纸相关labels

### 🎯 功能说明

**之前（Terrible UX）：**
- 用户要手写hex color codes：`#ff0000,#00ff00,#0000ff`
- 不知道颜色code是什么
- 不知道要用逗号分隔
- 没有emoji选项

**现在（User-Centric）：**
1. **🎨 彩纸颜色 - Color Picker List**
   - 点击色块 → color picker弹出
   - 不需要手写hex codes
   - 添加/删除颜色
   - 最多8个颜色
   - Hover显示删除按钮

2. **🎭 彩纸形状 - Emoji支持**
   - Radio选择：默认纸片 / Emoji
   - 预设20个派对主题emoji
   - 点击emoji toggle选择/取消
   - 最多10个emoji
   - 选中的emoji有蓝色边框+放大效果

3. **🎬 预览按钮**
   - 实时预览confetti效果
   - 使用选择的颜色和emoji
   - 放在emoji section下方

### ⚙️ 配置项

**Schema Fields:**
```typescript
{
  key: 'confetti_section',
  type: 'collapse-group',
  items: [
    { key: 'confettiParticles', type: 'slider' },    // 粒子数量
    { key: 'confettiSpread', type: 'slider' },       // 扩散角度
    { key: 'confettiColors', type: 'color-list' },   // 颜色列表
    { key: 'confettiShapeType', type: 'radio' },     // 形状类型
    { key: 'confettiEmojis', type: 'emoji-list' }    // Emoji列表
  ]
}
```

**Default Values:**
- confettiColors: `'#ff0000,#00ff00,#0000ff,#ffff00,#ff00ff'`
- confettiShapeType: `'default'` (可选: 'default' | 'emoji')
- confettiEmojis: `'🎉,⭐,❤️'`

**Preset Emojis (20个):**
- 派对：🎉 🎊 🎈 🎁 
- 星星：⭐ 🌟 💫 ✨ 
- 爱心：❤️ 💙 💚 💛 💜 🧡
- 成就：🏆 🥇 👑 💎 🔥 🎯

### 🔗 依赖关系

**依赖于：**
- Canvas-Confetti library (CDN)
- NColorPicker component (Naive UI)
- Vue reactivity system

**被依赖于：**
- Game engine - 读取config并渲染confetti
- Admin Panel - 配置UI

### 🔧 工作原理

**1. ConfigForm UI (color-list type):**
```typescript
// Helper Functions
function getColorList(key: string): string[] {
  // Parse comma-separated string to array
}

function addColor(key: string, color: string = '#ff0000') {
  // Add new color (max 8)
  // Show warning if limit reached
}

function removeColor(key: string, index: number) {
  // Remove color from list
}

function updateColor(key: string, index: number, color: string) {
  // Update color at index
}

// Render
<NColorPicker 
  :value="color" 
  @update:value="(val) => updateColor(key, index, val)"
/>
```

**2. ConfigForm UI (emoji-list type):**
```typescript
// Helper Functions
const presetEmojis = ['🎉', '🎊', ...]; // 20 preset emojis

function toggleEmoji(key: string, emoji: string) {
  // Toggle emoji selection (max 10)
  // Add if not selected, remove if selected
}

function isEmojiSelected(key: string, emoji: string): boolean {
  // Check if emoji is in the list
}

// Render
<div 
  v-for="emoji in presetEmojis"
  @click="toggleEmoji(key, emoji)"
  :class="isEmojiSelected(key, emoji) ? 'selected' : 'unselected'">
  {{ emoji }}
</div>
```

**3. Preview Function:**
```typescript
function previewConfetti(key: string) {
  const colors = getColorList('confettiColors');
  const shapeType = formModel['confettiShapeType'];
  const emojis = getEmojiList('confettiEmojis');
  
  // Load canvas-confetti if not loaded
  // Create shapes from emojis if needed
  // Trigger confetti burst
}
```

**4. Game Engine:**
```typescript
// Prepare config
const confettiConfig = {
  particleCount: config.confettiParticles,
  spread: config.confettiSpread,
  colors: config.confettiColors.split(',')
};

// Add emoji shapes if enabled
if (config.confettiShapeType === 'emoji') {
  const emojis = config.confettiEmojis.split(',');
  confettiConfig.shapes = emojis.map(emoji => 
    confetti.shapeFromText({ text: emoji, scalar: 2 })
  );
}

confetti(confettiConfig);
```

### 📊 数据流

```
Admin配置
  ↓
用户点击色块/emoji
  ↓
更新formModel (comma-separated string)
  ↓
保存到game instance config
  ↓
Game engine读取并解析
  ↓
Canvas-confetti渲染
```

**数据格式（保持backward compatibility）：**
- Colors: `'#ff0000,#00ff00,#0000ff'` (逗号分隔hex codes)
- Emojis: `'🎉,⭐,❤️'` (逗号分隔unicode emoji)

### 🐛 常见问题

1. **问题：** 添加颜色/emoji没反应
   **原因：** 已达到最大限制（8个颜色/10个emoji）
   **解决：** 删除一些再添加，或看warning提示

2. **问题：** Preview按钮点击没效果
   **原因：** Canvas-confetti library没加载
   **解决：** ✅ 已处理 - 自动加载CDN script

3. **问题：** Emoji显示为方块
   **原因：** 系统不支持该emoji
   **解决：** 选择其他emoji，或使用默认纸片

4. **问题：** 游戏里看不到emoji效果
   **原因：** 没选择emoji mode或没保存
   **解决：** 检查confettiShapeType是'emoji'，确保保存

5. **问题：** 颜色删除按钮看不到
   **原因：** 需要hover
   **解决：** ✅ 设计 - hover时opacity从0变100

### 🚨 修改影响范围

**修改彩纸配置会影响：**
- ✅ Admin Panel - 配置UI
- ✅ Game Engine - Confetti渲染
- ✅ 用户体验 - 所有赢奖时的视觉效果

**需要rebuild：**
- `admin` frontend (ConfigForm changes)
- `api` backend (schema + template changes)

**需要测试：**
- ✅ 添加/删除颜色
- ✅ Color picker选色
- ✅ Emoji toggle选择
- ✅ 最大限制提示
- ✅ 预览按钮功能
- ✅ 保存后游戏里实际效果
- ✅ Default shapes vs Emoji shapes
- ✅ Refresh schemas应用到existing instances

### 🎯 User-Centric Design Principles

1. **不要让用户手写代码**
   - ❌ 之前：手写`#ff0000,#00ff00`
   - ✅ 现在：点击color picker

2. **直观的交互**
   - 点击emoji就选择/取消
   - 选中状态明显（蓝色边框+放大）
   - Hover显示删除按钮

3. **实时反馈**
   - 预览按钮看实际效果
   - 限制达到时warning提示
   - 选中emoji立即高亮

4. **合理的限制**
   - 最多8个颜色（够用了）
   - 最多10个emoji（不会太乱）
   - 清晰的提示文字

5. **降低学习成本**
   - 预设常用emoji
   - 不需要知道hex codes
   - 一看就懂的UI

**Complete Solution ✓**
- 一次性实现所有功能
- Frontend + Backend + i18n
- 两个render sections都支持
- 完整的UX体验

