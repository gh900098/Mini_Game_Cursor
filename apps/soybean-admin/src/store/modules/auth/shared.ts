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
  // Check which storage has the token
  const hasLocalToken = Boolean(localStg.get('token'));
  const hasSessionToken = Boolean(sessionStg.get('token'));

  // Only clear from the storage that has the token
  if (hasLocalToken) {
    localStg.remove('token');
    localStg.remove('refreshToken');
  }
  
  if (hasSessionToken) {
    sessionStg.remove('token');
    sessionStg.remove('refreshToken');
  }

  // If no token found, clear both (fallback)
  if (!hasLocalToken && !hasSessionToken) {
    localStg.remove('token');
    localStg.remove('refreshToken');
    sessionStg.remove('token');
    sessionStg.remove('refreshToken');
  }
}
