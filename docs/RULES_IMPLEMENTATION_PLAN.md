# 🎮 Spin Wheel Game Rules Implementation Plan (Detailed version)

**Planning Time:** 2026-02-01 08:08  
**Objective:** Implement backend logic for all rule configurations.

---

## 📋 Overall Architecture Design

### Solution Choice: Independent GameRulesService ✅

**Why this design:**
- ✅ Separated logic, easy to maintain.
- ✅ Reusable for other game types.
- ✅ Easy to test.
- ✅ Does not clutter `scores.service.ts`.

**Call Flow:**
```
User clicks to play game
  ↓
Frontend calls POST /scores/:instanceSlug
  ↓
ScoresController.submit()
  ↓
GameRulesService.validatePlay() ← Checks all rules
  ↓ (Success)
ScoresService.submit() ← Records score
  ↓
Returns result
```

---

## 🗄️ Required Database Changes

### 1. New Table: play_attempts (Game Attempt Records)

**Purpose:** Tracks every game play attempt to check `dailyLimit`, `cooldown`, and `oneTimeOnly`.

```sql
CREATE TABLE play_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  ip_address VARCHAR(45),
  
  -- Index optimization
  INDEX idx_member_instance (member_id, instance_id),
  INDEX idx_attempted_at (attempted_at)
);
```

**Design rationale:**
- `success` field: Records if the play was successful (for future cases where pre-checks might fail).
- `ip_address`: Anti-cheating measure, can limit instances per IP.
- Indexes: Speed up queries for daily counts and last play time.

---

### 2. Modify members Table (Add Level System)

```sql
ALTER TABLE members ADD COLUMN level INT DEFAULT 1;
ALTER TABLE members ADD COLUMN vip_tier VARCHAR(20) DEFAULT NULL;
ALTER TABLE members ADD COLUMN experience INT DEFAULT 0;
```

**Why these are needed:**
- `level`: For `minLevel` rule.
- `vip_tier`: For VIP privileges (Bronze/Silver/Gold/Platinum).
- `experience`: Accumulate experience to level up (optional/future feature).

---

### 3. New Table: budget_tracking (Budget Tracking)

**Purpose:** Tracks the value of prizes issued daily/monthly to control costs.

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

**Design rationale:**
- `tracking_date`: Daily tracking.
- `total_cost`: Total daily cost (prizes value).
- `play_count`: Number of daily plays.
- UNIQUE constraint: Ensures only one record per day per instance.

---

## 🔧 Detailed Implementation (Rule by Rule)

---

## 1️⃣ dailyLimit (Daily Play Limit)

### 📝 Description
**Purpose:** Restricts the number of times a user can play per day.  
**Use Cases:**
- Prevents score abuse.
- Controls costs (limits prize distributions).
- Creates scarcity (players value their 3 daily chances).

### ⚙️ Implementation Logic

```typescript
async checkDailyLimit(memberId: string, instance: GameInstance): Promise<void> {
  const dailyLimit = instance.config.dailyLimit || 0;
  
  // 0 = No limit
  if (dailyLimit === 0) return;
  
  // Count plays for today
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
      message: `You have used up your daily game attempts (${dailyLimit} times/day)`,
      resetAt: new Date(startOfDay.getTime() + 24*60*60*1000) // Midnight tomorrow
    });
  }
}
```

### 📊 Backend Response

