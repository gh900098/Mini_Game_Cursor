<template>
  <div class="min-h-screen bg-slate-900 text-white p-8">
    <header class="flex-y-center justify-between mb-12">
      <h1 class="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
        Mini Game Portal
      </h1>
      <div class="flex-y-center gap-4">
        <template v-if="authStore.isLoggedIn">
           <n-button text class="text-white/60 hover:text-primary transition-colors" @click="$router.push('/profile')">
             <template #icon><div class="i-carbon-user-avatar text-xl"></div></template>
             {{ authStore.userInfo?.username }}
           </n-button>
           <n-button type="error" ghost size="small" @click="authStore.logout()">Logout</n-button>
        </template>
        <n-button v-else type="primary" secondary @click="$router.push('/login')">
          Login
        </n-button>
      </div>
    </header>

    <main>
      <n-spin :show="loading">
        <div v-if="instances.length === 0 && !loading" class="flex-col-center py-20 opacity-50">
          <div class="i-carbon-warning text-5xl mb-4"></div>
          <p>No games available at the moment.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div v-for="instance in instances" :key="instance.id" class="glass-card p-6 flex-col-center gap-4 transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/20">
            <div class="w-full aspect-video bg-white/5 rounded-xl overflow-hidden flex-center relative border border-white/10">
              <img v-if="instance.gameTemplate?.thumbnailUrl" :src="instance.gameTemplate.thumbnailUrl" class="w-full h-full object-cover" />
              <div v-else class="i-carbon-game-console text-5xl opacity-30"></div>
              <div class="absolute top-3 right-3 flex gap-2">
                <n-tag v-if="instance.isActive" type="success" size="small" round>Active</n-tag>
                <n-tag type="info" size="small" round>{{ instance.gameTemplate?.type || 'Arcade' }}</n-tag>
              </div>
            </div>
            <div class="w-full">
              <h3 class="text-xl font-bold text-white mb-2">{{ instance.name }}</h3>
              <p class="text-white/50 text-sm line-clamp-2 h-10 mb-4">{{ instance.gameTemplate?.description || 'No description available.' }}</p>
              <n-button type="primary" block size="large" @click="$router.push('/game/' + instance.slug)">
                Launch Game
              </n-button>
            </div>
          </div>
        </div>
      </n-spin>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/store/auth';
import service from '@/service/api';

const authStore = useAuthStore();
const instances = ref<any[]>([]);
const loading = ref(true);

async function fetchGames() {
  loading.value = true;
  try {
    const res: any = await service.get('/game-instances/public/demo-company');
    instances.value = Array.isArray(res) ? res : (res.data || []);
  } catch (error) {
    console.error('Failed to fetch games:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchGames();
});
</script>
