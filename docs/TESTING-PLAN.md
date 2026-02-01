# 🧪 游戏规则系统 - 完整测试计划

**创建时间：** 2026-02-01  
**状态：** 待执行  
**目标：** 科学地测试所有8个规则的功能

---

## 📋 测试策略

### 测试类型
1. **Unit Tests** - 单元测试（每个方法独立）
2. **Integration Tests** - API集成测试
3. **End-to-End Tests** - 完整用户流程测试

### 测试优先级
- 🔴 **Critical** - dailyLimit, cooldown, oneTimeOnly, timeLimitConfig
- 🟡 **Important** - minLevel, budgetConfig
- 🟢 **Nice-to-have** - dynamicProbConfig, vipTiers

---

## 🚧 Prerequisites（测试前必须完成）

### 1. Database Setup ✅ Required

**需要执行的Migration：**

```sql
-- 1. 创建 play_attempts 表
CREATE TABLE IF NOT EXISTS play_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  ip_address VARCHAR(45),
  
  -- 索引
  CONSTRAINT fk_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_instance FOREIGN KEY (instance_id) REFERENCES game_instances(id) ON DELETE CASCADE
);

CREATE INDEX idx_play_attempts_member_instance ON play_attempts(member_id, instance_id);
CREATE INDEX idx_play_attempts_attempted_at ON play_attempts(attempted_at);

-- 2. 创建 budget_tracking 表
CREATE TABLE IF NOT EXISTS budget_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  tracking_date DATE NOT NULL,
  total_cost DECIMAL(10,2) DEFAULT 0,
  play_count INT DEFAULT 0,
  
  CONSTRAINT fk_budget_instance FOREIGN KEY (instance_id) REFERENCES game_instances(id) ON DELETE CASCADE,
  UNIQUE(instance_id, tracking_date)
);

CREATE INDEX idx_budget_tracking_date ON budget_tracking(tracking_date);

-- 3. 修改 members 表
ALTER TABLE members ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;
ALTER TABLE members ADD COLUMN IF NOT EXISTS vip_tier VARCHAR(20);
ALTER TABLE members ADD COLUMN IF NOT EXISTS experience INT DEFAULT 0;
```

**执行方式：**
```bash
# 连接到production database
sshpass -p 'Abcd01923' ssh root@154.26.136.139

# 进入database container
docker exec -it minigame-db psql -U postgres -d minigame

# 粘贴上面的SQL
\i /path/to/migration.sql

# 或者直接粘贴SQL语句
```

### 2. Test Game Instance ✅ Required

**创建测试游戏实例：**

通过Admin Panel创建一个test game instance with以下配置：

```json
{
  "slug": "test-rules-wheel",
  "name": "规则测试转盘",
  "config": {
    "dailyLimit": 3,
    "cooldown": 30,
    "oneTimeOnly": false,
    "timeLimitConfig": {
      "enable": true,
      "startTime": null,
      "endTime": null,
      "activeDays": [1, 2, 3, 4, 5]  // 周一到周五
    },
    "minLevel": 2,
    "budgetConfig": {
      "enable": true,
      "dailyBudget": 1000,
      "monthlyBudget": 30000
    },
    "dynamicProbConfig": {
      "enable": true,
      "lossStreakLimit": 3,
      "lossStreakBonus": 20
    },
    "vipTiers": [
      { "name": "Bronze", "extraSpins": 0, "multiplier": 1 },
      { "name": "Silver", "extraSpins": 1, "multiplier": 1.2 },
      { "name": "Gold", "extraSpins": 2, "multiplier": 1.5 },
      { "name": "Platinum", "extraSpins": 5, "multiplier": 2 }
    ],
    "prizeList": [
      { "icon": "10", "label": "10分", "weight": 40, "value": 10, "cost": 10, "isLose": false },
      { "icon": "50", "label": "50分", "weight": 20, "value": 50, "cost": 50, "isLose": false },
      { "icon": "❌", "label": "未中奖", "weight": 30, "value": 0, "cost": 0, "isLose": true },
      { "icon": "💎", "label": "大奖", "weight": 10, "value": 1000, "cost": 1000, "isLose": false }
    ]
  }
}
```

