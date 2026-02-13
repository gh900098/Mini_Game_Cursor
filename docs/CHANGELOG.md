# MiniGame 修改历史
 
 记录所有重要的功能更新、bug修复和架构改动。
 
 ---
 
## [2026-02-01 晚上] 会员管理修复：UUID 显示优化、状态切换功能修复

### 🎯 修复会员管理模块的 UI 和 功能

**实施时间：** 2026-02-01 18:05-18:15 (10分钟)  

**核心需求：**
- 会员列表 ID 显示过长导致换行（乱）
- "Enable/Disable" 按钮无效
- 会员详情页无法加载内容

**修复内容：**
1. **UI 优化**：将 ID 列宽度从 80 增加到 380，防止 UUID 换行，改善页面布局。
2. **类型修复**：修正了前端 Service 和 View 中将 Member ID 错误定义为 `number` 的问题（UUID 应为 `string`）。
3. **功能增强**：更新了后端 `toggle-status` 接口，使其支持显式传递 `isActive` 值，确保前后端状态一致。
4. **详情页修复**：删除了 `detail.vue` 中错误的 `Number()` 转换，确保 UUID 能正确传递并加载数据。

---

 ## [2026-02-01 晚上] 游戏状态显示系统：oneTimeOnly、时间限制、Live Preview、英文化

### 🎯 完整的游戏规则显示系统

**实施时间：** 2026-02-01 12:20-12:57 (37分钟)  
**Commits:** c56317a, 7628f99, 5d32982, ae62dda

**核心需求：**
- Admin需要在Live Preview看到配置效果
- 用户需要清楚知道游戏限制（一次性、时间限制等）
- 前端统一英文文字

### 📋 新增功能

#### 1. One Time Only 显示
- ✅ 显示 "⚠️ One Time Only" warning
- ✅ 如果已玩过，显示 "(Used)" 标签（红色）
- ✅ **隐藏每日次数显示** - 因为oneTimeOnly是最高优先级
- ✅ Backend检查：`hasPlayedEver` 时设置 `canPlay=false`

**实现位置：**
- Backend: `game-rules.service.ts` - `getPlayerStatus()`
- Frontend: `index.vue` - Floating status card

**API Response新增字段：**
```json
{
  "oneTimeOnly": true,
  "hasPlayedEver": true
}
```

#### 2. 时间限制显示
- ✅ 显示 "📅 Mon, Tue, Wed 10:00-20:00"
- ✅ 不在开放时间 → **红色**
- ✅ 在开放时间内 → **蓝色**
- ✅ 支持周几 + 时间范围显示

**实现位置：**
- Backend: `game-rules.service.ts` - 新增 `isInActiveTime` 判断
- Frontend: `index.vue` - `formatTimeLimit()` helper

**API Response新增字段：**
```json
{
  "timeLimitConfig": {
    "enable": true,
    "startTime": "09:00",
    "endTime": "21:00",
    "activeDays": [1, 2, 3, 4, 5]
  },
  "isInActiveTime": false
}
```

**Day names英文化：**
```javascript
// 旧：['周日', '周一', '周二', '周三', '周四', '周五', '周六']
// 新：['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
```

#### 3. Live Preview支持
**问题：** Admin在preview模式看不到status信息，无法验证配置

**解决方案：**
```javascript
// 旧的逻辑（错误）
<div v-if="gameStatus && !isPreview">  // 不显示

async function fetchGameStatus() {
  if (isPreview.value || !authStore.token) return;  // 不fetch
}

// 新的逻辑（正确）
<div v-if="gameStatus">  // 总是显示

async function fetchGameStatus() {
  if (!authStore.token || !instanceSlug.value) return;  // Preview也fetch
}
```

**好处：**
- ✅ Admin编辑配置时在preview立即看到效果
- ✅ 修改"仅限一次"、"时间限制"可以实时验证
- ✅ 不需要publish后才能测试

**实现位置：**
- `apps/web-app/src/views/game/index.vue`
- 移除 `!isPreview` 条件
- 修改 `fetchGameStatus()` 逻辑

#### 4. 前端统一英文化
**需求：** 前端用户看到的全是英文，admin backend保持中文

