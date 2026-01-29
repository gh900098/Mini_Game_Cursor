# JK Backend - Wallet API Reference

> **Documentation URL**: https://k3o58k.com/
> **API Version**: v1.0.0

## Overview

JK Backend provides a Wallet API for user management, transactions, and game integration. It uses a **single-endpoint architecture** where all requests are sent to the same URL with a `module` parameter to determine the operation.

## Key Features

- 🔄 Single endpoint for all operations
- 🎯 Module-based routing system
- 🔒 Secure authentication with `accessId` and `accessToken`
- 💳 Complete wallet management functionality
- 🎮 Game provider integration
- 📊 Transaction history and reporting

## Authentication

All requests require:
- `accessId`: Unique identifier (integer)
- `accessToken`: Secure access token (string)

```json
{
  "accessId": 12345,
  "accessToken": "your-secure-token-here",
  "module": "/users/getUserDetail",
  "...other parameters"
}
```

## API Endpoint

```
POST https://your-domain.com/api/v1/index.php
Content-Type: multipart/form-data
```

## Available Modules

### User Management
| Module | Description |
|--------|-------------|
| `register` | Register a new user |
| `getUserDetail` | Get user details, balance, status |
| `transfer` | Transfer credits between users |

### Transactions
| Module | Description |
|--------|-------------|
| `/users/getAllTransaction` | Get all transactions with filters |
| `/users/manualAngPao` | Manual credit distribution |
| `/users/getManualAngpaoAmount` | Get distributed amount |

### Games
| Module | Description |
|--------|-------------|
| `/games/getGameCategory` | List game providers (SLOT, LIVE, SPORTSBOOK, 4D) |
| `/games/getGameList` | List available games |
| `/users/getGameURL` | Get game launch URL |
| `getBetHistory` | Get betting history |

### Other
| Module | Description |
|--------|-------------|
| `/users/getPromotionList` | Get promotions for user |
| `/merchants/getLeaderboard` | Get leaderboard data |
| `/referrer/getDownline` | Get referral downlines |
| `decryptDataToPlainText` | Decrypt encrypted data |

## Response Format

```json
{
  "status": "SUCCESS",
  "data": { /* response data */ },
  "timestamp": "2025-09-08T09:37:10+00:00"
}
```

## Integration Points for Our Platform

### User Sync
Use `getUserDetail` to validate users from iframe:
```typescript
// When user comes from JK platform via iframe
async validateJKUser(externalUserId: string): Promise<User> {
  const response = await this.jkApi.request('getUserDetail', {
    id: externalUserId
  });
  
  if (response.status === 'SUCCESS') {
    return this.usersService.upsertFromExternal({
      externalId: externalUserId,
      source: 'jk_backend',
      metadata: response.data
    });
  }
}
```

### Credit/Deposit Sync
Use `transfer` and transaction modules to sync credits:
```typescript
async syncCreditsFromJK(userId: string, amount: number): Promise<void> {
  // When JK platform notifies us of a deposit
  await this.creditsService.addCredits({
    userId,
    amount,
    source: 'jk_deposit',
    externalRef: transactionId
  });
}
```

### Webhook Integration
Set up webhook receiver for JK events:
```typescript
@Post('webhooks/jk/:companyId')
async handleJKWebhook(
  @Param('companyId') companyId: string,
  @Body() payload: JKWebhookPayload,
  @Headers('x-signature') signature: string
) {
  // Verify signature and process event
}
```

## Configuration Schema

```typescript
interface JKProviderConfig {
  provider: 'jk_backend';
  apiUrl: string;           // Base URL for JK API
  accessId: number;         // JK access ID
  accessToken: string;      // JK access token
  webhookSecret?: string;   // For webhook verification
}
```
