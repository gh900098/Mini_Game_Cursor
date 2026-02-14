# JK Backend Integration - Full Design Specification

> **Status:** Not implemented (Future Feature)  
> **Priority:** Medium  
> **Estimated Effort:** 2-3 weeks  
> **Document Version:** v1.0.0  
> **Last Updated:** 2026-02-01

---

## 📋 Overview

### Objective
Enable the MiniGame platform to seamlessly integrate with JK Backend (a third-party wallet system), supporting:
- Seamless login from the JK platform to MiniGame via iframe.
- Automatic synchronization of JK users to MiniGame (webhook + nightly full sync).
- Physical prize/e-gift distribution (requires collecting shipping info).
- 1 player per company (allows duplicate usernames across different companies).

### Core Principles
1. **MiniGame is the Source of Truth** — All game data and prize configurations are managed by MiniGame.
2. **JK Provides Identity Only** — Synchronized user data is only used for authentication.
3. **Dual Sync Mechanism** — Webhook (real-time) + Full Sync (nightly, ensuring consistency).
4. **On-demand Shipping Info Collection** — Users are only asked for addresses when necessary.

---

## 🎯 Integration Points

### 1. User Authentication & Sync
```
JK Platform (iframe) 
  ↓ (encrypted token)
MiniGame Auth Endpoint 
  ↓ (decrypt & validate with JK API)
Upsert Player 
  ↓ (generate JWT)
Redirect to Game
```

### 2. Data Flow
```
JK Users ←→ MiniGame Players
  • Webhook (real-time sync)
  • Nightly Full Sync (3am)
  • Iframe Auth (on-demand)
```

### 3. Prize Distribution
```
Player Wins Prize
  ↓
Check prize.requires_shipping
  ↓ (if true)
Check player.shipping_address
  ↓ (if empty)
Show Shipping Info Modal
  ↓ (collect & save)
Distribute Prize
```

---

## 🗄️ Database Changes

### Players Table Extensions
```sql
-- External platform integration
ALTER TABLE players ADD COLUMN external_platform VARCHAR(50);  -- 'jk' | 'native'
ALTER TABLE players ADD COLUMN external_user_id VARCHAR(255);  -- User ID from JK
ALTER TABLE players ADD COLUMN external_username VARCHAR(255); -- Username from JK
ALTER TABLE players ADD COLUMN sync_source VARCHAR(50) DEFAULT 'native'; 
-- Values: 'native' | 'webhook' | 'full_sync' | 'iframe'
ALTER TABLE players ADD COLUMN last_synced_at TIMESTAMP;

-- Shipping information (collected on-demand)
ALTER TABLE players ADD COLUMN shipping_name VARCHAR(255);
ALTER TABLE players ADD COLUMN shipping_phone VARCHAR(50);
ALTER TABLE players ADD COLUMN shipping_address TEXT;
ALTER TABLE players ADD COLUMN shipping_city VARCHAR(100);
ALTER TABLE players ADD COLUMN shipping_state VARCHAR(100);
ALTER TABLE players ADD COLUMN shipping_postcode VARCHAR(20);
ALTER TABLE players ADD COLUMN shipping_country VARCHAR(100) DEFAULT 'Malaysia';

-- Unique constraint: 1 player per company
CREATE UNIQUE INDEX idx_player_company_external 
ON players(company_id, external_platform, external_user_id) 
WHERE external_platform IS NOT NULL;

-- Fast lookup for sync operations
CREATE INDEX idx_player_external ON players(external_platform, external_user_id);
CREATE INDEX idx_player_sync_source ON players(sync_source);
```

### Companies Table Extensions
```sql
-- JK integration config per company
ALTER TABLE companies ADD COLUMN jk_config JSONB;

-- Example jk_config structure:
-- {
--   "enabled": true,
--   "accessId": 12345,
--   "accessToken": "your-secure-token",
--   "apiUrl": "https://your-domain.com",
--   "webhookSecret": "optional-webhook-secret"
-- }
```

### Prize Configs Table Extensions
```sql
-- Shipping requirements for prizes
ALTER TABLE prize_configs ADD COLUMN requires_shipping BOOLEAN DEFAULT FALSE;
ALTER TABLE prize_configs ADD COLUMN shipping_fields JSONB;

-- Example shipping_fields structure:
-- ["name", "phone", "address", "city", "state", "postcode"]
```

---

## 🔌 API Reference

### JK Backend API
- **Documentation:** https://k3o58k.com/
- **Architecture:** Single endpoint (`/api/v1/index.php`) with `module` parameter
- **Auth:** `accessId` (integer) + `accessToken` (string)

