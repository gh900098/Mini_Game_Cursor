import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { useLoading } from '@sa/hooks';
import { fetchGetUserInfo, fetchLogin } from '@/service/api';
import { useRouterPush } from '@/hooks/common/router';
import { localStg } from '@/utils/storage';
import { SetupStoreId } from '@/enum';
import { $t } from '@/locales';
import { useRouteStore } from '../route';
import { useTabStore } from '../tab';
import { clearAuthStorage, getToken, storage } from './shared';

export const useAuthStore = defineStore(SetupStoreId.Auth, () => {
  const route = useRoute();
  const authStore = useAuthStore();
  const routeStore = useRouteStore();
  const tabStore = useTabStore();
  const { toLogin, redirectFromLogin } = useRouterPush(false);
  const { loading: loginLoading, startLoading, endLoading } = useLoading();

  const token = ref(getToken());

  const userInfo: Api.Auth.UserInfo = reactive({
    userId: '',
    userName: '',
    roles: [],
    buttons: [],
    currentCompanyId: null,
    currentCompanySlug: null,
    currentRoleId: null,
    currentRoleLevel: 0,
    companies: [],
    isSuperAdmin: false
  });

  const publicSettings = reactive<Api.SystemSettings.PublicSettings>({
    EMAIL_VERIFICATION_REQUIRED: 'false'
  });

  /** is super role in static route */
  const isStaticSuper = computed(() => {
    const { VITE_AUTH_ROUTE_MODE, VITE_STATIC_SUPER_ROLE } = import.meta.env;

    return VITE_AUTH_ROUTE_MODE === 'static' && (userInfo.roles?.includes(VITE_STATIC_SUPER_ROLE) ?? false);
  });

  /** Is login */
  const isLogin = computed(() => Boolean(token.value));

  /** Reset auth store */
  async function resetStore() {
    recordUserId();

    clearAuthStorage();

    authStore.$reset();

    if (!route.meta.constant) {
      await toLogin();
    }

    tabStore.cacheTabs();
    routeStore.resetStore();
  }

  /** Record the user ID of the previous login session Used to compare with the current user ID on next login */
  function recordUserId() {
    if (!userInfo.userId) {
      return;
    }

    // Store current user ID locally for next login comparison
    localStg.set('lastLoginUserId', userInfo.userId);
  }

  /**
   * Check if current login user is different from previous login user If different, clear all tabs
   *
   * @returns {boolean} Whether to clear all tabs
   */
  function checkTabClear(): boolean {
    if (!userInfo.userId) {
      return false;
    }

    const lastLoginUserId = localStg.get('lastLoginUserId');

    // Clear all tabs if current user is different from previous user
    if (!lastLoginUserId || lastLoginUserId !== userInfo.userId) {
      localStg.remove('globalTabs');
      tabStore.clearTabs();

      localStg.remove('lastLoginUserId');
      return true;
    }

    localStg.remove('lastLoginUserId');
    return false;
  }

  /**
   * Login
   *
   * @param email User email
   * @param password Password
   * @param remember Whether to remember the session
   * @param [redirect=true] Whether to redirect after login. Default is `true`
   */
  async function login(email: string, password: string, remember = false, redirect = true) {
    startLoading();

    const { data: loginToken, error } = await fetchLogin(email, password);

    if (!error) {
      const pass = await loginByToken(loginToken, remember);

      if (pass) {
        // Check if the tab needs to be cleared
        const isClear = checkTabClear();
        let needRedirect = redirect;

        if (isClear) {
          // If the tab needs to be cleared,it means we don't need to redirect.
          needRedirect = false;
        }
        await redirectFromLogin(needRedirect);

        window.$notification?.success({
          title: $t('page.login.common.loginSuccess'),
          content: $t('page.login.common.welcomeBack', { userName: userInfo.userName }),
          duration: 4500
        });
      }
    } else {
      resetStore();
    }

    endLoading();
  }

  async function loginByToken(loginToken: Api.Auth.LoginToken, remember = false) {
    const stg = remember ? storage.local : storage.session;

    // 1. stored in the localStorage or sessionStorage, the later requests need it in headers
    stg.set('token', loginToken.access_token);
    if (loginToken.refreshToken) {
      stg.set('refreshToken', loginToken.refreshToken);
    }

    // 2. get user info
    const pass = await getUserInfo();

    if (pass) {
      token.value = loginToken.access_token;

      return true;
    }

    return false;
  }

  async function getUserInfo() {
    const { data: info, error } = await fetchGetUserInfo();

    if (!error) {
      // Map backend response to UserInfo format
      const backendUser = info as any;
      let roles = ['R_USER'];

      const currentUc = backendUser.userCompanies?.find((uc: any) => uc.companyId === backendUser.currentCompanyId);

      if (backendUser.isSuperAdmin || currentUc?.role?.slug === 'super_admin') {
        roles = ['R_SUPER'];
      } else {
        if (currentUc?.role?.slug === 'company_admin') {
          roles = ['R_ADMIN'];
        }
      }

      const permissions = currentUc?.permissions || currentUc?.role?.permissions?.map((p: any) => p.slug) || backendUser.permissions || [];

      const mappedInfo: Api.Auth.UserInfo = {
        userId: backendUser.id || '',
        userName: backendUser.email || '',
        email: backendUser.email,
        roles,
        buttons: permissions,
        currentCompanyId: backendUser.currentCompanyId,
        currentCompanySlug: backendUser.currentCompanySlug,
        currentRoleId: backendUser.currentRoleId,
        currentRoleLevel: backendUser.currentRoleLevel || 0,
        companies: backendUser.userCompanies?.map((uc: any) => ({
          companyId: uc.companyId,
          companyName: uc.company?.name || 'Unknown',
          roleId: uc.roleId,
          roleName: uc.role?.name || 'Unknown',
          permissions: uc.role?.permissions?.map((p: any) => (typeof p === 'string' ? p : p.slug)) || uc.permissions || []
        })) || [],
        isSuperAdmin: backendUser.isSuperAdmin || roles.includes('R_SUPER')
      };

      // update store
      Object.assign(userInfo, mappedInfo);

      return true;
    }

    return false;
  }

  async function initUserInfo() {
    await fetchPublicSettings();

    const hasToken = getToken();

    if (hasToken) {
      const pass = await getUserInfo();

      if (!pass) {
        resetStore();
      }
    }
  }

  async function fetchPublicSettings() {
    const { data, error } = await import('@/service/api').then(m => m.fetchGetPublicSettings());
    if (!error && data) {
      Object.assign(publicSettings, data);
    }
  }

  async function switchCompany(companyId: string) {
    const { data: loginToken, error } = await import('@/service/api').then(m => m.fetchSwitchCompany(companyId));

    if (!error) {
      // Use existing token storage type
      const isRemembered = Boolean(localStg.get('token'));
      await loginByToken(loginToken, isRemembered);
      window.location.reload();
    }
  }

  return {
    token,
    userInfo,
    publicSettings,
    isStaticSuper,
    isLogin,
    loginLoading,
    resetStore,
    login,
    initUserInfo,
    switchCompany
  };
});
