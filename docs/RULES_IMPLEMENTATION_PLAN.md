# 🎮 转盘游戏规则实现方案（详细版）

**规划时间：** 2026-02-01 08:08  
**目标：** 实现所有规则配置的backend逻辑

---

## 📋 总体架构设计

### 方案选择：独立的 GameRulesService ✅

**为什么这样设计：**
- ✅ 逻辑分离，易维护
- ✅ 可以复用到其他游戏类型
- ✅ 易于测试
- ✅ 不污染scores.service.ts

**调用流程：**
```
用户点击玩游戏
  ↓
Frontend调用 POST /scores/:instanceSlug
  ↓
ScoresController.submit()
  ↓
GameRulesService.validatePlay() ← 检查所有规则
  ↓ (通过)
ScoresService.submit() ← 记录分数
  ↓
返回结果
```

---

## 🗄️ 需要的数据库改动

### 1. 新建表：play_attempts（游戏尝试记录）

**用途：** 记录每次玩游戏的尝试，用于检查 dailyLimit, cooldown, oneTimeOnly

```sql
CREATE TABLE play_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  ip_address VARCHAR(45),
  
  -- 索引优化查询
  INDEX idx_member_instance (member_id, instance_id),
  INDEX idx_attempted_at (attempted_at)
);
```

**为什么设计成这样：**
- `success` 字段：记录是否成功玩（未来可能有前置检查失败的情况）
- `ip_address`：防作弊，可以限制同一IP
- 索引：加速查询今日次数、上次玩的时间

---

### 2. 修改 members 表（添加等级系统）

```sql
ALTER TABLE members ADD COLUMN level INT DEFAULT 1;
ALTER TABLE members ADD COLUMN vip_tier VARCHAR(20) DEFAULT NULL;
ALTER TABLE members ADD COLUMN experience INT DEFAULT 0;
```

**为什么需要这些：**
- `level`：用于 minLevel 规则
- `vip_tier`：用于 VIP 等级特权（Bronze/Silver/Gold/Platinum）
- `experience`：积累经验升级（可选，未来功能）

---

### 3. 新建表：budget_tracking（预算跟踪）

**用途：** 跟踪每日/每月发放的奖品价值，控制成本

```sql
CREATE TABLE budget_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  tracking_date DATE NOT NULL,
  total_cost DECIMAL(10,2) DEFAULT 0,
  play_count INT DEFAULT 0,
  
  UNIQUE(instance_id, tracking_date),
  INDEX idx_tracking_date (tracking_date)
);
```

**为什么这样设计：**
- `tracking_date`：按天跟踪
- `total_cost`：当天总成本（奖品总价值）
- `play_count`：当天玩的次数
- UNIQUE约束：确保每天只有一条记录

---

## 🔧 详细实现方案（逐个规则）

---

## 1️⃣ dailyLimit（每日游戏次数限制）

### 📝 功能说明
**用途：** 限制每个用户每天最多玩X次  
**适用场景：** 
- 防止刷分滥用
- 控制成本（限制发奖次数）
- 营造稀缺性（每天3次机会，更珍惜）

### ⚙️ 实现逻辑

```typescript
async checkDailyLimit(memberId: string, instance: GameInstance): Promise<void> {
  const dailyLimit = instance.config.dailyLimit || 0;
  
  // 0 = 无限制
  if (dailyLimit === 0) return;
  
  // 查询今天玩了几次
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const count = await this.playAttemptsRepo.count({
    where: {
      memberId,
      instanceId: instance.id,
      attemptedAt: MoreThanOrEqual(startOfDay),
      success: true
    }
  });
  
  if (count >= dailyLimit) {
    throw new BadRequestException({
      code: 'DAILY_LIMIT_REACHED',
      message: `您今天的游戏次数已用完（${dailyLimit}次/天）`,
      resetAt: new Date(startOfDay.getTime() + 24*60*60*1000) // 明天0点
    });
  }
}
```

### 📊 返回给前端的数据

**成功时：** 无，继续玩
**失败时：**
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

### 💡 额外功能（建议）

**在游戏页面显示剩余次数：**
```typescript
// GET /game-instances/:slug/status
{
  "canPlay": true,
  "dailyLimit": 3,
  "played": 2,
  "remaining": 1,
  "resetAt": "2026-02-02T00:00:00Z"
}
```

---

