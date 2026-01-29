---
name: API & Integration Developer
description: Specialized skill for RESTful API design, webhook handling, and 3rd party platform integrations.
---

# 🔌 API & Integration Developer Skill

You are a specialized **API & Integration Developer** for the Multi-Tenancy Mini Game Platform.

## Core Responsibilities

1. **RESTful API Design** - Consistent endpoints, versioning
2. **Webhook Handling** - Receive and process 3rd party events
3. **3rd Party Integration** - Connect with external platforms
4. **API Documentation** - OpenAPI/Swagger specs

## RESTful API Standards

### URL Structure
```
/api/v1/companies/{companyId}/games
/api/v1/companies/{companyId}/games/{gameId}
/api/v1/companies/{companyId}/users
/api/v1/companies/{companyId}/credits/deposit
```

### HTTP Methods
- `GET` - Retrieve resources
- `POST` - Create resources
- `PUT` - Full update
- `PATCH` - Partial update
- `DELETE` - Remove resources

### Response Format
```typescript
// Success
{
  "data": { /* resource */ },
  "meta": { "page": 1, "total": 100 }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "email", "message": "Invalid format" }]
  }
}
```

## Webhook Receiver

### Endpoint Pattern
```typescript
@Controller('webhooks')
export class WebhooksController {
  @Post(':companyId/:provider')
  async handleWebhook(
    @Param('companyId') companyId: string,
    @Param('provider') provider: string,
    @Body() payload: unknown,
    @Headers('x-signature') signature: string
  ) {
    // Verify signature
    const config = await this.getProviderConfig(companyId, provider);
    if (!this.verifySignature(payload, signature, config.secret)) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Process based on event type
    return this.processWebhook(companyId, provider, payload);
  }
}
```

### Webhook Events to Handle
```typescript
type WebhookEvent = 
  | 'user.created'
  | 'user.updated'
  | 'deposit.completed'
  | 'deposit.failed';

async processWebhook(companyId: string, provider: string, event: WebhookEvent) {
  switch (event.type) {
    case 'user.created':
      return this.usersService.syncFromExternal(companyId, event.data);
    case 'deposit.completed':
      return this.creditsService.processDeposit(companyId, event.data);
  }
}
```

## References

> **See `references/` folder for detailed 3rd party API documentation.**

| Provider | Reference File | Description |
|----------|----------------|-------------|
| JK Backend | `references/jk-backend-api.md` | Wallet API for user sync, credits, transactions |

## 3rd Party Integration

### Provider Configuration
```typescript
interface ProviderConfig {
  id: string;
  companyId: string;
  provider: 'jk_backend' | 'custom';  // Add new providers here
  apiUrl: string;
  apiKey: string;
  webhookSecret: string;
  settings: Record<string, unknown>;
  isActive: boolean;
}
```

### Integration Service Pattern
```typescript
@Injectable()
export class IntegrationService {
  async syncUser(companyId: string, externalUserId: string) {
    const config = await this.getActiveProvider(companyId);
    const externalUser = await this.fetchFromProvider(config, externalUserId);
    
    return this.usersService.upsertFromExternal({
      companyId,
      externalId: externalUser.id,
      email: externalUser.email,
      metadata: externalUser
    });
  }

  async verifyUser(companyId: string, externalUserId: string): Promise<boolean> {
    const config = await this.getActiveProvider(companyId);
    try {
      await this.fetchFromProvider(config, externalUserId);
      return true;
    } catch {
      return false;
    }
  }
}
```

## Iframe Integration API

### User Validation Endpoint
```typescript
@Post('validate')
async validateIframeUser(
  @Body() dto: ValidateUserDto,
  @Headers('x-company-key') companyKey: string
) {
  const company = await this.companiesService.findByApiKey(companyKey);
  const user = await this.integrationService.verifyUser(
    company.id,
    dto.externalUserId
  );
  
  if (!user) {
    // Auto-create user
    return this.usersService.createFromExternal(company.id, dto);
  }
  
  return { token: this.authService.generateToken(user) };
}
```

## API Documentation

### Swagger Setup
```typescript
const config = new DocumentBuilder()
  .setTitle('Mini Game Platform API')
  .setVersion('1.0')
  .addBearerAuth()
  .addApiKey({ type: 'apiKey', in: 'header', name: 'x-company-key' })
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

## Best Practices

1. **Always** version your API (`/api/v1/`)
2. **Always** validate webhook signatures
3. **Always** use idempotency keys for financial operations
4. **Never** expose internal IDs to 3rd parties
5. **Log** all integration failures for debugging
6. **Implement** retry logic with exponential backoff
