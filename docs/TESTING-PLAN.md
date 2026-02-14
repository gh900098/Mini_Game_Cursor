# 🧪 Game Rules System - Complete Testing Plan

**Created:** 2026-02-01  
**Status:** Pending Execution  
**Objective:** Systematically test the functionality of all 8 game rules.

---

## 📋 Testing Strategy

### Test Types
1. **Unit Tests** - Independent testing of each method.
2. **Integration Tests** - API integration testing.
3. **End-to-End Tests** - Complete user flow testing.

### Test Priorities
- 🔴 **Critical** - dailyLimit, cooldown, oneTimeOnly, timeLimitConfig
- 🟡 **Important** - minLevel, budgetConfig
- 🟢 **Nice-to-have** - dynamicProbConfig, vipTiers

---

## 🚧 Prerequisites (Must be completed before testing)

### 1. Database Setup ✅ Required

**Migration to be executed:**

```sql
-- 1. Create play_attempts table
CREATE TABLE IF NOT EXISTS play_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  ip_address VARCHAR(45),
  
  -- Indexes
  CONSTRAINT fk_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_instance FOREIGN KEY (instance_id) REFERENCES game_instances(id) ON DELETE CASCADE
);

CREATE INDEX idx_play_attempts_member_instance ON play_attempts(member_id, instance_id);
CREATE INDEX idx_play_attempts_attempted_at ON play_attempts(attempted_at);

-- 2. Create budget_tracking table
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

-- 3. Modify members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;
ALTER TABLE members ADD COLUMN IF NOT EXISTS vip_tier VARCHAR(20);
ALTER TABLE members ADD COLUMN IF NOT EXISTS experience INT DEFAULT 0;
```

**Execution Method:**
```bash
# Connect to production database
sshpass -p 'Abcd01923' ssh root@154.26.136.139

# Enter database container
docker exec -it minigame-db psql -U postgres -d minigame

# Paste the SQL above
\i /path/to/migration.sql

# Or paste SQL statements directly
```

### 2. Test Game Instance ✅ Required

**Create a test game instance:**

Create a test game instance via the Admin Panel with the following configuration:

```json
{
  "slug": "test-rules-wheel",
  "name": "Rules Test Wheel",
  "config": {
    "dailyLimit": 3,
    "cooldown": 30,
    "oneTimeOnly": false,
    "timeLimitConfig": {
      "enable": true,
      "startTime": null,
      "endTime": null,
      "activeDays": [1, 2, 3, 4, 5]  // Monday to Friday
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
      { "icon": "10", "label": "10 Points", "weight": 40, "value": 10, "cost": 10, "isLose": false },
      { "icon": "50", "label": "50 Points", "weight": 20, "value": 50, "cost": 50, "isLose": false },
      { "icon": "❌", "label": "No Prize", "weight": 30, "value": 0, "cost": 0, "isLose": true },
      { "icon": "💎", "label": "Jackpot", "weight": 10, "value": 1000, "cost": 1000, "isLose": false }
    ]
  }
}
```

### 3. Test Users ✅ Required

**Create test users:**

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

**Obtain JWT Tokens:**

```bash
# Method 1: Login via API to get token
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

# Save tokens to environment variables
export TEST_TOKEN_1="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export TEST_TOKEN_2="..."
export TEST_TOKEN_3="..."
```

---

## 🧪 Test Cases

### Test Suite 1: dailyLimit

#### Test 1.1: Normal user daily limit
**Configuration:** dailyLimit = 3, no VIP  
**Steps:**
```bash
# 1st time - should succeed
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10, "metadata": {"prizeIndex": 0}}'

# 2nd time - should succeed
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10, "metadata": {"prizeIndex": 0}}'

# 3rd time - should succeed
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10, "metadata": {"prizeIndex": 0}}'

# 4th time - should return DAILY_LIMIT_REACHED
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10, "metadata": {"prizeIndex": 0}}'
```

**Expected Result:**
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