### Key Modules We'll Use

| Module | Purpose |
|--------|---------|
| `getUserDetail` | Validate user, fetch user info |
| `register` | Register new user to JK (if needed) |
| `transfer` | Transfer credits (for prize distribution) |
| `decryptDataToPlainText` | Decrypt iframe token |
| `/users/manualAngPao` | Manual credit distribution |
| `/transactions/getAllTransactions` | Transaction history |

**Complete API docs:** See `.agent/skills/api-integration-developer/references/jk-backend-api.md`

---

## 💻 Backend Implementation

### File Structure
```
src/
├── external/
│   └── jk-backend.service.ts         # JK API client
├── players/
│   ├── player-sync.service.ts        # Sync logic
│   └── entities/player.entity.ts     # Updated with new fields
├── auth/
│   └── jk-auth.controller.ts         # Iframe auth endpoint
├── webhooks/
│   └── jk-webhook.controller.ts      # Webhook receiver
├── prizes/
│   └── prize-distribution.service.ts # Updated with shipping check
└── cron/
    └── player-sync.cron.ts           # Nightly full sync
```

### 1. JK API Client Service
**File:** `src/external/jk-backend.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import FormData from 'form-data';
import axios from 'axios';

interface JKConfig {
  apiUrl: string;
  accessId: number;
  accessToken: string;
}

interface JKResponse<T = any> {
  status: 'SUCCESS' | 'ERROR';
  data: T;
  timestamp: string;
}

@Injectable()
export class JKBackendService {
  private readonly logger = new Logger(JKBackendService.name);

  async request<T = any>(
    config: JKConfig,
    module: string,
    additionalData: Record<string, any> = {}
  ): Promise<JKResponse<T>> {
    const url = `${config.apiUrl}/api/v1/index.php`;
    
    const formData = new FormData();
    formData.append('module', module);
    formData.append('accessId', config.accessId.toString());
    formData.append('accessToken', config.accessToken);
    
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    try {
      const response = await axios.post(url, formData, {
        headers: formData.getHeaders(),
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      this.logger.error(`JK API request failed: ${module}`, error);
      throw error;
    }
  }

  async getUserDetail(config: JKConfig, userId: string) {
    return this.request(config, 'getUserDetail', { id: userId });
  }

  async getAllUsers(
    config: JKConfig, 
    pageIndex: number = 0,
    filters: { status?: 'ACTIVE' | 'INACTIVE' } = {}
  ) {
    return this.request(config, 'getUserDetail', {
      pageIndex,
      ...filters
    });
  }

  async transfer(config: JKConfig, username: string, amount: number) {
    return this.request(config, 'transfer', {
      username,
      amount: amount.toFixed(2) // JK requires decimal format
    });
  }

  async decryptToken(config: JKConfig, encryptedData: string) {
    return this.request(config, 'decryptDataToPlainText', {
      data: encryptedData
    });
  }
}
```

