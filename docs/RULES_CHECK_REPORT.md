# 🎮 Spin Wheel Game Rules Configuration Audit Report

**Audit Time:** 2026-02-01 07:53  
**Audit Scope:** All game rule-related configurations.

---

## 📊 Overall Status

| Rule Type | Frontend Config | Backend Implementation | Status |
|-----------|-----------------|------------------------|--------|
| **Base Rules** | ✅ | ❌ | 🔴 Not Implemented |
| **Time Control** | ✅ | ❌ | 🔴 Not Implemented |
| **Budget Control** | ✅ | ❌ | 🔴 Not Implemented |
| **Dynamic Prob.** | ✅ | ❌ | 🔴 Not Implemented |
| **VIP Tiers** | ✅ | ❌ | 🔴 Not Implemented |

**Conclusion: All rule configurations are only present in the frontend UI; the backend completely lacks implementation of the check logic!** 🔴

---

## 🔴 Unimplemented Rule Configurations (Detailed)

### 1. Base Rules (5 items)

#### ❌ dailyLimit (Daily Play Limit)
**Frontend Config:**
```typescript
{ 
  key: 'dailyLimit', 
  type: 'number', 
  label: 'Daily Play Limit', 
  default: 3 
}
```

**Backend Implementation:** ❌ None
- `submit()` in `scores.service.ts` does not check this limit.
- Users can play an unlimited number of times.

**Required Implementation:**
```typescript
// Check how many times the user has played today
const todayCount = await getTodayPlayCount(memberId, instanceId);
if (todayCount >= instance.config.dailyLimit) {
  throw new BadRequestException('Daily play limit reached');
}
```

---

#### ❌ cooldown (Game Cooldown)
**Frontend Config:**
```typescript
{ 
  key: 'cooldown', 
  type: 'number', 
  label: 'Cooldown (Seconds)', 
  default: 60 
}
```

**Backend Implementation:** ❌ None
- Users can play repeatedly in quick succession.

**Required Implementation:**
```typescript
// Check last play time
const lastPlay = await getLastPlayTime(memberId, instanceId);
const elapsed = Date.now() - lastPlay;
if (elapsed < instance.config.cooldown * 1000) {
  throw new BadRequestException('Please wait for the cooldown to expire');
}
```

---

#### ❌ minLevel (Minimum Level Requirement)
**Frontend Config:**
```typescript
{ 
  key: 'minLevel', 
  type: 'number', 
  label: 'Minimum Level', 
  default: 0 
}
```

**Backend Implementation:** ❌ None
- Any level can play.

**Required Implementation:**
```typescript
const member = await getMember(memberId);
if (member.level < instance.config.minLevel) {
  throw new ForbiddenException('Insufficient level');
}
```

---

#### ❌ requireLogin (Require Login)
**Frontend Config:**
```typescript
{ 
  key: 'requireLogin', 
  label: 'Require Login' 
}
```

**Backend Implementation:** ⚠️ Partial
- `@UseGuards(JwtAuthGuard)` is present—forces login.
- However, the value of `config.requireLogin` is not checked.
- Login is required even if the config is set to false.

**Required Implementation:**
```typescript
if (instance.config.requireLogin && !req.user) {
  throw new UnauthorizedException('Login required');
}
```

---

#### ❌ oneTimeOnly (One Game per Person Only)
**Frontend Config:**
```typescript
{ 
  key: 'oneTimeOnly', 
  label: 'One Game per Person Only' 
}
```

**Backend Implementation:** ❌ None
- Users can play multiple times.

**Required Implementation:**
```typescript
if (instance.config.oneTimeOnly) {
  const hasPlayed = await hasUserPlayed(memberId, instanceId);
  if (hasPlayed) {
    throw new BadRequestException('You have already played this game');
  }
}
```

---

### 2. Time Control (1 item)

#### ❌ timeLimitConfig (Time Limit Configuration)
**Frontend Config:**
```typescript
{ 
  key: 'timeLimitConfig', 
  type: 'time-limit',
  // Includes: enable, startTime, endTime, activeDays
}
```

**Backend Implementation:** ❌ None
- The game can be played at any time.

**Required Implementation:**
```typescript
if (instance.config.timeLimitConfig?.enable) {
  const now = new Date();
  const config = instance.config.timeLimitConfig;
  
  // Check date range
  if (now < config.startTime || now > config.endTime) {
    throw new BadRequestException('Game is not open at this time');
  }
  
  // Check active days
  const today = now.getDay();
  if (!config.activeDays.includes(today)) {
    throw new BadRequestException('Game is not open today');
  }
}
```

---

### 3. Budget Control (1 item)

#### ❌ budgetConfig (Budget Control)
**Frontend Config:**
```typescript
{ 
  key: 'budgetConfig', 
  type: 'budget-control',
  // Includes: enable, dailyBudget, monthlyBudget
}
```

**Backend Implementation:** ❌ None
- No budget restrictions exist.

**Required Implementation:**
```typescript
if (instance.config.budgetConfig?.enable) {
  const dailySpent = await getDailySpent(instanceId);
  const monthlySpent = await getMonthlySpent(instanceId);
  
  if (dailySpent >= instance.config.budgetConfig.dailyBudget) {
    throw new BadRequestException("Today's budget has been exhausted");
  }
  
  if (monthlySpent >= instance.config.budgetConfig.monthlyBudget) {
    throw new BadRequestException("This month's budget has been exhausted");
  }
}
```

