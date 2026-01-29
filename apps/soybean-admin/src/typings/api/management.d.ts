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
            isAnonymous: boolean;
            createdAt: string;
            updatedAt: string;
            company?: Company;
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
    }
}