### 3. Test Users ✅ Required

**创建测试用户：**

```sql
-- Normal user (level 1, no VIP)
INSERT INTO members (id, company_id, external_id, username, level, vip_tier, points_balance)
VALUES ('test-user-1', 'your-company-id', 'test1', 'TestUser1', 1, NULL, 0);

-- Level 3 user (for minLevel test)
INSERT INTO members (id, company_id, external_id, username, level, vip_tier, points_balance)
VALUES ('test-user-2', 'your-company-id', 'test2', 'TestUser2', 3, NULL, 0);

-- Gold VIP user
INSERT INTO members (id, company_id, external_id, username, level, vip_tier, points_balance)
VALUES ('test-user-3', 'your-company-id', 'test3', 'TestUser3', 5, 'Gold', 0);
```

### 4. Authentication Tokens ✅ Required

**获取JWT Token：**

```bash
# Method 1: 通过API登录获取token
curl -X POST http://api.xseo.me/auth/member/login \
  -H "Content-Type: application/json" \
  -d '{
    "companySlug": "your-company",
    "externalId": "test1",
    "username": "TestUser1"
  }'

# Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "member": { ... }
}

# 保存token到环境变量
export TEST_TOKEN_1="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export TEST_TOKEN_2="..."
export TEST_TOKEN_3="..."
```

---

## 🧪 Test Cases

### Test Suite 1: dailyLimit（每日次数限制）

#### Test 1.1: Normal user daily limit
**配置：** dailyLimit = 3, no VIP  
**步骤：**
```bash
# 第1次 - 应该成功
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10, "metadata": {"prizeIndex": 0}}'

# 第2次 - 应该成功
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10, "metadata": {"prizeIndex": 0}}'

# 第3次 - 应该成功
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10, "metadata": {"prizeIndex": 0}}'

# 第4次 - 应该返回 DAILY_LIMIT_REACHED
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10, "metadata": {"prizeIndex": 0}}'
```

**期望结果：**
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

#### Test 1.2: VIP user extra spins
**配置：** dailyLimit = 3, Gold VIP (+2 extra)  
**步骤：** 使用 TEST_TOKEN_3 (Gold VIP) 玩5次游戏  
**期望结果：** 前5次成功，第6次返回 DAILY_LIMIT_REACHED (limit: 5)

#### Test 1.3: Check player status
**步骤：**
```bash
curl http://api.xseo.me/scores/status/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1"
```

**期望结果：**
```json
{
  "canPlay": false,
  "dailyLimit": 3,
  "played": 3,
  "remaining": 0,
  "resetAt": "2026-02-02T00:00:00Z"
}
```

---

### Test Suite 2: cooldown（冷却时间）

#### Test 2.1: Basic cooldown check
**配置：** cooldown = 30秒  
**步骤：**
```bash
# 第1次 - 应该成功
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_2" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'

# 立即第2次 - 应该返回 COOLDOWN_ACTIVE
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_2" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'

# 等待31秒后再试 - 应该成功
sleep 31
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_2" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'
```

**期望结果（第2次）：**
```json
{
  "code": "COOLDOWN_ACTIVE",
  "message": "请等待30秒后再玩",
  "cooldownSeconds": 30,
  "remainingSeconds": 29,
  "canPlayAt": "2026-02-01T09:10:30Z"
}
```

---

### Test Suite 3: oneTimeOnly（只能玩一次）

#### Test 3.1: Lifetime one-time limit
**配置：** oneTimeOnly = true  
**步骤：**
```bash
# 创建一个oneTimeOnly的游戏
# 在admin panel创建 test-onetime-wheel (oneTimeOnly: true)

# 第1次 - 应该成功
curl -X POST http://api.xseo.me/scores/test-onetime-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'

# 第2次 - 应该返回 ALREADY_PLAYED
curl -X POST http://api.xseo.me/scores/test-onetime-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'

# 第二天再试 - 仍然返回 ALREADY_PLAYED（终身限制）
```

**期望结果（第2次）：**
```json
{
  "code": "ALREADY_PLAYED",
  "message": "您已经玩过此游戏，每人仅限一次机会"
}
```

---

### Test Suite 4: timeLimitConfig（时间限制）

