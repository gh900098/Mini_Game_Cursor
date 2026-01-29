import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const service = axios.create({
    baseURL: '/api',
    timeout: 10000,
});

service.interceptors.request.use(
    (config) => {
        const authStore = useAuthStore();
        if (authStore.token) {
            config.headers.Authorization = `Bearer ${authStore.token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

service.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        if (error.response?.status === 401) {
            const isPreview = window.location.search.includes('isPreview=true') ||
                window.location.pathname.includes('isPreview=true'); // Fallback check

            if (!isPreview) {
                const authStore = useAuthStore();
                authStore.logout();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default service;
