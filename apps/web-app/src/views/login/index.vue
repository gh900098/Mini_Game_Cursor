<template>
  <div class="min-h-screen flex-center bg-slate-900">
    <div class="glass-card p-10 w-full max-w-md animate-fade-in">
      <h2 class="text-3xl font-bold text-white mb-8 text-center">Welcome Back</h2>
      <n-form mt-4 :model="loginModel" :rules="rules" ref="formRef">
        <n-form-item label="Username" path="username" label-style="color: white">
          <n-input v-model:value="loginModel.username" placeholder="Enter your username" @keyup.enter="handleLogin" />
        </n-form-item>
        <n-form-item label="Password" path="password" label-style="color: white">
          <n-input
            v-model:value="loginModel.password"
            type="password"
            placeholder="Enter your password"
            show-password-on="mousedown"
            @keyup.enter="handleLogin"
          />
        </n-form-item>
        <n-button type="primary" block size="large" mt-4 :loading="loading" @click="handleLogin">
          Sign In
        </n-button>
      </n-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import service from '@/service/api';
import type { FormInst } from 'naive-ui';
import { useMessage } from 'naive-ui';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const message = useMessage();

const formRef = ref<FormInst | null>(null);
const loading = ref(false);

onMounted(async () => {
  const token = route.query.token as string;
  if (token) {
    loading.value = true;
    try {
      authStore.setToken(token);
      message.success('Auto-login successful');
      
      // Fetch user profile
      await authStore.fetchProfile();
      
      router.push('/');
    } catch (e) {
      message.error('Invalid impersonation token');
    } finally {
      loading.value = false;
    }
  }
});

const loginModel = reactive({
  username: '',
  password: '',
});

const rules = {
  username: { required: true, message: 'Please enter your username', trigger: 'blur' },
  password: { required: true, message: 'Please enter your password', trigger: 'blur' },
};

async function handleLogin() {
  await formRef.value?.validate();
  loading.value = true;
  try {
    const res: any = await service.post('/members/login', loginModel);
    authStore.setToken(res.token);
    authStore.setUserInfo(res.user);
    message.success('Login successful!');
    router.push('/');
  } catch (error: any) {
    message.error(error.response?.data?.message || 'Login failed');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
