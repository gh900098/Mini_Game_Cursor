import { request } from '../request';

/** Get all prize types */
export function fetchGetPrizeTypes() {
    return request<any[]>({
        url: '/admin/prizes/types',
        method: 'get'
    });
}

/** Get prize type by slug */
export function fetchGetPrizeTypeBySlug(slug: string) {
    return request<any>({
        url: `/admin/prizes/types/${slug}`,
        method: 'get'
    });
}

/** Create prize type */
export function fetchCreatePrizeType(data: any) {
    return request<any>({
        url: '/admin/prizes/types',
        method: 'post',
        data
    });
}

/** Update prize type */
export function fetchUpdatePrizeType(slug: string, data: any) {
    return request<any>({
        url: `/admin/prizes/types/${slug}`,
        method: 'patch',
        data
    });
}

/** Delete prize type */
export function fetchDeletePrizeType(slug: string) {
    return request<any>({
        url: `/admin/prizes/types/${slug}`,
        method: 'delete'
    });
}
