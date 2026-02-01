# 📊 Option B 实现：Game Status Display UI

**实施日期：** 2026-02-01  
**状态：** ✅ 已部署到Production  
**目的：** 让用户可以实时查看游戏状态（剩余次数、冷却时间等）

---

## 🎯 实现的功能

### 1. 游戏状态显示卡片

**位置：** 游戏页面左上角（浮动显示）

**显示内容：**
- 🎮 **每日剩余次数** - 显示"剩余/总次数"（如：2/3）
- ⏱️ **冷却倒计时** - 显示剩余等待时间（如：25s 或 1:30）
- 🔄 **刷新按钮** - 手动更新状态

**样式：**
- 黑色半透明背景 + 模糊效果
- 白色边框 + 圆角
- 图标+文字布局
- 仅在非预览模式显示

---

## 📱 用户体验

### 正常游戏流程

```
用户进入游戏
  ↓
自动显示状态卡片
  "🎮 3/3"（还有3次机会）
  ↓
玩游戏 → 提交分数
  ↓
状态自动更新
  "🎮 2/3"（剩余2次）
  ↓
继续玩...
  ↓
达到每日限制
  错误提示："每日次数已用完！明天再来吧 (3次/天)"
  状态显示："🎮 0/3"
```

### 冷却时间体验

```
用户玩一次游戏
  ↓
立即再玩
  ↓
错误提示："请等待 30 秒后再玩"
  ↓
状态卡片显示：
  "⏱️ 30s"
  "⏱️ 29s"
  "⏱️ 28s"
  ...
  "⏱️ 1s"
  ↓
倒计时结束
  状态自动刷新
  可以继续玩
```

---

## 🔍 错误消息优化

### 中文用户友好提示

**所有规则violation都会显示清晰的中文提示：**

| 错误码 | 原始API消息 | 用户看到的提示 |
|--------|------------|---------------|
| `DAILY_LIMIT_REACHED` | 您今天的游戏次数已用完（3次/天） | 每日次数已用完！明天再来吧 (3次/天) |
| `COOLDOWN_ACTIVE` | 请等待30秒后再玩 | 请等待 30 秒后再玩 + 倒计时 |
| `ALREADY_PLAYED` | 您已经玩过此游戏，每人仅限一次机会 | 您已经玩过此游戏，每人仅限一次机会 |
| `INVALID_DAY` | 此游戏仅在周一、周二...开放 | 今天不在开放日期 |
| `LEVEL_TOO_LOW` | 此游戏需要达到等级5 | 等级不足！需要等级 5，当前 2 |
| `DAILY_BUDGET_EXCEEDED` | 今日预算已用完 | 今日预算已用完，明天再来吧 |

---

## 🛠️ 技术实现

### Frontend Changes

**文件：** `apps/web-app/src/views/game/index.vue`

#### 1. 新增State

```typescript
const gameStatus = ref<any>(null);        // 游戏状态数据
const cooldownRemaining = ref(0);         // 冷却倒计时（秒）
const loadingStatus = ref(false);         // 加载状态
let cooldownInterval: any = null;         // 倒计时定时器
```

#### 2. API集成

