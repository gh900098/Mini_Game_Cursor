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
      <!-- Game Status Display (Floating & Collapsible) - Premium Glassmorphism Design -->
      <div v-if="gameStatus && !isPreview" class="absolute top-4 left-4 z-50">
        <div class="relative">
          <Transition name="slide-fade">
            <div v-if="!statusCollapsed" class="status-card-with-button group">
              <!-- Block Reason (if cannot play) - RED BOX -->
              <div v-if="!gameStatus.canPlay && gameStatus.blockReason" class="mb-2 flex items-center gap-2 bg-red-600/90 rounded-lg px-3 py-2 -mx-1 shadow-lg animate-pulse-slow">
                <div class="i-carbon-locked text-lg drop-shadow-md"></div>
                <span class="text-sm font-bold drop-shadow-md">
                  <template v-if="gameStatus.blockReason === 'LEVEL_TOO_LOW'">
                    等级不足！需要 Lv{{ gameStatus.blockDetails.required }}
                  </template>
                  <template v-else-if="gameStatus.blockReason === 'NOT_STARTED'">
                    活动未开始！
                  </template>
                  <template v-else-if="gameStatus.blockReason === 'ENDED'">
                    活动已结束！
                  </template>
                  <template v-else-if="gameStatus.blockReason === 'INVALID_DAY'">
                    今日不开放！
                  </template>
                  <template v-else>
                    {{ gameStatus.blockReason }}
                  </template>
                </span>
              </div>
              
              <!-- Hide Button attached to main status card (not warning box) -->
              <button
                @click="statusCollapsed = true"
                class="status-card-hide-button group"
                title="Hide"
              >
                <div class="i-carbon-chevron-right text-3xl font-black"></div>
                <div class="absolute inset-0 rounded-full border-2 border-white/30 scale-100 group-hover:scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              </button>
              
              <!-- No Attempts Left Warning (even if canPlay somehow true) -->
              <div v-if="gameStatus.dailyLimit > 0 && gameStatus.remaining === 0 && gameStatus.canPlay" class="mb-2 flex items-center gap-2 bg-red-600/90 rounded-lg px-3 py-2 -mx-1 shadow-lg animate-pulse-slow">
                <div class="i-carbon-warning text-lg drop-shadow-md"></div>
                <span class="text-sm font-bold drop-shadow-md">次数已用完！</span>
              </div>
              
              <div class="flex items-center gap-3">
                <!-- Daily Limit Display -->
                <div v-if="gameStatus.canPlay && gameStatus.dailyLimit > 0 && gameStatus.remaining > 0" class="flex items-center gap-2">
                  <!-- Warning if only 1 left -->
                  <div v-if="gameStatus.remaining === 1" class="i-carbon-play-filled text-yellow-400 drop-shadow-glow-yellow"></div>
                  <div v-else class="i-carbon-play-filled text-blue-400 drop-shadow-glow-blue"></div>
                  <span class="text-sm" :class="gameStatus.remaining === 1 ? 'text-yellow-400 font-bold' : ''">
                    <span class="font-bold">{{ gameStatus.remaining }}</span>
                    <span :class="gameStatus.remaining === 1 ? 'text-yellow-400/80' : 'text-white/60'">/{{ gameStatus.dailyLimit }}</span>
                  </span>
                </div>
                <!-- Cooldown Timer -->
                <div v-if="cooldownRemaining > 0" class="flex items-center gap-2">
                  <div class="i-carbon-time text-orange-400 drop-shadow-glow-orange"></div>
                  <span class="text-sm font-mono text-orange-300">{{ formatCooldown(cooldownRemaining) }}</span>
                </div>
                <!-- Refresh Button -->
                <button
                  @click="fetchGameStatus"
                  class="action-button"
                  :class="{ 'animate-spin': loadingStatus }"
                  title="Refresh status"
                >
                  <div class="i-carbon-renew text-lg"></div>
                </button>
              </div>
            </div>
          </Transition>
        </div>
        
        <!-- Collapsed State: Premium Floating Button with Glow -->
        <Transition name="fade">
          <button
            v-if="statusCollapsed"
            @click="statusCollapsed = false"
            class="collapsed-button group"
            title="Show status"
          >
            <div class="i-carbon-information text-xl drop-shadow-glow-white"></div>
            <!-- Animated ring on hover -->
            <div class="absolute inset-0 rounded-full border-2 border-white/30 scale-100 group-hover:scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
          </button>
        </Transition>
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
const statusCollapsed = ref(false);
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
    
    // Send status to iframe immediately
    if (iframeRef.value) {
      const simpleStatus = {
        canPlay: gameStatus.value.canPlay,
        blockReason: gameStatus.value.blockReason,
        blockDetails: gameStatus.value.blockDetails ? JSON.parse(JSON.stringify(gameStatus.value.blockDetails)) : null,
      };
      
      iframeRef.value.contentWindow?.postMessage({
        type: 'game-status-update',
        status: simpleStatus,
      }, '*');
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
  
  // Also send game status if available
  if (gameStatus.value) {
    const simpleStatus = {
      canPlay: gameStatus.value.canPlay,
      blockReason: gameStatus.value.blockReason,
      blockDetails: gameStatus.value.blockDetails ? JSON.parse(JSON.stringify(gameStatus.value.blockDetails)) : null,
    };
    
    // Wait a bit for game template to be ready
    setTimeout(() => {
      iframeRef.value?.contentWindow?.postMessage({
        type: 'game-status-update',
        status: simpleStatus,
      }, '*');
    }, 500);
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

// 监听游戏状态变化，通知iframe disable/enable按钮
watch(() => gameStatus.value, (status) => {
  if (status && iframeRef.value) {
    // Only send serializable data (no functions, no DOM elements)
    const simpleStatus = {
      canPlay: status.canPlay,
      blockReason: status.blockReason,
      blockDetails: status.blockDetails ? JSON.parse(JSON.stringify(status.blockDetails)) : null,
    };
    
    iframeRef.value.contentWindow?.postMessage({
      type: 'game-status-update',
      status: simpleStatus,
    }, '*');
  }
}, { deep: true });

onMounted(async () => {
  // 每次加载游戏时重置音效为开启
  settingsStore.resetSound();
  
  window.addEventListener('message', handleMessage);
  
  // Auto-login if token in URL query
  const urlToken = route.query.token as string;
  if (urlToken && !authStore.isLoggedIn) {
    console.log('[Game] Auto-login with URL token');
    authStore.setToken(urlToken);
  }
  
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

<style scoped>
/* ==================== */
/* PREMIUM GLASSMORPHISM DESIGN */
/* Based on UI/UX Pro Max principles */
/* ==================== */

/* Status Card with Button - Glassmorphism with curved right edge + button */
.status-card-with-button {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(20, 20, 30, 0.9) 100%);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  /* Curved right edge to accommodate button */
  border-radius: 0.75rem 1.5rem 1.5rem 0.75rem;
  padding: 0.75rem 4rem 0.75rem 1rem;
  color: white;
  box-shadow: 
    0 8px 32px 0 rgba(0, 0, 0, 0.37),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  position: relative;
  overflow: visible !important;
}

/* Subtle glow on hover */
.status-card-with-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.status-card-with-button:hover::before {
  opacity: 1;
}

/* Action Buttons - Interactive with smooth hover */
.action-button {
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  padding: 0.25rem;
  border-radius: 0.375rem;
}

.action-button:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

.action-button:active {
  transform: scale(0.95);
}

/* Hide Button on status card - large and visible */
.status-card-hide-button {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(168, 85, 247, 0.95) 100%);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 2.5px solid rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 8px 32px rgba(99, 102, 241, 0.9),
    0 0 0 1px rgba(255, 255, 255, 0.4) inset,
    0 0 20px rgba(255, 255, 255, 0.3);
  z-index: 100;
  flex-shrink: 0;
}

.status-card-hide-button:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 1) 0%, rgba(168, 85, 247, 1) 100%);
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 
    0 12px 48px rgba(99, 102, 241, 1),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset,
    0 0 30px rgba(255, 255, 255, 0.5);
  transform: translateY(-50%) scale(1.15) translateX(4px);
}

.status-card-hide-button:active {
  transform: translateY(-50%) scale(0.95);
}

/* Large arrow icon */
.status-card-hide-button .i-carbon-chevron-right {
  font-size: 2rem;
  font-weight: 900;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

/* Collapsed Button - Premium floating design */
.collapsed-button {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 8px 32px rgba(59, 130, 246, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.collapsed-button:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.5) 0%, rgba(139, 92, 246, 0.5) 100%);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 12px 48px rgba(59, 130, 246, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  transform: scale(1.05);
}

.collapsed-button:active {
  transform: scale(0.95);
}

/* Glow effects for icons */
.drop-shadow-glow-blue {
  filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8));
}

.drop-shadow-glow-yellow {
  filter: drop-shadow(0 0 8px rgba(234, 179, 8, 0.8));
}

.drop-shadow-glow-orange {
  filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.8));
}

.drop-shadow-glow-white {
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.6));
}

/* Pulse animation for critical warnings */
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}

/* Slide-fade transition for status card */
.slide-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.6, 1);
}
.slide-fade-enter-from {
  transform: translateX(-20px);
  opacity: 0;
}
.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

/* Fade transition for collapse button */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Smooth scale on appear */
.fade-enter-active {
  animation: scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes scale-in {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