### 2. Player Sync Service
**File:** `src/players/player-sync.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './entities/player.entity';
import { Company } from '../companies/entities/company.entity';
import { JKBackendService } from '../external/jk-backend.service';

@Injectable()
export class PlayerSyncService {
  private readonly logger = new Logger(PlayerSyncService.name);

  constructor(
    @InjectRepository(Player)
    private playersRepo: Repository<Player>,
    @InjectRepository(Company)
    private companiesRepo: Repository<Company>,
    private jkService: JKBackendService
  ) {}

  /**
   * Upsert player from JK platform
   */
  async upsertFromJK(
    companyId: string,
    externalUserId: string,
    externalUsername: string,
    data: {
      name?: string;
      email?: string;
      mobile?: string;
      cash?: string;
    },
    syncSource: 'webhook' | 'full_sync' | 'iframe' = 'webhook'
  ): Promise<Player> {
    let player = await this.playersRepo.findOne({
      where: {
        company_id: companyId,
        external_platform: 'jk',
        external_user_id: externalUserId
      }
    });

    if (player) {
      // Update existing
      player.external_username = externalUsername;
      player.name = data.name || player.name;
      player.email = data.email || player.email;
      player.phone = data.mobile || player.phone;
      player.sync_source = syncSource;
      player.last_synced_at = new Date();
    } else {
      // Create new
      player = this.playersRepo.create({
        company_id: companyId,
        external_platform: 'jk',
        external_user_id: externalUserId,
        external_username: externalUsername,
        username: externalUsername,
        name: data.name,
        email: data.email,
        phone: data.mobile,
        sync_source: syncSource,
        last_synced_at: new Date()
      });
    }

    return this.playersRepo.save(player);
  }

  /**
   * Full sync all players for a company
   */
  async fullSyncCompanyPlayers(companyId: string): Promise<void> {
    const company = await this.companiesRepo.findOne({ 
      where: { id: companyId } 
    });
    
    if (!company?.jk_config?.enabled) {
      this.logger.debug(`Company ${companyId}: JK integration not enabled`);
      return;
    }

    const jkConfig = company.jk_config;
    let pageIndex = 0;
    let hasMore = true;
    const syncedIds: string[] = [];

    this.logger.log(`Starting full sync for company ${companyId}`);

    try {
      while (hasMore) {
        const response = await this.jkService.getAllUsers(
          jkConfig, 
          pageIndex, 
          { status: 'ACTIVE' }
        );

        if (response.status === 'SUCCESS' && response.data.users) {
          for (const user of response.data.users) {
            await this.upsertFromJK(
              companyId,
              user.id,
              user.username,
              {
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                cash: user.cash
              },
              'full_sync'
            );
            
            syncedIds.push(user.id);
          }

          hasMore = pageIndex < response.data.totalPage - 1;
          pageIndex++;
        } else {
          hasMore = false;
        }
      }

      this.logger.log(
        `Full sync completed for ${companyId}: ${syncedIds.length} players`
      );
    } catch (error) {
      this.logger.error(`Full sync failed for company ${companyId}`, error);
      throw error;
    }
  }

  /**
   * Sync all companies with JK integration enabled
   */
  async fullSyncAll(): Promise<void> {
    const companies = await this.companiesRepo
      .createQueryBuilder('company')
      .where("company.jk_config->>'enabled' = 'true'")
      .getMany();

    for (const company of companies) {
      try {
        await this.fullSyncCompanyPlayers(company.id);
      } catch (error) {
        this.logger.error(`Failed to sync company ${company.id}`, error);
        // Continue with next company
      }
    }
  }
}
```

### 3. Webhook Endpoint
**File:** `src/webhooks/jk-webhook.controller.ts`

```typescript
import { 
  Controller, Post, Body, Param, Headers, 
  HttpCode, UnauthorizedException 
} from '@nestjs/common';
import { PlayerSyncService } from '../players/player-sync.service';
import * as crypto from 'crypto';

interface JKWebhookPayload {
  company_id: string;
  external_user_id: string;
  external_username: string;
  action: 'create' | 'update' | 'delete';
  data?: {
    name?: string;
    email?: string;
    mobile?: string;
  };
}

@Controller('webhooks/jk')
export class JKWebhookController {
  constructor(private playerSync: PlayerSyncService) {}

  /**
   * Webhook endpoint for JK platform
   * URL: POST /webhooks/jk/:companyId
   */
  @Post(':companyId')
  @HttpCode(200)
  async handleWebhook(
    @Param('companyId') companyId: string,
    @Body() payload: JKWebhookPayload,
    @Headers('x-signature') signature?: string
  ) {
    // Optional: Verify signature if JK provides webhook signing
    // if (signature && !this.verifySignature(payload, signature, secret)) {
    //   throw new UnauthorizedException('Invalid signature');
    // }

    try {
      switch (payload.action) {
        case 'create':
        case 'update':
          await this.playerSync.upsertFromJK(
            companyId,
            payload.external_user_id,
            payload.external_username,
            payload.data || {},
            'webhook'
          );
          break;
        
        case 'delete':
          // Handle deletion (mark inactive instead of hard delete)
          // await this.playerSync.markInactive(companyId, payload.external_user_id);
          break;
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private verifySignature(
    payload: any, 
    signature: string, 
    secret: string
  ): boolean {
    const computed = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computed)
    );
  }
}
```

### 4. Iframe Authentication
**File:** `src/auth/jk-auth.controller.ts`

