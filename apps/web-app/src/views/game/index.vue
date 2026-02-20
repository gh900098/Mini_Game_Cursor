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
      <div v-if="gameStatus" class="absolute top-4 left-4 z-50">
        <div class="relative">
          <Transition name="slide-fade">
            <div v-if="!statusCollapsed" class="status-card-with-button group">
              <!-- Left side: Info content -->
              <div class="flex flex-col gap-2 flex-1 min-w-0 py-1">
                <!-- Integrated Block Reason Pill -->
                <div v-if="!gameStatus.canPlay && gameStatus.blockReason" class="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-3 py-1 mr-2 shadow-inner">
                  <div class="i-carbon-locked text-red-500 text-sm drop-shadow-glow-red"></div>
                  <span class="text-xs font-bold text-red-400 uppercase tracking-wider truncate">
                    <template v-if="gameStatus.blockReason === 'LEVEL_TOO_LOW'">
                      Lv{{ gameStatus.blockDetails.required }} Required
                    </template>
                    <template v-else-if="gameStatus.blockReason === 'NOT_STARTED'">
                      Not Started
                    </template>
                    <template v-else-if="gameStatus.blockReason === 'ENDED'">
                      Ended
                    </template>
                    <template v-else-if="gameStatus.blockReason === 'NO_ATTEMPTS_LEFT'">
                      No attempts left today
                    </template>
                    <template v-else-if="gameStatus.blockReason === 'INSUFFICIENT_BALANCE'">
                      Insufficient Balance
                    </template>
                    <template v-else-if="gameStatus.blockReason === 'INVALID_DAY'">
                      Not available today
                    </template>
                    <template v-else-if="gameStatus.blockReason === 'ALREADY_PLAYED'">
                      Already played
                    </template>
                    <template v-else-if="gameStatus.blockReason === 'LOGIN_REQUIRED'">
                      Login Required
                    </template>
                    <template v-else>
                      {{ gameStatus.blockReason }}
                    </template>
                  </span>
                </div>
                
                <!-- Main Info Rows -->
                <div class="flex flex-col gap-1.5 pl-1">
                  <!-- One Time Only Warning -->
                  <div v-if="gameStatus.oneTimeOnly" class="flex items-center gap-2">
                    <div class="i-carbon-warning text-yellow-400 drop-shadow-glow-yellow text-[1em]"></div>
                    <span class="text-[0.85em] font-bold text-yellow-500/90 whitespace-nowrap">One Time Only</span>
                    <span v-if="gameStatus.hasPlayedEver" class="text-[0.8em] font-bold text-red-500">(Used)</span>
                  </div>
                  
                  <!-- Daily Limit Display -->
                  <div v-if="!gameStatus.oneTimeOnly && gameStatus.dailyLimit > 0" class="flex items-center gap-2">
                    <div 
                      class="i-carbon-play-filled drop-shadow-glow text-[1em]"
                      :style="{ color: remainingColor }"
                    ></div>
                    
                    <span 
                      class="text-[0.9em] font-bold whitespace-nowrap"
                      :style="{ color: remainingColor }"
                    >
                      {{ gameStatus.remaining }}<span :style="{ color: remainingSlashColor, fontWeight: 'normal' }">/{{ gameStatus.dailyLimit }}</span>
                    </span>

                    <button
                      @click="fetchGameStatus"
                      class="action-button-compact"
                      :class="{ 'animate-spin': loadingStatus }"
                      title="Refresh"
                    >
                      <div class="i-carbon-renew text-[0.9em]"></div>
                    </button>
                  </div>
                  
                  <!-- Time Limit Display -->
                  <div v-if="gameStatus.timeLimitConfig?.enable" class="flex items-center gap-2 text-[0.85em]">
                    <div 
                      :class="gameStatus.isInActiveTime ? 'i-carbon-calendar text-blue-400' : 'i-carbon-calendar text-red-500'"
                      class="drop-shadow-glow-blue"
                    ></div>
                    <span 
                      class="font-bold whitespace-nowrap"
                      :style="{ color: gameStatus.isInActiveTime ? '#60a5fa' : '#ef4444' }"
                    >
                      {{ formatDaysLocal(gameStatus.timeLimitConfig.activeDays) }} {{ formatTimeLocal(gameStatus.timeLimitConfig.startTime) }}~{{ formatTimeLocal(gameStatus.timeLimitConfig.endTime) }}
                    </span>
                  </div>
                  
                  <!-- Cooldown Timer -->
                  <div v-if="cooldownRemaining > 0" class="flex items-center gap-2 text-[0.85em]">
                    <div 
                      class="i-carbon-time drop-shadow-glow"
                      :style="{ color: remainingColor }"
                    ></div>
                    <span class="font-mono text-yellow-400 font-bold whitespace-nowrap">{{ formatCooldown(cooldownRemaining) }}</span>
                  </div>
                </div>
              </div>

              <!-- Right side: Circle Hide Button - Full Scale Nesting -->
              <div class="flex items-center justify-center py-1 self-stretch">
                <button
                  @click="statusCollapsed = true"
                  class="status-card-hide-button group"
                  title="Hide Status"
                >
                  <div class="i-carbon-chevron-right text-[1.4em] font-black"></div>
                  <div class="absolute inset-0 rounded-full border-2 border-white/20 scale-100 group-hover:scale-105 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
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
            :class="[
              'collapsed-button group',
              {
                'collapsed-button-danger': collapsedButtonStatus === 'danger',
                'collapsed-button-warning': collapsedButtonStatus === 'warning'
              }
            ]"
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
      <!-- Preview Mode Simulation Banner -->
      <div v-if="isPreview || gameStatus?.isImpersonated" class="absolute top-0 left-0 right-0 z-[60] pointer-events-none">
        <div 
          :class="isPreview ? 'bg-amber-500/95' : 'bg-red-600/95'"
          class="backdrop-blur-xl text-white text-[11px] font-black py-2 px-4 text-center tracking-[0.2em] shadow-2xl border-b-2 border-white/20 flex items-center justify-center gap-4"
        >
          <div :class="isPreview ? 'i-carbon-warning-filled' : 'i-carbon-security-filled'" class="text-lg animate-pulse"></div>
          <div class="flex flex-col items-center">
            <span class="leading-none mb-0.5">{{ isPreview ? 'PROTOTYPE SIMULATION' : 'ADMIN IMPERSONATION MODE' }}</span>
            <span class="text-[9px] opacity-70 leading-none">STRICTLY NO PERSISTENT CHANGES OR TOKEN DEDUCTION</span>
          </div>
          <div :class="isPreview ? 'i-carbon-warning-filled' : 'i-carbon-security-filled'" class="text-lg animate-pulse"></div>
        </div>
      </div>
      
      <!-- Social Mode (Budget Empty) Banner -->
      <div v-else-if="gameStatus?.budgetExhausted && gameStatus?.exhaustionMode === 'soft'" class="absolute top-0 left-0 right-0 z-[60] pointer-events-none animate-fade-in">
        <div class="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold py-1.5 px-4 text-center tracking-widest shadow-lg border-b border-blue-400/30 flex items-center justify-center gap-3">
          <div class="i-carbon-star-filled text-blue-200 animate-pulse"></div>
          <span>SOCIAL MODE ACTIVE: PLAYING FOR LEADERBOARD RANK</span>
          <div class="i-carbon-star-filled text-blue-200 animate-pulse"></div>
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
const statusCollapsed = ref(true);
let cooldownInterval: any = null;

