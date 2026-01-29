import { useAuthStore } from '@/store/modules/auth';

export function useAuth() {
  const authStore = useAuthStore();

  function hasAuth(codes: string | string[]) {
    if (!authStore.isLogin) {
      return false;
    }

    if (authStore.userInfo.isSuperAdmin) {
      return true;
    }

    const check = (code: string) => {
      if (authStore.userInfo.buttons.includes(code)) return true;

      const [resource] = code.split(':');
      return resource && authStore.userInfo.buttons.includes(`${resource}:manage`);
    };

    if (typeof codes === 'string') {
      return check(codes);
    }

    return codes.some(code => check(code));
  }

  return {
    hasAuth
  };
}