## 2️⃣ cooldown（游戏冷却时间）

### 📝 功能说明
**用途：** 玩一次后，必须等待X秒才能再玩  
**适用场景：**
- 防止快速刷分
- 给用户"冷静"时间（不要沉迷）
- 减轻服务器压力

### ⚙️ 实现逻辑

```typescript
async checkCooldown(memberId: string, instance: GameInstance): Promise<void> {
  const cooldown = instance.config.cooldown || 0; // 秒
  
  // 0 = 无冷却
  if (cooldown === 0) return;
  
  // 查询上次玩的时间
  const lastAttempt = await this.playAttemptsRepo.findOne({
    where: {
      memberId,
      instanceId: instance.id,
      success: true
    },
    order: { attemptedAt: 'DESC' }
  });
  
  if (!lastAttempt) return; // 第一次玩，无需冷却
  
  const elapsed = Date.now() - lastAttempt.attemptedAt.getTime();
  const remaining = (cooldown * 1000) - elapsed;
  
  if (remaining > 0) {
    throw new BadRequestException({
      code: 'COOLDOWN_ACTIVE',
      message: `请等待${Math.ceil(remaining/1000)}秒后再玩`,
      cooldownSeconds: cooldown,
      remainingSeconds: Math.ceil(remaining/1000),
      canPlayAt: new Date(Date.now() + remaining)
    });
  }
}
```

### 📊 返回给前端的数据

**失败时：**
```json
{
  "statusCode": 400,
  "code": "COOLDOWN_ACTIVE",
  "message": "请等待45秒后再玩",
  "cooldownSeconds": 60,
  "remainingSeconds": 45,
  "canPlayAt": "2026-02-01T08:10:00Z"
}
```

### 💡 前端显示建议

**在游戏页面显示倒计时：**
```javascript
// Frontend
if (error.code === 'COOLDOWN_ACTIVE') {
  startCountdown(error.remainingSeconds);
  // "请等待 45 秒后再玩"
  // "请等待 44 秒后再玩"
  // ...
}
```

---

## 3️⃣ oneTimeOnly（每人只能玩一次）

### 📝 功能说明
**用途：** 每个用户终身只能玩一次  
**适用场景：**
- 新人首单礼（欢迎奖励）
- 限时活动（每人只能参与一次）
- 稀缺奖品（防止重复领取）

### ⚙️ 实现逻辑

```typescript
async checkOneTimeOnly(memberId: string, instance: GameInstance): Promise<void> {
  const oneTimeOnly = instance.config.oneTimeOnly || false;
  
  if (!oneTimeOnly) return;
  
  // 检查是否玩过
  const hasPlayed = await this.playAttemptsRepo.exists({
    where: {
      memberId,
      instanceId: instance.id,
      success: true
    }
  });
  
  if (hasPlayed) {
    throw new BadRequestException({
      code: 'ALREADY_PLAYED',
      message: '您已经玩过此游戏，每人仅限一次机会'
    });
  }
}
```

### 📊 返回给前端的数据

**失败时：**
```json
{
  "statusCode": 400,
  "code": "ALREADY_PLAYED",
  "message": "您已经玩过此游戏，每人仅限一次机会"
}
```

### 💡 额外功能（建议）

**在游戏列表显示状态：**
```typescript
// GET /game-instances/public/:companySlug
{
  "instances": [
    {
      "slug": "welcome-spin",
      "name": "新人转盘",
      "oneTimeOnly": true,
      "hasPlayed": true, // ← 用户已玩过
      "canPlay": false
    }
  ]
}
```

---

## 4️⃣ timeLimitConfig（时间限制配置）

### 📝 功能说明
**用途：** 限制游戏在特定时间段内开放  
**适用场景：**
- 限时活动（2月1日-2月14日情人节活动）
- 每周特定日期开放（仅周末可玩）
- 营业时间限制（仅9:00-18:00可玩）

### ⚙️ Config结构

```typescript
interface TimeLimitConfig {
  enable: boolean;
  startTime: Date | null;  // 活动开始时间
  endTime: Date | null;    // 活动结束时间
  activeDays: number[];    // 0=周日, 1=周一, ..., 6=周六
}
```

### ⚙️ 实现逻辑

