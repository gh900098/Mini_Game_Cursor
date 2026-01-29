import { request } from '../request';

/** get audit log list */
export function fetchGetAuditLogList(params?: Api.AuditLog.AuditLogSearchParams) {
    return request<Api.AuditLog.AuditLogList>({
        url: '/audit-logs',
        method: 'get',
        params
    });
}

/** get audit log detail */
export function fetchGetAuditLogDetail(id: string) {
    return request<Api.AuditLog.AuditLog>({
        url: `/audit-logs/${id}`,
        method: 'get'
    });
}

/** get audit log options */
export function fetchGetAuditLogOptions() {
    return request<Api.AuditLog.AuditLogOptions>({
        url: '/audit-logs/options',
        method: 'get'
    });
}