const instanceSlug = computed(() => (route.params.gameSlug || route.params.id) as string);
const companySlug = computed(() => route.params.companySlug as string);
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

// Computed property for collapsed button status color
const collapsedButtonStatus = computed(() => {
  if (!gameStatus.value) return 'normal';
  
  // Case 1: Cannot play (blocked) - RED
  if (!gameStatus.value.canPlay && gameStatus.value.blockReason) {
    return 'danger';
  }
  
  // Case 2: One Time Only and already played - RED
  if (gameStatus.value.oneTimeOnly && gameStatus.value.hasPlayedEver) {
    return 'danger';
  }
  
  // Case 3: Not in active time (time limit enabled but not active) - RED
  if (gameStatus.value.timeLimitConfig?.enable && !gameStatus.value.isInActiveTime) {
    return 'danger';
  }
  
  // Case 4: No remaining attempts - RED
  if (gameStatus.value.dailyLimit > 0 && gameStatus.value.remaining === 0) {
    return 'danger';
  }
  
  // Case 5: Cooldown active - YELLOW (warning)
  if (cooldownRemaining.value > 0) {
    return 'warning';
  }
  
  // Case 6: Only 1 attempt left - YELLOW (warning)
  if (gameStatus.value.dailyLimit > 0 && gameStatus.value.remaining === 1) {
    return 'warning';
  }
  
  // Normal state - PURPLE (default)
  return 'normal';
});

