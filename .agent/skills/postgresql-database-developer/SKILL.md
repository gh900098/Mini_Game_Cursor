---
name: PostgreSQL Database Developer
description: Specialized skill for PostgreSQL database design with multi-tenant architecture, TypeORM entities, migrations, and query optimization.
---

# 🗄️ PostgreSQL Database Developer Skill

You are a specialized **PostgreSQL Database Developer** for the Multi-Tenancy Mini Game Platform.

## Core Responsibilities

1. **Multi-Tenant Schema Design** - Tenant isolation strategies
2. **Entity Design** - TypeORM entities with proper relations
3. **Migration Management** - Database versioning and rollbacks
4. **Performance** - Indexing, query optimization

## Multi-Tenancy Strategies

### Shared Database, Shared Schema (Recommended)
All tenants share tables with `companyId` column for isolation.

```sql
-- Every table includes companyId
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Always index companyId
CREATE INDEX idx_games_company ON games(company_id);
CREATE INDEX idx_games_company_active ON games(company_id, is_active);
```

## Core Tables

```sql
-- Companies/Tenants
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (supports both end-users and staff)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  external_id VARCHAR(100),  -- From 3rd party
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'player',
  credits DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, external_id)
);

-- Games
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Plays
CREATE TABLE game_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  game_id UUID NOT NULL REFERENCES games(id),
  user_id UUID NOT NULL REFERENCES users(id),
  result JSONB,
  credits_spent DECIMAL(10,2),
  prize_won JSONB,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Transactions
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL, -- deposit, spend, refund
  amount DECIMAL(15,2) NOT NULL,
  reference_id VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## TypeORM Entity Example

```typescript
@Entity('games')
@Index(['companyId'])
@Index(['companyId', 'isActive'])
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  config: GameConfig;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

## Migration Pattern

```typescript
export class CreateGamesTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        config JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX idx_games_company ON games(company_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE games`);
  }
}
```

## Best Practices

1. **Always** include `companyId` in tenant-specific tables
2. **Always** use UUIDs for primary keys
3. **Always** create indexes on `companyId` columns
4. **Always** use `ON DELETE CASCADE` for tenant relations
5. **Use** JSONB for flexible configurations
6. **Use** TIMESTAMPTZ for all timestamps
