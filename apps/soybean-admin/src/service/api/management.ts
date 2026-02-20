import { request } from '../request';

/** Get roles */
export function fetchGetRoles(params?: { page?: number; limit?: number; keyword?: string }) {
    return request<Api.Management.Role[] | { items: Api.Management.Role[]; total: number }>({
        url: '/roles',
        method: 'get',
        params
    });
}

/** Get permissions */
export function fetchGetPermissions(params?: { page?: number; limit?: number; keyword?: string }) {
    return request<Api.Management.Permission[] | { items: Api.Management.Permission[]; total: number }>({
        url: '/permissions',
        method: 'get',
        params
    });
}

/** Get permissions for options (accessible with roles:read) */
export function fetchGetPermissionOptions() {
    return request<Api.Management.Permission[]>({
        url: '/permissions/options',
        method: 'get'
    });
}

/** Create role */
export function fetchCreateRole(data: Partial<Api.Management.Role>) {
    return request<Api.Management.Role>({
        url: '/roles',
        method: 'post',
        data
    });
}

/** Update role */
export function fetchUpdateRole(id: string, data: Partial<Api.Management.Role>) {
    return request<Api.Management.Role>({
        url: `/roles/${id}`,
        method: 'patch',
        data
    });
}

/** Delete role */
export function fetchDeleteRole(id: string) {
    return request<void>({
        url: `/roles/${id}`,
        method: 'delete'
    });
}

/** Get users */
export function fetchGetUsers(params?: { page?: number; limit?: number; companyId?: string; keyword?: string }) {
    return request<Api.Management.User[] | { items: Api.Management.User[]; total: number }>({
        url: '/users',
        method: 'get',
        params
    });
}

/** Create user */
export function fetchCreateUser(data: Partial<Api.Management.User>) {
    return request<Api.Management.User>({
        url: '/users',
        method: 'post',
        data
    });
}

/** Update user */
export function fetchUpdateUser(id: string, data: Partial<Api.Management.User>) {
    return request<Api.Management.User>({
        url: `/users/${id}`,
        method: 'patch',
        data
    });
}

/** Delete user */
export function fetchDeleteUser(id: string) {
    return request<void>({
        url: `/users/${id}`,
        method: 'delete'
    });
}

/** Add company to user */
export function fetchAddCompanyToUser(userId: string, data: { companyId: string; roleId: string; isPrimary?: boolean; isActive?: boolean }) {
    return request<void>({
        url: `/users/${userId}/companies`,
        method: 'post',
        data
    });
}

/** Update user role for a company */
export function fetchUpdateUserCompanyRole(userId: string, companyId: string, roleId: string) {
    return request<void>({
        url: `/users/${userId}/companies/${companyId}/role/${roleId}`,
        method: 'patch'
    });
}

/** Remove company from user */
export function fetchRemoveCompanyFromUser(userId: string, companyId: string) {
    return request<void>({
        url: `/users/${userId}/companies/${companyId}`,
        method: 'delete'
    });
}

/** Set primary company for user */
export function fetchSetPrimaryCompany(userId: string, companyId: string) {
    return request<void>({
        url: `/users/${userId}/companies/${companyId}/set-primary`,
        method: 'patch'
    });
}

/** Get companies */
export function fetchGetCompanies(params?: { page?: number; limit?: number; keyword?: string }) {
    return request<Api.Management.Company[] | { items: Api.Management.Company[]; total: number }>({
        url: '/companies',
        method: 'get',
        params
    });
}

/** Create company */
export function fetchCreateCompany(data: Partial<Api.Management.Company>) {
    return request<Api.Management.Company>({
        url: '/companies',
        method: 'post',
        data
    });
}

/** Update company */
export function fetchUpdateCompany(id: string, data: Partial<Api.Management.Company>) {
    return request<Api.Management.Company>({
        url: `/companies/${id}`,
        method: 'patch',
        data
    });
}

/** Delete company */
export function fetchDeleteCompany(id: string) {
    return request<void>({
        url: `/companies/${id}`,
        method: 'delete'
    });
}

