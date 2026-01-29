import { localStg, sessionStg } from '@/utils/storage';

export const storage = {
  local: localStg,
  session: sessionStg
};

/** Get token */
export function getToken() {
  return localStg.get('token') || sessionStg.get('token') || '';
}

/** Clear auth storage */
export function clearAuthStorage() {
  localStg.remove('token');
  localStg.remove('refreshToken');
  sessionStg.remove('token');
  sessionStg.remove('refreshToken');
}