**On Success:** Proceed with gameplay.
**On Failure:**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "code": "DAILY_LIMIT_REACHED",
  "message": "Daily play limit reached (3 times/day)",
  "resetAt": "2026-02-02T00:00:00Z",
  "remaining": 0,
  "limit": 3
}
```

### 💡 Additional Features (Recommended)

**Display remaining attempts on game page:**
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

## 2️⃣ cooldown (Game Cooldown)

### 📝 Description
**Purpose:** Requires users to wait X seconds between attempts.  
**Use Cases:**
- Prevents rapid spamming.
- Provides a "cool-down" period for users.
- Reduces server load.

### ⚙️ Implementation Logic

```typescript
async checkCooldown(memberId: string, instance: GameInstance): Promise<void> {
  const cooldown = instance.config.cooldown || 0; // Seconds
  
  // 0 = No cooldown
  if (cooldown === 0) return;
  
  // Find last play attempt
  const lastAttempt = await this.playAttemptsRepo.findOne({
    where: {
      memberId,
      instanceId: instance.id,
      success: true
    },
    order: { attemptedAt: 'DESC' }
  });
  
  if (!lastAttempt) return; // First attempt, no cooldown
  
  const elapsed = Date.now() - lastAttempt.attemptedAt.getTime();
  const remaining = (cooldown * 1000) - elapsed;
  
  if (remaining > 0) {
    throw new BadRequestException({
      code: 'COOLDOWN_ACTIVE',
      message: `Please wait ${Math.ceil(remaining/1000)} seconds before playing again`,
      cooldownSeconds: cooldown,
      remainingSeconds: Math.ceil(remaining/1000),
      canPlayAt: new Date(Date.now() + remaining)
    });
  }
}
```

### 📊 Backend Response

**On Failure:**
```json
{
  "statusCode": 400,
  "code": "COOLDOWN_ACTIVE",
  "message": "Please wait 45 seconds before playing again",
  "cooldownSeconds": 60,
  "remainingSeconds": 45,
  "canPlayAt": "2026-02-01T08:10:00Z"
}
```

### 💡 Frontend Display Suggestions

**Display countdown on game page:**
```javascript
// Frontend
if (error.code === 'COOLDOWN_ACTIVE') {
  startCountdown(error.remainingSeconds);
  // "Please wait 45 seconds before playing again"
  // "Please wait 44 seconds before playing again"
  // ...
}
```

---

## 3️⃣ oneTimeOnly (Lifetime One-Time Limit)

### 📝 Description
**Purpose:** Each user can only play once in total.  
**Use Cases:**
- New user welcome gift.
- Time-limited events (one entry per person).
- High-value prizes (prevents duplicate wins).

### ⚙️ Implementation Logic

```typescript
async checkOneTimeOnly(memberId: string, instance: GameInstance): Promise<void> {
  const oneTimeOnly = instance.config.oneTimeOnly || false;
  
  if (!oneTimeOnly) return;
  
  // Check if ever played
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
      message: 'You have already played this game. Limited to one entry per person.'
    });
  }
}
```

### 📊 Backend Response

**On Failure:**
```json
{
  "statusCode": 400,
  "code": "ALREADY_PLAYED",
  "message": "One entry per person only. You have already played."
}
```

### 💡 Additional Features (Recommended)

**Display status in game list:**
```typescript
// GET /game-instances/public/:companySlug
{
  "instances": [
    {
      "slug": "welcome-spin",
      "name": "Welcome Spin",
      "oneTimeOnly": true,
      "hasPlayed": true, // ← User has played
      "canPlay": false
    }
  ]
}
```

---

## 4️⃣ timeLimitConfig (Time Limits)

### 📝 Description
**Purpose:** Limits game availability to specific dates or days.  
**Use Cases:**
- Flash events (e.g., Feb 1st - Feb 14th Valentine's event).
- Weekend-only events.
- Business hour restrictions (e.g., 9:00 - 18:00 only).

### ⚙️ Config Structure

```typescript
interface TimeLimitConfig {
  enable: boolean;
  startTime: Date | null;  // Start time
  endTime: Date | null;    // End time
  activeDays: number[];    // 0=Sun, 1=Mon, ..., 6=Sat
}
```

### ⚙️ Implementation Logic

```typescript
async checkTimeLimit(instance: GameInstance): Promise<void> {
  const config = instance.config.timeLimitConfig;
  
  if (!config?.enable) return;
  
  const now = new Date();
  
  // Date range check
  if (config.startTime && now < new Date(config.startTime)) {
    throw new BadRequestException({
      code: 'NOT_STARTED',
      message: 'Event has not started yet',
      startTime: config.startTime
    });
  }
  
  if (config.endTime && now > new Date(config.endTime)) {
    throw new BadRequestException({
      code: 'ENDED',
      message: 'Event has ended',
      endTime: config.endTime
    });
  }
  
  // Day of week check
  if (config.activeDays && config.activeDays.length > 0) {
    const today = now.getDay(); // 0-6
    
    if (!config.activeDays.includes(today)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const activeDayNames = config.activeDays.map(d => dayNames[d]);
      
      throw new BadRequestException({
        code: 'INVALID_DAY',
        message: `This game is only open on ${activeDayNames.join(', ')}`,
        activeDays: config.activeDays
      });
    }
  }
}
```

### 📊 Backend Responses

**Event Not Started:**
```json
{
  "statusCode": 400,
  "code": "NOT_STARTED",
  "message": "Activity has not started yet",
  "startTime": "2026-02-14T00:00:00Z"
}
```

**Event Ended:**
```json
{
  "statusCode": 400,
  "code": "ENDED",
  "message": "Activity has ended",
  "endTime": "2026-02-28T23:59:59Z"
}
```

**Closed Today:**
```json
{
  "statusCode": 400,
  "code": "INVALID_DAY",
  "message": "This game is only open on Friday, Saturday, Sunday",
  "activeDays": [5, 6, 0]
}
```

### 💡 Frontend Display Suggestions

**Display countdowns/status in game list:**
- "Starts on Feb 14th"
- "Ends in 3 days 23 hours"
- "Weekends only (Next opening: Fri 18:00)"

---

## 5️⃣ minLevel (Minimum Level Requirement)

### 📝 Description
**Purpose:** Restricts access to users who haven't reached a specific level.  
**Use Cases:**
- Entry barriers (prevents bots/new accounts from spamming).
- Tiered rewards (premium games for high-level members).
- Encourages user progression.

### ⚙️ Implementation Logic

```typescript
async checkMinLevel(memberId: string, instance: GameInstance): Promise<void> {
  const minLevel = instance.config.minLevel || 0;
  
  if (minLevel === 0) return; // No requirement
  
  const member = await this.membersRepo.findOne({
    where: { id: memberId },
    select: ['level']
  });
  
  if (!member || member.level < minLevel) {
    throw new ForbiddenException({
      code: 'LEVEL_TOO_LOW',
      message: `This game requires level ${minLevel}`,
      required: minLevel,
      current: member?.level || 1,
      missing: minLevel - (member?.level || 1)
    });
  }
}
```

### 📊 Backend Response

**Level Too Low:**
```json
{
  "statusCode": 403,
  "code": "LEVEL_TOO_LOW",
  "message": "This game requires level 5",
  "required": 5,
  "current": 2,
  "missing": 3
}
```

### 💡 Level System Design (Suggestions)

**How XP is earned:**
- +10 XP per game play.
- +50 XP for win streaks.
- +5 XP for daily login.

**Level calculation:**
```typescript
// XP required = level * 100
// Lv1 → Lv2: 100 XP
// Lv2 → Lv3: 200 XP
```

---

## 6️⃣ budgetConfig (Budget Control)

### 📝 Description
**Purpose:** Controls the total value of prizes issued daily/monthly.  
**Use Cases:**
- Cost control (stop issuing prizes after today's budget of $1000 is reached).
- Prevents campaign costs from exceeding estimates.
- Financial management oversight.

### ⚙️ Config Structure

```typescript
interface BudgetConfig {
  enable: boolean;
  dailyBudget: number;   // Daily budget ($)
  monthlyBudget: number; // Monthly budget ($)
}
```

### ⚙️ Implementation Logic

```typescript
async checkBudget(instance: GameInstance): Promise<void> {
  const config = instance.config.budgetConfig;
  
  if (!config?.enable) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Fetch current consumption
  const todayTracking = await this.budgetRepo.findOne({
    where: {
      instanceId: instance.id,
      trackingDate: today
    }
  });
  
  const dailySpent = todayTracking?.totalCost || 0;
  
  // Check daily budget
  if (config.dailyBudget && dailySpent >= config.dailyBudget) {
    throw new BadRequestException({
      code: 'DAILY_BUDGET_EXCEEDED',
      message: "Today's budget has been exhausted. Please come back tomorrow.",
      dailyBudget: config.dailyBudget,
      spent: dailySpent,
      resetAt: new Date(today.getTime() + 24*60*60*1000)
    });
  }
  
  // Check monthly budget
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
        message: 'Monthly budget has been exhausted',
        monthlyBudget: config.monthlyBudget,
        spent: monthlySpent.total
      });
    }
  }
}
```

### 💡 Budget Update Logic

**Update after a player wins:**
```typescript
// Call after ScoresService.submit()
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