#### Test 1.2: VIP user extra spins
**Configuration:** dailyLimit = 3, Gold VIP (+2 extra)  
**Steps:** Play 5 games using TEST_TOKEN_3 (Gold VIP)  
**Expected Result:** First 5 succeed, 6th returns DAILY_LIMIT_REACHED (limit: 5)

#### Test 1.3: Check player status
**Steps:**
```bash
curl http://api.xseo.me/scores/status/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1"
```

**Expected Result:**
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

### Test Suite 2: cooldown

#### Test 2.1: Basic cooldown check
**Configuration:** cooldown = 30 seconds  
**Steps:**
```bash
# 1st time - should succeed
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_2" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'

# Immediate 2nd time - should return COOLDOWN_ACTIVE
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_2" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'

# Wait 31 seconds and retry - should succeed
sleep 31
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_2" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'
```

**Expected Result (2nd time):**
```json
{
  "code": "COOLDOWN_ACTIVE",
  "message": "Please wait 30 seconds before playing again",
  "cooldownSeconds": 30,
  "remainingSeconds": 29,
  "canPlayAt": "2026-02-01T09:10:30Z"
}
```

---

### Test Suite 3: oneTimeOnly

#### Test 3.1: Lifetime one-time limit
**Configuration:** oneTimeOnly = true  
**Steps:**
```bash
# Create a oneTimeOnly game in Admin Panel: test-onetime-wheel (oneTimeOnly: true)

# 1st time - should succeed
curl -X POST http://api.xseo.me/scores/test-onetime-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'

# 2nd time - should return ALREADY_PLAYED
curl -X POST http://api.xseo.me/scores/test-onetime-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'

# Retry the next day - should still return ALREADY_PLAYED (lifetime limit)
```

**Expected Result (2nd time):**
```json
{
  "code": "ALREADY_PLAYED",
  "message": "You have already played this game. Limited to one game per person."
}
```

---

### Test Suite 4: timeLimitConfig

#### Test 4.1: Active days check
**Configuration:** activeDays = [1,2,3,4,5] (Monday to Friday)  
**Test Time:** Saturday or Sunday  
**Steps:**
```bash
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'
```

**Expected Result (if today is weekend):**
```json
{
  "code": "INVALID_DAY",
  "message": "This game is only open on Monday, Tuesday, Wednesday, Thursday, Friday",
  "activeDays": [1, 2, 3, 4, 5]
}
```

#### Test 4.2: Date range check
**Configuration:** startTime = "2026-02-10", endTime = "2026-02-20"  
**Test Time:** 2026-02-01  
**Expected Result:**
```json
{
  "code": "NOT_STARTED",
  "message": "Activity has not started yet",
  "startTime": "2026-02-10T00:00:00Z"
}
```

---

### Test Suite 5: minLevel

#### Test 5.1: Level too low
**Configuration:** minLevel = 2  
**Test User:** TEST_TOKEN_1 (level 1)  
**Steps:**
```bash
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_1" \
  -H "Content-Type: application/json" \
  -d '{"score": 10}'
```

**Expected Result:**
```json
{
  "statusCode": 403,
  "code": "LEVEL_TOO_LOW",
  "message": "This game requires level 2",
  "required": 2,
  "current": 1,
  "missing": 1
}
```

#### Test 5.2: Level sufficient
**Test User:** TEST_TOKEN_2 (level 3)  
**Expected Result:** Success

---

### Test Suite 6: budgetConfig

#### Test 6.1: Daily budget check
**Configuration:** dailyBudget = 1000  
**Test Steps:**
```bash
# Clear today's budget records
DELETE FROM budget_tracking WHERE tracking_date = CURRENT_DATE;

# Play games continuously until prizes are won (assuming cost=100 each time)
# After 10 times, total_cost should reach 1000

# 11th time should return DAILY_BUDGET_EXCEEDED
```

**Expected Result:**
```json
{
  "code": "DAILY_BUDGET_EXCEEDED",
  "message": "Today's budget has been exhausted. Please come back tomorrow.",
  "dailyBudget": 1000,
  "spent": 1000,
  "resetAt": "2026-02-02T00:00:00Z"
}
```