#### Test 4.1: Active days check
**配置：** activeDays = [1,2,3,4,5] (周一到周五)  
**测试时间：** 周六或周日  
**步骤：**
```bash
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'
```

**期望结果（如果今天是周末）：**
```json
{
  "code": "INVALID_DAY",
  "message": "此游戏仅在周一、周二、周三、周四、周五开放",
  "activeDays": [1, 2, 3, 4, 5]
}
```

#### Test 4.2: Date range check
**配置：** startTime = "2026-02-10", endTime = "2026-02-20"  
**测试时间：** 2026-02-01  
**期望结果：**
```json
{
  "code": "NOT_STARTED",
  "message": "活动尚未开始",
  "startTime": "2026-02-10T00:00:00Z"
}
```

---

### Test Suite 5: minLevel（等级要求）

#### Test 5.1: Level too low
**配置：** minLevel = 2  
**测试用户：** TEST_TOKEN_1 (level 1)  
**步骤：**
```bash
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'
```

**期望结果：**
```json
{
  "statusCode": 403,
  "code": "LEVEL_TOO_LOW",
  "message": "此游戏需要达到等级2",
  "required": 2,
  "current": 1,
  "missing": 1
}
```

#### Test 5.2: Level sufficient
**测试用户：** TEST_TOKEN_2 (level 3)  
**期望结果：** 成功玩游戏

---

### Test Suite 6: budgetConfig（预算控制）

#### Test 6.1: Daily budget check
**配置：** dailyBudget = 1000  
**测试步骤：**
```bash
# 清空今日预算记录
DELETE FROM budget_tracking WHERE tracking_date = CURRENT_DATE;

# 连续玩游戏直到赢取奖品（假设每次cost=100）
# 重复10次后，total_cost应该达到1000

# 第11次应该返回 DAILY_BUDGET_EXCEEDED
```

**期望结果：**
```json
{
  "code": "DAILY_BUDGET_EXCEEDED",
  "message": "今日预算已用完，明天再来吧",
  "dailyBudget": 1000,
  "spent": 1000,
  "resetAt": "2026-02-02T00:00:00Z"
}
```

#### Test 6.2: Budget tracking
**验证步骤：**
```sql
SELECT * FROM budget_tracking 
WHERE instance_id = 'test-rules-wheel-id' 
AND tracking_date = CURRENT_DATE;

-- 应该看到：
-- total_cost = 累计的奖品cost
-- play_count = 玩的次数
```

---

### Test Suite 7: dynamicProbConfig（动态概率）

#### Test 7.1: Loss streak adjustment
**配置：** lossStreakLimit = 3, lossStreakBonus = 20%  
**测试步骤：**
```bash
# 1. 创建3次连输记录（手动插入或玩游戏）
INSERT INTO scores (member_id, instance_id, score, metadata)
VALUES 
  ('test-user-1', 'instance-id', 0, '{"isLose": true}'),
  ('test-user-1', 'instance-id', 0, '{"isLose": true}'),
  ('test-user-1', 'instance-id', 0, '{"isLose": true}');

# 2. Frontend调用getDynamicWeights()时应该看到调整后的权重
# 需要在frontend game engine里调用这个方法
```

**期望行为：**
- Console输出：`[DynamicProb] User xxx loss streak: 3, adjusting weights`
- 输奖品权重降低50%
- 赢奖品权重增加20%

---

### Test Suite 8: vipTiers（VIP倍数）

#### Test 8.1: Score multiplier
**配置：** Gold VIP multiplier = 1.5  
**测试步骤：**
```bash
# 使用Gold VIP账号玩游戏，赢取10分
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_3" \
  -H "Content-Type: application/json" \
  -d '{"score": 10, "metadata": {"prizeIndex": 0}}'

# 查询member的points_balance
SELECT points_balance FROM members WHERE id = 'test-user-3';
```

**期望结果：**
- 原始分数：10
- VIP倍数：1.5
- **实际增加积分：15** (10 * 1.5)

---

## 🔧 测试工具和脚本

### Option 1: Manual API Testing (Postman/curl)
**优点：** 简单直接，容易debug  
**缺点：** 手动执行，重复劳动