**How prize cost is measured:**
```typescript
// Add a `cost` field to each prize in `prizeList`
{
  icon: '10%',
  label: '10% OFF',
  weight: 30,
  cost: 10  // ← Prize is worth $10
}
```

---

## 7️⃣ dynamicProbConfig (Dynamic Probability Adjustment)

### 📝 Description
**Purpose:** Increases winning probability after X consecutive losses (Pity system).  
**Use Cases:**
- Balance gameplay (prevents churn due to bad luck).
- Enhances player experience.
- "Mercy" mechanism.

### ⚙️ Config Structure

```typescript
interface DynamicProbConfig {
  enable: boolean;
  lossStreakLimit: number;  // Trigger point
  lossStreakBonus: number;  // Probability bonus (%)
}
```

### ⚙️ Implementation Logic

```typescript
async getDynamicWeights(memberId: string, instance: GameInstance, baseWeights: number[]): Promise<number[]> {
  const config = instance.config.dynamicProbConfig;
  
  if (!config?.enable) return baseWeights;
  
  // Query loss streak
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
      break; // Streak broken by a win
    }
  }
  
  // Streak threshold not met
  if (lossStreak < config.lossStreakLimit) {
    return baseWeights;
  }
  
  // Adjust weights: decrease loss probability, increase win probability
  const adjustedWeights = baseWeights.map((weight, idx) => {
    const prize = instance.prizeList[idx];
    if (prize.isLose) {
      return weight * 0.5; // Cut loss probability in half
    } else {
      return weight * (1 + config.lossStreakBonus / 100); // Increase win probability
    }
  });
  
  console.log(`[DynamicProb] User ${memberId} loss streak: ${lossStreak}, adjusting weights`);
  
  return adjustedWeights;
}
```

