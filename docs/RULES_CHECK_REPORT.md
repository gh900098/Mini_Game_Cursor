# 🎮 转盘游戏规则配置检查报告

**检查时间：** 2026-02-01 07:53  
**检查范围：** 所有规则相关的config配置

---

## 📊 总体状态

| 规则类型 | 前端配置 | Backend实现 | 状态 |
|---------|---------|------------|------|
| **基础规则** | ✅ | ❌ | 🔴 未实现 |
| **时间控制** | ✅ | ❌ | 🔴 未实现 |
| **预算控制** | ✅ | ❌ | 🔴 未实现 |
| **动态概率** | ✅ | ❌ | 🔴 未实现 |
| **VIP等级** | ✅ | ❌ | 🔴 未实现 |

**结论：所有规则配置都只有前端UI，backend完全没有实现检查逻辑！** 🔴

---

## 🔴 未实现的规则配置（详细）

### 1. 基础规则（5个）

#### ❌ dailyLimit（每日游戏次数限制）
**前端配置：**
```typescript
{ 
  key: 'dailyLimit', 
  type: 'number', 
  label: '每日游戏限制', 
  default: 3 
}
```

**Backend实现：** ❌ 无
- scores.service.ts 的 `submit()` 没有检查
- 用户可以无限次玩

**应该实现：**
```typescript
// 检查今天该用户玩了几次
const todayCount = await getTodayPlayCount(memberId, instanceId);
if (todayCount >= instance.config.dailyLimit) {
  throw new BadRequestException('已达到每日游戏次数限制');
}
```

---

#### ❌ cooldown（游戏冷却时间）
**前端配置：**
```typescript
{ 
  key: 'cooldown', 
  type: 'number', 
  label: '冷却时间(秒)', 
  default: 60 
}
```

**Backend实现：** ❌ 无
- 用户可以连续快速玩

**应该实现：**
```typescript
// 检查上次玩的时间
const lastPlay = await getLastPlayTime(memberId, instanceId);
const elapsed = Date.now() - lastPlay;
if (elapsed < instance.config.cooldown * 1000) {
  throw new BadRequestException('请等待冷却时间');
}
```

---

#### ❌ minLevel（最低等级要求）
**前端配置：**
```typescript
{ 
  key: 'minLevel', 
  type: 'number', 
  label: '最低等级', 
  default: 0 
}
```

**Backend实现：** ❌ 无
- 任何等级都能玩

**应该实现：**
```typescript
const member = await getMember(memberId);
if (member.level < instance.config.minLevel) {
  throw new ForbiddenException('等级不足');
}
```

---

#### ❌ requireLogin（需要登录）
**前端配置：**
```typescript
{ 
  key: 'requireLogin', 
  label: '需要登录' 
}
```

**Backend实现：** ⚠️ 部分
- 有 `@UseGuards(JwtAuthGuard)` - 强制登录
- 但没有检查 `config.requireLogin` 的值
- 即使config设为false，还是需要登录

**应该实现：**
```typescript
if (instance.config.requireLogin && !req.user) {
  throw new UnauthorizedException('需要登录');
}
```

---

#### ❌ oneTimeOnly（每人只能玩一次）
**前端配置：**
```typescript
{ 
  key: 'oneTimeOnly', 
  label: '每人只能玩一次' 
}
```

**Backend实现：** ❌ 无
- 用户可以重复玩

**应该实现：**
```typescript
if (instance.config.oneTimeOnly) {
  const hasPlayed = await hasUserPlayed(memberId, instanceId);
  if (hasPlayed) {
    throw new BadRequestException('您已经玩过此游戏');
  }
}
```

---

### 2. 时间控制（1个）

#### ❌ timeLimitConfig（时间限制配置）
**前端配置：**
```typescript
{ 
  key: 'timeLimitConfig', 
  type: 'time-limit',
  // 包含：enable, startTime, endTime, activeDays
}
```

**Backend实现：** ❌ 无
- 任何时间都能玩

**应该实现：**
```typescript
if (instance.config.timeLimitConfig?.enable) {
  const now = new Date();
  const config = instance.config.timeLimitConfig;
  
  // 检查日期范围
  if (now < config.startTime || now > config.endTime) {
    throw new BadRequestException('游戏未在开放时间内');
  }
  
  // 检查星期
  const today = now.getDay();
  if (!config.activeDays.includes(today)) {
    throw new BadRequestException('今天不开放');
  }
}
```

---

### 3. 预算控制（1个）

#### ❌ budgetConfig（预算控制）
**前端配置：**
```typescript
{ 
  key: 'budgetConfig', 
  type: 'budget-control',
  // 包含：enable, dailyBudget, monthlyBudget
}
```

**Backend实现：** ❌ 无
- 没有预算限制

**应该实现：**
```typescript
if (instance.config.budgetConfig?.enable) {
  const dailySpent = await getDailySpent(instanceId);
  const monthlySpent = await getMonthlySpent(instanceId);
  
  if (dailySpent >= instance.config.budgetConfig.dailyBudget) {
    throw new BadRequestException('今日预算已用完');
  }
  
  if (monthlySpent >= instance.config.budgetConfig.monthlyBudget) {
    throw new BadRequestException('本月预算已用完');
  }
}
```

---

### 4. 动态概率（1个）

#### ❌ dynamicProbConfig（动态概率配置）
**前端配置：**
```typescript
{ 
  key: 'dynamicProbConfig', 
  type: 'dynamic-prob',
  // 包含：enable, lossStreakLimit, lossStreakBonus
}
```