```typescript
import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PlayerSyncService } from '../players/player-sync.service';
import { JKBackendService } from '../external/jk-backend.service';
import { JwtService } from '@nestjs/jwt';
import { CompaniesService } from '../companies/companies.service';

@Controller('auth/jk')
export class JKAuthController {
  constructor(
    private playerSync: PlayerSyncService,
    private jkService: JKBackendService,
    private jwtService: JwtService,
    private companiesService: CompaniesService
  ) {}

  /**
   * Iframe entry point
   * URL: /auth/jk/login?company={id}&userId={jkUserId}&token={encrypted}
   */
  @Get('login')
  async iframeLogin(
    @Query('company') companyId: string,
    @Query('userId') externalUserId: string,
    @Query('token') encryptedToken: string,
    @Res() res: Response
  ) {
    try {
      // 1. Get company JK config
      const company = await this.companiesService.findOne(companyId);
      if (!company?.jk_config?.enabled) {
        throw new Error('JK integration not enabled for this company');
      }

      const jkConfig = company.jk_config;

      // 2. Decrypt and verify token with JK API
      const decryptResponse = await this.jkService.decryptToken(
        jkConfig, 
        encryptedToken
      );

      if (decryptResponse.status !== 'SUCCESS') {
        throw new Error('Invalid token');
      }

      // 3. Fetch user details from JK
      const userResponse = await this.jkService.getUserDetail(
        jkConfig, 
        externalUserId
      );
      
      if (userResponse.status !== 'SUCCESS' || !userResponse.data.users?.[0]) {
        throw new Error('User not found in JK platform');
      }

      const jkUser = userResponse.data.users[0];

      // 4. Upsert player in our database
      const player = await this.playerSync.upsertFromJK(
        companyId,
        jkUser.id,
        jkUser.username,
        {
          name: jkUser.name,
          email: jkUser.email,
          mobile: jkUser.mobile,
          cash: jkUser.cash
        },
        'iframe'
      );

      // 5. Generate our JWT token
      const accessToken = this.jwtService.sign({
        playerId: player.id,
        companyId: player.company_id,
        externalPlatform: 'jk',
        externalUserId: player.external_user_id
      });

      // 6. Redirect to game with token
      const redirectUrl = `${process.env.FRONTEND_URL}/game?token=${accessToken}`;
      res.redirect(redirectUrl);

    } catch (error) {
      const errorUrl = `${process.env.FRONTEND_URL}/error?message=authentication_failed`;
      res.redirect(errorUrl);
    }
  }
}
```

### 5. Cron Job for Nightly Full Sync
**File:** `src/cron/player-sync.cron.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlayerSyncService } from '../players/player-sync.service';

@Injectable()
export class PlayerSyncCron {
  private readonly logger = new Logger(PlayerSyncCron.name);

  constructor(private playerSync: PlayerSyncService) {}

  /**
   * Nightly full sync at 3:00 AM MYT
   */
  @Cron('0 3 * * *', {
    timeZone: 'Asia/Kuala_Lumpur'
  })
  async handleNightlyFullSync() {
    this.logger.log('Starting nightly full sync...');
    
    try {
      await this.playerSync.fullSyncAll();
      this.logger.log('Nightly full sync completed successfully');
    } catch (error) {
      this.logger.error('Nightly full sync failed', error);
      // TODO: Send alert to admin
    }
  }

  /**
   * Manual trigger endpoint (for testing/debugging)
   */
  async triggerManualSync(companyId?: string): Promise<void> {
    if (companyId) {
      await this.playerSync.fullSyncCompanyPlayers(companyId);
    } else {
      await this.playerSync.fullSyncAll();
    }
  }
}
```

### 6. Prize Distribution with Shipping Check
**File:** `src/prizes/prize-distribution.service.ts` (updated)

```typescript
async distributePrize(playerId: string, prizeId: string): Promise<void> {
  const player = await this.playersRepo.findOne({ where: { id: playerId } });
  const prize = await this.prizesRepo.findOne({ where: { id: prizeId } });

  // Check if prize requires shipping
  if (prize.requires_shipping) {
    const hasShipping = this.validateShippingInfo(player, prize.shipping_fields);
    
    if (!hasShipping) {
      // Pause distribution and notify player to fill shipping info
      await this.notifyPlayerToFillShipping(player, prize);
      return;
    }
  }

  // Proceed with prize distribution
  switch (prize.prize_type) {
    case 'bonus':
      await this.distributeBonusPrize(player, prize);
      break;
    case 'physical':
      await this.distributePhysicalPrize(player, prize);
      break;
    case 'egift':
      await this.distributeEGiftPrize(player, prize);
      break;
  }
}

private validateShippingInfo(player: Player, requiredFields: string[]): boolean {
  if (!requiredFields || requiredFields.length === 0) return true;
  
  for (const field of requiredFields) {
    const value = player[`shipping_${field}`];
    if (!value || value.trim() === '') {
      return false;
    }
  }
  
  return true;
}

private async notifyPlayerToFillShipping(player: Player, prize: Prize): Promise<void> {
  // Send notification (email/SMS/push) to player
  // Frontend will show modal when player logs in
}
```

