<template>
  <div class="min-h-screen bg-slate-900 text-white p-8">
    <header class="flex-y-center justify-between mb-12">
      <div class="flex-y-center gap-4">
        <n-button text class="text-white" @click="$router.push('/')">
          <template #icon>
            <div class="i-carbon-chevron-left text-xl"></div>
          </template>
          Back to Lobby
        </n-button>
        <h1 class="text-3xl font-bold ml-4">User Profile</h1>
      </div>
    </header>

    <main class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Profile Card -->
      <div class="lg:col-span-1">
        <div class="glass-card p-8 flex-col-center text-center">
          <n-avatar :size="120" round src="https://api.dicebear.com/7.x/avataaars/svg?seed=MiniGame" />
          <h2 class="text-2xl font-bold mt-6">{{ authStore.userInfo?.username || 'User' }}</h2>
          <p class="text-white/40 mt-1">{{ authStore.userInfo?.email || 'No email provided' }}</p>
          
          <div class="w-full h-px bg-white/10 my-8"></div>
          
          <div class="grid grid-cols-2 gap-4 w-full">
            <div class="p-4 bg-white/5 rounded-xl border border-white/5">
              <div class="text-primary text-2xl font-bold">{{ scores.length }}</div>
              <div class="text-xs text-white/40 uppercase tracking-wider">Games Played</div>
            </div>
            <div class="p-4 bg-white/5 rounded-xl border border-white/5">
              <div class="text-purple-400 text-2xl font-bold">{{ totalScore }}</div>
              <div class="text-xs text-white/40 uppercase tracking-wider">Total Points</div>
            </div>
          </div>
          
          <n-button mt-8 secondary block @click="authStore.logout()">
            Sign Out
          </n-button>
        </div>
      </div>

      <!-- Score History -->
      <div class="lg:col-span-2">
        <div class="glass-card p-8 min-h-[500px]">
          <h3 class="text-xl font-bold mb-6 flex-y-center">
            <div class="i-carbon-history mr-2 text-primary"></div>
            Recent Performance
          </h3>
          
          <n-spin :show="loading">
            <n-empty v-if="scores.length === 0 && !loading" description="No scores yet. Go play some games!" pt-12 />
            
            <div v-else class="space-y-4">
              <div v-for="score in scores" :key="score.id" 
                class="flex-y-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                <div class="flex-y-center gap-4">
                  <div class="w-12 h-12 bg-white/10 rounded-lg flex-center">
                    <div class="i-carbon-game-console text-2xl text-primary"></div>
                  </div>
                  <div>
                    <div class="font-bold text-lg">{{ score.instance?.name || 'Unknown Game' }}</div>
                    <div class="text-xs text-white/40">{{ formatDate(score.createdAt) }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-mono text-primary">{{ score.score }}</div>
                  <div class="text-[10px] text-white/20 uppercase">Points</div>
                </div>
              </div>
            </div>
          </n-spin>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import service from '@/service/api';

const authStore = useAuthStore();
const scores = ref<any[]>([]);
const loading = ref(true);

const totalScore = computed(() => {
  return scores.value.reduce((acc, curr) => acc + curr.score, 0);
});

async function fetchScores() {
  loading.value = true;
  try {
    const res: any = await service.get('/scores/my-scores');
    scores.value = Array.isArray(res) ? res : (res.data || []);
  } catch (error) {
    console.error('Failed to fetch scores:', error);
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

onMounted(() => {
  if (authStore.isLoggedIn) {
     fetchScores();
  }
});
</script>