/** Create permission */
export function fetchCreatePermission(data: Partial<Api.Management.Permission>) {
    return request<Api.Management.Permission>({
        url: '/permissions',
        method: 'post',
        data
    });
}

/** Update permission */
export function fetchUpdatePermission(id: string, data: Partial<Api.Management.Permission>) {
    return request<Api.Management.Permission>({
        url: `/permissions/${id}`,
        method: 'patch',
        data
    });
}

/** Delete permission */
export function fetchDeletePermission(id: string) {
    return request<void>({
        url: `/permissions/${id}`,
        method: 'delete'
    });
}

/** Get members */
export function fetchGetMembers(params?: { companyId?: string }) {
    return request<Api.Management.Member[]>({
        url: '/members',
        method: 'get',
        params
    });
}

/** Get game instances */
export function fetchGetGameInstances(params?: { companyId?: string }) {
    return request<Api.Management.GameInstance[]>({
        url: '/game-instances',
        method: 'get',
        params
    });
}

/** Create game instance */
export function fetchCreateGameInstance(data: Partial<Api.Management.GameInstance>) {
    return request<Api.Management.GameInstance>({
        url: '/game-instances',
        method: 'post',
        data
    });
}
/** Update game instance */
export function fetchUpdateGameInstance(id: string, data: Partial<Api.Management.GameInstance>) {
    return request<Api.Management.GameInstance>({
        url: `/game-instances/${id}`,
        method: 'patch',
        data
    });
}

/** Delete game instance */
export function fetchDeleteGameInstance(id: string) {
    return request<void>({
        url: `/game-instances/${id}`,
        method: 'delete'
    });
}

/** Check game instance usage */
export function fetchCheckGameInstanceUsage(id: string) {
    return request<{ hasRecords: boolean; recordCount: number }>({
        url: `/game-instances/${id}/usage-check`,
        method: 'get'
    });
}

/** Validate game instance slug */
export function fetchValidateGameInstanceSlug(data: { slug: string; excludeId?: string }) {
    return request<{ isAvailable: boolean; suggestedSlug: string }>({
        url: '/game-instances/validate-slug',
        method: 'post',
        data
    });
}

/** Get play attempts */
export function fetchGetPlayAttempts(params?: { companyId?: string }) {
    return request<Api.Management.PlayAttempt[]>({
        url: '/admin/scores/play-attempts',
        method: 'get',
        params
    });
}

/** Get all scores */
export function fetchGetScores(params?: { companyId?: string }) {
    return request<Api.Management.Score[]>({
        url: '/admin/scores/all',
        method: 'get',
        params
    });
}

/** Get scores stats */
export function fetchGetScoresStats(params?: { companyId?: string }) {
    return request<any>({
        url: '/admin/scores/stats',
        method: 'get',
        params
    });
}

/** Get budget tracking */
export function fetchGetBudgetTracking(params?: { companyId?: string }) {
    return request<Api.Management.BudgetTracking[]>({
        url: '/admin/scores/budget-tracking',
        method: 'get',
        params
    });
}

/** Get budget ledger */
export function fetchGetBudgetLedger(params?: { companyId?: string }) {
    return request<Api.Management.BudgetLedger[]>({
        url: '/admin/scores/budget-ledger',
        method: 'get',
        params
    });
}

/** Get all games */
export function fetchGetAdminGames() {
    return request<Api.Management.Game[]>({
        url: '/admin/games/all',
        method: 'get'
    });
}

/** Get games stats */
export function fetchGetGamesStats() {
    return request<any>({
        url: '/admin/games/stats',
        method: 'get'
    });
}

/** Create game template */
export function fetchCreateGame(data: Partial<Api.Management.Game>) {
    return request<Api.Management.Game>({
        url: '/games',
        method: 'post',
        data
    });
}

/** Update game template */
export function fetchUpdateGame(id: string, data: Partial<Api.Management.Game>) {
    return request<Api.Management.Game>({
        url: `/games/${id}`,
        method: 'patch',
        data
    });
}

