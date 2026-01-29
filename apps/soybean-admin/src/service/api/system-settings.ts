import { request } from '../request';

/** Get public system settings */
export function fetchGetPublicSettings() {
    return request<Api.SystemSettings.PublicSettings>({
        url: '/system-settings/public',
        method: 'get'
    });
}
export function fetchGetAllSystemSettings() {
    return request<Record<string, any>>({
        url: '/system-settings',
        method: 'get'
    });
}

export function fetchUpdateSystemSettings(data: Record<string, any>) {
    return request<any>({
        url: '/system-settings',
        method: 'post',
        data
    });
}
