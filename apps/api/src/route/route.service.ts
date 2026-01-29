import { Injectable } from '@nestjs/common';

@Injectable()
export class RouteService {
    getUserRoutes() {
        return {
            routes: [
                {
                    name: 'home',
                    path: '/home',
                    component: 'layout.base$view.home',
                    meta: {
                        title: 'home',
                        i18nKey: 'route.home',
                        icon: 'mdi:monitor-dashboard',
                        order: 1
                    }
                },
                {
                    name: 'games',
                    path: '/games',
                    component: 'layout.base',
                    meta: {
                        title: 'games',
                        i18nKey: 'route.games',
                        icon: 'ion:game-controller',
                        order: 1
                    },
                    children: [
                        {
                            name: 'games_list',
                            path: '/games/list',
                            component: 'view.games_list',
                            meta: {
                                title: 'games_list',
                                i18nKey: 'route.games_list',
                                roles: ['R_SUPER', 'R_ADMIN', 'R_USER'],
                                icon: 'ion:game-controller-outline',
                                order: 1
                            }
                        }
                    ]
                },
                {
                    name: 'management',
                    path: '/management',
                    component: 'layout.base',
                    meta: {
                        title: 'management',
                        i18nKey: 'route.management',
                        icon: 'carbon:cloud-service-management',
                        order: 2
                    },
                    children: [
                        {
                            name: 'management_company',
                            path: '/management/company',
                            component: 'view.management_company',
                            meta: {
                                title: 'management_company',
                                i18nKey: 'route.management_company',
                                roles: ['R_SUPER'],
                                icon: 'carbon:enterprise',
                                order: 1
                            }
                        },
                        {
                            name: 'management_role',
                            path: '/management/role',
                            component: 'view.management_role',
                            meta: {
                                title: 'management_role',
                                i18nKey: 'route.management_role',
                                roles: ['R_SUPER', 'R_ADMIN'],
                                icon: 'carbon:user-role',
                                order: 2
                            }
                        },
                        {
                            name: 'management_user',
                            path: '/management/user',
                            component: 'view.management_user',
                            meta: {
                                title: 'management_user',
                                i18nKey: 'route.management_user',
                                roles: ['R_SUPER', 'R_ADMIN'],
                                icon: 'ph:users',
                                order: 3
                            }
                        },
                        {
                            name: 'management_permission',
                            path: '/management/permission',
                            component: 'view.management_permission',
                            meta: {
                                title: 'management_permission',
                                i18nKey: 'route.management_permission',
                                roles: ['R_SUPER'],
                                icon: 'carbon:user-access',
                                order: 4
                            }
                        },
                        {
                            name: 'management_email-settings',
                            path: '/management/email-settings',
                            component: 'view.management_email-settings',
                            meta: {
                                title: 'management_email-settings',
                                i18nKey: 'route.management_email-settings',
                                roles: ['R_SUPER'],
                                icon: 'carbon:email',
                                order: 3
                            }
                        },
                        {
                            name: 'management_audit-log',
                            path: '/management/audit-log',
                            component: 'view.management_audit-log',
                            meta: {
                                title: 'management_audit-log',
                                i18nKey: 'route.management_audit-log',
                                roles: ['audit-logs:read']
                            }
                        }
                    ]
                }
            ],
            home: 'home'
        };
    }

    getConstantRoutes() {
        return [];
    }

    isRouteExist(routeName: string) {
        return true;
    }
}