#### Test 6.2: Budget tracking
**Verification Steps:**
```sql
SELECT * FROM budget_tracking 
WHERE instance_id = 'test-rules-wheel-id' 
AND tracking_date = CURRENT_DATE;

-- Should see:
-- total_cost = Accumulated prize costs
-- play_count = Number of plays
```

---

### Test Suite 7: dynamicProbConfig

#### Test 7.1: Loss streak adjustment
**Configuration:** lossStreakLimit = 3, lossStreakBonus = 20%  
**Test Steps:**
```bash
# 1. Create 3 consecutive losing records (manually insert or play)
INSERT INTO scores (member_id, instance_id, score, metadata)
VALUES 
  ('test-user-1', 'instance-id', 0, '{"isLose": true}'),
  ('test-user-1', 'instance-id', 0, '{"isLose": true}'),
  ('test-user-1', 'instance-id', 0, '{"isLose": true}');

# 2. Adjusted weights should be visible when calling getDynamicWeights() in frontend
```

**Expected Behavior:**
- Console Output: `[DynamicProb] User xxx loss streak: 3, adjusting weights`
- Loss weight reduced by 50%
- Win weight increased by 20%

---

### Test Suite 8: vipTiers

#### Test 8.1: Score multiplier
**Configuration:** Gold VIP multiplier = 1.5  
**Test Steps:**
```bash
# Play using Gold VIP account, win 10 points
curl -X POST http://api.xseo.me/scores/test-rules-wheel \
  -H "Authorization: Bearer $TEST_TOKEN_3" \
  -H "Content-Type: application/json" \
  -d '{"score": 10, "metadata": {"prizeIndex": 0}}'

# Query member's points_balance
SELECT points_balance FROM members WHERE id = 'test-user-3';
```

**Expected Result:**
- Base score: 10
- VIP multiplier: 1.5
- **Actual points added: 15** (10 * 1.5)

---

## 🔧 Testing Tools and Scripts

### Option 1: Manual API Testing (Postman/curl)
**Pros:** Simple, direct, easy to debug.  
**Cons:** Labor-intensive, manual repetition.

### Option 2: Automated Test Script (Bash)
**Create test script:**
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
**Create test file:**
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

## 📊 Test Results Log

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

## 🚨 Currently Missing (Required before testing)

### ❌ Missing Items

1. **Database Migration Execution Privileges**
   - Requires access to production database or creation of a test database.

2. **Valid JWT Tokens**
   - Requires tokens for 3 test users.

3. **Test Game Instance**
   - Needs to be created in Admin Panel with all rules configured.

4. **Deployment**
   - API needs to be restarted to load latest code.
   - Database migration needs to be executed.

5. **Testing Framework Setup (Optional)**
   - Jest configuration and test database setup.

---

## ✅ Recommended Testing Flow

### Step 1: Prerequisites Setup (30 mins)
```bash
# 1. Deploy API to production
sshpass -p 'Abcd01923' ssh root@154.26.136.139 \
  "cd /opt/minigame && git pull origin main && \
   docker compose -f docker-compose.prod.yml up -d --force-recreate api"

# 2. Run database migrations
# 3. Create test game instance via Admin Panel
# 4. Create 3 test users and obtain their tokens
```

### Step 2: Manual API Testing (1 hr)
- Execute all test cases using curl or Postman.
- Record results and screenshots of error responses.

### Step 3: Automated Testing (Optional, 2 hrs)
- Setup and run Jest e2e test suite.
- Generate test report.

---

## 🎯 What I need from DJ:

1. ✅ **Execute Database Migration** - Create play_attempts and budget_tracking tables.
2. ✅ **Provide Test User Tokens** - JWT tokens for 3 users with different levels/VIP statuses.
3. ✅ **Create Test Game Instance** - Configured with all rules.
4. 🔧 **API Deployment** - Restart API to load new code.

**Or:**
- 📝 **Database access** - I can execute migrations and create test data myself.
- 🔑 **Admin Panel access** - I can create the test instance myself.

**With these, I can start the comprehensive testing immediately!** 🚀
```
