declare namespace Api {
    namespace AuditLog {
        interface AuditLog {
            id: string;
            userId: string | null;
            userName: string | null;
            companyId: string | null;
            module: string | null;
            action: string | null;
            method: string | null;
            path: string | null;
            ip: string | null;
            userAgent: string | null;
            payload: any | null;
            params: any | null;
            result: any | null;
            status: number | null;
            duration: number | null;
            createdAt: string;
        }

        interface AuditLogSearchParams {
            page?: number;
            limit?: number;
            module?: string;
            action?: string;
            userId?: string;
            companyId?: string;
            userName?: string;
        }

        interface AuditLogOptions {
            modules: string[];
            actions: string[];
        }

        interface AuditLogList {
            items: AuditLog[];
            total: number;
            page: number;
            limit: number;
        }
    }
}
