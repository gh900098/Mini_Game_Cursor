import { defineStore } from 'pinia';

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
        logout() {
            this.token = null;
            this.userInfo = null;
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
        },
    },
});
