declare namespace Api {
    namespace Management {
        interface Permission {
            id: string;
            name: string;
            slug: string;
            resource: string;
            action: string;
            description?: string;
            createdAt?: string;
            updatedAt?: string;
        }

        interface Role {
            id: string;
            name: string;
            slug: string;
            description?: string;
            isSystem: boolean;
            level: number;
            permissions: Permission[];
            createdAt?: string;
            updatedAt?: string;
        }

        interface User {
            id: string;
            email: string;
            name?: string | null;
            mobile?: string | null;
            bio?: string | null;
            description?: string | null;
            remark?: string | null;
            password?: string;
            isActive: boolean;
            isSuperAdmin: boolean;
            createdAt: string;
            updatedAt: string;
            userCompanies: UserCompany[];
        }

        interface UserCompany {
            id: string;
            userId: string;
            companyId: string;
            roleId: string;
            isActive: boolean;
            isPrimary: boolean;
            company?: {
                id: string;
                name: string;
                slug: string;
            };
            role?: {
                id: string;
                name: string;
                slug: string;
            };
        }

        interface Company {
            id: string;
            name: string;
            slug: string;
            apiSecret?: string;
            isActive: boolean;
            inactiveAt?: string | null;
            createdAt?: string;
            updatedAt?: string;
        }

        interface Member {
            id: string;
            companyId: string;
            externalId?: string;
            username?: string;
            pointsBalance: number;
            level: number;
            vipTier?: string;
            experience: number;
            isAnonymous: boolean;
            isActive: boolean;
            lastLoginAt?: string;
            metadata?: Record<string, any>;
            createdAt: string;
            updatedAt: string;
            company?: Company;
        }

        interface CreditTransaction {
            id: string;
            memberId: string;
            amount: number;
            balanceBefore: number;
            balanceAfter: number;
            type: string;
            reason?: string;
            adminUserId?: string;
            metadata?: Record<string, any>;
            createdAt: string;
        }

        interface LoginHistory {
            id: string;
            memberId: string;
            ipAddress?: string;
            userAgent?: string;
            success: boolean;
            failureReason?: string;
            metadata?: Record<string, any>;
            createdAt: string;
        }

        interface GameInstance {
            id: string;
            gameId: string;
            companyId: string;
            name: string;
            slug: string;
            config?: Record<string, any>;
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
            gameTemplate?: Api.Game.Game;
            company?: Company;
        }

        interface PlayAttempt {
            id: string;
            memberId: string;
            instanceId: string;
            attemptedAt: string;
            success: boolean;
            ipAddress?: string;
            member?: Member;
            instance?: GameInstance;
        }

        interface Score {
            id: string;
            memberId: string;
            instanceId: string;
            score: number;
            metadata?: any;
            achievedAt: string;
            member?: Member;
            instance?: GameInstance;
        }

        interface BudgetTracking {
            id: string;
            instanceId: string;
            trackingDate: string;
            totalCost: number;
            playCount: number;
            instance?: GameInstance;
        }

        interface Game {
            id: string;
            name: string;
            slug: string;
            description?: string;
            type: string;
            thumbnailUrl?: string;
            baseWidth?: number;
            baseHeight?: number;
            isPortrait?: boolean;
            isActive: boolean;
            config?: any;
            configSchema?: any;
            createdAt: string;
            updatedAt: string;
        }
    }
}