// Computed property for remaining count color
const remainingColor = computed(() => {
  if (!gameStatus.value || !gameStatus.value.dailyLimit) {
    console.log('[remainingColor] No gameStatus or dailyLimit, returning white');
    return 'white';
  }
  
  const remaining = gameStatus.value.remaining;
  let color = 'white';
  
  if (remaining === 0) color = '#ef4444'; // Red
  else if (remaining === 1) color = '#facc15'; // Yellow
  else color = 'white'; // Normal
  
  console.log('[remainingColor] remaining:', remaining, 'color:', color);
  return color;
});

const remainingSlashColor = computed(() => {
  if (!gameStatus.value || !gameStatus.value.dailyLimit) return 'rgba(255, 255, 255, 0.6)';
  
  const remaining = gameStatus.value.remaining;
  if (remaining === 0) return 'rgba(239, 68, 68, 0.8)';
  if (remaining === 1) return 'rgba(250, 204, 21, 0.8)';
  return 'rgba(255, 255, 255, 0.6)';
});

const gameUrl = computed(() => {
  if (!instance.value) return '';
  
  // Use company-scoped play URL if possible
  const basePath = companySlug.value 
    ? `/api/game-instances/c/${companySlug.value}/${instanceSlug.value}/play`
    : `/api/game-instances/${instanceSlug.value}/play`;

  const params = new URLSearchParams();
  if (authStore.token) params.append('token', authStore.token);
  if (isPreview.value) params.append('isPreview', 'true');
  
  return `${basePath}?${params.toString()}`;
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
    const res: any = await service.post(`/scores/${instanceSlug.value}`, {
      score,
      metadata,
    });
    
    const savedScore = res.data || res;
    const finalPoints = savedScore.finalPoints ?? score;

    const isSocialMode = gameStatus.value?.budgetExhausted && gameStatus.value?.exhaustionMode === 'soft';

    if (gameStatus.value?.isImpersonated) {
      if (finalPoints > 0) {
        message.info(`[Test Mode] ${finalPoints} points would have been awarded.`);
      } else {
        message.info(`[Test Mode] Result submitted, but NOT recorded.`);
      }
    } else if (isSocialMode) {
      message.success('Great score! Your rank has been updated on the Leaderboard.');
    } else {
      if (finalPoints > 0) {
        message.success(`Awesome! You earned ${finalPoints} points!`);
      } else if (!metadata?.isLose) {
        message.success(`Congratulations! Your win has been recorded.`);
      } else {
        message.success(`Result submitted successfully.`);
      }
    }
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
        case 'MONTHLY_BUDGET_EXCEEDED':
          message.warning('本月预算已用完，下个月再来吧');
          break;
        case 'TOTAL_BUDGET_EXCEEDED':
          message.error('此活动总预算已耗尽，感谢参与');
          break;
        case 'INSUFFICIENT_BALANCE':
          message.error(`余额不足！本次游戏需要 ${errorData.required} 点数，当前仅剩 ${errorData.current}`);
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
  // Skip if no instanceSlug (new instance in preview)
  if (!instanceSlug.value) return;

  // Handle preview mode without token
  if (!authStore.token && isPreview.value) {
    const config = instance.value?.config;
    const { canPlay, blockReason, blockDetails, isInActiveTime } = checkRulesLocally(config);
    
    const limit = config?.dailyLimit ?? 3;
    gameStatus.value = {
      canPlay,
      blockReason,
      blockDetails,
      dailyLimit: limit,
      played: 0,
      remaining: limit,
      oneTimeOnly: config?.oneTimeOnly || false,
      hasPlayedEver: false,
      isInActiveTime,
      timeLimitConfig: config?.timeLimitConfig || null,
    };
    
    // DEBUG: Log for unauth preview
    console.log('[Preview] Status calculated:', gameStatus.value);
    
    // IMPORTANT: Sync to iframe even in preview!
    syncStatusToIframe();
    return;
  }
  
  // Skip if not logged in
  if (!authStore.token) return;
  
  loadingStatus.value = true;
  try {
    const url = companySlug.value 
      ? `/scores/status/c/${companySlug.value}/${instanceSlug.value}`
      : `/scores/status/${instanceSlug.value}`;
    const res: any = await service.get(url);
    gameStatus.value = res.data || res;
    
    // DEBUG: Log status for color debugging
    console.log('[GameStatus v2.0] Remaining:', gameStatus.value.remaining, 'DailyLimit:', gameStatus.value.dailyLimit);
    console.log('[GameStatus v2.0] Color should be:', 
      gameStatus.value.remaining === 0 ? 'RED' : 
      gameStatus.value.remaining === 1 ? 'YELLOW' : 
      'BLUE/WHITE');
    console.log('[GameStatus v2.0] CSS classes available:', document.querySelector('.remaining-yellow') ? 'YES' : 'NO');
    
    // If there's a cooldown, start the timer
    if (gameStatus.value.cooldownRemaining > 0) {
      cooldownRemaining.value = gameStatus.value.cooldownRemaining;
      startCooldownTimer();
    }
    
    // Send status to iframe
    syncStatusToIframe();
  } catch (error) {
    console.error('Failed to fetch game status:', error);
  } finally {
    loadingStatus.value = false;
  }
}

function syncStatusToIframe() {
  if (!iframeRef.value || !gameStatus.value) return;

  const simpleStatus = {
    canPlay: gameStatus.value.canPlay,
    blockReason: gameStatus.value.blockReason,
    blockDetails: gameStatus.value.blockDetails ? JSON.parse(JSON.stringify(gameStatus.value.blockDetails)) : null,
    cooldownRemaining: cooldownRemaining.value,
    balance: authStore.userInfo?.pointsBalance || 0,
    isImpersonated: gameStatus.value.isImpersonated || false,
    budgetExhausted: gameStatus.value.budgetExhausted || false,
    exhaustionMode: gameStatus.value.exhaustionMode || 'hard',
  };
  
  console.log('[Sync] Sending status to iframe:', simpleStatus);
  
  iframeRef.value.contentWindow?.postMessage({
    type: 'game-status-update',
    status: simpleStatus,
  }, '*');
}

function checkRulesLocally(config: any) {
  let canPlay = true;
  let blockReason: string | null = null;
  let blockDetails: any = null;
  let isInActiveTime = true;

  if (config?.timeLimitConfig?.enable) {
    const now = new Date();
    const tConfig = config.timeLimitConfig;
    console.log('[PreviewRule] TimeLimit enabled. ActiveDays:', tConfig.activeDays, 'Today:', now.getDay());

    // Check date range
    if (tConfig.startTime && new Date(tConfig.startTime) > now) {
      canPlay = false;
      isInActiveTime = false;
      blockReason = 'NOT_STARTED';
      blockDetails = { startTime: tConfig.startTime };
    } else if (tConfig.endTime && new Date(tConfig.endTime) < now) {
      canPlay = false;
      isInActiveTime = false;
      blockReason = 'ENDED';
      blockDetails = { endTime: tConfig.endTime };
    }

    // Check active days
    if (canPlay && tConfig.activeDays && Array.isArray(tConfig.activeDays) && tConfig.activeDays.length > 0) {
      const dayOfWeek = now.getDay();
      if (!tConfig.activeDays.includes(dayOfWeek)) {
        canPlay = false;
        isInActiveTime = false;
        blockReason = 'INVALID_DAY';
        blockDetails = { activeDays: tConfig.activeDays };
        console.log('[PreviewRule] Blocked by INVALID_DAY');
      }
    }
  }

  // Check requireLogin
  if (canPlay && config?.requireLogin && !authStore.token) {
    canPlay = false;
    blockReason = 'LOGIN_REQUIRED';
    console.log('[PreviewRule] Blocked by LOGIN_REQUIRED');
  }

  // Check oneTimeOnly (mocking hasPlayedEver as false for preview, but we can simulate the block if they want to see it)
  // For preview, we'll only block if it's explicitly set and we want to SHOW the "Already Played" state.
  // Actually, usually they just want to see the rule icon. 
  // Let's keep it playable unless Login/Time/Level blocks it.

  // Check minLevel (default user level 0 for preview)
  if (canPlay && config?.minLevel > 0) {
    canPlay = false;
    blockReason = 'LEVEL_TOO_LOW';
    blockDetails = { required: config.minLevel, current: 0 };
    console.log('[PreviewRule] Blocked by LEVEL_TOO_LOW');
  }

  return { canPlay, blockReason, blockDetails, isInActiveTime };
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
      
      // Update iframe with new cooldown value
      if (iframeRef.value && gameStatus.value) {
        iframeRef.value.contentWindow?.postMessage({
          type: 'game-status-update',
          status: {
            canPlay: gameStatus.value.canPlay,
            blockReason: gameStatus.value.blockReason,
            blockDetails: gameStatus.value.blockDetails ? JSON.parse(JSON.stringify(gameStatus.value.blockDetails)) : null,
            cooldownRemaining: cooldownRemaining.value,
          },
        }, '*');
      }
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

function formatTimeLimit(config: any): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const parts: string[] = [];
  
  // Format active days
  if (config.activeDays && config.activeDays.length > 0) {
    const sortedDays = [...config.activeDays].sort((a, b) => a - b);
    const dayLabels = sortedDays.map((d: number) => dayNames[d]);
    parts.push(dayLabels.join(', '));
  }
  
  // Format time range
  if (config.startTime && config.endTime) {
    // Extract HH:mm from ISO strings or time strings
    const formatTime = (timeStr: string) => {
      if (!timeStr) return '';
      // If it's an ISO date, extract time part
      if (timeStr.includes('T')) {
        const date = new Date(timeStr);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      // Otherwise assume it's already HH:mm format
      return timeStr;
    };
    parts.push(`${formatTime(config.startTime)}-${formatTime(config.endTime)}`);
  }
  
  return parts.join(' ') || 'Time limit enabled';
}

async function fetchInstance() {
  loading.value = true;
  try {
    const url = companySlug.value 
      ? `/game-instances/c/${companySlug.value}/${instanceSlug.value}`
      : `/game-instances/${instanceSlug.value}`;
    const res: any = await service.get(url);
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
  
  // Also send game status if available (or empty success status for preview)
  if (gameStatus.value || isPreview.value) {
    const status = gameStatus.value || {
      canPlay: true,
      blockReason: null,
      blockDetails: null,
    };

    const simpleStatus = {
      canPlay: status.canPlay,
      blockReason: status.blockReason,
      blockDetails: status.blockDetails ? JSON.parse(JSON.stringify(status.blockDetails)) : null,
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

// 监听游戏数据加载，加载后更新预览状态
watch(() => instance.value, (inst) => {
  if (inst && isPreview.value && !authStore.token) {
    fetchGameStatus();
  }
});

// 监听游戏状态变化，通知iframe disable/enable按钮
watch(() => gameStatus.value, (status) => {
  if (status && iframeRef.value) {
    // Only send serializable data (no functions, no DOM elements)
    const simpleStatus = {
      canPlay: status.canPlay,
      blockReason: status.blockReason,
      blockDetails: status.blockDetails ? JSON.parse(JSON.stringify(status.blockDetails)) : null,
      balance: authStore.userInfo?.pointsBalance || 0,
      isImpersonated: status.isImpersonated || false,
      budgetExhausted: status.budgetExhausted || false,
      exhaustionMode: status.exhaustionMode || 'hard',
    };
    
    iframeRef.value.contentWindow?.postMessage({
      type: 'game-status-update',
      status: simpleStatus,
    }, '*');
  }
}, { deep: true });

function formatTimeLocal(timeStr: string) {
  if (!timeStr) return '';
  return timeStr.split(':').slice(0, 2).join(':');
}

function formatDaysLocal(days: string[]) {
  if (!days?.length) return '';
  const dayNames: any = {
    '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat', '0': 'Sun'
  };
  return days.map(d => dayNames[d]).join(', ');
}

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

/* Status Card with Button - Glassmorphism Half-Capsule Design */
.status-card-with-button {
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(15, 15, 25, 0.95) 100%);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  /* Sharp Left, Rounded Right - Half Capsule look */
  border-radius: 0 999px 999px 0;
  border-left: none; /* Make left side look even sharper */
  /* Proportional padding - Left-heavy to balance the large button on right */
  /* Increased right padding (second value) to inset button further from edge */
  padding: 0.5em 1em 0.5em 1.5em;
  color: white;
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 1.25em;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  /* Prevent jumping when content appears */
  min-width: 12em;
}

/* Subtle gloss effect - adjusted for sharp left */
.status-card-with-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 15%;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255, 255, 255, 0.1), transparent);
  opacity: 0.5;
}

/* Action Buttons - Interactive with smooth hover */
.action-button-compact {
  color: #60a5fa;
  filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.3));
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1.4em;
  width: 1.4em;
  padding: 0;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.action-button-compact:hover {
  color: white;
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(96, 165, 250, 0.4);
}

/* Hide Button - Auto-scaling to fill capsule height */
.status-card-hide-button {
  /* Using aspect-ratio and height: 100% relative to stretchy flex container */
  height: 100%;
  aspect-ratio: 1/1;
  min-height: 2.5em; /* Minimum size for visibility */
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%);
  backdrop-filter: blur(8px);
  border: 0.15em solid rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 12px rgba(99, 102, 241, 0.5),
    0 0 10px rgba(168, 85, 247, 0.3);
  position: relative;
}