**文字映射：**
```javascript
// Block reasons
'LEVEL_TOO_LOW': 'Level too low! Need Lv5'
'NOT_STARTED': 'Event not started yet'
'ENDED': 'Event has ended'
'INVALID_DAY': 'Not available today'
'ALREADY_PLAYED': 'Already played (one time only)'
'NO_ATTEMPTS_LEFT': 'No attempts left today'
'COOLDOWN_ACTIVE': 'Cooldown: 1m 30s'

// Status display
'⚠️ 仅限一次 (已使用)' → '⚠️ One Time Only (Used)'
'📅 周一、周二、周三' → '📅 Mon, Tue, Wed'
'冷却中... 1m 30s' → 'Cooldown: 1m 30s'
```

**修改位置：**
- `apps/web-app/src/views/game/index.vue` - Frontend status display
- `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts` - Game engine error messages

#### 5. Collapsed Button状态完善
**新增状态判断：**
```javascript
collapsedButtonStatus = computed(() => {
  // 新增：One Time Only已用完 - RED
  if (oneTimeOnly && hasPlayedEver) return 'danger';
  
  // 新增：不在时间范围 - RED
  if (timeLimitConfig?.enable && !isInActiveTime) return 'danger';
  
  // 原有逻辑...
});
```

### 🐛 Bug修复

#### Bug #1: oneTimeOnly不阻止玩家
**问题：** Backend的 `getPlayerStatus()` 返回了 `oneTimeOnly` 和 `hasPlayedEver`，但没有设置 `canPlay=false`

**原因：** 只在 `checkOneTimeOnly()` 里检查，但那是play时才调用

**解决：**
```typescript
// getPlayerStatus() 里添加
if (oneTimeOnly && hasPlayedEver && canPlay) {
  canPlay = false;
  blockReason = 'ALREADY_PLAYED';
  blockDetails = { message: '...' };
}
```

#### Bug #2: API rebuild后frontend没更新
**问题：** 修改了API但只rebuild了API容器，frontend没有rebuild

**原因：** Frontend有cached JavaScript bundle

**解决：** 同时rebuild API和web-app
```bash
docker compose build --no-cache api web-app
```

**教训：** 修改API response结构时，也要rebuild frontend

### 📊 完整的API Response结构

**getPlayerStatus() 返回：**
```json
{
  "canPlay": false,
  "dailyLimit": 5,
  "played": 5,
  "remaining": 0,
  "resetAt": "2026-02-02T00:00:00.000Z",
  
  // Block info
  "blockReason": "ALREADY_PLAYED",
  "blockDetails": { "message": "..." },
  
  // NEW: One Time Only
  "oneTimeOnly": true,
  "hasPlayedEver": true,
  
  // NEW: Time Limit
  "timeLimitConfig": {
    "enable": true,
    "startTime": "09:00",
    "endTime": "21:00",
    "activeDays": [1, 2, 3]
  },
  "isInActiveTime": false,
  
  // Cooldown
  "cooldownRemaining": 45
}
```

### 🔄 部署流程

**完整部署（同时rebuild API + Frontend）：**
```bash
cd ~/Documents/MiniGame
git add -A
git commit -m "feat: Enhanced game status display..."
git push origin main

# 服务器上
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && \
   git pull origin main && \
   docker compose -f docker-compose.prod.yml build --no-cache api web-app && \
   docker compose -f docker-compose.prod.yml up -d"
```

**注意：** API和Frontend都改了，必须一起rebuild！

### 🎓 重要教训

#### 教训 #1: Complete Solution思维（再次强调）
- ❌ 不要只改Backend或只改Frontend
- ✅ 完整考虑：Backend返回什么 → Frontend如何显示 → 游戏引擎如何响应
- ✅ API response改了 → Frontend logic也要改 → 一起rebuild

#### 教训 #2: Preview是Admin的验证工具
- ✅ Admin需要在preview看到完整效果
- ✅ 不要用 `!isPreview` 隐藏重要信息
- ✅ Preview应该和正式环境一样，只是数据是测试数据

#### 教训 #3: User-Centric Thinking
**DJ的话：**
> "当你solution任何东西的时候，要时刻想象用户的实用性，不要一味的用技术的看法，也要多站在用户的立场去想"

**实例：**
- ✅ "仅限一次"时隐藏次数显示 - 因为用户会困惑"为什么还有5/5？"
- ✅ Time limit显示周几和时间 - 用户一眼知道什么时候能玩
- ✅ 不在时间范围显示红色 - 用户清楚知道现在不能玩

