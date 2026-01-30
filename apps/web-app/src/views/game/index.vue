<template>
  <div class="h-screen bg-black flex flex-col">
    <header v-if="!hideHeader" class="h-14 bg-slate-900 border-b border-white/10 flex-y-center px-6 justify-between">
      <div class="flex-y-center gap-4">
        <n-button text class="text-white" @click="$router.back()">
          <template #icon>
            <div class="i-carbon-chevron-left text-xl"></div>
          </template>
          Back to Lobby
        </n-button>
        <div class="h-4 w-px bg-white/20"></div>
        <span class="text-white font-medium">{{ loading ? 'Loading Game...' : instance?.name }}</span>
      </div>
      <div class="flex-y-center gap-4">
        <n-button text class="text-white" @click="toggleSound" :title="settingsStore.soundEnabled ? 'Mute Sound' : 'Unmute Sound'">
          <template #icon>
            <div :class="settingsStore.soundEnabled ? 'i-carbon-volume-up' : 'i-carbon-volume-mute'" class="text-xl"></div>
          </template>
        </n-button>
        <n-button text class="text-white" @click="toggleFullscreen">
          <template #icon>
            <div class="i-carbon-maximize text-xl"></div>
          </template>
        </n-button>
      </div>
    </header>
    <div class="flex-1 relative overflow-hidden" ref="gameContainer">
      <iframe
        v-if="gameUrl"
        ref="iframeRef"
        :src="gameUrl"
        class="w-full h-full border-none"
        allow="autoplay; fullscreen"
      ></iframe>
      <!-- 浮动音效按钮（不管是否全屏都显示） -->
      <div v-if="showSoundButton" class="absolute top-4 right-4 z-50">
        <button
          @click="toggleSound"
          :title="settingsStore.soundEnabled ? 'Mute Sound' : 'Unmute Sound'"
          :style="{ opacity: soundButtonOpacity }"
          class="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all"
        >
          <div :class="settingsStore.soundEnabled ? 'i-carbon-volume-up' : 'i-carbon-volume-mute'" class="text-2xl"></div>
        </button>
      </div>
      <div v-if="loading" class="absolute inset-0 flex-center bg-slate-800/80 backdrop-blur-sm">
        <div class="text-center">
          <n-spin size="large" />
          <h2 class="text-2xl text-white font-bold mt-4">Connecting to Game Engine...</h2>
          <p class="text-white/40 mt-2">Authentication and Token verification in progress.</p>
        </div>
      </div>
      <div v-else-if="!instance" class="absolute inset-0 flex-center bg-slate-800">
        <div class="text-center">
          <div class="i-carbon-error text-6xl text-error mb-4"></div>
          <h2 class="text-2xl text-white font-bold">Game Not Found</h2>
          <n-button mt-4 type="primary" @click="$router.push('/')">Return to Lobby</n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import service from '@/service/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();

const instance = ref<any>(null);
const loading = ref(true);
const gameContainer = ref<HTMLElement | null>(null);

const instanceSlug = computed(() => route.params.id);
const isPreview = computed(() => route.query.isPreview === 'true');
const hideHeader = computed(() => route.query.hideHeader === 'true');

// 音效按钮配置
const showSoundButton = computed(() => {
  return instance.value?.config?.showSoundButton !== false; // 默认显示
});

const soundButtonOpacity = computed(() => {
  return instance.value?.config?.soundButtonOpacity ?? 0.8; // 默认 0.8
});

const gameUrl = computed(() => {
  if (!instance.value) return '';
  const baseUrl = `/api/game-instances/${instanceSlug.value}/play`;
  const params = new URLSearchParams();
  
  if (authStore.token) params.append('token', authStore.token);
  if (isPreview.value) params.append('isPreview', 'true');
  
  return `${baseUrl}?${params.toString()}`;
});

const message = useMessage();

const iframeRef = ref<HTMLIFrameElement | null>(null);

function handleMessage(event: MessageEvent) {
  if (event.data?.type === 'score-submit') {
    submitScore(event.data.score, event.data.metadata);
  } else if (event.data?.type === 'sync-config') {
    // Forward sync-config to iframe
    iframeRef.value?.contentWindow?.postMessage(event.data, '*');
  }
}

async function submitScore(score: number, metadata?: any) {
  if (isPreview.value) {
    message.info(`[Preview Mode] Score of ${score} would be submitted.`);
    return;
  }
  try {
    await service.post(`/scores/${instanceSlug.value}`, {
      score,
      metadata,
    });
    message.success(`Score of ${score} submitted successfully!`);
  } catch (err) {
    message.error('Failed to submit score');
    console.error(err);
  }
}

async function fetchInstance() {
  loading.value = true;
  try {
    const res: any = await service.get(`/game-instances/${instanceSlug.value}`);
    instance.value = res.data || res;
  } catch (error) {
    console.error('Failed to fetch game instance:', error);
  } finally {
    loading.value = false;
  }
}

function toggleFullscreen() {
  if (gameContainer.value?.requestFullscreen) {
    gameContainer.value.requestFullscreen();
  }
}

function toggleSound() {
  settingsStore.toggleSound();
  // 通知 iframe 内的游戏音效状态已改变
  iframeRef.value?.contentWindow?.postMessage({
    type: 'sound-toggle',
    enabled: settingsStore.soundEnabled,
  }, '*');
}

// 监听音效状态变化，自动同步到游戏
watch(() => settingsStore.soundEnabled, (enabled) => {
  iframeRef.value?.contentWindow?.postMessage({
    type: 'sound-toggle',
    enabled,
  }, '*');
});

onMounted(() => {
  window.addEventListener('message', handleMessage);
  
  if (!authStore.isLoggedIn && !isPreview.value) {
    message.warning('Please log in to play and save your scores!');
    router.push('/login');
    return;
  }
  fetchInstance();
});

onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
});
</script>