### Option 2: Automated Test Script (Bash)
**创建测试脚本：**
```bash
#!/bin/bash
# test-game-rules.sh

API_URL="http://api.xseo.me"
TOKEN_1=$TEST_TOKEN_1
TOKEN_2=$TEST_TOKEN_2
TOKEN_3=$TEST_TOKEN_3

echo "🧪 Testing Game Rules System"
echo "================================"

echo "\n📊 Test 1: Daily Limit"
for i in {1..4}; do
  echo "Attempt $i:"
  curl -s -X POST $API_URL/scores/test-rules-wheel \
    -H "Authorization: Bearer $TOKEN_1" \
    -H "Content-Type: application/json" \
    -d '{"score": 10}' | jq
  sleep 1
done

echo "\n⏱️ Test 2: Cooldown"
# ... more tests

echo "\n✅ All tests completed"
```

### Option 3: Jest Integration Tests
**创建测试文件：**
```typescript
// apps/api/test/game-rules.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('Game Rules (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    // Setup test module
  });

  it('should enforce daily limit', async () => {
    // Play 3 times successfully
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/scores/test-rules-wheel')
        .set('Authorization', `Bearer ${token}`)
        .send({ score: 10 })
        .expect(201);
    }

    // 4th attempt should fail
    await request(app.getHttpServer())
      .post('/scores/test-rules-wheel')
      .set('Authorization', `Bearer ${token}`)
      .send({ score: 10 })
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe('DAILY_LIMIT_REACHED');
      });
  });

  // More tests...
});
```

---

## 📊 测试结果记录

### Test Execution Checklist

| Test Suite | Test Case | Status | Notes |
|------------|-----------|--------|-------|
| **dailyLimit** | Normal limit | ⬜ | |
| | VIP extra spins | ⬜ | |
| | Status endpoint | ⬜ | |
| **cooldown** | Basic check | ⬜ | |
| | Wait and retry | ⬜ | |
| **oneTimeOnly** | First play | ⬜ | |
| | Retry after | ⬜ | |
| **timeLimitConfig** | Active days | ⬜ | |
| | Date range | ⬜ | |
| **minLevel** | Level too low | ⬜ | |
| | Level sufficient | ⬜ | |
| **budgetConfig** | Daily budget | ⬜ | |
| | Budget tracking | ⬜ | |
| **dynamicProbConfig** | Loss streak | ⬜ | |
| **vipTiers** | Score multiplier | ⬜ | |

---

## 🚨 我现在缺少的东西（执行测试前需要）

### ❌ Missing Items

1. **Database Migration执行权限**
   - 需要access production database
   - 或者创建test database

2. **Valid JWT Tokens**
   - 需要3个test users的tokens
   - 或者admin提供test tokens

3. **Test Game Instance**
   - 需要在admin panel创建test instance
   - 配置所有规则

4. **Deployment**
   - 代码已push，但API需要重启加载新代码
   - Database migration需要执行

5. **Testing Framework Setup (Optional)**
   - Jest配置
   - Test database setup

---

## ✅ 建议的测试流程

### Step 1: Prerequisites Setup (30分钟)
```bash
# 1. Deploy API to production
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml up -d --force-recreate api"

# 2. Run database migrations
# (需要DJ提供database access或执行migration script)

# 3. Create test game instance via admin panel
# 4. Create 3 test users and get their tokens
```

### Step 2: Manual API Testing (1小时)
- 使用curl或Postman执行所有test cases
- 记录每个测试的结果
- 截图error responses

### Step 3: Automated Testing (Optional, 2小时)
- Setup Jest e2e tests
- Run automated test suite
- Generate test report

---

## 🎯 现在我需要DJ提供：

1. ✅ **Database Migration执行** - 创建play_attempts和budget_tracking表
2. ✅ **Test Users Tokens** - 3个不同level/VIP的用户JWT tokens
3. ✅ **Test Game Instance** - 配置好所有规则的测试游戏
4. 🔧 **API Deployment** - 重启API加载新代码

**或者：**
- 📝 **Database access** - 我可以自己执行migration和创建test data
- 🔑 **Admin panel access** - 我可以自己创建test instance

**有了这些，我可以立即开始科学的完整测试！** 🚀