---

## 🎨 Frontend Implementation

### File Structure
```
src/
├── views/
│   ├── admin/
│   │   ├── PrizeConfig.vue          # Updated with shipping options
│   │   └── PlayerList.vue           # Show sync source
│   └── player/
│       └── ShippingInfoModal.vue    # Collect shipping info
└── locales/
    ├── zh-cn.ts                     # Chinese translations
    └── en-us.ts                     # English translations
```

### 1. Prize Config UI (Admin Panel)
**File:** `src/views/admin/PrizeConfig.vue` (updated section)

```vue
<template>
  <!-- Prize Type Selection -->
  <el-form-item :label="$t('page.manage.game.section.prizeType')">
    <el-select v-model="config.prizeType">
      <el-option 
        value="bonus" 
        :label="$t('page.manage.game.section.prizeType.bonus')" 
      />
      <el-option 
        value="physical" 
        :label="$t('page.manage.game.section.prizeType.physical')" 
      />
      <el-option 
        value="egift" 
        :label="$t('page.manage.game.section.prizeType.egift')" 
      />
      <el-option 
        value="voucher" 
        :label="$t('page.manage.game.section.prizeType.voucher')" 
      />
    </el-select>
  </el-form-item>

  <!-- Shipping Requirements (Only shown when physical) -->
  <template v-if="config.prizeType === 'physical'">
    <el-form-item :label="$t('page.manage.game.section.requiresShipping')">
      <el-switch v-model="config.requiresShipping" />
    </el-form-item>

    <el-form-item 
      v-if="config.requiresShipping"
      :label="$t('page.manage.game.section.shippingFields')"
    >
      <el-checkbox-group v-model="config.shippingFields">
        <el-checkbox label="name">
          {{ $t('shipping.name') }}
        </el-checkbox>
        <el-checkbox label="phone">
          {{ $t('shipping.phone') }}
        </el-checkbox>
        <el-checkbox label="address">
          {{ $t('shipping.address') }}
        </el-checkbox>
        <el-checkbox label="city">
          {{ $t('shipping.city') }}
        </el-checkbox>
        <el-checkbox label="state">
          {{ $t('shipping.state') }}
        </el-checkbox>
        <el-checkbox label="postcode">
          {{ $t('shipping.postcode') }}
        </el-checkbox>
      </el-checkbox-group>
    </el-form-item>
  </template>
</template>
```

### 2. Player List UI (Admin Panel)
**File:** `src/views/admin/PlayerList.vue` (new columns)

```vue
<template>
  <el-table :data="players">
    <!-- Existing columns... -->

    <!-- Data Source Column -->
    <el-table-column :label="$t('player.source')" width="180">
      <template #default="{ row }">
        <el-tag v-if="row.externalPlatform === 'jk'" type="info">
          JK Backend
        </el-tag>
        <el-tag v-else type="success">
          {{ $t('player.sourceNative') }}
        </el-tag>
        
        <div 
          v-if="row.externalUserId" 
          class="text-xs text-gray-500 mt-1"
        >
          ID: {{ row.externalUserId }}
        </div>
      </template>
    </el-table-column>

    <!-- Last Sync Column -->
    <el-table-column :label="$t('player.lastSync')" width="180">
      <template #default="{ row }">
        <span v-if="row.lastSyncedAt">
          {{ formatDateTime(row.lastSyncedAt) }}
        </span>
        <span v-else class="text-gray-400">-</span>
      </template>
    </el-table-column>

    <!-- Sync Source Badge -->
    <el-table-column :label="$t('player.syncSource')" width="120">
      <template #default="{ row }">
        <el-tag 
          v-if="row.syncSource === 'webhook'" 
          type="primary" 
          size="small"
        >
          Webhook
        </el-tag>
        <el-tag 
          v-else-if="row.syncSource === 'full_sync'" 
          type="info" 
          size="small"
        >
          Full Sync
        </el-tag>
        <el-tag 
          v-else-if="row.syncSource === 'iframe'" 
          type="warning" 
          size="small"
        >
          Iframe
        </el-tag>
        <el-tag 
          v-else 
          type="success" 
          size="small"
        >
          Native
        </el-tag>
      </template>
    </el-table-column>
  </el-table>
</template>
```

### 3. Shipping Info Collection Modal
**File:** `src/views/player/ShippingInfoModal.vue`