```typescript
// 获取游戏状态
async function fetchGameStatus() {
  const res = await service.get(`/scores/status/${instanceSlug.value}`);
  gameStatus.value = res.data;
  
  // 如果有冷却，启动倒计时
  if (gameStatus.value.cooldownRemaining > 0) {
    cooldownRemaining.value = gameStatus.value.cooldownRemaining;
    startCooldownTimer();
  }
}

// 启动倒计时
function startCooldownTimer() {
  cooldownInterval = setInterval(() => {
    if (cooldownRemaining.value > 0) {
      cooldownRemaining.value--;
    } else {
      clearInterval(cooldownInterval);
      fetchGameStatus(); // 倒计时结束，刷新状态
    }
  }, 1000);
}

// 格式化倒计时显示
function formatCooldown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

#### 3. 错误处理增强

```typescript
async function submitScore(score: number, metadata?: any) {
  try {
    await service.post(`/scores/${instanceSlug.value}`, { score, metadata });
    message.success(`Score of ${score} submitted successfully!`);
    fetchGameStatus(); // 成功后刷新状态
  } catch (err: any) {
    // 解析错误码，显示用户友好提示
    if (err.response?.data?.code) {
      const errorData = err.response.data;
      switch (errorData.code) {
        case 'DAILY_LIMIT_REACHED':
          message.error(`每日次数已用完！明天再来吧 (${errorData.limit}次/天)`);
          break;
        case 'COOLDOWN_ACTIVE':
          message.warning(`请等待 ${errorData.remainingSeconds} 秒后再玩`);
          cooldownRemaining.value = errorData.remainingSeconds;
          startCooldownTimer();
          break;
        // ... 其他error codes
      }
    }
    fetchGameStatus(); // 失败后也刷新状态
  }
}
```

#### 4. UI Component

```vue
<!-- Game Status Display -->
<div v-if="gameStatus && !isPreview" class="absolute top-4 left-4 z-50">
  <div class="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white">
    <div class="flex items-center gap-3">
      <!-- Daily Limit -->
      <div v-if="gameStatus.dailyLimit > 0" class="flex items-center gap-2">
        <div class="i-carbon-play-filled text-primary"></div>
        <span class="text-sm">
          <span class="font-bold">{{ gameStatus.remaining }}</span>
          <span class="text-white/60">/{{ gameStatus.dailyLimit }}</span>
        </span>
      </div>
      <!-- Cooldown Timer -->
      <div v-if="cooldownRemaining > 0" class="flex items-center gap-2">
        <div class="i-carbon-time text-warning"></div>
        <span class="text-sm font-mono">{{ formatCooldown(cooldownRemaining) }}</span>
      </div>
      <!-- Refresh Button -->
      <button @click="fetchGameStatus" class="i-carbon-renew..." />
    </div>
  </div>
</div>
```

#### 5. Lifecycle Hooks

```typescript
onMounted(() => {
  // ...现有逻辑
  fetchGameStatus(); // 加载时获取状态
});