```typescript
async checkTimeLimit(instance: GameInstance): Promise<void> {
  const config = instance.config.timeLimitConfig;
  
  if (!config?.enable) return;
  
  const now = new Date();
  
  // 检查日期范围
  if (config.startTime && now < new Date(config.startTime)) {
    throw new BadRequestException({
      code: 'NOT_STARTED',
      message: '活动尚未开始',
      startTime: config.startTime
    });
  }
  
  if (config.endTime && now > new Date(config.endTime)) {
    throw new BadRequestException({
      code: 'ENDED',
      message: '活动已结束',
      endTime: config.endTime
    });
  }
  
  // 检查星期几
  if (config.activeDays && config.activeDays.length > 0) {
    const today = now.getDay(); // 0-6
    
    if (!config.activeDays.includes(today)) {
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const activeDayNames = config.activeDays.map(d => dayNames[d]);
      
      throw new BadRequestException({
        code: 'INVALID_DAY',
        message: `此游戏仅在${activeDayNames.join('、')}开放`,
        activeDays: config.activeDays
      });
    }
  }
}
```

### 📊 返回给前端的数据

**活动未开始：**
```json
{
  "statusCode": 400,
  "code": "NOT_STARTED",
  "message": "活动尚未开始",
  "startTime": "2026-02-14T00:00:00Z"
}
```

**活动已结束：**
```json
{
  "statusCode": 400,
  "code": "ENDED",
  "message": "活动已结束",
  "endTime": "2026-02-28T23:59:59Z"
}
```

**今天不开放：**
```json
{
  "statusCode": 400,
  "code": "INVALID_DAY",
  "message": "此游戏仅在周五、周六、周日开放",
  "activeDays": [5, 6, 0]
}
```

### 💡 前端显示建议

**游戏列表显示倒计时：**
- "活动将于 2月14日 开始"
- "活动还有 3天23小时 结束"
- "仅周末开放（下次开放：周五 18:00）"

---

## 5️⃣ minLevel（最低等级要求）

### 📝 功能说明
**用途：** 只有达到X级的用户才能玩  
**适用场景：**
- 游戏门槛（防止新号刷分）
- 会员等级特权（高级游戏需要高等级）
- 引导用户升级

### ⚙️ 实现逻辑

```typescript
async checkMinLevel(memberId: string, instance: GameInstance): Promise<void> {
  const minLevel = instance.config.minLevel || 0;
  
  if (minLevel === 0) return; // 无等级要求
  
  const member = await this.membersRepo.findOne({
    where: { id: memberId },
    select: ['level']
  });
  
  if (!member || member.level < minLevel) {
    throw new ForbiddenException({
      code: 'LEVEL_TOO_LOW',
      message: `此游戏需要达到等级${minLevel}`,
      required: minLevel,
      current: member?.level || 1,
      missing: minLevel - (member?.level || 1)
    });
  }
}
```

### 📊 返回给前端的数据

**等级不足：**
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

### 💡 等级系统设计（建议）

**如何获得经验值：**
- 每玩一次游戏 +10 XP
- 达成连胜 +50 XP
- 每日登录 +5 XP

**等级计算：**
```typescript
// 升级所需经验 = level * 100
// Lv1 → Lv2: 100 XP
// Lv2 → Lv3: 200 XP
// Lv3 → Lv4: 300 XP
```

---

## 6️⃣ budgetConfig（预算控制）

### 📝 功能说明
**用途：** 控制每日/每月发放的奖品总价值  
**适用场景：**
- 成本控制（今日预算1000元，用完就关闭）
- 防止营销成本失控
- 财务管理需求

### ⚙️ Config结构

```typescript
interface BudgetConfig {
  enable: boolean;
  dailyBudget: number;   // 每日预算（元）
  monthlyBudget: number; // 每月预算（元）
}
```

### ⚙️ 实现逻辑