### 💡 Usage

**Call before calculating spin result:**
```typescript
// Original weights
const baseWeights = prizeList.map(p => p.weight);

// Dynamic adjustment
const finalWeights = await this.gameRulesService.getDynamicWeights(
  memberId, 
  instance, 
  baseWeights
);

// Deciding winner based on final weights
const winnerIdx = weightedRandom(finalWeights);
```

---

## 8️⃣ vipTiers (VIP Privileges)

### 📝 Description
**Purpose:** VIP members enjoy extra attempts and reward multipliers.  
**Use Cases:**
- Member differentiation (Free: 3x/day, VIP: 5x/day).
- Reward boost (VIP wins 2x points).
- Incentivizes premium memberships.

### ⚙️ Config Structure

```typescript
interface VipTier {
  name: string;       // "Bronze" | "Silver" | "Gold" | "Platinum"
  extraSpins: number; // Extra attempts
  multiplier: number; // Score multiplier
}

// Example:
[
  { name: "Bronze", extraSpins: 0, multiplier: 1 },
  { name: "Platinum", extraSpins: 5, multiplier: 2 }
]
```

### ⚙️ Implementation Logic

**1. Extra daily attempts:**
```typescript
async checkDailyLimit(memberId: string, instance: GameInstance): Promise<void> {
  let dailyLimit = instance.config.dailyLimit || 0;
  
  // Apply VIP bonus
  const member = await this.membersRepo.findOne({ where: { id: memberId } });
  if (member?.vipTier && instance.config.vipTiers) {
    const vipConfig = instance.config.vipTiers.find(t => t.name === member.vipTier);
    if (vipConfig) {
      dailyLimit += vipConfig.extraSpins;
    }
  }
  
  // Check limit...
}
```