#### 教训 #4: 国际化策略
- ✅ Frontend统一英文（用户端）
- ✅ Backend保持中文（Admin端）
- ✅ 未来需要多语言时通过i18n框架实现
- ✅ 不要混用中英文 - 选一个并保持一致

### 📝 文档更新

**已更新：**
- ✅ `FEATURES.md` - 新增"游戏状态显示系统"完整文档
- ✅ `CHANGELOG.md` - 本条记录
- ✅ Git commits有清晰的说明

**需要更新（如遇到问题）：**
- `TROUBLESHOOTING.md` - 如果出现新的常见问题

---

## [2026-02-01 下午] 游戏前端：次数和Cooldown颜色指示系统

### 🎨 完整的视觉反馈系统（重要教训：CSS实现的正确方式）

**花费时间：** ~2小时（大部分是debug CSS覆盖问题）

**核心需求：**
- 用户需要一眼看出当前游戏状态
- 颜色指示：红色（危险）、黄色（警告）、蓝色/紫色（正常）

**实现的功能：**

#### 1. 次数显示颜色系统
- ✅ **0次** → 🔴 红色（没次数了）
- ✅ **1次** → 🟡 黄色（警告：最后一次）
- ✅ **2+次** → 🔵 蓝色（正常）
- ✅ 次数永远显示（即使0/X也要显示）

#### 2. Floating Button（收起来的圆形按钮）颜色
- ✅ **红色** - 0次 或 被blocked（等级不足、活动未开始等）
- ✅ **黄色** - 1次剩余 或 cooldown中（警告状态）
- ✅ **紫色** - 2+次（正常状态）
- ✅ 带pulse breathing animation

#### 3. Cooldown倒计时
- ✅ 显示黄色文字（警告状态）
- ✅ 格式：Xm Ys 或 Xs
- ✅ 每秒更新一次

#### 4. Spin按钮禁用
- ✅ Cooldown时禁用spin按钮
- ✅ 显示cooldown倒计时在status message
- ✅ 只有cooldown=0且canPlay=true才能spin

**关键技术教训：CSS颜色实现的坑**

❌ **错误方式（花了1.5小时）：**
```vue
<!-- 用:class绑定 - 被父元素覆盖！ -->
<span :class="{ 'text-yellow-400': remaining === 1 }">

.parent { color: white; } /* 覆盖了子元素！ */
```

✅ **正确方式（最终解决）：**
```vue
<!-- Computed property + inline style -->
const remainingColor = computed(() => {
  if (remaining === 0) return '#ef4444';
  if (remaining === 1) return '#facc15';
  return 'white';
});

<span :style="{ color: remainingColor }">
```

**为什么inline style work：**
- Inline style优先级最高
- 不会被父元素CSS覆盖
- Vue reactivity保证动态更新
- 不受浏览器cache影响

**Files Modified:**
- `apps/web-app/src/views/game/index.vue`
  - 添加 `remainingColor`, `remainingSlashColor` computed properties
  - 添加 `collapsedButtonStatus` computed property（3态：danger/warning/normal）
  - Cooldown传递到iframe并实时更新
  - 添加debug console.log for troubleshooting
- `apps/api/src/modules/game-instances/templates/spin-wheel.template.ts`
  - 接收cooldownRemaining并disable按钮
  - 显示cooldown倒计时在status message

**CSS Additions:**
```css
.collapsed-button-danger { /* 红色 */ }
.collapsed-button-warning { /* 黄色 + pulse */ }
@keyframes pulse-danger { ... }
@keyframes pulse-warning { ... }
```

**Commits:**
```
ec34d25 - feat: floating button黄色warning状态
b70b6b3 - fix: 改用computed property + inline style设置次数颜色
65716d2 - fix: 使用CSS classes with !important强制覆盖颜色
39b826e - feat: 改进次数和cooldown显示规则
2006a7e - feat: cooldown时禁用spin按钮
f7c759f - feat: 游戏前端floating button红色warning indicator
```

**重要教训（已记录到AGENTS.md RULE #5）：**
1. ✅ Inline style > CSS classes when dealing with dynamic colors
2. ✅ Computed properties ensure Vue reactivity
3. ✅ Think holistically - 考虑ALL相关UI元素
4. ✅ Debug with Console - 验证logic和rendering
5. ✅ Document immediately - 不要等"later"

