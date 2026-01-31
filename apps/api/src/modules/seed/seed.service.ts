import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { Company } from '../companies/entities/company.entity';
import { User } from '../users/entities/user.entity';
import { UserCompany } from '../user-companies/entities/user-company.entity';
import { Game } from '../games/entities/game.entity';
import { GameInstance } from '../game-instances/entities/game-instance.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(Permission)
        private readonly permissionRepository: Repository<Permission>,
        @InjectRepository(Company)
        private readonly companyRepository: Repository<Company>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(UserCompany)
        private readonly userCompanyRepository: Repository<UserCompany>,
        @InjectRepository(Game)
        private readonly gameRepository: Repository<Game>,
        @InjectRepository(GameInstance)
        private readonly instanceRepository: Repository<GameInstance>,
    ) { }

    async seedAll(): Promise<{ message: string }> {
        this.logger.log('Starting database seeding...');

        await this.seedPermissions();
        await this.seedRoles();
        await this.seedDemoCompany();
        await this.seedGames();
        await this.seedInstances();

        this.logger.log('Database seeding completed!');
        return { message: 'Database seeded successfully' };
    }

    async refreshGameSchemas(): Promise<{ message: string; updated: number }> {
        this.logger.log('Refreshing game template schemas...');
        
        // Re-seed the game templates to get fresh schemas
        await this.seedGames();
        
        this.logger.log('Game templates refreshed with latest schemas');
        return { message: 'Game templates refreshed successfully', updated: 1 };
    }

    private async seedPermissions(): Promise<void> {
        const resources = ['companies', 'roles', 'permissions', 'users', 'games', 'game-instances', 'members', 'credits', 'gameplays', 'audit-logs', 'email'];
        const actions = ['create', 'read', 'update', 'delete', 'manage'];

        for (const resource of resources) {
            for (const action of actions) {
                const slug = `${resource}:${action}`;
                const existing = await this.permissionRepository.findOne({ where: { slug } });

                if (!existing) {
                    const permission = this.permissionRepository.create({
                        name: `${resource} ${action}`,
                        slug,
                        resource,
                        action,
                        description: `Permission to ${action} ${resource}`,
                    });
                    await this.permissionRepository.save(permission);
                    this.logger.log(`Created permission: ${slug}`);
                }
            }
        }

        // CLEANUP: Remove deprecated permissions
        const deprecatedResources = ['email-settings', 'system-settings'];
        for (const resource of deprecatedResources) {
            // 1. Find permissions to delete
            const permissionsToDelete = await this.permissionRepository.find({ where: { resource } });

            if (permissionsToDelete.length > 0) {
                const ids = permissionsToDelete.map(p => `'${p.id}'`).join(',');

                // 2. FORCE DELETE from junction table using raw query
                // We use raw query because we don't have a repository for the junction table
                await this.permissionRepository.query(`DELETE FROM role_permissions WHERE "permissionId" IN (${ids})`);

                // 3. Delete permissions
                const result = await this.permissionRepository.delete({ resource });
                if (result.affected && result.affected > 0) {
                    this.logger.log(`Cleaned up ${result.affected} deprecated permissions for resource: ${resource}`);
                }
            }
        }
    }

    private async seedRoles(): Promise<void> {
        this.logger.warn('=== ENTERING seedRoles FUNCTION - FORCE UPDATE MODE ===');
        try {
            // Ensure level column exists manually to fix sync issues
            await this.roleRepository.query('ALTER TABLE roles ADD COLUMN IF NOT EXISTS level integer DEFAULT 1');

            // MIGRATION: Rename 'player' to 'operator' if it exists
            const playerRole = await this.roleRepository.findOne({ where: { slug: 'player' } });
            if (playerRole) {
                this.logger.log('Migrating "player" role to "operator"...');
                playerRole.slug = 'operator';
                playerRole.name = 'Operator';
                playerRole.level = 5;
                playerRole.description = 'System Operator';
                await this.roleRepository.save(playerRole);
            }
        } catch (e) {
            this.logger.warn('Role migration/alter failed: ' + e.message);
        }
        const roleDefinitions = [
            {
                name: 'Super Admin',
                slug: 'super_admin',
                description: 'Full system access',
                isSystem: true,
                level: 100,
                permissionPattern: '*:*', // All permissions
            },
            {
                name: 'Company Admin',
                slug: 'company_admin',
                description: 'Administrator for a specific company',
                isSystem: true,
                level: 80,
                permissionPattern: '*:*', // All permissions within company
            },
            {
                name: 'Staff',
                slug: 'staff',
                description: 'Company staff member',
                isSystem: true,
                level: 10,
                permissionPattern: 'games:*,gameplays:read,credits:read', // Limited permissions
            },
            {
                name: 'Operator',
                slug: 'operator',
                description: 'System Operator',
                isSystem: true,
                level: 5,
                permissionPattern: 'games:read,gameplays:read', // Minimal permissions
            },
        ];

        for (const roleDef of roleDefinitions) {
            const existing = await this.roleRepository.findOne({ where: { slug: roleDef.slug } });

            // Get permissions based on pattern
            let permissions: Permission[] = [];
            if (roleDef.permissionPattern === '*:*') {
                permissions = await this.permissionRepository.find();
            } else {
                // Parse permission pattern and get specific permissions
                const patterns = roleDef.permissionPattern.split(',');
                for (const pattern of patterns) {
                    const [resource, action] = pattern.split(':');
                    if (action === '*') {
                        const perms = await this.permissionRepository
                            .createQueryBuilder('permission')
                            .where('permission.resource = :resource', { resource })
                            .getMany();
                        permissions.push(...perms);
                    } else {
                        const perm = await this.permissionRepository.findOne({
                            where: { slug: pattern },
                        });
                        if (perm) permissions.push(perm);
                    }
                }
            }

            if (!existing) {
                const role = this.roleRepository.create({
                    name: roleDef.name,
                    slug: roleDef.slug,
                    description: roleDef.description,
                    isSystem: roleDef.isSystem,
                    level: roleDef.level,
                    permissions,
                });
                await this.roleRepository.save(role);
                this.logger.log(`Created role: ${roleDef.name} with ${permissions.length} permissions`);
            } else {
                // FORCE UPDATE ALWAYS
                existing.level = roleDef.level;
                // Also ensure system flag is consistent
                existing.isSystem = roleDef.isSystem;
                // SYNC PERMISSIONS
                existing.permissions = permissions;
                await this.roleRepository.save(existing);
                this.logger.log(`[SEED] Enforced role and permissions: ${roleDef.name} = ${roleDef.level} (${permissions.length} perms)`);
            }
        }
    }

    private async seedDemoCompany(): Promise<void> {
        this.logger.log('Seeding Demo Company...');

        try {
            // Manual check for inactiveAt column to fix sync issues
            this.logger.log('Manually ensuring inactiveAt column exists...');
            await this.companyRepository.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS "inactiveAt" timestamp');

            // Log all columns for verification
            const columns = await this.companyRepository.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'companies'
            `);
            this.logger.log('Current "companies" table columns: ' + columns.map((c: any) => c.column_name).join(', '));
        } catch (e) {
            this.logger.error('Failed to manually ensure inactiveAt column: ' + e.message);
        }

        const companySlug = 'demo-company';
        let company = await this.companyRepository.findOne({ where: { slug: companySlug } });

        if (!company) {
            company = this.companyRepository.create({
                name: 'Demo Company',
                slug: companySlug,
                isActive: true,
                inactiveAt: null,
                apiSecret: 'demo-secret-123'
            });
            await this.companyRepository.save(company);
            this.logger.log(`Created demo company with ID: ${company.id}`);
        } else {
            this.logger.log(`Found existing demo company with ID: ${company.id}`);
        }

        // Ensure demo admin user exists
        const adminEmail = 'demo@company.com';

        try {
            this.logger.log('Manually ensuring User profile columns exist...');
            await this.userRepository.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS name varchar');
            await this.userRepository.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile varchar');
            await this.userRepository.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS bio varchar');
            await this.userRepository.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS description text');
            await this.userRepository.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS remark text');
        } catch (e) {
            this.logger.error('Failed to manually ensure User columns: ' + e.message);
        }

        let adminUser = await this.userRepository.findOne({ where: { email: adminEmail } });

        if (!adminUser) {
            const hashedPassword = await bcrypt.hash('Demo@12345', 10);
            adminUser = this.userRepository.create({
                email: adminEmail,
                password: hashedPassword,
                name: 'Demo Admin',
                mobile: '+1234567890',
                bio: 'System Administrator',
                description: 'Initial admin user',
                remark: 'Created by seed'
            });
            await this.userRepository.save(adminUser);
            this.logger.log(`Created demo admin user: ${adminEmail} with ID: ${adminUser.id}`);
        } else {
            this.logger.log(`Found existing demo admin user: ${adminEmail} with ID: ${adminUser.id}`);
        }

        // Ensure UserCompany association exists
        const companyAdminRole = await this.roleRepository.findOne({ where: { slug: 'company_admin' } });

        if (!companyAdminRole) {
            this.logger.error('CRITICAL: company_admin role not found! Cannot assign user to company.');
            throw new Error('company_admin role not found');
        }

        this.logger.log(`Found company_admin role with ID: ${companyAdminRole.id}`);

        const existingAssociation = await this.userCompanyRepository.findOne({
            where: { userId: adminUser.id, companyId: company.id }
        });

        if (!existingAssociation) {
            this.logger.log('Creating new UserCompany association...');
            const userCompany = this.userCompanyRepository.create({
                userId: adminUser.id,
                companyId: company.id,
                roleId: companyAdminRole.id,
                isPrimary: true,
                isActive: true,
            });

            try {
                const saved = await this.userCompanyRepository.save(userCompany);
                this.logger.log(`Successfully assigned demo user to demo company. association ID: ${saved.id}`);
            } catch (error) {
                this.logger.error(`Failed to save UserCompany association: ${error.message}`, error.stack);
                throw error;
            }
        } else {
            this.logger.log('UserCompany association already exists.');
        }

        // --- SEED SUPER ADMIN ---
        const superEmail = 'super@admin.com';
        let superUser = await this.userRepository.findOne({ where: { email: superEmail } });
        const hashedSuperPassword = await bcrypt.hash('Demo@12345', 10);

        if (!superUser) {
            superUser = this.userRepository.create({
                email: superEmail,
                password: hashedSuperPassword,
            });
            await this.userRepository.save(superUser);
            this.logger.log(`Created super admin user: ${superEmail}`);
        } else {
            // FORCE UPDATE PASSWORD
            superUser.password = hashedSuperPassword;
            await this.userRepository.save(superUser);
            this.logger.log(`Updated super admin user password: ${superEmail}`);
        }

        const superAdminRole = await this.roleRepository.findOne({ where: { slug: 'super_admin' } });
        // Super Admin needs to be associated with SOME company or just have the role?
        // Our system associates roles VIA company.
        // So we will assign them to the demo company as a Super Admin.

        const superAssociation = await this.userCompanyRepository.findOne({
            where: { userId: superUser.id, companyId: company.id }
        });

        if (!superAssociation && superAdminRole) {
            const uc = this.userCompanyRepository.create({
                userId: superUser.id,
                companyId: company.id,
                roleId: superAdminRole.id,
                isPrimary: true,
                isActive: true
            });
            await this.userCompanyRepository.save(uc);
            this.logger.log(`Assigned super_admin role to ${superEmail}`);
        } else {
            this.logger.log(`Super admin role already assigned to ${superEmail}`);
        }
    }

    private async seedGames(): Promise<void> {
        this.logger.log('Seeding Demo Games...');
        const games = [
            {
                name: 'Spin Wheel',
                slug: 'spin-wheel',
                description: 'Spin the wheel of fortune and win amazing prizes!',
                thumbnailUrl: 'https://images.unsplash.com/photo-1596838132731-1820627709c3?w=400&h=250&fit=crop',
                type: 'arcade',
                isActive: true,
                config: {
                    prizeList: [
                        { icon: '💰', label: '500 PTS', color: '#3b82f6', textColor: '#fff', weight: 25, isJackpot: false, isLose: false },
                        { icon: '🎁', label: 'MYSTERY', color: '#8b5cf6', textColor: '#fff', weight: 15, isJackpot: false, isLose: false },
                        { icon: '😅', label: 'TRY AGAIN', color: '#475569', textColor: '#fff', weight: 30, isJackpot: false, isLose: true },
                        { icon: '💎', label: 'JACKPOT!', color: '#ffd700', textColor: '#000', weight: 3, isJackpot: true, isLose: false },
                        { icon: '🎟️', label: 'FREE SPIN', color: '#10b981', textColor: '#fff', weight: 12, isJackpot: false, isLose: false },
                        { icon: '⭐', label: '100 PTS', color: '#f43f5e', textColor: '#fff', weight: 20, isJackpot: false, isLose: false },
                        { icon: '🔥', label: '2X BONUS', color: '#f97316', textColor: '#fff', weight: 8, isJackpot: false, isLose: false },
                        { icon: '🌟', label: '1000 PTS', color: '#06b6d4', textColor: '#fff', weight: 7, isJackpot: false, isLose: false }
                    ],
                    themePreset: 'Cyberpunk Elite',
                    themeColor: '#00f5ff',
                    secondaryColor: '#ff00ff',
                    centerIcon: '🎯',

                    // Ultra Premium Features (enabled by default)
                    enableBGM: true,
                    enableLedRing: true,
                    enableConfetti: true,
                    enableStartScreen: true,
                    enableHexagons: true,
                    enableGridFloor: true,

                    // BGM Settings
                    bgmUrl: '/api/uploads/templates/cyberpunk-elite/bgm.mp3',
                    bgmVolume: 40,
                    bgmLoop: true,

                    // LED Ring Settings
                    ledCount: 32,
                    ledSpeed: 50,
                    ledColor1: '#00f5ff',
                    ledColor2: '#ff00ff',
                    ledColor3: '#ffd700',

                    // Confetti Settings
                    confettiParticles: 200,
                    confettiSpread: 70,
                    confettiColors: '#ff0000,#00ff00,#0000ff,#ffff00,#ff00ff',
                    confettiShapeType: 'default',
                    confettiEmojis: '🎉,⭐,❤️',

                    // Cyberpunk Theme Colors
                    neonCyan: '#00f5ff',
                    neonPink: '#ff00ff',
                    neonPurple: '#9d00ff',
                    neonGold: '#ffd700',
                    neonGreen: '#00ff88',
                    darkBg: '#0a0a12',

                    // Result Messages
                    jackpotTitle: '🎉 JACKPOT!!! 🎉',
                    jackpotSubtitle: 'INCREDIBLE WIN!',
                    winTitle: '🎊 WINNER! 🎊',
                    winSubtitle: 'Congratulations!',
                    loseTitle: '😅 Better luck next time!',
                    loseSubtitle: 'Try again?',

                    // Sound Settings
                    tickSoundEnabled: true,
                    tickVolume: 30,

                    costPerSpin: 10,
                    bgType: 'gradient',
                    bgFit: 'cover',
                    bgBlur: 0,
                    bgOpacity: 100,
                    bgGradStart: '#0a0a12',
                    bgGradEnd: '#1a1a2e',
                    bgGradDir: 'to bottom',
                    logoWidth: 80,
                    logoTopMargin: 10,
                    logoOpacity: 100,
                    logoDropShadow: true,
                    centerSize: 60,
                    centerBorder: true,
                    centerShadow: true,
                    centerType: 'emoji',
                    centerEmoji: '🎯',
                    pointerSize: 50,
                    pointerTop: -35,
                    pointerShadow: true,
                    pointerDirection: 'top',
                    wheelBorderSize: 110,
                    wheelBorderOpacity: 100,
                    wheelBorderTop: 0,
                    wheelBorderLayer: 'behind',
                    tokenBarColor: '#ca8a04',
                    tokenBarTextColor: '#ffffff',
                    tokenBarShadow: true,
                    spinBtnText: 'SPIN NOW',
                    spinBtnSubtext: '1 PLAY = 10 TOKEN',
                    spinBtnTextColor: '#451a03',
                    spinBtnColor: '#f59e0b',
                    spinBtnShadow: true,
                    spinBtnWidth: 320,
                    spinBtnHeight: 70,
                    dividerType: 'line',
                    dividerColor: 'rgba(255,255,255,0.2)',
                    dividerStroke: 1,
                    dividerWidth: 20,
                    dividerHeight: 180,
                    dividerTop: 0,

                    // Template Presets - when selected, these override the config
                    templatePresets: {
                        'Cyberpunk Elite': {
                            bgmUrl: '/api/uploads/templates/cyberpunk-elite/bgm.mp3',
                            bgGradStart: '#0a0a12',
                            bgGradEnd: '#1a1a2e',
                            neonCyan: '#00f5ff',
                            neonPink: '#ff00ff',
                            neonPurple: '#9d00ff',
                            neonGold: '#ffd700',
                            enableHexagons: true,
                            enableGridFloor: true,
                            enableLedRing: true,
                            ledColor1: '#00f5ff',
                            ledColor2: '#ff00ff',
                            ledColor3: '#ffd700'
                        },
                        'Neon Night': {
                            bgmUrl: '/api/uploads/templates/neon-night/bgm.mp3',
                            bgGradStart: '#0f0f23',
                            bgGradEnd: '#1a1a3e',
                            neonCyan: '#00ffff',
                            neonPink: '#ff1493',
                            neonPurple: '#9400d3',
                            enableHexagons: true,
                            enableGridFloor: false,
                            enableLedRing: true,
                            ledColor1: '#00ffff',
                            ledColor2: '#ff1493',
                            ledColor3: '#9400d3'
                        },
                        'Classic Arcade': {
                            bgmUrl: '/api/uploads/templates/classic-arcade/bgm.mp3',
                            winSound: '/api/uploads/templates/classic-arcade/win.mp3',
                            loseSound: '/api/uploads/templates/classic-arcade/lose.mp3',
                            jackpotSound: '/api/uploads/templates/classic-arcade/jackpot.mp3',
                            bgGradStart: '#000428',
                            bgGradEnd: '#004e92',
                            bgType: 'gradient',
                            enableBGM: true,
                            enableStartScreen: true,
                            enableHexagons: false,
                            enableGridFloor: false,
                            enableLedRing: true,
                            enableConfetti: true,
                            ledColor1: '#ffdd00',
                            ledColor2: '#ff0055',
                            ledColor3: '#39ff14',
                            themeColor: '#ffdd00',
                            secondaryColor: '#ff0055',
                            spinBtnColor: '#ffdd00',
                            spinBtnTextColor: '#000000',
                            tokenBarColor: '#ff0055',
                            tokenBarTextColor: '#ffffff'
                        },
                        'Christmas Joy': {
                            bgmUrl: '/api/uploads/templates/christmas-joy/bgm.mp3',
                            winSound: '/api/uploads/templates/christmas-joy/win.mp3',
                            loseSound: '/api/uploads/templates/christmas-joy/lose.mp3',
                            jackpotSound: '/api/uploads/templates/christmas-joy/jackpot.mp3',
                            bgGradStart: '#1a472a',
                            bgGradEnd: '#2d5a3f',
                            bgType: 'gradient',
                            neonCyan: '#ff0000',
                            neonPink: '#00ff00',
                            neonGold: '#ffd700',
                            enableBGM: true,
                            enableStartScreen: true,
                            enableHexagons: false,
                            enableGridFloor: false,
                            enableLedRing: true,
                            enableConfetti: true,
                            ledColor1: '#ff0000',
                            ledColor2: '#00ff00',
                            ledColor3: '#ffd700',
                            themeColor: '#ff0000',
                            secondaryColor: '#00aa00',
                            spinBtnColor: '#ff0000',
                            spinBtnTextColor: '#ffffff',
                            tokenBarColor: '#00aa00',
                            tokenBarTextColor: '#ffffff'
                        },
                        'Gold Royale': {
                            bgmUrl: '/api/uploads/templates/gold-royale/bgm.mp3',
                            bgGradStart: '#1a1a0f',
                            bgGradEnd: '#3d3d1f',
                            neonCyan: '#ffd700',
                            neonPink: '#daa520',
                            neonGold: '#ffdf00',
                            enableHexagons: false,
                            enableGridFloor: false,
                            enableLedRing: true,
                            ledColor1: '#ffd700',
                            ledColor2: '#daa520',
                            ledColor3: '#ffdf00'
                        }
                    }
                },
                configSchema: [
                    {
                        name: 'prizes',
                        label: 'page.manage.game.tabs.prizes',
                        items: [
                            {
                                key: 'visualTemplate',
                                type: 'select',
                                label: 'page.manage.game.prizes.visualTemplate',
                                options: [
                                    { label: 'Default (Dynamic)', value: 'default' },
                                    { label: 'Premium Neon', value: 'premium-neon' },
                                    { label: 'Classic Style', value: 'classic' }
                                ],
                                default: 'default',
                                span: 24
                            },
                            {
                                key: 'prizeTemplate',
                                type: 'select',
                                label: 'page.manage.game.prizes.quickTemplate',
                                options: ['Standard Balanced', 'High Stakes', 'Emoji Party'],
                                default: 'Standard Balanced'
                            },
                            { key: 'prizeList', type: 'prize-list', label: 'page.manage.game.prizes.prizeSegments' },
                        ]
                    },
                    {
                        name: 'rules',
                        label: 'page.manage.game.tabs.rules', // page.manage.game.tabRules
                        items: [
                            { key: 'dailyLimit', type: 'number', label: 'page.manage.game.rules.dailyLimit', default: 3, span: 8 },
                            { key: 'cooldown', type: 'number', label: 'page.manage.game.rules.cooldown', default: 60, span: 8 },
                            { key: 'minLevel', type: 'number', label: 'page.manage.game.rules.minLevel', default: 0, span: 8 },
                            {
                                key: 'rules_bools',
                                type: 'switch-group',
                                label: 'page.manage.game.rules.accessControl',
                                items: [
                                    { key: 'requireLogin', label: 'page.manage.game.rules.requireLogin' },
                                    { key: 'oneTimeOnly', label: 'page.manage.game.rules.oneTimeOnly' }
                                ]
                            },
                            { key: 'timeLimitConfig', type: 'time-limit', label: 'page.manage.game.rules.enableTimeLimit', span: 24 },
                            { key: 'dynamicProbConfig', type: 'dynamic-prob', label: 'page.manage.game.rules.enableDynamicProb', span: 24 },
                            { key: 'budgetConfig', type: 'budget-control', label: 'page.manage.game.rules.enableBudget', span: 24 },
                            { key: 'vipTiers', type: 'vip-grid', label: 'page.manage.game.rules.vipTiers', span: 24 }
                        ]
                    },
                    {
                        name: 'visuals',
                        label: 'page.manage.game.tabs.visuals',
                        items: [
                            // ═══════════════════════════════════════════════════════════
                            // 🎨 SECTION 1: QUICK STYLE (快速风格设置)
                            // ═══════════════════════════════════════════════════════════
                            {
                                key: 'themePreset',
                                type: 'select',
                                label: 'page.manage.game.visuals.themePreset',
                                options: [
                                    { label: '🎮 Cyberpunk Elite', value: 'Cyberpunk Elite' },
                                    { label: '🌃 Neon Night', value: 'Neon Night' },
                                    { label: '🕹️ Classic Arcade', value: 'Classic Arcade' },
                                    { label: '🎄 Christmas Joy', value: 'Christmas Joy' },
                                    { label: '👑 Gold Royale', value: 'Gold Royale' },
                                    { label: '✏️ Custom', value: 'Custom' }
                                ],
                                default: 'Cyberpunk Elite',
                                loadPreset: true,
                                span: 12
                            },
                            { 
                                key: 'fontPreset', 
                                type: 'font-select', 
                                label: 'page.manage.game.visuals.gameFont', 
                                span: 12,
                                default: 'Orbitron',
                                options: [
                                    { label: 'Orbitron', value: 'Orbitron' },
                                    { label: 'Press Start 2P', value: 'Press Start 2P' },
                                    { label: 'Bangers', value: 'Bangers' },
                                    { label: 'Bungee', value: 'Bungee' },
                                    { label: 'Russo One', value: 'Russo One' },
                                    { label: 'Black Ops One', value: 'Black Ops One' },
                                    { label: 'Righteous', value: 'Righteous' },
                                    { label: 'Permanent Marker', value: 'Permanent Marker' },
                                    { label: 'Creepster', value: 'Creepster' },
                                    { label: 'Lobster', value: 'Lobster' },
                                    { label: 'Custom (Upload Below)', value: 'custom' }
                                ]
                            },
                            { key: 'gameFont', type: 'file', label: 'page.manage.game.visuals.customFontFile', span: 12, condition: { key: 'fontPreset', value: 'custom' } },
                            {
                                key: 'background_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.visuals.bgSettings',
                                span: 24,
                                items: [
                                    {
                                        key: 'bgType',
                                        type: 'radio',
                                        label: 'page.manage.game.visuals.bgType',
                                        options: [
                                            { label: 'Gradient', value: 'gradient' },
                                            { label: 'Solid Color', value: 'color' },
                                            { label: 'Image', value: 'image' }
                                        ],
                                        default: 'gradient',
                                        span: 24
                                    },
                                    { key: 'bgGradStart', type: 'color', label: 'Start Color', default: '#1e1b4b', span: 12, condition: { key: 'bgType', value: 'gradient' } },
                                    { key: 'bgGradEnd', type: 'color', label: 'End Color', default: '#312e81', span: 12, condition: { key: 'bgType', value: 'gradient' } },
                                    {
                                        key: 'bgGradDir',
                                        type: 'select',
                                        label: 'page.manage.game.visuals.direction',
                                        options: [
                                            { label: 'Top to Bottom', value: 'to bottom' },
                                            { label: 'Left to Right', value: 'to right' },
                                            { label: 'Bottom Left to Top Right', value: '135deg' },
                                            { label: 'Top Left to Bottom Right', value: '45deg' },
                                            { label: 'Radial (Center)', value: 'radial' }
                                        ],
                                        default: '135deg',
                                        span: 24,
                                        condition: { key: 'bgType', value: 'gradient' }
                                    },
                                    { key: 'bgColor', type: 'color', label: 'page.manage.game.visuals.backgroundColor', default: '#1a1a1a', span: 24, condition: { key: 'bgType', value: 'color' } },
                                    { key: 'bgImage', type: 'image', label: 'page.manage.game.visuals.backgroundImage', span: 24, condition: { key: 'bgType', value: 'image' } },
                                    {
                                        key: 'bgFit',
                                        type: 'select',
                                        label: 'page.manage.game.visuals.imageFillMethod',
                                        options: [
                                            { label: 'Cover (Crop to fit)', value: 'cover' },
                                            { label: 'Contain (Show full)', value: 'contain' },
                                            { label: 'Stretch (Fill screen)', value: '100% 100%' },
                                            { label: 'Tile (Repeat)', value: 'repeat' }
                                        ],
                                        default: 'cover',
                                        span: 24,
                                        condition: { key: 'bgType', value: 'image' }
                                    },
                                    { key: 'bgBlur', type: 'slider', label: 'Background Blur', min: 0, max: 20, step: 1, suffix: 'px', default: 0, span: 12, condition: { key: 'bgType', value: 'image' } },
                                    { key: 'bgOpacity', type: 'slider', label: 'Background Opacity', min: 0, max: 100, step: 5, suffix: '%', default: 100, span: 12, condition: { key: 'bgType', value: 'image' } }
                                ]
                            },

                            // ═══════════════════════════════════════════════════════════
                            // 🎡 SECTION 2: WHEEL DESIGN (转盘设计 - 由外到内)
                            // ═══════════════════════════════════════════════════════════
                            {
                                key: 'border_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.visuals.wheelBorderFrame',
                                span: 24,
                                items: [
                                    { key: 'wheelBorderImage', type: 'image', label: 'page.manage.game.visuals.wheelBorderImage', span: 24 },
                                    { key: 'wheelBorderSize', type: 'slider', label: 'page.manage.game.visuals.wheelBorderSize', min: 100, max: 150, step: 1, suffix: '%', default: 110, span: 12 },
                                    { key: 'wheelBorderOpacity', type: 'slider', label: 'page.manage.game.visuals.bgOpacity', min: 0, max: 100, step: 5, suffix: '%', default: 100, span: 12 },
                                    { key: 'wheelBorderTop', type: 'slider', label: 'page.manage.game.visuals.verticalOffset', min: -50, max: 50, step: 1, suffix: 'px', default: 0, span: 12 },
                                    {
                                        key: 'wheelBorderLayer',
                                        type: 'select',
                                        label: 'page.manage.game.visuals.layerPriority',
                                        default: 'behind',
                                        span: 12,
                                        options: [
                                            { label: 'page.manage.game.visuals.behindPrizes', value: 'behind' },
                                            { label: 'page.manage.game.visuals.inFrontOfPrizes', value: 'front' }
                                        ]
                                    }
                                ]
                            },
                            {
                                key: 'divider_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.visuals.sliceDividers',
                                span: 24,
                                items: [
                                    {
                                        key: 'dividerType',
                                        type: 'select',
                                        label: 'page.manage.game.visuals.type',
                                        default: 'line',
                                        span: 24,
                                        options: [
                                            { label: '➖ Line', value: 'line' },
                                            { label: '🖼️ Image', value: 'image' }
                                        ]
                                    },
                                    { key: 'dividerColor', type: 'color', label: 'Line Color', default: 'rgba(255,255,255,0.2)', span: 12, condition: { key: 'dividerType', value: 'line' } },
                                    { key: 'dividerStroke', type: 'slider', label: 'Thickness', min: 1, max: 10, step: 1, suffix: 'px', default: 1, span: 12, condition: { key: 'dividerType', value: 'line' } },
                                    { key: 'dividerImage', type: 'image', label: 'Texture', span: 24, condition: { key: 'dividerType', value: 'image' } },
                                    { key: 'dividerWidth', type: 'slider', label: 'page.manage.game.visuals.width', min: 5, max: 50, step: 1, suffix: 'px', default: 20, span: 12, condition: { key: 'dividerType', value: 'image' } },
                                    { key: 'dividerHeight', type: 'slider', label: 'Height (Length)', min: 20, max: 300, step: 5, suffix: 'px', default: 180, span: 12, condition: { key: 'dividerType', value: 'image' } },
                                    { key: 'dividerTop', type: 'slider', label: 'Offset', min: -50, max: 50, step: 1, suffix: 'px', default: 0, span: 24, condition: { key: 'dividerType', value: 'image' } }
                                ]
                            },
                            {
                                key: 'center_hub_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.visuals.centerHubSection',
                                span: 24,
                                items: [
                                    {
                                        key: 'centerType',
                                        type: 'radio',
                                        label: 'page.manage.game.visuals.contentType',
                                        options: [{ label: 'Emoji / Preset', value: 'emoji' }, { label: 'page.manage.game.visuals.customImage', value: 'image' }],
                                        default: 'emoji',
                                        span: 24
                                    },
                                    {
                                        key: 'centerEmoji',
                                        type: 'select',
                                        label: 'page.manage.game.visuals.selectIcon',
                                        default: '🎯',
                                        span: 24,
                                        condition: { key: 'centerType', value: 'emoji' },
                                        options: [
                                            { label: '🎯 Target', value: '🎯' },
                                            { label: '🎰 Slot', value: '🎰' },
                                            { label: '💰 Money Bag', value: '💰' },
                                            { label: '💎 Gem', value: '💎' },
                                            { label: '🏆 Trophy', value: '🏆' },
                                            { label: '🎁 Gift', value: '🎁' },
                                            { label: '🔥 Fire', value: '🔥' },
                                            { label: '⚡ Zap', value: '⚡' },
                                            { label: '⭐ Star', value: '⭐' },
                                            { label: '🎲 Dice', value: '🎲' },
                                            { label: '👑 Crown', value: '👑' },
                                            { label: '🚀 Rocket', value: '🚀' },
                                            { label: '🤑 Rich Face', value: '🤑' },
                                            { label: '😎 Cool', value: '😎' },
                                            { label: '🤩 Star Eyes', value: '🤩' },
                                            { label: '🥳 Party', value: '🥳' },
                                            { label: '❤️ Heart', value: '❤️' },
                                            { label: '👍 Thumbs Up', value: '👍' },
                                            { label: '🍀 Clover', value: '🍀' },
                                            { label: '🐉 Dragon', value: '🐉' },
                                            { label: '🦄 Unicorn', value: '🦄' }
                                        ]
                                    },
                                    { key: 'centerImage', type: 'image', label: 'Hub Image', span: 24, condition: { key: 'centerType', value: 'image' } },
                                    { key: 'centerSize', type: 'slider', label: 'page.manage.game.visuals.hubSize', min: 40, max: 120, step: 5, suffix: 'px', default: 60, span: 10 },
                                    { key: 'centerBorder', type: 'switch', label: 'page.manage.game.visuals.border', default: true, span: 7 },
                                    { key: 'centerShadow', type: 'switch', label: 'page.manage.game.visuals.shadow', default: true, span: 7 }
                                ]
                            },
                            {
                                key: 'pointer_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.visuals.pointerSection',
                                span: 24,
                                items: [
                                    { key: 'pointerImage', type: 'image', label: 'page.manage.game.visuals.pointerImage', span: 24 },
                                    {
                                        key: 'pointerDirection',
                                        type: 'select',
                                        label: 'page.manage.game.visuals.direction',
                                        default: 'top',
                                        span: 24,
                                        options: [
                                            { label: '⬆️ Top', value: 'top' },
                                            { label: '↗️ Top Right', value: 'top-right' },
                                            { label: '➡️ Right', value: 'right' },
                                            { label: '↘️ Bottom Right', value: 'bottom-right' },
                                            { label: '⬇️ Bottom', value: 'bottom' },
                                            { label: '↙️ Bottom Left', value: 'bottom-left' },
                                            { label: '⬅️ Left', value: 'left' },
                                            { label: '↖️ Top Left', value: 'top-left' }
                                        ]
                                    },
                                    { key: 'pointerSize', type: 'slider', label: 'page.manage.game.visuals.wheelBorderSize', min: 40, max: 150, step: 5, suffix: 'px', default: 50, span: 10 },
                                    { key: 'pointerTop', type: 'slider', label: 'page.manage.game.visuals.topPos', min: -100, max: 100, step: 5, suffix: 'px', default: -35, span: 7 },
                                    { key: 'pointerShadow', type: 'switch', label: 'page.manage.game.visuals.shadow', default: true, span: 7 }
                                ]
                            },

                            // ═══════════════════════════════════════════════════════════
                            // 🖼️ SECTION 3: UI ELEMENTS (界面元素 - 由上到下)
                            // ═══════════════════════════════════════════════════════════
                            {
                                key: 'brand_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.visuals.brandLogoSection',
                                span: 24,
                                items: [
                                    { key: 'titleImage', type: 'image', label: 'page.manage.game.visuals.titleImage', span: 24 },
                                    { key: 'logoWidth', type: 'slider', label: 'page.manage.game.visuals.logoWidth', min: 20, max: 100, step: 5, suffix: '%', default: 80, span: 12 },
                                    { key: 'logoTopMargin', type: 'slider', label: 'page.manage.game.visuals.topMargin', min: 0, max: 60, step: 2, suffix: 'px', default: 10, span: 12 },
                                    { key: 'logoOpacity', type: 'slider', label: 'page.manage.game.visuals.bgOpacity', min: 0, max: 100, step: 5, suffix: '%', default: 100, span: 12 },
                                    { key: 'logoDropShadow', type: 'switch', label: 'page.manage.game.visuals.enableDropShadow', default: true, span: 12 }
                                ]
                            },
                            {
                                key: 'token_bar_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.visuals.tokenBarSection',
                                span: 24,
                                items: [
                                    { key: 'tokenBarImage', type: 'image', label: 'page.manage.game.visuals.backgroundImage', span: 24 },
                                    { key: 'tokenBarColor', type: 'color', label: 'page.manage.game.visuals.backgroundColor', default: '#ca8a04', span: 12 },
                                    { key: 'tokenBarTextColor', type: 'color', label: 'page.manage.game.visuals.textColor', default: '#ffffff', span: 12 },
                                    { key: 'tokenBarShadow', type: 'switch', label: 'page.manage.game.visuals.shadow', default: true, span: 24 }
                                ]
                            },
                            {
                                key: 'spin_button_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.visuals.spinButtonSection',
                                span: 24,
                                items: [
                                    { key: 'spinBtnText', type: 'text', label: 'page.manage.game.visuals.buttonText', default: 'SPIN NOW', span: 12 },
                                    { key: 'spinBtnSubtext', type: 'text', label: 'page.manage.game.visuals.subtext', default: '1 PLAY = 10 TOKEN', span: 12 },
                                    { key: 'spinBtnTextColor', type: 'color', label: 'page.manage.game.visuals.textColor', default: '#451a03', span: 8 },
                                    { key: 'spinBtnColor', type: 'color', label: 'page.manage.game.visuals.buttonColor', default: '#f59e0b', span: 8 },
                                    { key: 'spinBtnShadow', type: 'switch', label: 'page.manage.game.visuals.shadow', default: true, span: 8 },
                                    { key: 'spinBtnWidth', type: 'slider', label: 'page.manage.game.visuals.width', min: 200, max: 400, step: 10, suffix: 'px', default: 320, span: 12 },
                                    { key: 'spinBtnHeight', type: 'slider', label: 'page.manage.game.visuals.height', min: 50, max: 120, step: 5, suffix: 'px', default: 70, span: 12 },
                                    { key: 'spinBtnImage', type: 'image', label: 'page.manage.game.visuals.customImage', span: 24 }
                                ]
                            },

                            // ═══════════════════════════════════════════════════════════
                            // ⚙️ SECTION 4: ANIMATION & INTERACTION (动画与交互)
                            // ═══════════════════════════════════════════════════════════
                            { key: 'spinDuration', type: 'slider', label: 'page.manage.game.visuals.spinDuration', min: 1, max: 10, step: 0.5, suffix: 's', default: 4, span: 12 },
                            { key: 'spinTurns', type: 'slider', label: 'page.manage.game.visuals.spinTurns', min: 1, max: 20, step: 1, default: 5, span: 12 },
                            {
                                key: 'interact_bools',
                                type: 'switch-group',
                                label: 'page.manage.game.visuals.interact',
                                span: 24,
                                items: [
                                    { key: 'swipeToSpin', label: 'page.manage.game.visuals.swipeToSpin' }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'effects',
                        label: 'page.manage.game.tabs.effects',
                        items: [
                            {
                                key: 'ultra_features',
                                type: 'switch-group',
                                label: 'page.manage.game.effects.ultraFeatures',
                                items: [
                                    { key: 'enableBGM', label: 'page.manage.game.effects.enableBGM' },
                                    { key: 'enableLedRing', label: 'page.manage.game.effects.enableLedRing' },
                                    { key: 'enableConfetti', label: 'page.manage.game.effects.enableConfetti' },
                                    { key: 'enableStartScreen', label: 'page.manage.game.effects.enableStartScreen' },
                                    { key: 'enableHexagons', label: 'page.manage.game.effects.enableHexagons' },
                                    { key: 'enableGridFloor', label: 'page.manage.game.effects.enableGridFloor' }
                                ]
                            },
                            {
                                key: 'bgm_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.effects.bgmSettings',
                                items: [
                                    { key: 'bgmUrl', type: 'file', label: 'page.manage.game.effects.bgmUrl', span: 24 },
                                    { key: 'bgmVolume', type: 'slider', label: 'page.manage.game.effects.bgmVolume', min: 0, max: 100, step: 5, suffix: '%', default: 40, span: 12, condition: { key: 'bgmUrl', value: '', operator: 'neq' } },
                                    { key: 'bgmLoop', type: 'switch', label: 'page.manage.game.effects.bgmLoop', default: true, span: 12, condition: { key: 'bgmUrl', value: '', operator: 'neq' } }
                                ]
                            },
                            {
                                key: 'led_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.effects.ledSettings',
                                items: [
                                    { key: 'ledCount', type: 'slider', label: 'page.manage.game.effects.ledCount', min: 16, max: 64, step: 4, default: 32, span: 12 },
                                    { key: 'ledSpeed', type: 'slider', label: 'page.manage.game.effects.ledSpeed', min: 20, max: 200, step: 10, suffix: 'ms', default: 50, span: 12 },
                                    { key: 'ledColor1', type: 'color', label: 'page.manage.game.effects.ledColor1', default: '#00f5ff', span: 8 },
                                    { key: 'ledColor2', type: 'color', label: 'page.manage.game.effects.ledColor2', default: '#ff00ff', span: 8 },
                                    { key: 'ledColor3', type: 'color', label: 'page.manage.game.effects.ledColor3', default: '#ffd700', span: 8 }
                                ]
                            },
                            {
                                key: 'result_sounds',
                                type: 'collapse-group',
                                label: 'page.manage.game.effects.resultSounds',
                                items: [
                                    { key: 'winSound', type: 'file', label: 'page.manage.game.effects.winSound', span: 24 },
                                    { key: 'loseSound', type: 'file', label: 'page.manage.game.effects.loseSound', span: 24 },
                                    { key: 'jackpotSound', type: 'file', label: 'page.manage.game.effects.jackpotSoundFile', span: 24 },
                                    { key: 'tickSoundEnabled', type: 'switch', label: 'page.manage.game.effects.tickSound', default: true, span: 12 },
                                    { key: 'tickVolume', type: 'slider', label: 'page.manage.game.effects.tickVolume', min: 0, max: 100, step: 5, suffix: '%', default: 30, span: 12 }
                                ]
                            },
                            {
                                key: 'sound_button_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.effects.soundButtonSettings',
                                items: [
                                    { key: 'showSoundButton', type: 'switch', label: 'page.manage.game.effects.showSoundButton', default: true, span: 12 },
                                    { key: 'soundButtonOpacity', type: 'slider', label: 'page.manage.game.effects.soundButtonOpacity', min: 0, max: 100, step: 5, suffix: '%', default: 80, span: 12 }
                                ]
                            },
                            {
                                key: 'confetti_section',
                                type: 'collapse-group',
                                label: 'page.manage.game.effects.confettiSettings',
                                items: [
                                    { key: 'confettiParticles', type: 'slider', label: 'page.manage.game.effects.confettiParticles', min: 50, max: 500, step: 50, default: 200, span: 12 },
                                    { key: 'confettiSpread', type: 'slider', label: 'page.manage.game.effects.confettiSpread', min: 30, max: 180, step: 10, suffix: '°', default: 70, span: 12 },
                                    { key: 'confettiColors', type: 'color-list', label: 'page.manage.game.effects.confettiColors', default: '#ff0000,#00ff00,#0000ff,#ffff00,#ff00ff', span: 24 },
                                    { key: 'confettiShapeType', type: 'radio', label: 'page.manage.game.effects.confettiShapeType', options: ['default', 'emoji'], default: 'default', span: 24 },
                                    { key: 'confettiEmojis', type: 'emoji-list', label: 'page.manage.game.effects.confettiEmojis', default: '🎉,⭐,❤️', span: 24, condition: { key: 'confettiShapeType', value: 'emoji' } }
                                ]
                            },
                            {
                                key: 'cyber_theme',
                                type: 'collapse-group',
                                label: 'page.manage.game.effects.neonColors',
                                items: [
                                    { key: 'neonCyan', type: 'color', label: 'page.manage.game.effects.neonCyan', default: '#00f5ff', span: 8 },
                                    { key: 'neonPink', type: 'color', label: 'page.manage.game.effects.neonPink', default: '#ff00ff', span: 8 },
                                    { key: 'neonPurple', type: 'color', label: 'page.manage.game.effects.neonPurple', default: '#9d00ff', span: 8 },
                                    { key: 'neonGold', type: 'color', label: 'page.manage.game.effects.neonGold', default: '#ffd700', span: 8 },
                                    { key: 'neonGreen', type: 'color', label: 'page.manage.game.effects.neonGreen', default: '#00ff88', span: 8 },
                                    { key: 'darkBg', type: 'color', label: 'page.manage.game.effects.darkBg', default: '#0a0a12', span: 8 }
                                ]
                            },
                            {
                                key: 'result_messages',
                                type: 'collapse-group',
                                label: 'page.manage.game.effects.resultMessages',
                                items: [
                                    { key: 'jackpotTitle', type: 'text', label: 'page.manage.game.effects.jackpotTitle', default: '🎉 JACKPOT!!! 🎉', span: 24 },
                                    { key: 'jackpotSubtitle', type: 'text', label: 'page.manage.game.effects.jackpotSubtitle', default: 'INCREDIBLE WIN!', span: 24 },
                                    { key: 'winTitle', type: 'text', label: 'page.manage.game.effects.winTitle', default: '🎊 WINNER! 🎊', span: 24 },
                                    { key: 'winSubtitle', type: 'text', label: 'page.manage.game.effects.winSubtitle', default: 'Congratulations!', span: 24 },
                                    { key: 'loseTitle', type: 'text', label: 'page.manage.game.effects.loseTitle', default: '😅 Better luck next time!', span: 24 },
                                    { key: 'loseSubtitle', type: 'text', label: 'page.manage.game.effects.loseSubtitle', default: 'Try again?', span: 24 }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'embed',
                        label: 'page.manage.game.tabs.embed',
                        items: [
                            { key: 'iframeCode', type: 'embed-code', label: 'page.manage.game.iframeCode' }
                        ]
                    }
                ]
            },
            {
                name: 'Scratch Card',
                slug: 'scratch-card',
                description: 'Scratch to reveal your prize! Instant win excitement.',
                thumbnailUrl: 'https://images.unsplash.com/photo-1518349619113-03114f06ac3a?w=400&h=250&fit=crop',
                type: 'instant',
                isActive: true,
                config: {
                    prizeList: [
                        { icon: '💎', label: '$500', weight: 5, value: 500 },
                        { icon: '💰', label: '$100', weight: 15, value: 100 },
                        { icon: '🎁', label: '$50', weight: 25, value: 50 },
                        { icon: '⭐', label: '$20', weight: 30, value: 20 },
                        { icon: '🍀', label: '$10', weight: 25, value: 10 }
                    ],
                    scratchPercent: 60,
                    cardColor: '#c0c0c0'
                },
                configSchema: [
                    { name: 'prizes', label: 'page.manage.game.common.prizes', items: [
                        { key: 'prizeList', type: 'prize-list', label: 'page.manage.game.common.prizeList' }
                    ]},
                    { name: 'settings', label: 'page.manage.game.common.settings', items: [
                        { key: 'scratchPercent', type: 'slider', label: 'page.manage.game.common.scratchPercent', min: 30, max: 90, default: 60, suffix: '%' },
                        { key: 'cardColor', type: 'color', label: 'page.manage.game.common.scratchLayer', default: '#c0c0c0' }
                    ]}
                ]
            },
            {
                name: 'Daily Check-in',
                slug: 'daily-checkin',
                description: 'Check in daily to earn rewards and build your streak!',
                thumbnailUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&h=250&fit=crop',
                type: 'daily',
                isActive: true,
                config: {
                    dailyRewards: [10, 20, 30, 50, 70, 100, 150],
                    streakBonus: { 7: 500, 14: 1500, 30: 5000 },
                    resetOnMiss: true
                },
                configSchema: [
                    { name: 'rewards', label: 'page.manage.game.common.rewards', items: [
                        { key: 'dailyRewards', type: 'list', label: 'page.manage.game.common.dailyRewards' },
                        { key: 'resetOnMiss', type: 'switch', label: 'page.manage.game.common.resetOnMiss', default: true }
                    ]},
                    { name: 'milestones', label: 'page.manage.game.common.milestones', items: [
                        { key: 'streakBonus', type: 'vip-grid', label: 'page.manage.game.common.streakBonus' }
                    ]}
                ]
            },
            {
                name: 'Slot Machine',
                slug: 'slot-machine',
                description: 'Classic 3-reel slot machine. Match symbols to win big!',
                thumbnailUrl: 'https://images.unsplash.com/photo-1596838132731-1820627709c3?w=400&h=250&fit=crop',
                type: 'casino',
                isActive: true,
                config: {
                    symbols: ['🍒', '🍋', '🍊', '🍇', '⭐', '7️⃣', '💎'],
                    payouts: {
                        '💎💎💎': 100, '7️⃣7️⃣7️⃣': 50, '⭐⭐⭐': 30,
                        '🍇🍇🍇': 20, '🍊🍊🍊': 15, '🍋🍋🍋': 10, '🍒🍒🍒': 5
                    },
                    betAmount: 10,
                    jackpotAmount: 10000
                },
                configSchema: [
                    { name: 'symbols', label: 'page.manage.game.common.symbols', items: [
                        { key: 'symbols', type: 'list', label: 'page.manage.game.common.reelSymbols' },
                        { key: 'payouts', type: 'vip-grid', label: 'page.manage.game.common.payoutTable' }
                    ]},
                    { name: 'settings', label: 'page.manage.game.common.gameSettings', items: [
                        { key: 'betAmount', type: 'number', label: 'page.manage.game.common.betAmount', default: 10 },
                        { key: 'jackpotAmount', type: 'number', label: 'page.manage.game.common.jackpotAmount', default: 10000 }
                    ]}
                ]
            },
            {
                name: 'Plinko',
                slug: 'plinko',
                description: 'Drop the ball and watch it bounce to your prize!',
                thumbnailUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop',
                type: 'arcade',
                isActive: true,
                config: {
                    rows: 12,
                    riskLevels: {
                        low: [1.2, 1.4, 1.6, 2, 3, 5, 3, 2, 1.6, 1.4, 1.2],
                        medium: [0.5, 1, 1.5, 2, 4, 10, 4, 2, 1.5, 1, 0.5],
                        high: [0, 0.2, 1, 2, 5, 50, 5, 2, 1, 0.2, 0]
                    },
                    betAmount: 10
                },
                configSchema: [
                    { name: 'board', label: 'page.manage.game.common.board', items: [
                        { key: 'rows', type: 'slider', label: 'page.manage.game.common.numberOfRows', min: 8, max: 16, default: 12 },
                        { key: 'betAmount', type: 'number', label: 'page.manage.game.common.betAmount', default: 10 }
                    ]},
                    { name: 'multipliers', label: 'page.manage.game.common.multipliers', items: [
                        { key: 'riskLevels', type: 'vip-grid', label: 'page.manage.game.common.riskMultipliers' }
                    ]}
                ]
            },
            {
                name: 'Memory Match',
                slug: 'memory-game',
                description: 'Match pairs of cards before time runs out!',
                thumbnailUrl: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400&h=250&fit=crop',
                type: 'puzzle',
                isActive: true,
                config: {
                    gridSize: 4,
                    timeLimit: 60,
                    symbols: ['🎮', '🎲', '🎯', '🏆', '💎', '⭐', '🔥', '🚀'],
                    baseScore: 100,
                    timeBonus: 5
                },
                configSchema: [
                    { name: 'gameplay', label: 'page.manage.game.common.gameplay', items: [
                        { key: 'gridSize', type: 'select', label: 'page.manage.game.common.gridSize', options: ['3', '4', '5'], default: '4' },
                        { key: 'timeLimit', type: 'slider', label: 'page.manage.game.common.timeLimit', min: 30, max: 120, default: 60, suffix: 's' }
                    ]},
                    { name: 'scoring', label: 'page.manage.game.common.scoring', items: [
                        { key: 'baseScore', type: 'number', label: 'page.manage.game.common.baseScore', default: 100 },
                        { key: 'timeBonus', type: 'number', label: 'page.manage.game.common.timeBonus', default: 5 }
                    ]}
                ]
            },
            {
                name: 'Lucky Dice',
                slug: 'dice-roll',
                description: 'Bet on the dice roll outcome and win multipliers!',
                thumbnailUrl: 'https://images.unsplash.com/photo-1522069213448-443a614da9b6?w=400&h=250&fit=crop',
                type: 'casino',
                isActive: true,
                config: {
                    betOptions: [
                        { name: 'Low (2-6)', multiplier: 2 },
                        { name: 'Lucky 7', multiplier: 5 },
                        { name: 'High (8-12)', multiplier: 2 },
                        { name: 'Even', multiplier: 2 },
                        { name: 'Odd', multiplier: 2 },
                        { name: 'Doubles', multiplier: 6 }
                    ],
                    betAmount: 50
                },
                configSchema: [
                    { name: 'bets', label: 'page.manage.game.common.bets', items: [
                        { key: 'betOptions', type: 'vip-grid', label: 'page.manage.game.common.bettingOptions' },
                        { key: 'betAmount', type: 'number', label: 'page.manage.game.common.defaultBet', default: 50 }
                    ]}
                ]
            },
            {
                name: 'Treasure Box',
                slug: 'treasure-box',
                description: 'Pick treasure boxes to reveal hidden prizes!',
                thumbnailUrl: 'https://images.unsplash.com/photo-1553991562-9f24b119ff51?w=400&h=250&fit=crop',
                type: 'instant',
                isActive: true,
                config: {
                    boxCount: 9,
                    picksAllowed: 3,
                    prizeList: [
                        { icon: '💎', name: 'Diamond', value: 500, weight: 5 },
                        { icon: '👑', name: 'Crown', value: 200, weight: 10 },
                        { icon: '💰', name: 'Gold', value: 100, weight: 25 },
                        { icon: '⭐', name: 'Star', value: 50, weight: 30 },
                        { icon: '🎁', name: 'Gift', value: 25, weight: 30 }
                    ]
                },
                configSchema: [
                    { name: 'boxes', label: 'page.manage.game.common.boxes', items: [
                        { key: 'boxCount', type: 'number', label: 'page.manage.game.common.numberOfBoxes', default: 9 },
                        { key: 'picksAllowed', type: 'number', label: 'page.manage.game.common.picksAllowed', default: 3 }
                    ]},
                    { name: 'prizes', label: 'page.manage.game.common.prizes', items: [
                        { key: 'prizeList', type: 'prize-list', label: 'page.manage.game.common.prizeConfiguration' }
                    ]}
                ]
            },
            {
                name: 'Quiz Wheel',
                slug: 'quiz-wheel',
                description: 'Spin the wheel, answer trivia, and earn points!',
                thumbnailUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&h=250&fit=crop',
                type: 'trivia',
                isActive: true,
                config: {
                    categories: ['Science', 'History', 'Sports', 'Movies', 'Music', 'Geography'],
                    timePerQuestion: 10,
                    basePoints: 100,
                    streakBonus: 10
                },
                configSchema: [
                    { name: 'categories', label: 'page.manage.game.common.categories', items: [
                        { key: 'categories', type: 'list', label: 'page.manage.game.common.quizCategories' }
                    ]},
                    { name: 'gameplay', label: 'page.manage.game.common.gameplay', items: [
                        { key: 'timePerQuestion', type: 'slider', label: 'page.manage.game.common.timePerQuestion', min: 5, max: 30, default: 10, suffix: 's' },
                        { key: 'basePoints', type: 'number', label: 'page.manage.game.common.basePoints', default: 100 },
                        { key: 'streakBonus', type: 'number', label: 'page.manage.game.common.streakBonus', default: 10 }
                    ]}
                ]
            }
        ];

        for (const gameData of games) {
            const existing = await this.gameRepository.findOne({ where: { slug: gameData.slug } });
            if (!existing) {
                const game = this.gameRepository.create(gameData);
                await this.gameRepository.save(game);
                this.logger.log(`Created demo game: ${gameData.name}`);
            } else {
                // Update properties in case they changed
                Object.assign(existing, gameData);
                // Explicitly reassigned purely to ensure dirty checking picks it up if it was a deep object issue
                existing.configSchema = gameData.configSchema;
                existing.config = gameData.config;
                await this.gameRepository.save(existing);
                this.logger.log(`Updated demo game (Forced Schema): ${gameData.name}`);
            }
        }
    }

    private async seedInstances(): Promise<void> {
        this.logger.log('Seeding Demo Game Instances...');
        const company = await this.companyRepository.findOne({ where: { slug: 'demo-company' } });
        const spinTemplate = await this.gameRepository.findOne({ where: { slug: 'spin-wheel' } });

        if (company && spinTemplate) {
            const instances = [
                {
                    name: 'Christmas Spin Wheel',
                    slug: 'christmas-spin',
                    companyId: company.id,
                    gameId: spinTemplate.id,
                    config: {
                        themeColor: '#ef4444', // Christmas Red
                        prizes: ['50', '100', 'Gift Card', 'Jackpot'],
                    }
                },
                {
                    name: 'Midnight Spin',
                    slug: 'midnight-spin',
                    companyId: company.id,
                    gameId: spinTemplate.id,
                    config: {
                        themeColor: '#1e293b', // Midnight Blue
                        prizes: ['200', '500', 'Mystery Box'],
                    }
                }
            ];

            for (const instanceData of instances) {
                const existing = await this.instanceRepository.findOne({ where: { slug: instanceData.slug } });
                if (!existing) {
                    await this.instanceRepository.save(this.instanceRepository.create(instanceData));
                    this.logger.log(`Created instance: ${instanceData.name}`);
                } else {
                    Object.assign(existing, instanceData);
                    await this.instanceRepository.save(existing);
                    this.logger.log(`Updated instance: ${instanceData.name}`);
                }
            }
        }
    }
}