**2. Reward Multiplier:**
```typescript
async submit(...) {
  // ...
  let finalScore = scoreValue;
  
  // Apply VIP multiplier
  const member = await this.membersRepo.findOne({ where: { id: memberId } });
  if (member?.vipTier && instance.config.vipTiers) {
    const vipConfig = instance.config.vipTiers.find(t => t.name === member.vipTier);
    if (vipConfig) {
      finalScore = Math.floor(scoreValue * vipConfig.multiplier);
    }
  }
  
  // Update points balance
  await this.membersService.updatePoints(memberId, finalScore);
}
```

---

## 📊 Documentation Requirements

### Docs that must be updated upon completion:

#### 1. FEATURES.md
```markdown
## 🎮 Game Rules System (Added 2026-02-01)

### Implemented Rules
- ✅ dailyLimit - Daily play limit
- ✅ cooldown - Cooldown period
- ✅ oneTimeOnly - Lifetime one-time play
- ✅ timeLimitConfig - Time windows
- ✅ minLevel - Level requirement
- ✅ budgetConfig - Budget control
- ✅ dynamicProbConfig - Pity system
- ✅ vipTiers - VIP privileges

### Database Tables
- play_attempts - Tracking plays
- budget_tracking - Controlling costs
- members.level - Added level field
```

#### 2. API.md (New)
Record all API error codes:
```markdown
## POST /scores/:instanceSlug

### Error Responses
- `DAILY_LIMIT_REACHED` - Used up daily attempts
- `COOLDOWN_ACTIVE` - Cooling down
- `ALREADY_PLAYED` - Already played (oneTimeOnly)
- `NOT_STARTED` / `ENDED` / `INVALID_DAY` - Time window issues
- `LEVEL_TOO_LOW` - Insufficient level
- `DAILY_BUDGET_EXCEEDED` - Budget exhausted
```

#### 3. DATABASE.md (New)
Record all schema and migration scripts.

---

## ✅ Implementation Steps (Recommended Order)


### Phase 1: Infrastructure (30 mins)
1. Create `play_attempts` table.
2. Modify `members` table (add `level`, `vip_tier`).
3. Create `GameRulesService`.

### Phase 2: High-Priority Rules (1 hour)
4. Implement `dailyLimit`.
5. Implement `cooldown`.
6. Implement `oneTimeOnly`.
7. Implement `timeLimitConfig`.

### Phase 3: Medium-Priority Rules (1 hour)
8. Implement `minLevel`.
9. Create `budget_tracking` table.
10. Implement `budgetConfig`.

### Phase 4: Low-Priority Features (1 hour)
11. Implement `dynamicProbConfig`.
12. Implement `vipTiers`.

### Phase 5: Frontend Display (30 mins)
13. Add `GET /game-instances/:slug/status` API.
14. Return remaining attempts, cooldown time, etc.

### Phase 6: Documentation & Testing (30 mins)
15. Update all documentation.
16. Test each rule.
17. Add to `TROUBLESHOOTING.md`.

**Total: Approx. 4-5 hours for all rules.**

---

## 🎯 How would you like to proceed?

1. ✅ **Approve this plan** → I will start implementation.
2. 🤔 **Adjust certain rules** → Let me know what needs to change.
3. 📋 **View test cases first** → I will write test scenarios for your review.

---

**Document Version:** v1.0  
**Next Update:** Upon implementation completion.