```vue
<template>
  <el-dialog
    v-model="visible"
    :title="$t('shipping.fillInfo')"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    width="500px"
  >
    <el-alert
      type="info"
      :title="$t('shipping.required')"
      :description="$t('shipping.requiredDesc')"
      show-icon
      :closable="false"
      class="mb-4"
    />

    <el-form 
      ref="formRef" 
      :model="form" 
      :rules="rules" 
      label-width="120px"
    >
      <el-form-item 
        v-if="requiredFields.includes('name')"
        prop="name"
        :label="$t('shipping.name')"
      >
        <el-input v-model="form.name" :placeholder="$t('shipping.namePlaceholder')" />
      </el-form-item>

      <el-form-item 
        v-if="requiredFields.includes('phone')"
        prop="phone"
        :label="$t('shipping.phone')"
      >
        <el-input v-model="form.phone" :placeholder="$t('shipping.phonePlaceholder')" />
      </el-form-item>

      <el-form-item 
        v-if="requiredFields.includes('address')"
        prop="address"
        :label="$t('shipping.address')"
      >
        <el-input 
          v-model="form.address" 
          type="textarea" 
          :rows="3"
          :placeholder="$t('shipping.addressPlaceholder')"
        />
      </el-form-item>

      <el-form-item 
        v-if="requiredFields.includes('city')"
        prop="city"
        :label="$t('shipping.city')"
      >
        <el-input v-model="form.city" />
      </el-form-item>

      <el-form-item 
        v-if="requiredFields.includes('state')"
        prop="state"
        :label="$t('shipping.state')"
      >
        <el-select v-model="form.state" class="w-full">
          <el-option value="Johor" label="Johor" />
          <el-option value="Kedah" label="Kedah" />
          <el-option value="Kelantan" label="Kelantan" />
          <el-option value="Malacca" label="Malacca" />
          <el-option value="Negeri Sembilan" label="Negeri Sembilan" />
          <el-option value="Pahang" label="Pahang" />
          <el-option value="Penang" label="Penang" />
          <el-option value="Perak" label="Perak" />
          <el-option value="Perlis" label="Perlis" />
          <el-option value="Sabah" label="Sabah" />
          <el-option value="Sarawak" label="Sarawak" />
          <el-option value="Selangor" label="Selangor" />
          <el-option value="Terengganu" label="Terengganu" />
          <el-option value="Kuala Lumpur" label="Kuala Lumpur" />
          <el-option value="Labuan" label="Labuan" />
          <el-option value="Putrajaya" label="Putrajaya" />
        </el-select>
      </el-form-item>

      <el-form-item 
        v-if="requiredFields.includes('postcode')"
        prop="postcode"
        :label="$t('shipping.postcode')"
      >
        <el-input v-model="form.postcode" :placeholder="$t('shipping.postcodePlaceholder')" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button 
        type="primary" 
        @click="submit" 
        :loading="loading"
        size="large"
      >
        {{ $t('common.submit') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  requiredFields: string[];
}>();

const emit = defineEmits<{
  submit: [data: any];
}>();

const visible = ref(true);
const loading = ref(false);
const formRef = ref();

const form = reactive({
  name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  postcode: ''
});

const rules = computed(() => ({
  name: props.requiredFields.includes('name') 
    ? [{ required: true, message: t('shipping.nameRequired') }] 
    : [],
  phone: props.requiredFields.includes('phone')
    ? [{ required: true, message: t('shipping.phoneRequired') }]
    : [],
  address: props.requiredFields.includes('address')
    ? [{ required: true, message: t('shipping.addressRequired') }]
    : [],
  city: props.requiredFields.includes('city')
    ? [{ required: true, message: t('shipping.cityRequired') }]
    : [],
  state: props.requiredFields.includes('state')
    ? [{ required: true, message: t('shipping.stateRequired') }]
    : [],
  postcode: props.requiredFields.includes('postcode')
    ? [{ required: true, message: t('shipping.postcodeRequired') }]
    : []
}));

const submit = async () => {
  try {
    await formRef.value.validate();
    loading.value = true;
    
    // Filter only required fields
    const data = {};
    props.requiredFields.forEach(field => {
      data[field] = form[field];
    });
    
    emit('submit', data);
  } catch (error) {
    // Validation failed
  } finally {
    loading.value = false;
  }
};
</script>
```

---

## 🌐 i18n Updates

