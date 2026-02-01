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
        @load="handleIframeLoad"
      ></iframe>
      <!-- Game Status Display -->
      <div v-if="gameStatus && !isPreview" class="absolute top-4 left-4 z-50">
        <div class="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white">
          <div class="flex items-center gap-3">
            <!-- Daily Limit -->
            <div v-if="gameStatus.dailyLimit > 0" class="flex items-center gap-2">
              <div class="i-carbon-play-filled text-primary"></div>
              <span class="text-sm">
                <span class="font-bold">{{ gameStatus.remaining }}</span>
                <span class="text-white/60">/{{ gameStatus.dailyLimit }}</span>
              </span>
            </div>
            <!-- Cooldown Timer -->
            <div v-if="cooldownRemaining > 0" class="flex items-center gap-2">
              <div class="i-carbon-time text-warning"></div>
              <span class="text-sm font-mono">{{ formatCooldown(cooldownRemaining) }}</span>
            </div>
            <!-- Refresh Button -->
            <button
              @click="fetchGameStatus"
              class="i-carbon-renew text-white/60 hover:text-white text-lg transition-colors"
              :class="{ 'animate-spin': loadingStatus }"
              title="Refresh status"
            ></button>
          </div>
        </div>
      </div>
      
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
const loadingStatus = ref(false);
const gameContainer = ref<HTMLElement | null>(null);
const gameStatus = ref<any>(null);
const cooldownRemaining = ref(0);
let cooldownInterval: any = null;

const instanceSlug = computed(() => route.params.id);
const isPreview = computed(() => route.query.isPreview === 'true');
const hideHeader = computed(() => route.query.hideHeader === 'true');

// 音效按钮配置
const showSoundButton = computed(() => {
  return instance.value?.config?.showSoundButton !== false; // 默认显示
});

const soundButtonOpacity = computed(() => {
  const opacity = instance.value?.config?.soundButtonOpacity ?? 80; // 默认 80%
  return opacity / 100; // 转换成 CSS opacity (0-1)
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
    // Refresh game status after successful submission
    fetchGameStatus();
  } catch (err: any) {
    // Handle game rule errors with user-friendly messages
    if (err.response?.data?.code) {
      const errorData = err.response.data;
      switch (errorData.code) {
        case 'DAILY_LIMIT_REACHED':
          message.error(`每日次数已用完！明天再来吧 (${errorData.limit}次/天)`);
          break;
        case 'COOLDOWN_ACTIVE':
          message.warning(`请等待 ${errorData.remainingSeconds} 秒后再玩`);
          cooldownRemaining.value = errorData.remainingSeconds;
          startCooldownTimer();
          break;
        case 'ALREADY_PLAYED':
          message.error('您已经玩过此游戏，每人仅限一次机会');
          break;
        case 'INVALID_DAY':
          message.warning(errorData.message || '今天不在开放日期');
          break;
        case 'LEVEL_TOO_LOW':
          message.error(`等级不足！需要等级 ${errorData.required}，当前 ${errorData.current}`);
          break;
        case 'DAILY_BUDGET_EXCEEDED':
          message.warning('今日预算已用完，明天再来吧');
          break;
        default:
          message.error(errorData.message || '提交分数失败');
      }
    } else {
      message.error('Failed to submit score');
    }
    console.error(err);
    // Refresh status to show updated info
    fetchGameStatus();
  }
}

async function fetchGameStatus() {
  if (isPreview.value || !authStore.token) return;
  
  loadingStatus.value = true;
  try {
    const res: any = await service.get(`/scores/status/${instanceSlug.value}`);
    gameStatus.value = res.data || res;
    
    // If there's a cooldown, start the timer
    if (gameStatus.value.cooldownRemaining > 0) {
      cooldownRemaining.value = gameStatus.value.cooldownRemaining;
      startCooldownTimer();
    }
  } catch (error) {
    console.error('Failed to fetch game status:', error);
  } finally {
    loadingStatus.value = false;
  }
}

function startCooldownTimer() {
  // Clear existing timer
  if (cooldownInterval) {
    clearInterval(cooldownInterval);
  }
  
  // Start countdown
  cooldownInterval = setInterval(() => {
    if (cooldownRemaining.value > 0) {
      cooldownRemaining.value--;
    } else {
      clearInterval(cooldownInterval);
      cooldownInterval = null;
      // Refresh status when cooldown ends
      fetchGameStatus();
    }
  }, 1000);
}

function formatCooldown(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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

function handleIframeLoad() {
  // Iframe 加载完成后，发送初始音效状态
  iframeRef.value?.contentWindow?.postMessage({
    type: 'sound-toggle',
    enabled: settingsStore.soundEnabled,
  }, '*');
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
  // 每次加载游戏时重置音效为开启
  settingsStore.resetSound();
  
  window.addEventListener('message', handleMessage);
  
  if (!authStore.isLoggedIn && !isPreview.value) {
    message.warning('Please log in to play and save your scores!');
    router.push('/login');
    return;
  }
  fetchInstance();
  fetchGameStatus(); // Fetch game status on mount
});

onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
  
  // Clear cooldown timer
  if (cooldownInterval) {
    clearInterval(cooldownInterval);
    cooldownInterval = null;
  }
});
</script>