**DJ的教导：**
> "这些为什么你都没有记录起来的？你还是一样一直会忘记这些rule啊，必须要记录到你的记忆啊，不然以后还是会犯同样的错误的啊"

---

## [2026-02-01 上午] Admin Panel: Tab Validation Visual Indicator

### ✨ 新功能：Tab Validation Status Display

**功能：**
- ✅ 当tab有validation error时，tab标签显示**红色文字**和**❌图标**
- ✅ Prizes tab: 检查总概率是否=100%
- ✅ 用户可一眼识别哪个tab需要修正

**实现细节：**
- 添加 `isTabValid(tabName)` 函数检查tab的validation状态
- Tab header使用dynamic class绑定：`:class="{ 'text-red-500': !isTabValid(tab.name) }"`
- 当invalid时显示❌图标

**Files Modified:**
- apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue
  - 添加 `isTabValid()` function (line ~685)
  - 修改 tab header template (line ~1033)

**扩展性：**
- 可以为其他tabs添加更多validation rules
- 例如：Rules tab检查必填字段，Visuals tab检查colors数量等

**文档更新：**
- ✅ FEATURES.md - 添加Tab Validation功能说明
- ✅ CHANGELOG.md - 记录这次改动

**Commit:**
```
00a8d5f - feat: 显示tab validation状态 - 有error的tab显示红色
```

---

## [2026-02-01] 游戏规则系统完整实现 + JK集成方案 + i18n修复

### 🎯 游戏规则系统（Phase 1-4，全部完成）

**Phase 1+2: Backend实现（高优先级）**
- ✅ 创建GameRulesService - 规则验证服务
- ✅ 实现4个高优先级规则：
  - dailyLimit - 每日次数限制（含VIP加成）
  - cooldown - 冷却时间
  - oneTimeOnly - 终身一次
  - timeLimitConfig - 时间限制（日期范围+星期几）

**数据库改动：**
- ✅ 创建 play_attempts 表 - 记录游戏尝试
- ✅ 创建 budget_tracking 表 - 预算跟踪（准备Phase 3）
- ✅ Members表添加 level, vip_tier, experience 字段

**API变更：**
- ✅ POST /scores/:instanceSlug - 集成规则验证，传递IP地址
- ✅ GET /scores/status/:instanceSlug - 查询玩家状态（剩余次数等）

**错误码：**
- DAILY_LIMIT_REACHED
- COOLDOWN_ACTIVE
- ALREADY_PLAYED
- NOT_STARTED / ENDED / INVALID_DAY

**Files Modified:**
- apps/api/src/modules/scores/game-rules.service.ts (新建)
- apps/api/src/modules/scores/entities/play-attempt.entity.ts (新建)
- apps/api/src/modules/scores/entities/budget-tracking.entity.ts (新建)
- apps/api/src/modules/members/entities/member.entity.ts (添加字段)
- apps/api/src/modules/scores/scores.service.ts (集成规则)
- apps/api/src/modules/scores/scores.controller.ts (添加status endpoint)
- apps/api/src/modules/scores/scores.module.ts (注册entities和service)

**文档更新：**
- ✅ FEATURES.md - 添加完整的游戏规则系统说明

**Phase 3+4: 完成全部规则**
- ✅ minLevel - 等级要求检查（错误码：LEVEL_TOO_LOW）
- ✅ budgetConfig - 预算控制和跟踪
  - updateBudget() 方法记录每次奖品成本
  - 检查每日/每月预算是否超支
- ✅ dynamicProbConfig - 动态概率调整（保底机制）
  - 分析最近10次游戏记录
  - 连输达阈值时调整权重
  - getDynamicWeights() 方法供frontend调用
- ✅ vipTiers.multiplier - VIP奖励倍数
  - 根据VIP等级应用积分倍数
  - 自动计算final score = score × multiplier

**Implementation Details:**
- Budget tracking after prize distribution (based on prize.cost)
- VIP multiplier applied before updating member points
- Dynamic weights based on loss streak analysis
- All 8 rules integrated into validatePlay()

**Files Modified (Phase 3+4):**
- apps/api/src/modules/scores/game-rules.service.ts
  - Add getDynamicWeights() method
  - Add updateBudget() method
  - Enable minLevel and budgetConfig checks
  - Inject Score repository for loss streak analysis