### Chinese (zh-cn.ts)
```typescript
export default {
  page: {
    manage: {
      game: {
        section: {
          prizeType: {
            bonus: 'Bonus',
            physical: 'Physical Item',
            egift: 'E-Gift Card',
            voucher: 'Voucher'
          },
          requiresShipping: 'Requires Shipping Address',
          shippingFields: 'Shipping Fields to Collect'
        }
      }
    }
  },
  shipping: {
    name: 'Recipient Name',
    phone: 'Contact Phone',
    address: 'Detailed Address',
    city: 'City',
    state: 'State/Province',
    postcode: 'Postal Code',
    fillInfo: 'Fill Shipping Information',
    required: 'Shipping Information Required',
    requiredDesc: 'Your prize requires shipping. Please fill in your delivery information.',
    namePlaceholder: 'Enter recipient name',
    phonePlaceholder: 'e.g., +60123456789',
    addressPlaceholder: 'Enter detailed address (street, unit number, etc.)',
    postcodePlaceholder: 'e.g., 41150',
    nameRequired: 'Recipient name is required',
    phoneRequired: 'Contact phone is required',
    addressRequired: 'Address is required',
    cityRequired: 'City is required',
    stateRequired: 'State/Province is required',
    postcodeRequired: 'Postal code is required'
  },
  player: {
    source: 'Data Source',
    sourceNative: 'Native Registration',
    lastSync: 'Last Synced',
    syncSource: 'Sync Method'
  }
};
```

### English (en-us.ts)
```typescript
export default {
  page: {
    manage: {
      game: {
        section: {
          prizeType: {
            bonus: 'Bonus',
            physical: 'Physical Item',
            egift: 'E-Gift Card',
            voucher: 'Voucher'
          },
          requiresShipping: 'Requires Shipping Address',
          shippingFields: 'Shipping Fields to Collect'
        }
      }
    }
  },
  shipping: {
    name: 'Recipient Name',
    phone: 'Contact Phone',
    address: 'Detailed Address',
    city: 'City',
    state: 'State/Province',
    postcode: 'Postal Code',
    fillInfo: 'Fill Shipping Information',
    required: 'Shipping Information Required',
    requiredDesc: 'Your prize requires shipping. Please fill in your delivery information.',
    namePlaceholder: 'Enter recipient name',
    phonePlaceholder: 'e.g., +60123456789',
    addressPlaceholder: 'Enter detailed address (street, unit number, etc.)',
    postcodePlaceholder: 'e.g., 41150',
    nameRequired: 'Recipient name is required',
    phoneRequired: 'Contact phone is required',
    addressRequired: 'Address is required',
    cityRequired: 'City is required',
    stateRequired: 'State/Province is required',
    postcodeRequired: 'Postal code is required'
  },
  player: {
    source: 'Data Source',
    sourceNative: 'Native Registration',
    lastSync: 'Last Synced',
    syncSource: 'Sync Method'
  }
};
```

---

## ✅ Testing Checklist

### Phase 1: Setup
- [ ] Database migrations executed successfully
- [ ] JK API client can make basic requests (test with `getUserDetail`)
- [ ] Company JK config can be saved and loaded from database

### Phase 2: Player Sync
- [ ] Webhook endpoint receives POST requests
- [ ] Webhook can create new player
- [ ] Webhook can update existing player
- [ ] Webhook signature verification works (if implemented)
- [ ] Manual full sync completes successfully
- [ ] Full sync handles pagination correctly (multiple pages)
- [ ] Full sync updates `last_synced_at` timestamp

### Phase 3: Iframe Auth
- [ ] JK user can login via iframe URL
- [ ] Token decryption works
- [ ] User details are fetched from JK API
- [ ] Player is upserted in database
- [ ] JWT token is generated correctly
- [ ] Redirect to game works
- [ ] Error handling redirects to error page

### Phase 4: Cron Job
- [ ] Cron job is registered and runs at correct time (3am MYT)
- [ ] Manual trigger endpoint works
- [ ] Multiple companies are synced in sequence
- [ ] Errors in one company don't stop others
- [ ] Logs are written correctly

### Phase 5: Shipping Info
- [ ] Prize config UI shows shipping options
- [ ] Shipping fields are saved to database
- [ ] Shipping modal appears when player wins physical prize
- [ ] Shipping modal shows only required fields
- [ ] Shipping info is saved to player record
- [ ] Prize distribution proceeds after shipping info is filled
- [ ] Admin can view player shipping info

### Phase 6: Admin UI
- [ ] Player list shows data source (JK / Native)
- [ ] Player list shows external user ID
- [ ] Player list shows last sync time
- [ ] Player list shows sync method (webhook/full_sync/iframe)
- [ ] Filters work correctly

