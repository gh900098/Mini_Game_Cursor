import { defineStore } from 'pinia';
import service from '@/service/api';
import router from '@/router';

interface AuthState {
    token: string | null;
    userInfo: any | null;
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        token: localStorage.getItem('token'),
        userInfo: JSON.parse(localStorage.getItem('userInfo') || 'null'),
    }),
    getters: {
        isLoggedIn: (state) => !!state.token,
    },
    actions: {
        setToken(token: string) {
            this.token = token;
            localStorage.setItem('token', token);
        },
        setUserInfo(userInfo: any) {
            this.userInfo = userInfo;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
        },
        async fetchProfile() {
            try {
                // Try to fetch profile from members endpoint. 
                // If it fails (404), maybe it's an admin token (though unlikely for this app).
                // We don't have a guaranteed /members/profile yet, so I will add it to the backend next.
                // For now, let's try calling the new API endpoint I'm about to create.
                const response = await service.get('/members/profile');
                if (response) {
                    this.setUserInfo(response);
                }
            } catch (error) {
                console.error('Failed to fetch profile', error);
            }
        },
        logout() {
            this.token = null;
            this.userInfo = null;
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            router.push('/login');
        },
    },
});