- apps/api/src/modules/scores/scores.service.ts
  - Apply VIP multiplier to final score
  - Call updateBudget() after prize distribution
  - Use member.vipTier for calculations

**测试文档：**
- ✅ TESTING-PLAN.md - 完整测试计划（640+ lines）
  - 8个test suites（每个规则独立测试）
  - Prerequisites checklist
  - Test data setup scripts
  - Expected responses
  - 缺失项分析

### 新增文档
- **JK-INTEGRATION.md** — 第三方平台（JK Backend）集成完整设计方案

### i18n修复
**问题：** 音效三模式labels使用hard-coded中文

**修复：**
- 添加audioModeTheme/audioModeCustom/audioModeNone到zh-cn.ts和en-us.ts
- 更新ConfigForm.vue两处使用$t()替代hard-coded text

**Files Modified:**
- `apps/soybean-admin/src/locales/langs/zh-cn.ts`
- `apps/soybean-admin/src/locales/langs/en-us.ts`
- `apps/soybean-admin/src/views/management/game-instance/components/ConfigForm.vue`

**遵循i18n rule：** 所有UI labels必须使用i18n keys，不能hard-code任何语言

### 规划内容
**用户集成：**
- Iframe seamless登入（encrypted token验证）
- Webhook实时同步用户数据
- Nightly full sync确保一致性（每晚3am）
- 1 player per company规则

**数据结构：**
- Players表扩展字段（external_platform, external_user_id等）
- Shipping info字段（按需收集）
- Companies表添加JK config存储
- Prize configs添加requires_shipping配置

**功能扩展：**
- 奖品类型扩展：bonus/physical/egift/voucher
- Shipping info收集modal（只在需要时显示）
- Admin UI显示数据来源和sync状态

**实现细节：**
- Complete backend services (JK API client, sync service, webhook, cron)
- Complete frontend UI (prize config, player list, shipping modal)
- Complete i18n (zh-cn + en-us)
- Testing checklist和implementation steps

**状态：** 设计完成，未实施（Future Feature）

---

## [2026-01-31] 音效上传三模式功能

### 新增功能

**音效三模式上传系统：**
- 🎵 使用主题默认音效
- 📤 自定义上传音效
- 🔇 不使用音效

**适用于：**
- 背景音乐 (bgmUrl)
- 中奖音效 (winSound)
- 未中奖音效 (loseSound)
- 大奖音效 (jackpotSound)

### 技术实现

**Frontend (ConfigForm.vue):**
- 添加`audioModes` ref存储mode state
- 添加helper functions: `isAudioField()`, `getAudioMode()`, `setAudioMode()`, `getThemeAudioUrl()`
- 实现两个render sections的UI：
  - Main section (line 1229-1283)
  - Nested collapse-group (line 1143-1199) ← **Audio fields实际位置**

**Backend (spin-wheel.template.ts):**
- 添加`resolveAudioUrl()` function
- 支持`__THEME_DEFAULT__`特殊值
- 自动根据`visualTemplate`选择对应主题的音效

**File Storage:**
- 用户文件：`uploads/{companyId}/{instanceId}/audio/`
- 主题文件：`uploads/templates/{theme}/`
- 完全隔离，互不影响

### Bug修复

**Problem:** Deploy后新UI不显示

**Root Cause:**
- Audio fields在collapse-group里作为nested items
- 初始实现只在main section添加了logic
- Nested render section使用fallback `<NInput v-else>`
- Hard refresh无效 (不是cache问题)

**Solution:**
- 在collapse-group的nested render section复制完整的audio三模式logic
- 使用`subItem.key`处理nested fields
- 两个render sections都有完整UI

### 相关Commits

1. `0eb1c37` - feat: 添加音效三模式上传功能
2. `4ace515` - feat: Game engine支持音效三模式
3. `74ce0d7` - fix: 添加audio三模式到collapse-group nested fields

### 文档更新

- ✅ FEATURES.md - 音效三模式完整文档
- ✅ TROUBLESHOOTING.md - Case 3: ConfigForm新功能不显示
- ✅ CHANGELOG.md - 本文件

### 测试验证