### Phase 7: Integration Test
- [ ] End-to-end: JK user → iframe login → play game → win prize → fill shipping → receive prize
- [ ] Webhook from JK platform updates player in real-time
- [ ] Nightly sync catches any missed updates
- [ ] Multiple companies don't interfere with each other
- [ ] Same username in different companies creates separate players

---

## 🚀 Implementation Steps

**When you're ready to implement:**

### Step 1: Database Setup
```bash
# Create migration
npm run migration:create -- AddJKIntegrationFields

# Edit migration file with SQL from "Database Changes" section
# Run migration
npm run migration:run
```

### Step 2: Backend Dependencies
```bash
npm install axios form-data @nestjs/schedule
```

### Step 3: Backend Implementation
1. Create `src/external/jk-backend.service.ts`
2. Create `src/players/player-sync.service.ts`
3. Create `src/webhooks/jk-webhook.controller.ts`
4. Create `src/auth/jk-auth.controller.ts`
5. Create `src/cron/player-sync.cron.ts`
6. Update `src/prizes/prize-distribution.service.ts`
7. Register modules in `app.module.ts`

### Step 4: Frontend Implementation
1. Update `PrizeConfig.vue` with shipping fields
2. Update `PlayerList.vue` with sync columns
3. Create `ShippingInfoModal.vue`
4. Update i18n files (zh-cn.ts, en-us.ts)

### Step 5: Testing
1. Test JK API client with Postman
2. Test webhook with curl/Postman
3. Test full sync manually
4. Test iframe auth flow
5. Test shipping info collection
6. End-to-end integration test

### Step 6: Deployment
1. Run database migrations on production
2. Deploy backend changes
3. Deploy frontend changes
4. Configure JK webhook URL in JK platform
5. Set up cron job monitoring

---

## 📊 Monitoring & Maintenance

### Key Metrics to Monitor
- Webhook success rate
- Full sync duration and success rate
- Player sync errors
- Shipping info completion rate

### Log Files to Watch
```
logs/jk-sync.log       # Player sync operations
logs/jk-webhook.log    # Webhook events
logs/jk-auth.log       # Iframe auth attempts
logs/cron.log          # Nightly sync runs
```

### Health Checks
```bash
# Check last successful sync
SELECT company_id, MAX(last_synced_at) as last_sync
FROM players 
WHERE external_platform = 'jk'
GROUP BY company_id;

# Check sync source distribution
SELECT sync_source, COUNT(*) 
FROM players 
WHERE external_platform = 'jk'
GROUP BY sync_source;

# Check players missing shipping info
SELECT COUNT(*) 
FROM players p
JOIN prize_winners pw ON p.id = pw.player_id
JOIN prize_configs pc ON pw.prize_id = pc.id
WHERE pc.requires_shipping = true
  AND p.shipping_address IS NULL;
```

---

## 🔒 Security Considerations

1. **Webhook Signature Verification** — Always verify webhook signatures if JK provides them
2. **Token Encryption** — Iframe tokens should be encrypted by JK and decrypted by us
3. **Rate Limiting** — Implement rate limiting on webhook endpoint
4. **API Credentials Storage** — Store JK credentials encrypted in database
5. **HTTPS Only** — All API communication must use HTTPS
6. **Input Validation** — Validate all incoming webhook data

---

## 📚 References

- JK Backend API Documentation: https://k3o58k.com/
- Local API Reference: `.agent/skills/api-integration-developer/references/jk-backend-api.md`
- MiniGame Architecture: `minigame/ARCHITECTURE.md`
- MiniGame Deployment: `minigame/DEPLOYMENT.md`

---

## 📝 Future Enhancements

### Phase 2 (After Initial Launch)
- [ ] Reverse sync: Create JK users from MiniGame
- [ ] Credit sync: Sync prize bonuses to JK wallet via `transfer` API
- [ ] Bet history integration: Show JK game history in MiniGame
- [ ] Leaderboard integration: Sync with JK leaderboard
- [ ] Promotion sync: Show JK promotions in MiniGame

### Phase 3 (Advanced Features)
- [ ] Multi-platform support (support other wallet systems besides JK)
- [ ] Real-time credit sync (websocket instead of periodic sync)
- [ ] Advanced shipping options (shipping tracking, delivery confirmation)
- [ ] Shipping cost calculation and payment
- [ ] Prize fulfillment workflow (admin marks "shipped", player confirms "received")

---

**Last Updated:** 2026-02-01  
**Status:** Design Completed, Pending Implementation  
**Estimated Implementation Time:** TBD
```
