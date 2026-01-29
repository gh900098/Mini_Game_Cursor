import { useAuthStore } from '@/store/modules/auth';
import { localStg, sessionStg } from '@/utils/storage';
import { fetchRefreshToken } from '../api';
import type { RequestInstanceState } from './type';

export function getAuthorization() {
  const token = localStg.get('token') || sessionStg.get('token');
  const Authorization = token ? `Bearer ${token}` : null;

  return Authorization;
}

/** refresh token */
async function handleRefreshToken() {
  const { resetStore } = useAuthStore();

  const rToken = localStg.get('refreshToken') || sessionStg.get('refreshToken') || '';
  const { error, data } = await fetchRefreshToken(rToken);
  if (!error && data) {
    const isLocal = !!localStg.get('refreshToken');
    const stg = isLocal ? localStg : sessionStg;

    stg.set('token', data.access_token);
    stg.set('refreshToken', data.refreshToken || '');
    return true;
  }

  resetStore();

  return false;
}

export async function handleExpiredRequest(state: RequestInstanceState) {
  if (!state.refreshTokenPromise) {
    state.refreshTokenPromise = handleRefreshToken();
  }

  const success = await state.refreshTokenPromise;

  setTimeout(() => {
    state.refreshTokenPromise = null;
  }, 1000);

  return success;
}

import { $t } from '@/locales';

export function handleFriendlyError(status?: number): string | null {
  if (!status) return null;

  switch (status) {
    case 400:
      return $t('request.error400');
    case 401:
      return $t('request.error401');
    case 403:
      return $t('request.error403');
    case 404:
      return $t('request.error404');
    case 413:
      return $t('request.error413');
    case 500:
      return $t('request.error500');
    default:
      return null;
  }
}

export function showErrorMsg(state: RequestInstanceState, message: string) {
  if (!state.errMsgStack?.length) {
    state.errMsgStack = [];
  }

  const isExist = state.errMsgStack.includes(message);

  if (!isExist) {
    state.errMsgStack.push(message);

    window.$message?.error(message, {
      onLeave: () => {
        state.errMsgStack = state.errMsgStack.filter(msg => msg !== message);

        setTimeout(() => {
          state.errMsgStack = [];
        }, 5000);
      }
    });
  }
}