**Test Steps:**
1. 打开Admin Panel → 编辑游戏实例
2. 展开"背景音乐设置" collapse section
3. 验证显示三个radio选项
4. 测试三种模式：
   - 主题默认 → 显示当前主题名称 + 预览按钮
   - 自定义上传 → 显示upload button + URL input + 预览
   - 不使用音效 → 清空URL
5. 保存并preview游戏
6. 验证音效正确播放

**Verified:** 2026-01-31 19:30 GMT+8

---

## [Unreleased]

## [2026-02-13]
### Added
- **Enterprise Prize Architecture**: Dynamic prize type system allowing custom prize types with specific fulfillment strategies.
- **Prize Strategy Service**: Backend service to handle different prize behaviors (e.g., `balance_credit`, `manual_fulfill`, `virtual_code`).

### Fixed
- **Critical Score Bug**: Fixed an issue where winning a prize would incorrectly add the game score to the member's balance in addition to the prize value.
- **Prize Configuration Encoding**: Resolved character encoding issues (mojibake) in the `ConfigForm.vue` component.
- **Member Detail Error**: Fixed `ReferenceError: $t is not defined` on the Member Detail page.
- **Missing Credit History**: Fixed an issue where credit history passed to the frontend was empty.
- **Prize Ledger Display**: Fixed missing icons and inconsistent casing in the Admin Prize Ledger.
- **Cash Auto-Fulfillment**: "Cash" prizes now correctly default to `manual_fulfill` strategy instead of auto-crediting.

## [Earlier] 项目初始化

### i18n System Setup
- 中文翻译 (zh-cn.ts)
- 英文翻译 (en-us.ts)
- 动态locale切换

### Core Features
- 游戏实例CRUD
- 配置表单系统
- 文件上传
- 多租户支持
- 权限系统

*(详细记录见FEATURES.md)*

---

**格式说明：**
- 每次重要改动都要记录
- 包含：日期、功能、实现、问题、commits、测试
- 按时间倒序排列（最新在最上面）

## 2026-01-31 - 音效系统三模式 + 完整UX改进

### ✨ 新功能
- **音效三模式系统：**
  - 使用主题默认音效
  - 自定义上传（支持preview）
  - 不使用音效
- **音效Preview功能：**
  - 完整的play/stop toggle behavior
  - Dynamic button text（"▶️ 预览" ↔ "⏸️ 停止"）
  - 防止重叠播放
  - 播放结束auto-reset
  - State tracking for每个按钮

### 🎨 UX改进
- **条件显示选项：**
  - 选择"不使用音效" → 隐藏音量/循环播放选项（User-Centric！）
  - 选择"自定义/主题" → 显示配置选项
- **友好的placeholder：**
  - 不显示internal values（`__CUSTOM_PENDING__`）给用户
  - 显示"请上传音效文件"引导用户
- **Immediate reactive UI：**
  - Radio切换后立即更新UI
  - 不需要关闭再打开collapse

### 🐛 Bug修复
1. **Preview按钮重叠播放**
   - 问题：多次点击音效重叠，terrible UX
   - 修复：State tracking + stop previous audio
   
2. **Radio切换UI不更新**
   - 问题：需要关闭再打开才显示
   - 修复：getAudioMode()直接从formModel derive，不cache

3. **File picker显示错误类型**
   - 问题：上传音效却显示"Image Files"
   - 修复：用`nextTick()`等待DOM更新后才click
   - Root cause：Vue reactivity是异步的

4. **Internal value暴露给用户**
   - 问题：显示`__CUSTOM_PENDING__`
   - 修复：用computed :value，显示空字符串 + placeholder

5. **条件选项没生效**
   - 问题：Seed schema已添加condition，但existing instances没更新
   - 修复：运行data seeder refresh

### 📝 文件改动
**Frontend (Admin Panel):**
- `ConfigForm.vue` - 音效三模式UI + preview logic + file upload timing fix

**Backend (API):**
- `spin-wheel.template.ts` - resolveAudioUrl()处理四种情况
- `seed.service.ts` - Schema条件显示

**Project文档：**
- `FEATURES.md` - 完整的音效系统文档
- `TROUBLESHOOTING.md` - 5个新case（音效相关bugs）
- `CHANGELOG.md` - 本条目