**Backend实现：** ❌ 无
- 概率固定不变

**应该实现：**
```typescript
if (instance.config.dynamicProbConfig?.enable) {
  const lossStreak = await getUserLossStreak(memberId, instanceId);
  
  if (lossStreak >= instance.config.dynamicProbConfig.lossStreakLimit) {
    // 增加赢的概率
    adjustPrizeWeights(instance.config.dynamicProbConfig.lossStreakBonus);
  }
}
```

---

### 5. VIP等级（1个）

#### ❌ vipTiers（VIP等级配置）
**前端配置：**
```typescript
{ 
  key: 'vipTiers', 
  type: 'vip-grid',
  // 包含：[{ name, extraSpins, multiplier }]
}
```

**Backend实现：** ❌ 无
- 没有VIP特权

**应该实现：**
```typescript
const member = await getMember(memberId);
const vipTier = instance.config.vipTiers?.find(t => t.name === member.vipLevel);

if (vipTier) {
  // 额外次数
  dailyLimit += vipTier.extraSpins;
  
  // 奖励倍数
  finalScore *= vipTier.multiplier;
}
```

---

## 📋 当前Backend代码（scores.service.ts）

**完全没有规则检查：**

```typescript
async submit(memberId: string, instanceSlug: string, scoreValue: number, metadata?: any) {
    // 1. Find Game Instance
    const instance = await this.instanceService.findBySlug(instanceSlug);

    // 2. Log Score (没有任何检查！)
    const score = this.scoreRepository.create({
        memberId,
        instanceId: instance.id,
        score: scoreValue,
        metadata,
    });
    
    // 3. Save (直接保存)
    const savedScore = await this.scoreRepository.save(score);

    // 4. Update Points (直接更新积分)
    await this.membersService.updatePoints(memberId, scoreValue);

    return savedScore;
}
```

**缺少的检查：**
1. ❌ 没有检查 dailyLimit
2. ❌ 没有检查 cooldown
3. ❌ 没有检查 minLevel
4. ❌ 没有检查 oneTimeOnly
5. ❌ 没有检查 timeLimitConfig
6. ❌ 没有检查 budgetConfig
7. ❌ 没有检查 dynamicProbConfig
8. ❌ 没有检查 vipTiers

---

## 🎯 实现优先级建议

### 高优先级（必须实现）
1. **dailyLimit** - 防止滥用
2. **cooldown** - 防止刷分
3. **oneTimeOnly** - 限时活动必需
4. **timeLimitConfig** - 活动时间控制

### 中优先级（建议实现）
5. **minLevel** - 游戏门槛
6. **requireLogin** - 访客vs会员
7. **budgetConfig** - 成本控制

### 低优先级（可选）
8. **dynamicProbConfig** - 游戏平衡
9. **vipTiers** - VIP特权

---

## 🔧 实现方案

### 方案1：在 scores.service.ts 的 submit() 添加检查

**优点：**
- 集中在一个地方
- 所有游戏都适用

**缺点：**
- submit() 会变得很长
- 每次提交都要检查

### 方案2：创建独立的 GameRulesService

**优点：**
- 逻辑分离，易维护
- 可复用
- 易测试

**缺点：**
- 多一个service

**建议：使用方案2** ✅

```typescript
// game-rules.service.ts
@Injectable()
export class GameRulesService {
  async validatePlay(memberId: string, instance: GameInstance): Promise<void> {
    await this.checkDailyLimit(memberId, instance);
    await this.checkCooldown(memberId, instance);
    await this.checkMinLevel(memberId, instance);
    await this.checkOneTimeOnly(memberId, instance);
    await this.checkTimeLimit(instance);
    await this.checkBudget(instance);
    // ... etc
  }
}

// scores.service.ts
async submit(...) {
  const instance = await this.instanceService.findBySlug(instanceSlug);
  
  // 检查规则
  await this.gameRulesService.validatePlay(memberId, instance);
  
  // 继续原有逻辑...
}
```

---

## 📝 需要的新数据表

### 1. play_records（游戏记录表）
```sql
CREATE TABLE play_records (
  id UUID PRIMARY KEY,
  memberId UUID,
  instanceId UUID,
  playedAt TIMESTAMP,
  -- 用于检查 dailyLimit, cooldown, oneTimeOnly
);
```

### 2. budget_tracking（预算跟踪表）
```sql
CREATE TABLE budget_tracking (
  id UUID PRIMARY KEY,
  instanceId UUID,
  date DATE,
  spent DECIMAL,
  -- 用于检查 budgetConfig
);
```

### 3. 或者在 members 表添加字段
```sql
ALTER TABLE members ADD COLUMN level INT DEFAULT 1;
ALTER TABLE members ADD COLUMN vipLevel VARCHAR;
```

---

## 🚨 安全风险

**当前状态：**
- ⚠️ 用户可以无限次玩（没有dailyLimit检查）
- ⚠️ 用户可以快速刷分（没有cooldown检查）
- ⚠️ 预算无法控制（没有budgetConfig检查）
- ⚠️ 活动时间无法限制（没有timeLimitConfig检查）

**建议：尽快实现基础规则检查（dailyLimit, cooldown, oneTimeOnly）！**

---

**报告完成时间：** 2026-02-01 07:53  
**下一步：** 等待决定优先实现哪些规则