/** Delete game template */
export function fetchDeleteGame(id: string) {
    return request<void>({
        url: `/games/${id}`,
        method: 'delete'
    });
}

/** Admin Members APIs */
export function fetchGetAdminMembers(params?: {
    companyId?: string;
    page?: number;
    limit?: number;
    username?: string;
    externalId?: string;
}) {
    return request<Api.Management.Member[] | { items: Api.Management.Member[]; meta: any }>({
        url: '/admin/members',
        method: 'get',
        params
    });
}

export function fetchGetAdminMember(id: string) {
    return request<Api.Management.Member>({
        url: `/admin/members/${id}`,
        method: 'get'
    });
}

export function fetchGetMemberById(id: string) {
    return request<Api.Management.Member>({
        url: `/admin/members/${id}`,
        method: 'get'
    });
}

export function fetchCreateMember(data: Partial<Api.Management.Member>) {
    return request<Api.Management.Member>({
        url: '/admin/members',
        method: 'post',
        data
    });
}

export function fetchUpdateMember(id: string, data: Partial<Api.Management.Member>) {
    return request<Api.Management.Member>({
        url: `/admin/members/${id}`,
        method: 'patch',
        data
    });
}

export function fetchDeleteMember(id: string) {
    return request<void>({
        url: `/admin/members/${id}`,
        method: 'delete'
    });
}

export function fetchToggleMemberStatus(id: string, data: { isActive: boolean }) {
    return request<Api.Management.Member>({
        url: `/admin/members/${id}/toggle-status`,
        method: 'patch',
        data
    });
}

export function fetchAdjustMemberCredits(id: string, data: { amount: number; reason: string; type: 'credit' | 'debit' }) {
    return request<any>({
        url: `/admin/members/${id}/adjust-credit`,
        method: 'post',
        data
    });
}

export function fetchGetMemberStats(id: string) {
    return request<any>({
        url: `/admin/members/${id}/stats`,
        method: 'get'
    });
}

export function fetchGetMemberCreditHistory(id: string) {
    return request<Api.Management.CreditTransaction[]>({
        url: `/admin/members/${id}/credit-history`,
        method: 'get'
    });
}

export function fetchGetMemberPlayHistory(id: string) {
    return request<Api.Management.PlayAttempt[]>({
        url: `/admin/members/${id}/play-history`,
        method: 'get'
    });
}

export function fetchGetMemberScores(id: string) {
    return request<Api.Management.Score[]>({
        url: `/admin/members/${id}/scores`,
        method: 'get'
    });
}

export function fetchGetMemberLoginHistory(id: string) {
    return request<Api.Management.LoginHistory[]>({
        url: `/admin/members/${id}/login-history`,
        method: 'get'
    });
}

export async function fetchGetPrizes(params?: { status?: string; memberId?: string; instanceId?: string }) {
    return request<Api.Management.MemberPrize[]>({
        url: '/admin/prizes',
        method: 'get',
        params
    });
}

export function fetchGetMemberPrizes(id: string) {
    return request<any[]>({
        url: `/admin/members/${id}/prizes`,
        method: 'get'
    });
}

export function fetchGetMemberAuditLogs(id: string) {
    return request<any[]>({
        url: `/admin/members/${id}/audit-logs`,
        method: 'get'
    });
}

/** Get design guide for a game (global, not theme-specific) */
export function fetchDesignGuide(gameSlug: string) {
    return request<{ content: string; themeName: string }>({
        url: `/games/${gameSlug}/design-guide`,
        method: 'get'
    });
}

/** Impersonate member */
export function fetchImpersonateMember(id: string) {
    return request<{ token: string; user: Api.Management.Member; redirectUrl: string }>({
        url: `/admin/members/${id}/impersonate`,
        method: 'post'
    });
}

/** Reset member password */
export function fetchResetMemberPassword(id: string, data: { password: string }) {
    return request<any>({
        url: `/admin/members/${id}/reset-password`,
        method: 'patch',
        data
    });
}