.status-card-hide-button:hover {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  box-shadow: 
    0 6px 20px rgba(99, 102, 241, 0.7),
    0 0 15px rgba(168, 85, 247, 0.5);
  transform: scale(1.02);
}

.status-card-hide-button:active {
  transform: scale(0.95);
}

/* Proportional chevron icon */
.status-card-hide-button .i-carbon-chevron-right {
  font-size: 1.5em;
  font-weight: 900;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
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

/* Danger State for Collapsed Button (red - cannot play) */
.collapsed-button-danger {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.4) 0%, rgba(239, 68, 68, 0.4) 100%);
  border-color: rgba(239, 68, 68, 0.4);
  box-shadow: 
    0 8px 32px rgba(220, 38, 38, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  animation: pulse-danger 2s ease-in-out infinite;
}

.collapsed-button-danger:hover {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.6) 0%, rgba(239, 68, 68, 0.6) 100%);
  border-color: rgba(239, 68, 68, 0.6);
  box-shadow: 
    0 12px 48px rgba(220, 38, 38, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.2) inset;
}

@keyframes pulse-danger {
  0%, 100% {
    box-shadow: 
      0 8px 32px rgba(220, 38, 38, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }
  50% {
    box-shadow: 
      0 8px 40px rgba(220, 38, 38, 0.7),
      0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  }
}

/* Warning State for Collapsed Button (yellow - 1 attempt left or cooldown) */
.collapsed-button-warning {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.4) 0%, rgba(250, 204, 21, 0.4) 100%);
  border-color: rgba(250, 204, 21, 0.4);
  box-shadow: 
    0 8px 32px rgba(234, 179, 8, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  animation: pulse-warning 2s ease-in-out infinite;
}

.collapsed-button-warning:hover {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.6) 0%, rgba(250, 204, 21, 0.6) 100%);
  border-color: rgba(250, 204, 21, 0.6);
  box-shadow: 
    0 12px 48px rgba(234, 179, 8, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.2) inset;
}

@keyframes pulse-warning {
  0%, 100% {
    box-shadow: 
      0 8px 32px rgba(234, 179, 8, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }
  50% {
    box-shadow: 
      0 8px 40px rgba(234, 179, 8, 0.7),
      0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  }
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
