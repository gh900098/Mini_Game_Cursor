import { request } from '../request';

export function fetchThemes(params?: Record<string, any>) {
    return request<Api.SystemManage.ThemeList>({
        url: '/themes',
        method: 'get',
        params
    });
}

export function fetchThemeDetail(id: string) {
    return request<Api.SystemManage.Theme>({
        url: `/themes/${id}`,
        method: 'get'
    });
}

export function createTheme(data: any) {
    return request<Api.SystemManage.Theme>({
        url: '/themes',
        method: 'post',
        data
    });
}

export function updateTheme(id: string, data: any) {
    return request<Api.SystemManage.Theme>({
        url: `/themes/${id}`,
        method: 'patch',
        data
    });
}

export function deleteTheme(id: string) {
    return request<boolean>({
        url: `/themes/${id}`,
        method: 'delete'
    });
}