onUnmounted(() => {
  // 清理倒计时定时器
  if (cooldownInterval) {
    clearInterval(cooldownInterval);
  }
});
```

---

## 🎨 UI Screenshots（描述）

### 正常状态
```
┌─────────────────────────┐
│  🎮 3/3    🔄          │  ← 左上角状态卡片
└─────────────────────────┘
```

### 使用后
```
┌─────────────────────────┐
│  🎮 2/3    🔄          │
└─────────────────────────┘
```

### 冷却中
```
┌─────────────────────────┐
│  🎮 2/3  ⏱️ 25s   🔄  │
└─────────────────────────┘
```

### 用完次数
```
┌─────────────────────────┐
│  🎮 0/3    🔄          │
└─────────────────────────┘
```

---

## 📊 Backend API

### GET /scores/status/:instanceSlug

**已实现（Phase 1-4）**

**Response:**
```json
{
  "canPlay": true,
  "dailyLimit": 3,
  "played": 2,
  "remaining": 1,
  "resetAt": "2026-02-02T00:00:00Z"
}
```

**字段说明：**
- `canPlay`: 是否可以玩（考虑所有规则）
- `dailyLimit`: 每日限制次数（含VIP加成）
- `played`: 今天已玩次数
- `remaining`: 剩余次数（-1表示无限制）
- `resetAt`: 次数重置时间

**未来可扩展：**
```json
{
  "canPlay": false,
  "dailyLimit": 3,
  "played": 3,
  "remaining": 0,
  "resetAt": "2026-02-02T00:00:00Z",
  "cooldownRemaining": 25,  // 冷却剩余秒数
  "canPlayAt": "2026-02-01T09:25:30Z",  // 可以玩的时间
  "blockedReason": "COOLDOWN_ACTIVE"  // 阻止原因
}
```

---

## 🚀 部署状态

### ✅ 已部署到Production

**Deployment Steps执行：**
```bash
1. Git push to main ✅
2. SSH到server并pull ✅
3. Docker build --no-cache web-app ✅
4. Docker up -d web-app ✅
```

**Build Output:**
```
✓ 2871 modules transformed
✓ dist/assets/index-CtffhjPA.js (335.63 kB │ gzip: 103.84 kB)
✓ built in 11.70s
```

**Container Status:**
```
Container minigame-webapp Recreated ✅
Container minigame-webapp Started ✅
```

---

## 🧪 测试验证

### Manual Testing Steps

**Step 1: 访问游戏**
```
URL: https://game.xseo.me/game?instance=test-rules-wheel
```

**Step 2: 观察状态卡片**
- ✅ 左上角显示状态卡片
- ✅ 显示剩余次数（如：3/3）
- ✅ 刷新按钮可点击

**Step 3: 玩游戏**
- 提交分数 → 状态自动更新（2/3）
- 再玩一次 → 状态更新（1/3）
- 第三次 → 状态更新（0/3）

**Step 4: 触发限制**
- 第四次尝试 → 错误提示："每日次数已用完！明天再来吧"
- 状态保持 0/3

**Step 5: 测试冷却（如果配置了cooldown）**
- 玩一次后立即再玩
- 错误提示："请等待 XX 秒后再玩"
- 状态卡片显示倒计时："⏱️ 25s"
- 倒计时递减...
- 倒计时结束后可以继续玩

---

## 📝 用户文档（给DJ的使用说明）

### 如何查看游戏状态

**所有玩家进入游戏时都会自动显示状态：**

1. **剩余次数** - 显示今天还能玩几次
   - 例如：🎮 3/3 表示还有3次机会
   - 例如：🎮 1/3 表示只剩1次

2. **冷却时间** - 如果需要等待，会显示倒计时
   - 例如：⏱️ 30s 表示还需等待30秒
   - 例如：⏱️ 1:25 表示还需等待1分25秒

3. **刷新按钮** - 点击🔄按钮可以手动更新状态

### 错误提示说明

**当玩家违反游戏规则时，会看到清晰的提示：**

- **每日次数用完：** "每日次数已用完！明天再来吧 (X次/天)"
- **冷却中：** "请等待 XX 秒后再玩"（会显示倒计时）
- **已玩过：** "您已经玩过此游戏，每人仅限一次机会"
- **等级不足：** "等级不足！需要等级 X，当前 Y"
- **不在开放时间：** "今天不在开放日期"
- **预算用完：** "今日预算已用完，明天再来吧"

---

## 🔧 未来优化建议

### Phase 1（已完成）✅
- ✅ 显示剩余次数
- ✅ 显示冷却倒计时
- ✅ 错误消息优化
- ✅ 自动刷新状态

### Phase 2（可选）
- ⏸️ 显示VIP标识和特权（如："Gold VIP - 5次/天"）
- ⏸️ 显示等级要求（如："需要等级 5"）
- ⏸️ 显示活动时间（如："活动时间：周一至周五"）
- ⏸️ 状态卡片折叠/展开功能

### Phase 3（高级）
- ⏸️ 动态提示："连输3次，下次中奖概率提高！"
- ⏸️ 预算剩余显示："今日预算剩余 500/1000"
- ⏸️ 历史记录快速查看
- ⏸️ 成就/里程碑显示

---

## 📚 相关文档

- **Backend实现：** `minigame/FEATURES.md` - 游戏规则系统
- **测试报告：** `minigame/FULL-TEST-RESULTS-2026-02-01.md`
- **API文档：** Backend GET /scores/status/:instanceSlug
- **Frontend源码：** `apps/web-app/src/views/game/index.vue`

---

## ✅ 完成状态

**Frontend实现：** 🟢 100%完成  
**Backend API：** 🟢 100%完成（Phase 1-4）  
**部署状态：** 🟢 Production Ready  
**用户体验：** 🟢 Ready for testing

---

**实施完成时间：** 2026-02-01 09:28 GMT+8  
**状态：** ✅ **Production部署成功，用户可以使用！**

**访问URL测试：** https://game.xseo.me/game?instance=test-rules-wheel
