# How to Add a New Integration Provider (Sync Strategy)

Because each third-party platform has unique authentication mechanisms, pagination rules, and JSON response formats, new Integrations are added via code using the **Strategy Pattern**.

If your business signs a new platform (e.g., "Shopify", "Magento", "Custom Client App"), follow these steps to add them to the system:

## 1. Create the Strategy Class
Create a new file in `apps/api/src/modules/sync/strategies/`:
Example: `shopify.strategy.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { SyncStrategy } from './sync.strategy.interface';
import { Company } from '../../companies/entities/company.entity';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ShopifySyncStrategy implements SyncStrategy {
    private readonly logger = new Logger(ShopifySyncStrategy.name);

    constructor(
        private readonly httpService: HttpService,
        // Inject your GameMember / PlayAttempt / Score repositories here
    ) {}

    async fetchMembers(company: Company, maxPages: number): Promise<void> {
        // 1. Read company.integration_config.apiUrl & accessToken
        // 2. Perform external HTTP GET request
        // 3. Map foreign JSON into GameMember entity
        // 4. Save to Repository (Upsert by externalId)
    }

    async fetchDeposits(company: Company, maxPages: number): Promise<void> {
       // Similar to above...
    }

    async fetchWithdrawals(company: Company, maxPages: number): Promise<void> {
       // Similar to above...
    }
}
```

## 2. Register with the Factory
Open `apps/api/src/modules/sync/strategies/sync-strategy.factory.ts`.
1. Inject your new strategy into the constructor.
2. Add it to the switch statement:

```typescript
import { ShopifySyncStrategy } from './shopify.strategy';

@Injectable()
export class SyncStrategyFactory {
    constructor(
        private readonly jkStrategy: JkSyncStrategy,
        private readonly shopifyStrategy: ShopifySyncStrategy, // <-- 1. Inject
    ) { }

    getStrategy(provider: string): SyncStrategy {
        switch (provider?.toUpperCase()) {
            case 'JK':
                return this.jkStrategy;
            case 'SHOPIFY': // <-- 2. Register enum
                return this.shopifyStrategy;
            default:
                throw new BadRequestException(`Unsupported sync provider: ${provider}`);
        }
    }
}
```

## 3. Register with Dependency Injection
Open `apps/api/src/modules/sync/sync.module.ts`.
Add your new strategy to the `providers` array so NestJS can instantiate it:

```typescript
providers: [
    SyncProcessor,
    SyncScheduler,
    SyncStrategyFactory,
    JkSyncStrategy,
    ShopifySyncStrategy // <-- Register here
]
```

## 4. Make it visible in the Admin UI
Open `apps/api/src/modules/companies/companies.controller.ts`.
Update the `getIntegrationProviders` endpoint to include your new provider label:

```typescript
@Get('integration-providers')
getIntegrationProviders() {
  return [
    { label: 'JK Platform', value: 'JK' },
    { label: 'Shopify E-commerce', value: 'SHOPIFY' } // <-- Add to Dropdown UI
  ];
}
```

## Done!
Once deployed, Super Admins can go to a Company's Settings -> Integration Tab -> and select "Shopify E-commerce" from the dropdown. The background SyncCron will automatically route synchronization tasks to your new `fetchMembers` logic!
