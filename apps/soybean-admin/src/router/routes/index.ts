import type { CustomRoute, ElegantConstRoute, ElegantRoute } from '@elegant-router/types';
import { generatedRoutes } from '../elegant/routes';
import { layouts, views } from '../elegant/imports';
import { transformElegantRoutesToVueRoutes } from '../elegant/transform';

/**
 * custom routes
 *
 * @link https://github.com/soybeanjs/elegant-router?tab=readme-ov-file#custom-route
 */
const customRoutes: CustomRoute[] = [
  {
    name: 'user-center',
    path: '/user-center',
    component: 'view.user-center',
    meta: {
      title: 'User Center',
      i18nKey: 'route.user-center',
      hideInMenu: true
    }
  } as any
];

/** create routes when the auth route mode is static */
export function createStaticRoutes() {
  const constantRoutes: ElegantRoute[] = [];

  const authRoutes: ElegantRoute[] = [];

  [...customRoutes, ...generatedRoutes].forEach(item => {
    // Deep clone the route and its meta to prevent mutation of original sources
    const route = {
      ...item,
      meta: item.meta ? { ...item.meta } : undefined
    } as any;

    // Recursive helper to override child roles without mutating original routes
    const overrideRoles = (r: any) => {
      if (r.meta) {
        r.meta = { ...r.meta }; // Clone meta at each level
        if (r.name === 'management_company') {
          r.meta.roles = ['R_SUPER', 'R_ADMIN'];
          r.meta.permission = 'companies:read';
        } else if (r.name === 'management_permission') {
          r.meta.roles = ['R_SUPER', 'R_ADMIN'];
          r.meta.permission = 'permissions:read';
        } else if (r.name === 'management_role') {
          r.meta.roles = ['R_SUPER', 'R_ADMIN'];
          r.meta.permission = 'roles:read';
        } else if (r.name === 'management_user') {
          r.meta.roles = ['R_SUPER', 'R_ADMIN'];
          r.meta.permission = 'users:read';
        } else if (r.name === 'management_route') {
          r.meta.roles = ['R_SUPER'];
          r.meta.permission = 'routes:read';
        } else if (r.name === 'management_audit-log') {
          r.meta.roles = ['R_SUPER', 'R_ADMIN'];
          r.meta.permission = 'audit-logs:read';
          r.meta.icon = 'material-symbols:history-rounded';
          r.meta.order = 6;
        } else if (r.name === 'management_member') {
          r.meta.roles = ['R_SUPER', 'R_ADMIN'];
          r.meta.permission = 'members:read';
          r.meta.icon = 'material-symbols:person-pin-rounded';
          r.meta.order = 7;
        } else if (r.name === 'management_game-instance') {
          r.meta.roles = ['R_SUPER', 'R_ADMIN'];
          r.meta.permission = 'game-instances:manage';
          r.meta.icon = 'material-symbols:qr-code-2-rounded';
          r.meta.order = 8;
        }
      }
      if (r.children) {
        r.children = r.children.map((child: any) => {
          const clonedChild = { ...child, meta: child.meta ? { ...child.meta } : undefined };
          overrideRoles(clonedChild);
          return clonedChild;
        });
      }
    };

    overrideRoles(route);

    if (route.meta?.constant) {
      constantRoutes.push(route);
    } else {
      authRoutes.push(route);
    }
  });

  return {
    constantRoutes,
    authRoutes
  };
}

/**
 * Get auth vue routes
 *
 * @param routes Elegant routes
 */
export function getAuthVueRoutes(routes: ElegantConstRoute[]) {
  return transformElegantRoutesToVueRoutes(routes, layouts, views);
}
