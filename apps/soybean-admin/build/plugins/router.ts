import type { RouteMeta } from 'vue-router';
import ElegantVueRouter from '@elegant-router/vue/vite';
import type { RouteKey } from '@elegant-router/types';

export function setupElegantRouter() {
  return ElegantVueRouter({
    layouts: {
      base: 'src/layouts/base-layout/index.vue',
      blank: 'src/layouts/blank-layout/index.vue'
    },
    routePathTransformer(routeName, routePath) {
      const key = routeName as RouteKey;

      if (key === 'login') {
        const modules: UnionKey.LoginModule[] = ['pwd-login', 'code-login', 'register', 'reset-pwd', 'bind-wechat'];

        const moduleReg = modules.join('|');

        return `/login/:module(${moduleReg})?`;
      }

      return routePath;
    },
    onRouteMetaGen(routeName) {
      const key = routeName as RouteKey;

      const constantRoutes: RouteKey[] = ['login', '403', '404', '500'];

      const meta: Partial<RouteMeta> = {
        title: key,
        i18nKey: `route.${key}` as App.I18n.I18nKey
      };

      if (constantRoutes.includes(key)) {
        meta.constant = true;
      }

      const roleMap: Partial<Record<RouteKey, string[]>> = {
        management_role: ['R_SUPER', 'R_ADMIN'],
        management_user: ['R_SUPER', 'R_ADMIN'],
        'management_audit-log': ['R_SUPER', 'R_ADMIN'],
        management_company: ['R_SUPER'],
        'management_email-settings': ['R_SUPER'],
        management_permission: ['R_SUPER'],

        games_list: ['R_SUPER', 'R_ADMIN', 'R_USER']
      };

      const iconMap: Partial<Record<RouteKey, string>> = {
        management: 'carbon:cloud-service-management',
        management_role: 'carbon:user-role',
        management_user: 'ph:users',
        management_company: 'carbon:enterprise',
        'management_email-settings': 'carbon:email',
        management_permission: 'carbon:user-access',

        games: 'ion:game-controller',
        games_list: 'ion:game-controller-outline'
      };

      const orderMap: Partial<Record<RouteKey, number>> = {
        games: 1,
        management: 2,
        games_list: 1,
        management_company: 1,
        management_role: 2,
        management_user: 3,
        'management_email-settings': 4,
        management_permission: 5,

      };

      if (roleMap[key]) {
        meta.roles = roleMap[key];
      }

      if (iconMap[key]) {
        meta.icon = iconMap[key];
      }

      if (orderMap[key]) {
        meta.order = orderMap[key];
      }

      return meta;
    }
  });
}