### 🎯 完整的User-Centric Implementation
这次完全按照"Complete Solution"和"User-Centric Thinking"原则：
- ✅ 完整理解需求
- ✅ 分析所有相关代码（frontend + backend）
- ✅ 一次性修改所有需要的地方
- ✅ 从用户角度验证体验
- ✅ 立即更新project文档

**DJ的教导：**
- "当你做任何solution的时候，我需要你真的是完整的做全部solution"
- "要时刻想象用户的实用性，不要一味的用技术的看法"
- "这样才是真的user-centric thinking的behavior"

### 📊 Impact
- Admin Panel配置体验大幅改进
- 用户不会被confusing的UI困惑
- Preview功能完整可用（不annoying）
- File upload正确识别类型
- 文档完整up-to-date


## 2026-01-31 (晚上) - 彩纸效果Color Picker + Emoji支持

### ✨ 新功能
**彩纸配置系统完全重做 - User-Centric！**

1. **🎨 Color Picker List (color-list type)**
   - 点击色块选择颜色
   - 不需要手写hex codes（之前要手写`#ff0000,#00ff00`）
   - 添加/删除颜色
   - 最多8个颜色
   - Hover显示删除按钮

2. **🎭 Emoji Shapes支持 (emoji-list type)**
   - Radio选择：默认纸片 / Emoji
   - 预设20个派对主题emoji（🎉🎊🎈🎁⭐🌟💫✨❤️💙💚💛💜🧡🏆🥇👑💎🔥🎯）
   - 点击emoji toggle选择/取消
   - 最多10个emoji
   - 选中emoji有蓝色边框+放大效果
   - Condition: 只在选择emoji mode时显示

3. **🎬 实时预览功能**
   - 点击预览按钮看实际confetti效果
   - 使用选择的颜色和emoji
   - Auto-load canvas-confetti library

### 🎨 UX改进
**从"手写代码"到"点击选择"：**
- ❌ 之前：用户要手写`#ff0000,#00ff00,#0000ff,#ffff00`
- ✅ 现在：点击色块 → color picker弹出
- ❌ 之前：不知道hex codes是什么
- ✅ 现在：直观的颜色选择器
- ❌ 之前：没有emoji选项
- ✅ 现在：20个预设emoji + 可选择

### 📝 文件改动
**Frontend (Admin Panel):**
- `ConfigForm.vue` - 新types + helper functions
  - color-list type rendering
  - emoji-list type rendering
  - Preview function with canvas-confetti
  - 两个render sections都实现

**Backend (API):**
- `seed.service.ts` - Schema定义
  - confettiColors改为'color-list'
  - 新fields: confettiShapeType, confettiEmojis
- `spin-wheel.template.ts` - Emoji shapes支持
  - 使用confetti.shapeFromText()
  - 传递shapes到所有bursts

**i18n:**
- `zh-cn.ts` + `en-us.ts` - 9个新labels

**Project文档:**
- `FEATURES.md` - 彩纸系统完整文档
- `CHANGELOG.md` - 本条目

### 🔧 Technical Details
**新Schema Types:**
- `color-list` - Array of colors (comma-separated string)
- `emoji-list` - Array of emojis (comma-separated string)

**Helper Functions (ConfigForm.vue):**
- Color management: getColorList/setColorList/addColor/removeColor/updateColor
- Emoji management: getEmojiList/setEmojiList/toggleEmoji/isEmojiSelected
- Preview: previewConfetti/triggerConfettiPreview

**Game Engine:**
- 检测confettiShapeType
- 如果='emoji' → 用confetti.shapeFromText()创建shapes
- Scalar: 2 让emoji更大更visible

**Data Format (保持兼容):**
- Colors: '#ff0000,#00ff00,#0000ff'
- Emojis: '🎉,⭐,❤️'

### 📊 Impact
- ✅ 大幅改善UX - 用户不需要懂hex codes
- ✅ 更多自定义选项 - Emoji shapes
- ✅ 实时预览 - 所见即所得
- ✅ 清晰的限制和提示
- ✅ Backward compatible - 数据格式不变

### 🎯 User-Centric Principles Applied
1. 不要让用户手写代码
2. 直观的交互（点击选择）
3. 实时反馈（预览+提示）
4. 合理的限制（8个颜色/10个emoji）
5. 降低学习成本（预设选项）

**Complete Solution:**
- Frontend + Backend + i18n一次完成
- 两个render sections都支持
- 完整测试checklist
- 文档同步更新

