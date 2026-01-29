---
name: Multi-Tenancy Architect
description: Specialized skill for multi-tenant architecture design, tenant isolation, and per-tenant customization.
---

# 🏢 Multi-Tenancy Architect Skill

You are a specialized **Multi-Tenancy Architect** for the Mini Game Platform.

## Core Responsibilities

1. **Isolation Strategy** - Data and resource isolation
2. **Tenant Context** - Propagating tenant throughout the system
3. **Customization** - Per-tenant branding and configuration
4. **Scaling** - Handle multiple tenants efficiently

## Tenancy Model

### Shared Database, Shared Schema (Recommended)
- All tenants share same tables
- `companyId` column on every tenant-specific table
- Pros: Simple, cost-effective, easy maintenance
- Cons: Requires careful query discipline

```sql
-- Every table includes companyId
SELECT * FROM games WHERE company_id = :tenantId;
```

## Tenant Identification

### Methods (in priority order)
1. **JWT Token** - Extract from authenticated user
2. **API Key Header** - For 3rd party integrations
3. **Subdomain** - company1.platform.com
4. **Path Parameter** - /api/companies/:companyId/...

### NestJS Implementation
```typescript
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // From JWT
    if (req.user?.companyId) {
      req.tenantId = req.user.companyId;
    }
    // From API Key
    else if (req.headers['x-company-key']) {
      req.tenantId = await this.lookupByApiKey(req.headers['x-company-key']);
    }
    next();
  }
}
```

## Per-Tenant Customization

### Company Settings Schema
```typescript
interface CompanySettings {
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
  };
  games: {
    defaultCreditsPerPlay: number;
    allowedGameTypes: GameType[];
  };
  integration: {
    webhookUrl?: string;
    apiEnabled: boolean;
  };
}
```

### Loading Tenant Config
```typescript
async getCompanyConfig(companyId: string): Promise<CompanySettings> {
  const cached = await this.cache.get(`company:${companyId}:settings`);
  if (cached) return cached;
  
  const config = await this.companyRepo.findOne({ 
    where: { id: companyId },
    select: ['settings']
  });
  
  await this.cache.set(`company:${companyId}:settings`, config.settings, 300);
  return config.settings;
}
```

## Data Isolation Patterns

### Repository Pattern
```typescript
@Injectable()
export class TenantAwareRepository<T> {
  constructor(
    @InjectRepository(Entity) private repo: Repository<T>,
    private tenantContext: TenantContext
  ) {}

  find(options?: FindOptions<T>): Promise<T[]> {
    return this.repo.find({
      ...options,
      where: {
        ...options?.where,
        companyId: this.tenantContext.companyId
      }
    });
  }
}
```

## Security Considerations

1. **Always** filter by companyId in queries
2. **Never** trust client-provided tenant IDs
3. **Validate** cross-tenant access for internal staff
4. **Audit** all tenant data access
5. **Cache** tenant configs per-tenant

## Best Practices

1. Create companyId indexes on all tenant tables
2. Use cascading deletes for tenant data
3. Implement tenant provisioning/deprovisioning
4. Plan for tenant data export/portability

## Role Hierarchy & Privacy

### Level-Based Visibility
Admins should strictly **never** see roles higher than their own level. This prevents lower-level administrators from mapping the robust security hierarchy.

1.  **Backend**: `currentRoleLevel` must be injected into the JWT profile.
2.  **Frontend**: All role selection lists (Role Table, User Role Dropdown) must filter options.

```typescript
// Filter Logic
return availableRoles.filter(role => 
  role.level <= currentUser.currentRoleLevel
);
```

### Decoupled Permissions
To support white-labeling, role assignment should **not** depend on the ability to read the system permission list.

- **Bad**: Requiring `permissions:read` to load checkboxes (exposes sensitive Permission Menu).
- **Good**: Using a dedicated `GET /permissions/options` endpoint secured by `roles:read`.
