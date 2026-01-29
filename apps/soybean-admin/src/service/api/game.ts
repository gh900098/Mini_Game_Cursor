import { request } from '../request';

/** Get games */
export function fetchGetGames() {
    return request<Api.Game.Game[]>({
        url: '/games',
        method: 'get'
    });
}