---

### 4. Dynamic Probability (1 item)

#### ❌ dynamicProbConfig (Dynamic Probability Configuration)
**Frontend Config:**
```typescript
{ 
  key: 'dynamicProbConfig', 
  type: 'dynamic-prob',
  // Includes: enable, lossStreakLimit, lossStreakBonus
}
```

**Backend Implementation:** ❌ None
- Win probability remains fixed.

**Required Implementation:**
```typescript
if (instance.config.dynamicProbConfig?.enable) {
  const lossStreak = await getUserLossStreak(memberId, instanceId);
  
  if (lossStreak >= instance.config.dynamicProbConfig.lossStreakLimit) {
    // Increase win probability
    adjustPrizeWeights(instance.config.dynamicProbConfig.lossStreakBonus);
  }
}
```

---

### 5. VIP Tiers (1 item)

#### ❌ vipTiers (VIP Tier Configuration)
**Frontend Config:**
```typescript
{ 
  key: 'vipTiers', 
  type: 'vip-grid',
  // Includes: [{ name, extraSpins, multiplier }]
}
```

**Backend Implementation:** ❌ None
- No VIP privileges exist.

**Required Implementation:**
```typescript
const member = await getMember(memberId);
const vipTier = instance.config.vipTiers?.find(t => t.name === member.vipLevel);

if (vipTier) {
  // Extra attempts
  dailyLimit += vipTier.extraSpins;
  
  // Reward multiplier
  finalScore *= vipTier.multiplier;
}
```

---

## 📋 Current Backend Code (scores.service.ts)

**Lacks any rule checks:**

```typescript
async submit(memberId: string, instanceSlug: string, scoreValue: number, metadata?: any) {
    // 1. Find Game Instance
    const instance = await this.instanceService.findBySlug(instanceSlug);

    // 2. Log Score (NO CHECKS!)
    const score = this.scoreRepository.create({
        memberId,
        instanceId: instance.id,
        score: scoreValue,
        metadata,
    });
    
    // 3. Save (Direct save)
    const savedScore = await this.scoreRepository.save(score);

    // 4. Update Points (Direct update)
    await this.membersService.updatePoints(memberId, scoreValue);

    return savedScore;
}
```

**Missing Checks:**
1. ❌ `dailyLimit`
2. ❌ `cooldown`
3. ❌ `minLevel`
4. ❌ `oneTimeOnly`
5. ❌ `timeLimitConfig`
6. ❌ `budgetConfig`
7. ❌ `dynamicProbConfig`
8. ❌ `vipTiers`

---

## 🎯 Proposed Implementation Priority

### High Priority (Critical)
1. **dailyLimit** - Prevents abuse.
2. **cooldown** - Prevents rapid farming.
3. **oneTimeOnly** - Required for unique events.
4. **timeLimitConfig** - Event schedule control.

### Medium Priority (Recommended)
5. **minLevel** - Entry barrier.
6. **requireLogin** - Guest vs. member differentiation.
7. **budgetConfig** - Cost control.

### Low Priority (Optional)
8. **dynamicProbConfig** - Gameplay balance.
9. **vipTiers** - VIP privileges.

---

## 🔧 Implementation Architecture

### Option 1: Add checks directly to submit() in scores.service.ts

**Pros:**
- Centralized logic.
- Applies to all game types.

**Cons:**
- `submit()` becomes overly long.
- Every submission triggers the checks.

### Option 2: Create a dedicated GameRulesService

**Pros:**
- Decoupled logic, easy maintenance.
- Reusable across different modules.
- Easier to test.

**Cons:**
- Introduces an additional service.

**Recommendation: Use Option 2** ✅

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
  
  // Validate rules
  await this.gameRulesService.validatePlay(memberId, instance);
  
  // Proceed with score logging...
}
```

---

## 📝 Required Database Schemas

### 1. play_records (Play History Tracking)
```sql
CREATE TABLE play_records (
  id UUID PRIMARY KEY,
  memberId UUID,
  instanceId UUID,
  playedAt TIMESTAMP,
  -- Used to check dailyLimit, cooldown, oneTimeOnly
);
```

### 2. budget_tracking (Budget Consumption Tracking)
```sql
CREATE TABLE budget_tracking (
  id UUID PRIMARY KEY,
  instanceId UUID,
  date DATE,
  spent DECIMAL,
  -- Used to check budgetConfig
);
```

### 3. Member Enhancements
```sql
ALTER TABLE members ADD COLUMN level INT DEFAULT 1;
ALTER TABLE members ADD COLUMN vipLevel VARCHAR;
```

---

## 🚨 Security & Business Risks

**Current Vulnerabilities:**
- ⚠️ Users can play an infinite number of times (No `dailyLimit`).
- ⚠️ Users can spam entries to farm rewards (No `cooldown`).
- ⚠️ Costs are uncontrollable (No `budgetConfig`).
- ❌ Events cannot be timed properly (No `timeLimitConfig`).

**Recommendation: Implement base rule checks (dailyLimit, cooldown, oneTimeOnly) as soon as possible!**

---

**Audit Report Completion:** 2026-02-01 07:53  
**Next Steps:** Awaiting direction on rule implementation priorities.