```typescript
async checkBudget(instance: GameInstance): Promise<void> {
  const config = instance.config.budgetConfig;
  
  if (!config?.enable) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 查询今日消耗
  const todayTracking = await this.budgetRepo.findOne({
    where: {
      instanceId: instance.id,
      trackingDate: today
    }
  });
  
  const dailySpent = todayTracking?.totalCost || 0;
  
  // 检查每日预算
  if (config.dailyBudget && dailySpent >= config.dailyBudget) {
    throw new BadRequestException({
      code: 'DAILY_BUDGET_EXCEEDED',
      message: '今日预算已用完，明天再来吧',
      dailyBudget: config.dailyBudget,
      spent: dailySpent,
      resetAt: new Date(today.getTime() + 24*60*60*1000)
    });
  }
  
  // 检查月度预算（类似逻辑）
  if (config.monthlyBudget) {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlySpent = await this.budgetRepo
      .createQueryBuilder()
      .where('instanceId = :id', { id: instance.id })
      .andWhere('trackingDate >= :start', { start: monthStart })
      .select('SUM(totalCost)', 'total')
      .getRawOne();
    
    if (monthlySpent.total >= config.monthlyBudget) {
      throw new BadRequestException({
        code: 'MONTHLY_BUDGET_EXCEEDED',
        message: '本月预算已用完',
        monthlyBudget: config.monthlyBudget,
        spent: monthlySpent.total
      });
    }
  }
}
```

### 💡 预算更新逻辑

**在用户赢奖后更新：**
```typescript
// 在 ScoresService.submit() 后执行
async updateBudget(instanceId: string, prizeCost: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  await this.budgetRepo
    .createQueryBuilder()
    .insert()
    .values({
      instanceId,
      trackingDate: today,
      totalCost: prizeCost,
      playCount: 1
    })
    .orUpdate(['totalCost', 'playCount'], ['instanceId', 'trackingDate'], {
      totalCost: () => 'totalCost + :cost',
      playCount: () => 'playCount + 1'
    })
    .setParameter('cost', prizeCost)
    .execute();
}
```

**如何计算奖品成本：**
```typescript
// 在 prizeList 配置里添加 cost 字段
{
  icon: '10%',
  label: '10% OFF',
  weight: 30,
  cost: 10  // ← 这个奖品价值10元
}
```

---

## 7️⃣ dynamicProbConfig（动态概率调整）

### 📝 功能说明
**用途：** 连输X次后，提高赢的概率（保底机制）  
**适用场景：**
- 游戏平衡（防止运气太差，玩家流失）
- 提升玩家体验（不会一直输）
- 类似"怜悯机制"

### ⚙️ Config结构

```typescript
interface DynamicProbConfig {
  enable: boolean;
  lossStreakLimit: number;  // 连输几次触发
  lossStreakBonus: number;  // 增加概率百分比
}
```

### ⚙️ 实现逻辑

```typescript
async getDynamicWeights(memberId: string, instance: GameInstance, baseWeights: number[]): Promise<number[]> {
  const config = instance.config.dynamicProbConfig;
  
  if (!config?.enable) return baseWeights;
  
  // 查询连输次数
  const recentAttempts = await this.scoreRepo.find({
    where: {
      memberId,
      instanceId: instance.id
    },
    order: { createdAt: 'DESC' },
    take: 10
  });
  
  let lossStreak = 0;
  for (const score of recentAttempts) {
    if (score.metadata?.isLose) {
      lossStreak++;
    } else {
      break; // 赢了一次，连输中断
    }
  }
  
  // 未达到连输阈值
  if (lossStreak < config.lossStreakLimit) {
    return baseWeights;
  }
  
  // 调整权重：提高非输奖品的概率
  const adjustedWeights = baseWeights.map((weight, idx) => {
    const prize = instance.prizeList[idx];
    if (prize.isLose) {
      return weight * 0.5; // 输奖品概率减半
    } else {
      return weight * (1 + config.lossStreakBonus / 100); // 赢奖品概率增加
    }
  });
  
  console.log(`[DynamicProb] User ${memberId} loss streak: ${lossStreak}, adjusting weights`);
  
  return adjustedWeights;
}
```

### 💡 如何使用

**在转盘结算前调用：**
```typescript
// 原本的权重
const baseWeights = prizeList.map(p => p.weight);

// 动态调整后的权重
const finalWeights = await this.gameRulesService.getDynamicWeights(
  memberId, 
  instance, 
  baseWeights
);

// 用调整后的权重来决定结果
const winnerIdx = weightedRandom(finalWeights);
```

---

## 8️⃣ vipTiers（VIP等级特权）

### 📝 功能说明
**用途：** VIP会员享受额外次数和奖励倍数  
**适用场景：**
- 会员差异化（普通会员3次/天，VIP 5次/天）
- 奖励倍数（VIP中奖积分x2）
- 增加付费动力

### ⚙️ Config结构

