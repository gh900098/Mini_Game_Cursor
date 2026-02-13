import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: () => import('@/views/home/index.vue'),
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/login/index.vue'),
        },
        {
            path: '/profile',
            name: 'profile',
            component: () => import('@/views/profile/index.vue'),
        },
        {
            path: '/game/:id',
            name: 'game-legacy',
            component: () => import('@/views/game/index.vue'),
        },
        {
            path: '/:companySlug/:gameSlug',
            name: 'game',
            component: () => import('@/views/game/index.vue'),
        },
    ],
});

export default router;
