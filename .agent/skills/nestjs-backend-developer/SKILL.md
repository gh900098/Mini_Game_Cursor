---
name: NestJS Backend Developer
description: Specialized skill for NestJS backend development with multi-tenancy support, TypeORM, authentication, and business logic implementation.
---

# ⚙️ NestJS Backend Developer Skill

You are a specialized **NestJS Backend Developer** for the Multi-Tenancy Mini Game Platform.

## Core Responsibilities

1. **NestJS Architecture** - Modular, feature-based design with DI
2. **Multi-Tenancy** - Tenant context propagation, data isolation
3. **Auth & RBAC** - JWT authentication, role-based permissions
4. **Database** - TypeORM with PostgreSQL, repository pattern

## Project Structure

```
apps/api/src/
├── main.ts
├── app.module.ts
├── common/           # Guards, decorators, filters, pipes
├── config/           # Configuration files
├── modules/          # Feature modules (auth, users, companies, games, credits)
└── database/         # Entities, migrations, seeds
```

## Module Pattern

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Game, GameConfig])],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService]
})
export class GamesModule {}
```

## Controller Pattern

```typescript
@ApiTags('Games')
@Controller('games')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  async findAll(@CurrentTenant() companyId: string): Promise<Game[]> {
    return this.gamesService.findAll(companyId);
  }

  @Post()
  @Roles('admin', 'manager')
  async create(
    @Body() dto: CreateGameDto,
    @CurrentTenant() companyId: string
  ): Promise<Game> {
    return this.gamesService.create(companyId, dto);
  }
}
```

## Service Pattern

```typescript
@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game) private readonly repo: Repository<Game>
  ) {}

  async findAll(companyId: string): Promise<Game[]> {
    return this.repo.find({ where: { companyId } });
  }

  async findOne(id: string, companyId: string): Promise<Game> {
    const game = await this.repo.findOne({ where: { id, companyId } });
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    return game;
  }
}
```

## Entity Pattern

```typescript
@Entity('games')
@Index(['companyId', 'isActive'])
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
```

## DTO Validation

```typescript
export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(GameType)
  type: GameType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

## Multi-Tenancy Decorator

```typescript
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.companyId;
  }
);
```

## Best Practices

1. **Always** use DTOs for request validation
2. **Always** include companyId in queries for data isolation
3. **Always** use transactions for multi-step operations
4. **Never** expose internal error details to clients
5. **Never** trust client-provided tenant IDs without validation
6. **Always** implement proper pagination
7. **Monorepo Env Support**: Always use `envFilePath: ['.env', '../../.env']` in `ConfigModule.forRoot` to support shared root configuration.
8. **JWT Safety**: Always provide a hardcoded fallback secret (e.g. `'secret'`) in `JwtModule` registration to prevent crashes if env vars fail to load.
9. **Localized Exceptions**: Use frontend-compatible i18n keys (e.g. `page.login.common.userNotFound`) as exception messages instead of plain English strings.
10. **Smart Audit Logging (Critical)**: All state-changing operations (POST, PATCH, DELETE, PUT) MUST be wrapped in the `AuditInterceptor`. Use surgical path-overrides in the interceptor to ensure action names are professional and business-focused (e.g., "Assign Company Access" instead of "Create Company").
11. **Audit Log Data Enrichment (Mandatory)**: Users MUST NOT see raw UUIDs in log details. The `AuditInterceptor` MUST be capable of resolving IDs (userId, companyId, roleId, permissionId) to human-readable names (email, name, slug) by injecting the respective services (CompaniesService, UsersService, etc.) and enriching the log payload.

## Granular Permissions

### Permission Guard
Use the `@RequirePermission` decorator to enforce granular access control on controller methods.

```typescript
// Controller
@Get()
@RequirePermission('games:read') // Requires specific action
findAll() { ... }
```

### Decoupling Logic
For sensitive resources (like System Permissions), separate the "management" access from the "usage" access.

```typescript
// Standard Read (Protected)
@Get()
@RequirePermission('permissions:read')
findAll() { ... }

// Options Read (Accessible to Role Managers)
@Get('options')
@RequirePermission('roles:read')
findAllOptions() { ... }
```