```typescript
interface VipTier {
  name: string;       // "Bronze" | "Silver" | "Gold" | "Platinum"
  extraSpins: number; // 额外次数
  multiplier: number; // 积分倍数
}

// Example:
[
  { name: "Bronze", extraSpins: 0, multiplier: 1 },
  { name: "Silver", extraSpins: 1, multiplier: 1.2 },
  { name: "Gold", extraSpins: 2, multiplier: 1.5 },
  { name: "Platinum", extraSpins: 5, multiplier: 2 }
]
```

### ⚙️ 实现逻辑

**1. 增加每日次数：**
```typescript
async checkDailyLimit(memberId: string, instance: GameInstance): Promise<void> {
  let dailyLimit = instance.config.dailyLimit || 0;
  
  // 应用VIP加成
  const member = await this.membersRepo.findOne({ where: { id: memberId } });
  if (member?.vipTier && instance.config.vipTiers) {
    const vipConfig = instance.config.vipTiers.find(t => t.name === member.vipTier);
    if (vipConfig) {
      dailyLimit += vipConfig.extraSpins;
    }
  }
  
  // 检查次数...
}
```

**2. 奖励倍数：**
```typescript
async submit(...) {
  // ...
  let finalScore = scoreValue;
  
  // 应用VIP倍数
  const member = await this.membersRepo.findOne({ where: { id: memberId } });
  if (member?.vipTier && instance.config.vipTiers) {
    const vipConfig = instance.config.vipTiers.find(t => t.name === member.vipTier);
    if (vipConfig) {
      finalScore = Math.floor(scoreValue * vipConfig.multiplier);
    }
  }
  
  // 更新积分
  await this.membersService.updatePoints(memberId, finalScore);
}
```

---

## 📊 数据记录与文档

### 完成后必须更新的文档

#### 1. FEATURES.md
```markdown
## 🎮 游戏规则系统 (2026-02-01新增)

### 实现的规则
- ✅ dailyLimit - 每日次数限制
- ✅ cooldown - 冷却时间
- ✅ oneTimeOnly - 只能玩一次
- ✅ timeLimitConfig - 时间限制
- ✅ minLevel - 等级要求
- ✅ budgetConfig - 预算控制
- ✅ dynamicProbConfig - 动态概率
- ✅ vipTiers - VIP特权

### 数据表
- play_attempts - 游戏尝试记录
- budget_tracking - 预算跟踪
- members.level - 等级字段
```

#### 2. API.md（新建）
记录所有API的错误码：
```markdown
## POST /scores/:instanceSlug

### 错误响应

- `DAILY_LIMIT_REACHED` - 每日次数用完
- `COOLDOWN_ACTIVE` - 冷却中
- `ALREADY_PLAYED` - 已玩过（oneTimeOnly）
- `NOT_STARTED` / `ENDED` / `INVALID_DAY` - 时间限制
- `LEVEL_TOO_LOW` - 等级不足
- `DAILY_BUDGET_EXCEEDED` - 预算用完
```

#### 3. DATABASE.md（新建）
记录所有数据库schema和迁移脚本

---

## ✅ 实现步骤（推荐顺序）

### Phase 1: 基础设施 (30分钟)
1. 创建 play_attempts 表
2. 修改 members 表（添加 level, vip_tier）
3. 创建 GameRulesService

### Phase 2: 高优先级规则 (1小时)
4. 实现 dailyLimit
5. 实现 cooldown
6. 实现 oneTimeOnly
7. 实现 timeLimitConfig

### Phase 3: 中优先级规则 (1小时)
8. 实现 minLevel
9. 创建 budget_tracking 表
10. 实现 budgetConfig

### Phase 4: 低优先级功能 (1小时)
11. 实现 dynamicProbConfig
12. 实现 vipTiers

### Phase 5: 前端展示 (30分钟)
13. 添加 GET /game-instances/:slug/status API
14. 返回剩余次数、冷却时间等

### Phase 6: 文档与测试 (30分钟)
15. 更新所有文档
16. 测试每个规则
17. 添加到 TROUBLESHOOTING.md

**总计：约4-5小时完成全部规则**

---

## 🎯 你想怎么开始？

1. ✅ **认可这个方案** → 我开始实现
2. 🤔 **需要调整某些规则** → 告诉我哪里需要改
3. 📋 **先看测试案例** → 我写测试场景给你看

---

**文档版本：** v1.0  
**下次更新：** 实现完成后
