<script setup lang="ts">
import { computed, ref, watch, onMounted, h } from 'vue';
import { NForm, NFormItem, NInput, NInputNumber, NSelect, NColorPicker, NDynamicInput, NTabs, NTabPane, NGrid, NGridItem, NButton, NSpace, NAlert, NSlider, NSwitch, NInputGroup, NInputGroupLabel, NTooltip, NImage, NCheckboxGroup, NCheckbox, NTimePicker, NRadio, NRadioGroup, NRadioButton, NCollapse, NCollapseItem, NIcon } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { request } from '@/service/request';

// Extend the window object to potentially access parent methods or simply use local logic
const { t, locale, availableLocales, messages } = useI18n();

// DEBUG: Check i18n status
const gameCommon = messages.value['zh-CN']?.page?.manage?.game?.common;
console.log('[ConfigForm] i18n Debug:', {
  currentLocale: locale.value,
  availableLocales: availableLocales,
  zhCNMessages: messages.value['zh-CN'],
  pageManageGame: messages.value['zh-CN']?.page?.manage?.game,
  gameCommon: gameCommon,
  gameCommonKeys: gameCommon ? Object.keys(gameCommon) : null,
  totalProbabilityValue: gameCommon?.totalProbability,
  testTranslation: t('page.manage.game.common.totalProbability'),
  testKey: 'page.manage.game.common.totalProbability'
});
console.log('[ConfigForm] Raw gameCommon object:', JSON.stringify(gameCommon, null, 2));

const uploadRef = ref<HTMLInputElement | null>(null);
const currentUploadTarget = ref<{ key: string, item?: any, name?: string, category?: string, accept?: string } | null>(null);

function triggerUpload(key: string, name?: string, category?: string, item?: any, accept: string = 'image/*') {
  currentUploadTarget.value = { key, name, category, item, accept };
  // Reset input value to allow selecting same file again
  if (uploadRef.value) {
    uploadRef.value.value = '';
    uploadRef.value.click();
  }
}

function checkCondition(item: SchemaItem) {
    if (!item.condition) return true;
    const { key, value, operator = 'eq' } = item.condition;
    const targetValue = formModel.value[key];
    
    if (operator === 'eq') return targetValue === value;
    if (operator === 'neq') return targetValue !== value;
    if (operator === 'in') return Array.isArray(value) && value.includes(targetValue);
    
    return true;
}

async function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !currentUploadTarget.value) return;

  const formData = new FormData();
  if (props.instanceId) formData.append('instanceId', props.instanceId);
  if (currentUploadTarget.value?.name) formData.append('customName', currentUploadTarget.value.name);
  if (currentUploadTarget.value?.category) formData.append('category', currentUploadTarget.value.category);
  formData.append('file', file);

  const { data, error } = await request<any>({
    url: '/game-instances/upload',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  if (!error && data?.url) {
    if (currentUploadTarget.value.item) {
      currentUploadTarget.value.item.icon = data.url;
    } else {
      formModel.value[currentUploadTarget.value.key] = data.url;
    }
    window.$message?.success(t('common.updateSuccess'));
  }
}

function clearAsset(key: string, item?: any) {
  if (item) {
    item.icon = '';
  } else {
    formModel.value[key] = '';
  }
}

// Audio Mode Helpers
const audioModes = ref<Record<string, 'theme' | 'custom' | 'none'>>({});

function isAudioField(key: string): boolean {
  return key.toLowerCase().includes('sound') || 
         key.toLowerCase().includes('bgm') || 
         key.toLowerCase().includes('audio');
}

function getAudioMode(key: string): 'theme' | 'custom' | 'none' {
  // Always derive mode from formModel current value (reactive!)
  const value = formModel.value[key];
  
  if (!value || value === '' || value === null) {
    return 'none';
  } else if (value === '__THEME_DEFAULT__' || value.includes('/templates/')) {
    return 'theme';
  } else if (value === '__CUSTOM_PENDING__' || !value.startsWith('__')) {
    return 'custom';
  }
  
  return 'none';
}

function setAudioMode(key: string, mode: 'theme' | 'custom' | 'none') {
  audioModes.value[key] = mode;
  
  if (mode === 'none') {
    formModel.value[key] = '';
  } else if (mode === 'theme') {
    // Set to a placeholder indicating theme default
    formModel.value[key] = '__THEME_DEFAULT__';
  } else if (mode === 'custom') {
    // Set placeholder to indicate custom mode (not empty = shows volume/loop options)
    // This way condition { bgmUrl != '' } will show options even before upload
    formModel.value[key] = '__CUSTOM_PENDING__';
  }
}

function getThemeAudioUrl(key: string): string {
  // Return the current theme's default audio URL for preview
  const themeId = formModel.value.visualTemplate || 'Cyberpunk Elite';
  const themeMap: Record<string, string> = {
    'Cyberpunk Elite': 'cyberpunk-elite',
    'Neon Night': 'neon-night',
    'Classic Arcade': 'classic-arcade',
    'Christmas Joy': 'christmas-joy',
    'Gold Royale': 'gold-royale'
  };
  const themeSlug = themeMap[themeId] || 'cyberpunk-elite';
  
  const audioTypeMap: Record<string, string> = {
    bgmUrl: 'bgm.mp3',
    winSound: 'win.mp3',
    loseSound: 'lose.mp3',
    jackpotSound: 'jackpot.mp3'
  };
  
  const filename = audioTypeMap[key] || 'bgm.mp3';
  return `/api/uploads/templates/${themeSlug}/${filename}`;
}

// Audio preview state management
let currentAudio: HTMLAudioElement | null = null;
const audioPlayingStates = ref<Record<string, boolean>>({});

function toggleAudioPreview(key: string, url: string) {
  // If this audio is playing, stop it
  if (audioPlayingStates.value[key]) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    audioPlayingStates.value[key] = false;
    return;
  }
  
  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    // Reset all playing states
    Object.keys(audioPlayingStates.value).forEach(k => {
      audioPlayingStates.value[k] = false;
    });
  }
  
  // Play new audio
  try {
    currentAudio = new window.Audio(url);
    audioPlayingStates.value[key] = true;
    
    currentAudio.play().catch(err => {
      console.error('Audio preview failed:', err);
      window.$message?.error('无法播放音效预览');
      audioPlayingStates.value[key] = false;
      currentAudio = null;
    });
    
    // Auto reset state when audio ends
    currentAudio.addEventListener('ended', () => {
      setTimeout(() => {
        audioPlayingStates.value[key] = false;
        currentAudio = null;
      }, 1500); // 1.5 seconds delay before resetting button
    });
  } catch (err) {
    console.error('Audio creation failed:', err);
    window.$message?.error('音效预览失败');
    audioPlayingStates.value[key] = false;
  }
}

function getPreviewButtonText(key: string, isTheme: boolean): string {
  if (audioPlayingStates.value[key]) {
    return '⏸️ 停止';
  }
  return isTheme ? '▶️ 预览主题音效' : '▶️ 预览';
}

interface SchemaItem {
  key: string;
  type: 'string' | 'number' | 'select' | 'color' | 'list' | 'prize-list' | 'vip-grid' | 'embed-code' | 'switch-group' | 'slider' | 'time-limit' | 'dynamic-prob' | 'budget-control' | 'image' | 'radio' | 'collapse-group' | 'switch' | 'file';
  label: string;
  default?: any;
  options?: string[] | { label: string; value: string }[];
  span?: number;
  presets?: Record<string, Record<string, any>>;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  items?: SchemaItem[]; // For nested groups
  condition?: { key: string; value: any; operator?: 'eq' | 'neq' | 'in' };
}

// ... (existing code)

const PRIZE_TEMPLATES = {
  'balanced': {
    label: '⚖️ Standard Balanced',
    items: [
      { icon: '💰', label: '10 Points', weight: 40, color: '#3b82f6', value: 10, isJackpot: false, isLose: false },
      { icon: '🎁', label: 'Surprise', weight: 10, color: '#8b5cf6', value: 50, isJackpot: false, isLose: false },
      { icon: '🤡', label: 'Try Again', weight: 25, color: '#64748b', value: 0, isJackpot: false, isLose: true },
      { icon: '💎', label: 'Jackpot', weight: 5, color: '#eab308', value: 1000, isJackpot: true, isLose: false },
      { icon: '🎟️', label: 'Ticket', weight: 20, color: '#10b981', value: 5, isJackpot: false, isLose: false }
    ]
  },
  'high_volatility': {
    label: '🔥 High Stakes',
    items: [
      { icon: '💀', label: 'Loose', weight: 45, color: '#ef4444', value: 0, isJackpot: false, isLose: true },
      { icon: '💀', label: 'Loose', weight: 45, color: '#ef4444', value: 0, isJackpot: false, isLose: true },
      { icon: '💰', label: 'BIG WIN', weight: 9, color: '#eab308', value: 500, isJackpot: false, isLose: false },
      { icon: '💎', label: 'JACKPOT', weight: 1, color: '#a855f7', value: 10000, isJackpot: true, isLose: false }
    ]
  },
  'everyone_wins': {
    label: '🎁 Everyone Wins',
    items: [
      { icon: '🍬', label: 'Candy', weight: 40, color: '#f9a8d4', value: 1, isJackpot: false, isLose: false },
      { icon: '🍪', label: 'Cookie', weight: 30, color: '#fdba74', value: 2, isJackpot: false, isLose: false },
      { icon: '🍫', label: 'Chocolate', weight: 20, color: '#a16207', value: 5, isJackpot: false, isLose: false },
      { icon: '🍰', label: 'Cake', weight: 10, color: '#f43f5e', value: 10, isJackpot: true, isLose: false }
    ]
  },
  'tiered': {
    label: '📊 Tiered Rewards',
    items: [
      { icon: '🥉', label: 'Bronze', weight: 50, color: '#cd7f32', value: 10, isJackpot: false, isLose: false },
      { icon: '🥈', label: 'Silver', weight: 30, color: '#94a3b8', value: 50, isJackpot: false, isLose: false },
      { icon: '🥇', label: 'Gold', weight: 15, color: '#eab308', value: 200, isJackpot: false, isLose: false },
      { icon: '💎', label: 'Diamond', weight: 5, color: '#3b82f6', value: 1000, isJackpot: true, isLose: false }
    ]
  },
   'promo': {
    label: '🏷️ Promo/Discount',
    items: [
      { icon: '5%', label: '5% OFF', weight: 40, color: '#3b82f6', value: 5, isJackpot: false, isLose: false },
      { icon: '10%', label: '10% OFF', weight: 30, color: '#8b5cf6', value: 10, isJackpot: false, isLose: false },
      { icon: '20%', label: '20% OFF', weight: 20, color: '#eab308', value: 20, isJackpot: false, isLose: false },
      { icon: '50%', label: '50% OFF', weight: 9, color: '#ef4444', value: 50, isJackpot: false, isLose: false },
      { icon: 'FREE', label: 'FREE ORDER', weight: 1, color: '#10b981', value: 100, isJackpot: true, isLose: false }
    ]
  }
};

const templateOptions = Object.entries(PRIZE_TEMPLATES).map(([key, val]) => ({ label: val.label, value: key }));

function handleTemplateChange(key: string, value: string) {
    const templateKey = value as keyof typeof PRIZE_TEMPLATES;
    if (PRIZE_TEMPLATES[templateKey]) {
        formModel.value[key] = JSON.parse(JSON.stringify(PRIZE_TEMPLATES[templateKey].items));
    }
}

interface TabSchema {
  name: string;
  label: string;
  items: SchemaItem[];
}

interface Props {
  schema: SchemaItem[] | TabSchema[];
  modelValue: Record<string, any>;
  instanceId?: string;
  companyId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:modelValue']);

const formModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

function initializeDefaults(items: SchemaItem[]) {
  items.forEach(item => {
    if (item.items) {
      initializeDefaults(item.items);
    }
    if (item.key && formModel.value[item.key] === undefined && item.default !== undefined) {
      formModel.value[item.key] = item.default;
    }
  });
}

watch(() => props.schema, (newSchema) => {
  if (newSchema) {
    if (Array.isArray(newSchema)) {
       // Check if it's TabSchema[] or SchemaItem[]
       // Simple heuristic: if first item has 'items' but no 'key' (or key is irrelevant for tabs), treat as tabs?
       // Actually Interface says TabSchema has 'items'. SchemaItem can have 'items' too.
       // We can just iterate. If item has .items, recurse.
       const confirmSchema = newSchema as any[];
       confirmSchema.forEach(s => {
           if (s.items) initializeDefaults(s.items);
           // specific check for top-level non-tab items if schema is SchemaItem[]
           if (!s.items && s.key && s.default !== undefined && formModel.value[s.key] === undefined) {
               formModel.value[s.key] = s.default;
           }
       });
    }
  }
}, { immediate: true, deep: true });

// Full theme presets with all settings (background, colors, effects, BGM, etc.)
const FULL_THEME_PRESETS: Record<string, any> = {
  'Cyberpunk Elite': {
    // 🌃 赛博朋克 - 霓虹科技感
    bgType: 'gradient', bgGradStart: '#0a0a12', bgGradEnd: '#1a1a2e', bgGradDir: 'to bottom',
    themeColor: '#00f5ff', secondaryColor: '#ff00ff', 
    neonCyan: '#00f5ff', neonPink: '#ff00ff', neonPurple: '#9d00ff', neonGold: '#ffd700', neonGreen: '#00ff88', darkBg: '#0a0a12',
    // Effects - 全开
    enableBGM: true, enableLedRing: true, enableConfetti: true, enableStartScreen: true, enableHexagons: true, enableGridFloor: true,
    // LED - 霓虹三色
    ledColor1: '#00f5ff', ledColor2: '#ff00ff', ledColor3: '#ffd700', ledCount: 32, ledSpeed: 50,
    // Confetti - 科技色
    confettiColors: '#00f5ff,#ff00ff,#ffd700,#00ff88', confettiParticles: 150, confettiSpread: 80,
    // Spin - 快速
    spinDuration: 4, spinTurns: 5,
    // Buttons
    spinBtnColor: '#ff00ff', spinBtnTextColor: '#ffffff', tokenBarColor: '#00f5ff', tokenBarTextColor: '#000000',
    // Sounds - 科技电子音效
    bgmUrl: '/api/uploads/templates/cyberpunk-elite/bgm.mp3',
    winSound: '/api/uploads/templates/cyberpunk-elite/win.mp3',
    loseSound: '/api/uploads/templates/cyberpunk-elite/lose.mp3',
    jackpotSound: '/api/uploads/templates/cyberpunk-elite/jackpot.mp3',
    tickSoundEnabled: true
  },
  'Neon Night': {
    // 🌌 霓虹之夜 - 复古霓虹风
    bgType: 'gradient', bgGradStart: '#0d0221', bgGradEnd: '#261447', bgGradDir: '135deg',
    themeColor: '#f72585', secondaryColor: '#4cc9f0',
    neonCyan: '#4cc9f0', neonPink: '#f72585', neonPurple: '#7209b7', neonGold: '#ffd60a', neonGreen: '#06ffa5',
    // Effects - 霓虹感但不要太cyber
    enableBGM: true, enableLedRing: true, enableConfetti: true, enableStartScreen: true, enableHexagons: false, enableGridFloor: false,
    // LED - 粉蓝紫
    ledColor1: '#f72585', ledColor2: '#4cc9f0', ledColor3: '#7209b7', ledCount: 28, ledSpeed: 60,
    // Confetti - 霓虹
    confettiColors: '#f72585,#4cc9f0,#7209b7,#ffd60a', confettiParticles: 120, confettiSpread: 70,
    // Spin
    spinDuration: 5, spinTurns: 4,
    // Buttons - 粉色主调
    spinBtnColor: '#f72585', spinBtnTextColor: '#ffffff', tokenBarColor: '#4cc9f0', tokenBarTextColor: '#000000',
    // Sounds - 复古合成器风
    bgmUrl: '/api/uploads/templates/neon-night/bgm.mp3',
    winSound: '/api/uploads/templates/neon-night/win.mp3',
    loseSound: '/api/uploads/templates/neon-night/lose.mp3',
    jackpotSound: '/api/uploads/templates/neon-night/jackpot.mp3',
    tickSoundEnabled: true
  },
  'Classic Arcade': {
    // 🕹️ 经典街机 - 复古游戏风
    bgType: 'gradient', bgGradStart: '#000428', bgGradEnd: '#004e92', bgGradDir: 'to bottom',
    themeColor: '#ffdd00', secondaryColor: '#ff0055',
    neonCyan: '#00fff7', neonPink: '#ff0055', neonGold: '#ffdd00', neonGreen: '#39ff14',
    // Effects - 经典街机感
    enableBGM: true, enableLedRing: true, enableConfetti: true, enableStartScreen: true, enableHexagons: false, enableGridFloor: false,
    // LED - 街机三色（黄红绿）
    ledColor1: '#ffdd00', ledColor2: '#ff0055', ledColor3: '#39ff14', ledCount: 24, ledSpeed: 40,
    // Confetti - 鲜艳
    confettiColors: '#ffdd00,#ff0055,#39ff14,#00fff7', confettiParticles: 200, confettiSpread: 100,
    // Spin - 中速
    spinDuration: 4, spinTurns: 5,
    // Buttons - 黄色街机按钮
    spinBtnColor: '#ffdd00', spinBtnTextColor: '#000000', tokenBarColor: '#ff0055', tokenBarTextColor: '#ffffff',
    // Sounds - 8-bit 街机风
    bgmUrl: '/api/uploads/templates/classic-arcade/bgm.mp3',
    winSound: '/api/uploads/templates/classic-arcade/win.mp3',
    loseSound: '/api/uploads/templates/classic-arcade/lose.mp3',
    jackpotSound: '/api/uploads/templates/classic-arcade/jackpot.mp3',
    tickSoundEnabled: true
  },
  'Christmas Joy': {
    // 🎄 圣诞欢乐 - 温馨节日风
    bgType: 'gradient', bgGradStart: '#1a472a', bgGradEnd: '#0f2818', bgGradDir: '180deg',
    themeColor: '#ff0000', secondaryColor: '#00aa00',
    neonCyan: '#00ff00', neonPink: '#ff0000', neonGold: '#ffd700', neonGreen: '#00aa00',
    // Effects - 节日氛围
    enableBGM: true, enableLedRing: true, enableConfetti: true, enableStartScreen: true, enableHexagons: false, enableGridFloor: false,
    // LED - 红绿金（圣诞色）
    ledColor1: '#ff0000', ledColor2: '#00ff00', ledColor3: '#ffd700', ledCount: 24, ledSpeed: 80,
    // Confetti - 雪花感
    confettiColors: '#ff0000,#00ff00,#ffd700,#ffffff', confettiParticles: 180, confettiSpread: 90,
    // Spin - 欢乐感
    spinDuration: 5, spinTurns: 4,
    // Buttons - 红色圣诞
    spinBtnColor: '#ff0000', spinBtnTextColor: '#ffffff', tokenBarColor: '#00aa00', tokenBarTextColor: '#ffffff',
    // Sounds - 圣诞铃声风
    bgmUrl: '/api/uploads/templates/christmas-joy/bgm.mp3',
    winSound: '/api/uploads/templates/christmas-joy/win.mp3',
    loseSound: '/api/uploads/templates/christmas-joy/lose.mp3',
    jackpotSound: '/api/uploads/templates/christmas-joy/jackpot.mp3',
    tickSoundEnabled: true
  },
  'Gold Royale': {
    // 👑 皇家金殿 - 奢华尊贵风
    bgType: 'gradient', bgGradStart: '#1a1a0a', bgGradEnd: '#2d2a1a', bgGradDir: 'radial',
    themeColor: '#ffd700', secondaryColor: '#b8860b',
    neonCyan: '#ffd700', neonPink: '#daa520', neonGold: '#ffdf00', neonGreen: '#c9b037',
    // Effects - 奢华但低调
    enableBGM: true, enableLedRing: true, enableConfetti: true, enableStartScreen: true, enableHexagons: false, enableGridFloor: false,
    // LED - 全金色系
    ledColor1: '#ffd700', ledColor2: '#ffdf00', ledColor3: '#daa520', ledCount: 32, ledSpeed: 70,
    // Confetti - 金色闪耀
    confettiColors: '#ffd700,#ffdf00,#daa520,#fffacd', confettiParticles: 100, confettiSpread: 60,
    // Spin - 稳重
    spinDuration: 6, spinTurns: 3,
    // Buttons - 金色奢华
    spinBtnColor: '#ffd700', spinBtnTextColor: '#1a1a0a', tokenBarColor: '#b8860b', tokenBarTextColor: '#ffffff',
    // Sounds - 奢华赌场风
    bgmUrl: '/api/uploads/templates/gold-royale/bgm.mp3',
    winSound: '/api/uploads/templates/gold-royale/win.mp3',
    loseSound: '/api/uploads/templates/gold-royale/lose.mp3',
    jackpotSound: '/api/uploads/templates/gold-royale/jackpot.mp3',
    tickSoundEnabled: true
  }
};

watch(() => formModel.value.themePreset, (newVal, oldVal) => {
  // Skip if changing to Custom or no value
  if (!newVal || newVal === 'Custom') return;
  
  // First check if config has templatePresets from backend (priority)
  const backendPresets = formModel.value.templatePresets;
  if (backendPresets && backendPresets[newVal]) {
    // Apply all preset values
    const preset = backendPresets[newVal];
    for (const key in preset) {
      formModel.value[key] = preset[key];
    }
    console.log(`[ConfigForm] Loaded preset from backend: ${newVal}`, preset);
    return;
  }
  
  // Fallback to frontend presets
  if (FULL_THEME_PRESETS[newVal]) {
    const preset = FULL_THEME_PRESETS[newVal];
    // Apply ALL preset values to form
    for (const key in preset) {
      formModel.value[key] = preset[key];
    }
    console.log(`[ConfigForm] Loaded preset from frontend: ${newVal}`, preset);
    
    // Force sync to iframe
    setTimeout(() => {
      window.postMessage({ type: 'sync-config', config: JSON.parse(JSON.stringify(formModel.value)) }, '*');
    }, 100);
  }
});

watch(formModel, (newVal) => {
    // Send to parent so it can forward to iframe if needed
    window.postMessage({ type: 'sync-config', config: JSON.parse(JSON.stringify(newVal)) }, '*');
}, { deep: true });

const isTabbed = computed(() => {
  return props.schema.length > 0 && 'items' in props.schema[0] && !('key' in props.schema[0]);
});

// Flat list for lookup
const allItems = computed(() => {
  if (isTabbed.value) {
    return (props.schema as TabSchema[]).flatMap(tab => tab.items);
  }
  return props.schema as SchemaItem[];
});

const initializeModel = (items: SchemaItem[]) => {
  items.forEach(item => {
    if (formModel.value[item.key] === undefined) {
      if (item.type === 'vip-grid') {
        formModel.value[item.key] = [
          { name: 'Bronze', multiplier: 1, extraSpins: 0 },
          { name: 'Silver', multiplier: 1.2, extraSpins: 1 },
          { name: 'Gold', multiplier: 1.5, extraSpins: 2 },
          { name: 'Platinum', multiplier: 2, extraSpins: 5 }
        ];
      } else if (item.type === 'switch-group') {
          formModel.value[item.key] = {};
      } else if (item.type === 'time-limit') {
          formModel.value[item.key] = { enable: false, activeDays: [], startTime: null, endTime: null };
      } else if (item.type === 'dynamic-prob') {
          formModel.value[item.key] = { enable: false, lossStreakLimit: 3, lossStreakBonus: 5 };
      } else if (item.type === 'budget-control') {
          formModel.value[item.key] = { enable: false, dailyBudget: 1000, monthlyBudget: 20000 };
      } else {
        formModel.value[item.key] = item.default ?? (item.type === 'list' ? [] : (item.type === 'number' ? 0 : ''));
      }
    }
  });
};

if (isTabbed.value) {
  (props.schema as TabSchema[]).forEach(tab => initializeModel(tab.items));
} else {
  initializeModel(props.schema as SchemaItem[]);
}

const PRESETS: Record<string, Record<string, any>> = {
  'Neon Night': { themeColor: '#8b5cf6', secondaryColor: '#1e1b4b', centerIcon: '💎', fontSize: 18 },
  'Classic Arcade': { themeColor: '#3b82f6', secondaryColor: '#f1f5f9', centerIcon: '🎯', fontSize: 16 },
  'Christmas Joy': { themeColor: '#ef4444', secondaryColor: '#10b981', centerIcon: '🎄', fontSize: 16 },
  'Gold Royale': { themeColor: '#eab308', secondaryColor: '#451a03', centerIcon: '💰', fontSize: 14 },
  'Cyberpunk Elite': { themeColor: '#f472b6', secondaryColor: '#06b6d4', centerIcon: '⚡', fontSize: 18 }
};

function getTotalChance(key: string) {
  const list = formModel.value[key];
  if (!Array.isArray(list)) return 0;
  return list.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
}

function getExpectedValue(key: string) {
    const list = formModel.value[key];
    if (!Array.isArray(list)) return 0;
    // Expected Value = Sum(Value * (Weight/100))
    const total = list.reduce((acc, curr) => {
        const val = Number(curr.value) || 0;
        const weight = Number(curr.weight) || 0;
        return acc + (val * (weight / 100));
    }, 0);
    return total.toFixed(2);
}

function handleFieldChange(key: string, value: any) {
  console.log('[handleFieldChange] key:', key, 'value:', value);
  console.log('[handleFieldChange] Available presets:', Object.keys(FULL_THEME_PRESETS));
  
  // Check full theme presets first (for themePreset field)
  if (FULL_THEME_PRESETS[value]) {
    console.log('[handleFieldChange] Found preset for:', value, FULL_THEME_PRESETS[value]);
    Object.entries(FULL_THEME_PRESETS[value]).forEach(([targetKey, targetValue]) => {
      console.log('[handleFieldChange] Setting:', targetKey, '=', targetValue);
      if (Array.isArray(targetValue)) {
        formModel.value[targetKey] = JSON.parse(JSON.stringify(targetValue));
      } else {
        formModel.value[targetKey] = targetValue;
      }
    });
    console.log('[handleFieldChange] Preset applied!');
  }
  // Also check legacy PRESETS for backwards compatibility
  else if (PRESETS[value]) {
    Object.entries(PRESETS[value]).forEach(([targetKey, targetValue]) => {
      if (Array.isArray(targetValue)) {
        formModel.value[targetKey] = JSON.parse(JSON.stringify(targetValue));
      } else {
        formModel.value[targetKey] = targetValue;
      }
    });
  } else {
    console.log('[handleFieldChange] No preset found for value:', value);
  }
  
  // Also check if the 'key' itself has specific presets defined in schema
  const item = allItems.value.find(i => i.key === key);
  if (item?.presets && item.presets[value]) {
     Object.entries(item.presets[value]).forEach(([targetKey, targetValue]) => {
        formModel.value[targetKey] = targetValue;
     });
  }
}

function getOptions(options?: string[] | { label: string; value: string }[]) {
  if (!options) return [];
  if (typeof options[0] === 'string') {
    return (options as string[]).map(opt => ({ label: opt, value: opt }));
  }
  return options as { label: string; value: string }[];
}

function moveItem(key: string, index: number | string, direction: 'up' | 'down') {
  const list = formModel.value[key];
  if (!Array.isArray(list)) return;
  const idx = Number(index);
  
  const newIndex = direction === 'up' ? idx - 1 : idx + 1;
  if (newIndex < 0 || newIndex >= list.length) return;
  
  const item = list.splice(idx, 1)[0];
  list.splice(newIndex, 0, item);
  formModel.value[key] = [...list];
}

function addPrizeItem(key: string) {
  if (!Array.isArray(formModel.value[key])) formModel.value[key] = [];
  formModel.value[key].push({ icon: '🎁', label: 'New Prize', weight: 10, color: '#3b82f6', value: 0, isJackpot: false, isLose: false });
}

function removePrizeItem(key: string, index: number | string) {
  const idx = Number(index);
  formModel.value[key].splice(idx, 1);
}

function autoBalance(key: string) {
    const list = formModel.value[key];
    if (!Array.isArray(list) || list.length === 0) return;
    
    const count = list.length;
    const share = Math.floor(100 / count);
    const remainder = 100 - (share * count);
    
    list.forEach((item, i) => {
        item.weight = share + (i < remainder ? 1 : 0);
    });
}

const getIcon = (tabName: string) => {
  switch (tabName) {
    case 'prizes': return '🎯';
    case 'rules': return '📜';
    case 'visuals': return '🎨';
    case 'ux': return '🧠';
    case 'embed': return '🔗';
    default: return '⚙️';
  }
};

function getItemLabel(item: SchemaItem) {
    const { te, t } = useI18n();

    // 1. Try translating the label itself (handles i18n keys used as labels)
    if (te(item.label)) return t(item.label);

    // 2. Try constructed keys from item.key across different scopes
    const scopes = ['rules', 'visuals', 'common'];
    for (const scope of scopes) {
        const key = `page.manage.game.${scope}.${item.key}`;
        if (te(key)) return t(key);
    }

    // 3. Special case for legacy switch-groups
    if (item.type === 'switch-group') {
        const groupKey = `page.manage.game.rules.${item.key.replace('_bools', '')}`;
        if (te(groupKey)) return t(groupKey);
        
        const visualGroupKey = `page.manage.game.visuals.${item.key.replace('_bools', '')}`;
        if (te(visualGroupKey)) return t(visualGroupKey);
    }
    
    return item.label;
}

function getSubItemLabel(sub: { key: string; label: string }) {
    const { te, t } = useI18n();
    
    // Check in order of specificity
    const scopes = ['effects', 'rules', 'visuals', 'prizes', 'common'];
    for (const scope of scopes) {
        const key = `page.manage.game.${scope}.${sub.key}`;
        if (te(key)) return t(key);
    }
    
    return sub.label;
}

const getEmbedCode = () => {
    return `<iframe\n  src="${window.location.origin}/games/spin-wheel?hideUI=true"\n  width="100%"\n  height="800"\n  frameborder="0"\n></iframe>`;
}

function getContrastColor(hexcolor: string) {
    // If invalid hex, default to black
    if (!hexcolor || !hexcolor.startsWith('#')) return '#000000';
    
    // Convert to RGB
    const r = parseInt(hexcolor.substring(1, 3), 16);
    const g = parseInt(hexcolor.substring(3, 5), 16);
    const b = parseInt(hexcolor.substring(5, 7), 16);
    
    // Calculate luma
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    return yiq >= 128 ? '#000000' : '#ffffff';
}

// Font list for Google Fonts preloading
const GOOGLE_FONTS = [
    'Orbitron',
    'Press Start 2P',
    'Bangers',
    'Bungee',
    'Russo One',
    'Black Ops One',
    'Righteous',
    'Permanent Marker',
    'Creepster',
    'Lobster'
];

// Preload Google Fonts on mount
onMounted(() => {
    // Check if fonts already loaded
    const existingLink = document.querySelector('link[data-font-preview]');
    if (!existingLink) {
        // Add preconnect for faster font loading
        const preconnect = document.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = 'https://fonts.gstatic.com';
        preconnect.crossOrigin = 'anonymous';
        document.head.appendChild(preconnect);

        const link = document.createElement('link');
        link.setAttribute('data-font-preview', 'true');
        link.rel = 'stylesheet';
        // Format: family=Font+Name:wght@400;700 for proper loading
        const fontParams = GOOGLE_FONTS.map(f => {
            const encoded = f.replace(/ /g, '+');
            // Some fonts need specific weights
            if (f === 'Press Start 2P') return `family=${encoded}`;
            return `family=${encoded}:wght@400;700;900`;
        }).join('&');
        link.href = `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
        document.head.appendChild(link);
        console.log('[ConfigForm] Loading Google Fonts:', link.href);

        // Inject CSS classes for font previews (in case inline styles don't work)
        const style = document.createElement('style');
        style.setAttribute('data-font-preview-styles', 'true');
        style.textContent = GOOGLE_FONTS.map(f => {
            const className = f.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return `.font-${className} { font-family: "${f}", sans-serif !important; }`;
        }).join('\n');
        document.head.appendChild(style);
    }
});

// Helper to get font family from value
function getFontFamily(fontValue: string, label?: string): string {
    const isSpecialOption = fontValue.toLowerCase() === 'custom' || fontValue.toLowerCase().includes('upload') || fontValue.toLowerCase().includes('default');
    
    const matchedFont = GOOGLE_FONTS.find(f => 
        fontValue.includes(f) || 
        (label && label.includes(f)) ||
        fontValue === f
    );
    
    return matchedFont 
        ? `'${matchedFont}', sans-serif` 
        : (isSpecialOption ? 'inherit' : `'${fontValue}', 'Orbitron', sans-serif`);
}

// Get CSS class name for font
function getFontClass(fontName: string): string {
    return 'font-' + fontName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Custom render function for font options with preview (dropdown items)
function renderFontOption(option: { label: string; value: string }) {
    const fontValue = option?.value || '';
    const label = option?.label || fontValue;
    const isSpecialOption = fontValue.toLowerCase() === 'custom' || fontValue.toLowerCase().includes('upload') || fontValue.toLowerCase().includes('default');
    
    // Find matching Google font (case-insensitive, handle labels with descriptions)
    const matchedFont = GOOGLE_FONTS.find(f => 
        fontValue.toLowerCase().includes(f.toLowerCase()) || 
        label.toLowerCase().includes(f.toLowerCase()) ||
        fontValue.toLowerCase() === f.toLowerCase()
    );
    
    const fontFamily = matchedFont 
        ? `"${matchedFont}", sans-serif` 
        : (isSpecialOption ? 'inherit' : `"${fontValue}", "Orbitron", sans-serif`);
    
    const fontClass = matchedFont ? getFontClass(matchedFont) : '';
    
    console.log('[renderFontOption]', { label, fontValue, matchedFont, fontFamily, fontClass });
    
    return h('div', {
        class: ['font-preview-option', fontClass],
        style: {
            fontFamily: fontFamily,
            fontSize: '16px',
            padding: '8px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minHeight: '32px',
            lineHeight: '1.4'
        }
    }, [
        // Font name displayed in its own style
        h('span', { 
            class: fontClass,
            style: { flex: 1, fontFamily: fontFamily }
        }, label),
        // Preview text for actual fonts  
        !isSpecialOption ? h('span', { 
            class: fontClass,
            style: { 
                opacity: 0.6, 
                fontSize: '14px', 
                fontFamily: fontFamily, 
                color: '#888' 
            }
        }, 'AaBb 测试') : null
    ]);
}

// Render selected font value with its actual font style
function renderFontTag(props: { option: { label: string; value: string } }) {
    const fontValue = props.option?.value || '';
    const label = props.option?.label || fontValue;
    
    const matchedFont = GOOGLE_FONTS.find(f => 
        fontValue.toLowerCase().includes(f.toLowerCase()) || 
        label.toLowerCase().includes(f.toLowerCase()) ||
        fontValue.toLowerCase() === f.toLowerCase()
    );
    
    const fontFamily = matchedFont 
        ? `"${matchedFont}", sans-serif` 
        : `"${fontValue}", "Orbitron", sans-serif`;
    
    const fontClass = matchedFont ? getFontClass(matchedFont) : '';
    
    return h('span', {
        class: fontClass,
        style: { fontFamily: fontFamily, fontSize: '14px' }
    }, label);
}

// Check if a select field is a font selector by examining its options
function isFontSelect(item: SchemaItem): boolean {
    if (!item.options) return false;
    
    // Check if key contains font-related words
    const keyLower = item.key.toLowerCase();
    const isFont = keyLower.includes('font');
    
    // Check if options contain known font names
    const opts = getOptions(item.options);
    const fontKeywords = ['Orbitron', 'Bangers', 'Bungee', 'Russo', 'Lobster', 'Press Start', 'Righteous', 'Creepster', 'Permanent Marker', 'Black Ops'];
    
    const hasKeyword = opts.some(opt => 
        fontKeywords.some(font => 
            opt.label?.includes(font) || opt.value?.includes(font)
        )
    );
    
    const result = isFont || hasKeyword;
    // Always log for debugging
    console.log('[isFontSelect]', item.key, '→', result, { isFont, hasKeyword });
    return result;
}

</script>

<template>
  <NForm label-placement="top" :show-feedback="false">
    <template v-if="isTabbed">
      <NTabs type="line" animated class="mb-4">
        <NTabPane v-for="tab in (schema as TabSchema[])" :key="tab.name" :name="tab.name">
          <template #tab>
            <NSpace :size="6" align="center">
              <span class="text-16px">{{ getIcon(tab.name) }}</span>
              <span class="font-medium">{{ t(`page.manage.game.tabs.${tab.name}`) || tab.label }}</span>
            </NSpace>
          </template>
          <div class="py-6 px-1">
             <!-- Special Layout for Prize Tab -->
             <div v-if="tab.name === 'prizes'" class="space-y-6">
                 <!-- Stats Header -->
                 <div class="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 flex-wrap">
                     <div class="flex flex-col min-w-120px">
                         <span class="text-xs text-gray-500 font-bold tracking-wider">{{ t('page.manage.game.common.totalProbability') }} ✓</span>
                         <span :class="['text-2xl font-black tabular-nums', getTotalChance('prizeList') === 100 ? 'text-green-500' : 'text-red-500']">
                             {{ getTotalChance('prizeList') }}%
                         </span>
                     </div>
                      <div class="w-px h-10 bg-gray-200 hidden sm:block"></div>
                      <div class="flex flex-col min-w-150px">
                         <span class="text-xs text-gray-500 uppercase font-bold tracking-wider">{{ t('page.manage.game.common.expectedValue') }}</span>
                         <span class="text-2xl font-black text-gray-700 tabular-nums">${{ getExpectedValue('prizeList') }}</span>
                     </div>
                     <div class="flex-1"></div>
                     <NSpace align="center">
                        <!-- Template Selector -->
                         <div class="w-200px">
                            <NSelect 
                                placeholder="Select Template..." 
                                :options="templateOptions"
                                @update:value="(val) => handleTemplateChange('prizeList', val)"
                            />
                         </div>
                        
                        <NButton dashed size="medium" class="rounded-lg px-4 font-bold" @click="autoBalance('prizeList')">
                            ⚖️ {{ t('page.manage.game.common.balance') }}
                        </NButton>
                        <NButton type="primary" size="medium" class="rounded-lg px-6 font-bold" @click="addPrizeItem('prizeList')">
                            + {{ t('common.add') }}
                        </NButton>
                     </NSpace>
                 </div>

                 <!-- Render only the prize-list items from this tab -->
                 <div v-for="item in tab.items" :key="item.key">
                     <!-- Prize List Editor -->
                     <div v-if="item.type === 'prize-list'" class="flex flex-col gap-3">
                        <div 
                            v-for="(p, idx) in formModel[item.key]" 
                            :key="idx" 
                            class="flex flex-wrap md:flex-nowrap items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 group relative bg-white hover:shadow-lg"
                            :style="{ borderColor: p.color + '40', backgroundColor: p.color + '05' }"
                        >
                              <!-- Drag Handle/Order -->
                              <div class="flex flex-col gap-1 text-gray-400">
                                   <button class="hover:text-primary transition-colors text-10px" @click="moveItem(item.key, idx, 'up')" :disabled="idx===0">▲</button>
                                   <button class="hover:text-primary transition-colors text-10px" @click="moveItem(item.key, idx, 'down')">▼</button>
                              </div>
                             
                              <!-- Color Picker & Hex Input -->
                               <div class="w-160px flex-shrink-0">
                                   <NColorPicker
                                      v-model:value="p.color"
                                      :show-alpha="false"
                                      :actions="['confirm']"
                                      size="small"
                                      class="font-mono font-bold text-center justify-center"
                                      :render-label="() => p.color"
                                      :style="{
                                          '--n-color': p.color,
                                          '--n-text-color': getContrastColor(p.color),
                                          '--n-border': '1px solid ' + p.color,
                                          backgroundColor: p.color,
                                          color: getContrastColor(p.color)
                                      }"
                                   />
                               </div>

                              <!-- Icon / Image -->
                              <div class="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden group/icon relative">
                                  <img v-if="p.icon && (p.icon.startsWith('http') || p.icon.startsWith('/'))" :src="p.icon" class="w-full h-full object-contain p-1" />
                                  <NInput v-else v-model:value="p.icon" :bordered="false" class="text-center p-0" />
                                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" @click="triggerUpload(item.key, p)">
                                      <span class="text-white text-14px">📁</span>
                                  </div>
                              </div>

                              <!-- Label -->
                              <div class="flex-grow min-w-150px">
                                  <NInput v-model:value="p.label" :placeholder="t('page.manage.game.common.prizeName')" round />
                              </div>

                              <!-- Value -->
                              <div class="w-120px flex-shrink-0">
                                  <NInputGroup>
                                    <NInputGroupLabel>$</NInputGroupLabel>
                                    <NInputNumber v-model:value="p.value" :show-button="false" placeholder="0" />
                                  </NInputGroup>
                              </div>

                              <!-- Probability Slider -->
                              <div class="flex-1 min-w-250px px-4 flex items-center gap-4">
                                  <NSlider v-model:value="p.weight" :step="1" :min="0" :max="100" class="flex-1" :tooltip="false">
                                      <template #thumb>
                                          <div class="w-4 h-4 rounded-full shadow-sm border-2 border-white" :style="{ backgroundColor: p.color }"></div>
                                      </template>
                                  </NSlider>
                                  <div class="w-20">
                                      <NInputNumber v-model:value="p.weight" size="small" :show-button="false">
                                          <template #suffix>%</template>
                                      </NInputNumber>
                                  </div>
                              </div>

                              <!-- Prize Type Toggles -->
                              <div class="flex items-center gap-3 flex-shrink-0">
                                  <NTooltip>
                                      <template #trigger>
                                          <div class="flex items-center gap-1">
                                              <span class="text-xs">💎</span>
                                              <NSwitch v-model:value="p.isJackpot" size="small" @update:value="(val) => { if(val) p.isLose = false; }" />
                                          </div>
                                      </template>
                                      Jackpot Prize
                                  </NTooltip>
                                  <NTooltip>
                                      <template #trigger>
                                          <div class="flex items-center gap-1">
                                              <span class="text-xs">😢</span>
                                              <NSwitch v-model:value="p.isLose" size="small" @update:value="(val) => { if(val) p.isJackpot = false; }" />
                                          </div>
                                      </template>
                                      Lose / Try Again
                                  </NTooltip>
                              </div>

                              <!-- Active Toggle -->
                              <NSwitch size="small" :default-value="true" />

                              <!-- Actions -->
                              <NButton quaternary circle type="error" @click="removePrizeItem(item.key, idx)">
                                  ✕
                              </NButton>
                        </div>
                     </div>
                     <!-- Render other items normally -->
                     <template v-else>
                         <!-- Normal rendering fallback below -->
                     </template>
                 </div>
             </div>

             <!-- Grid Layout for Other Tabs -->
             <NGrid v-else :x-gap="24" :y-gap="24" :cols="24">
              <template v-for="item in tab.items" :key="item.key">
                <NGridItem :span="item.span || 24" v-if="checkCondition(item)">
                
                <!-- Section Group (Switch Group) -->
                <div v-if="item.type === 'switch-group'" class="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <div class="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wide">{{ getItemLabel(item) }}</div>
                    <div class="space-y-4">
                        <div v-for="sub in item.items" :key="sub.key" class="flex items-center justify-between">
                            <span class="font-medium text-gray-700">{{ getSubItemLabel(sub) }}</span>
                            <NSwitch v-model:value="formModel[sub.key]" />
                        </div>
                    </div>
                </div>

                <!-- VIP Grid -->
                <div v-else-if="item.type === 'vip-grid'" class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-700">{{ getItemLabel(item) }}</div>
                    <div class="grid grid-cols-4 divide-x divide-gray-100">
                        <div v-for="(tier, idx) in formModel[item.key]" :key="idx" class="p-4 flex flex-col gap-3">
                            <div class="font-bold text-center text-primary mb-2">{{ tier.name }}</div>
                            <div class="text-xs text-gray-500">Multiplier</div>
                            <NInputNumber v-model:value="tier.multiplier" size="small" :step="0.1" />
                            <div class="text-xs text-gray-500">Extra Spins</div>
                            <NInputNumber v-model:value="tier.extraSpins" size="small" :step="1" />
                        </div>
                    </div>
                </div>

                <!-- Time Limit Config -->
                <div v-else-if="item.type === 'time-limit'" class="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <div class="flex items-center justify-between mb-4">
                         <div class="text-sm font-bold text-gray-500 uppercase tracking-wide">{{ getItemLabel(item) }}</div>
                         <NSwitch v-model:value="formModel[item.key].enable" size="medium" />
                    </div>
                    
                    <div v-if="formModel[item.key]?.enable" class="space-y-4 animate-fade-in">
                        <div>
                             <div class="mb-2 text-gray-700 font-medium">{{ getSubItemLabel({ key: 'activeDays', label: 'Active Days' }) }}</div>
                             <NCheckboxGroup v-model:value="formModel[item.key].activeDays">
                                 <NSpace item-style="display: flex;">
                                     <NCheckbox :value="1" :label="t('page.manage.game.rules.days.mon')" />
                                     <NCheckbox :value="2" :label="t('page.manage.game.rules.days.tue')" />
                                     <NCheckbox :value="3" :label="t('page.manage.game.rules.days.wed')" />
                                     <NCheckbox :value="4" :label="t('page.manage.game.rules.days.thu')" />
                                     <NCheckbox :value="5" :label="t('page.manage.game.rules.days.fri')" />
                                     <NCheckbox :value="6" :label="t('page.manage.game.rules.days.sat')" />
                                     <NCheckbox :value="0" :label="t('page.manage.game.rules.days.sun')" />
                                 </NSpace>
                             </NCheckboxGroup>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                             <div>
                                 <div class="mb-2 text-gray-700 font-medium">{{ getSubItemLabel({ key: 'startTime', label: 'Start Time' }) }}</div>
                                 <NTimePicker v-model:formatted-value="formModel[item.key].startTime" value-format="HH:mm" format="HH:mm" />
                             </div>
                             <div>
                                  <div class="mb-2 text-gray-700 font-medium">{{ getSubItemLabel({ key: 'endTime', label: 'End Time' }) }}</div>
                                  <NTimePicker v-model:formatted-value="formModel[item.key].endTime" value-format="HH:mm" format="HH:mm" />
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Dynamic Probability Config -->
                <div v-else-if="item.type === 'dynamic-prob'" class="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <div class="flex items-center justify-between mb-4">
                         <div class="text-sm font-bold text-gray-500 uppercase tracking-wide">{{ getItemLabel(item) }}</div>
                         <NSwitch v-model:value="formModel[item.key].enable" size="medium" />
                    </div>
                    
                    <div v-if="formModel[item.key]?.enable" class="grid grid-cols-2 gap-4 animate-fade-in">
                         <div>
                             <div class="mb-2 text-gray-700 font-medium">{{ getSubItemLabel({ key: 'lossStreakLimit', label: 'Loss Streak Limit' }) }}</div>
                             <NInputNumber v-model:value="formModel[item.key].lossStreakLimit" :show-button="false" />
                         </div>
                         <div>
                              <div class="mb-2 text-gray-700 font-medium">{{ getSubItemLabel({ key: 'lossStreakBonus', label: 'Loss Streak Bonus' }) }}</div>
                              <NInputNumber v-model:value="formModel[item.key].lossStreakBonus" :show-button="false">
                                  <template #suffix>%</template>
                              </NInputNumber>
                         </div>
                    </div>
                </div>

                <!-- Budget Control Config -->
                <div v-else-if="item.type === 'budget-control'" class="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <div class="flex items-center justify-between mb-4">
                         <div class="text-sm font-bold text-gray-500 uppercase tracking-wide">{{ getItemLabel(item) }}</div>
                         <NSwitch v-model:value="formModel[item.key].enable" size="medium" />
                    </div>
                    
                    <div v-if="formModel[item.key]?.enable" class="grid grid-cols-2 gap-4 animate-fade-in">
                         <div>
                             <div class="mb-2 text-gray-700 font-medium">{{ getSubItemLabel({ key: 'dailyBudget', label: 'Daily Budget' }) }}</div>
                             <NInputNumber v-model:value="formModel[item.key].dailyBudget" :show-button="false">
                                 <template #suffix>$</template>
                             </NInputNumber>
                         </div>
                         <div>
                              <div class="mb-2 text-gray-700 font-medium">{{ getSubItemLabel({ key: 'monthlyBudget', label: 'Monthly Budget' }) }}</div>
                              <NInputNumber v-model:value="formModel[item.key].monthlyBudget" :show-button="false">
                                  <template #suffix>$</template>
                              </NInputNumber>
                         </div>
                    </div>
                </div>

                <!-- Embed Code -->
                <div v-else-if="item.type === 'embed-code'">
                     <NAlert type="info" title="Embed Integration" class="mb-3">
                         Copy this code to your website to embed the game.
                     </NAlert>
                     <div class="relative group">
                         <div class="absolute right-2 top-2">
                             <NButton size="tiny" secondary type="primary">Copy</NButton>
                         </div>
                         <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">{{ getEmbedCode() }}</pre>
                     </div>
                </div>
                
                 <!-- Collapse Group (New) -->
                <div v-else-if="item.type === 'collapse-group'" class="w-full">
                     <NCollapse arrow-placement="right">
                        <NCollapseItem :title="getItemLabel(item)" :name="item.key">
                            <div class="p-4 bg-gray-50 rounded-b-xl border border-t-0 border-gray-100">
                                <NGrid :x-gap="24" :y-gap="16" :cols="24">
                                    <template v-for="subItem in item.items" :key="subItem.key">
                                        <NGridItem :span="subItem.span || 24" v-if="checkCondition(subItem)">
                                             <!-- RECURSIVE FIELD RENDERING (Simplified for this depth) -->
                                             <NFormItem :label="getItemLabel(subItem)" :path="subItem.key">
                                                <template #label><span class="font-bold text-gray-700 text-sm">{{ getItemLabel(subItem) }}</span></template>
                                                
                                                <NRadioGroup v-if="subItem.type === 'radio'" v-model:value="formModel[subItem.key]" :name="subItem.key">
                                                   <NSpace>
                                                      <NRadio v-for="opt in getOptions(subItem.options)" :key="opt.value" :value="opt.value" :label="opt.label" />
                                                   </NSpace>
                                                </NRadioGroup>

                                                <NColorPicker v-else-if="subItem.type === 'color'" v-model:value="formModel[subItem.key]" :show-alpha="false" />
                                                
                                                <div v-else-if="subItem.type === 'slider'" class="flex items-center gap-4 w-full">
                                                    <NSlider v-model:value="formModel[subItem.key]" :min="subItem.min" :max="subItem.max" :step="subItem.step" class="flex-1" />
                                                    <NInputNumber v-model:value="formModel[subItem.key]" size="small" class="w-20" :show-button="false">
                                                        <template v-if="subItem.suffix" #suffix>{{ subItem.suffix }}</template>
                                                    </NInputNumber>
                                                </div>

                                                <NSelect 
                                                  v-else-if="subItem.type === 'select'" 
                                                  v-model:value="formModel[subItem.key]" 
                                                  :options="getOptions(subItem.options)"
                                                  :render-label="isFontSelect(subItem) ? renderFontOption : undefined"
                                                  :render-tag="isFontSelect(subItem) ? renderFontTag : undefined"
                                                />
                                                
                                                <NInput v-else-if="subItem.type === 'image'" v-model:value="formModel[subItem.key]" :placeholder="getItemLabel(subItem)">
                                                    <template #suffix>
                                                        <NSpace size="small">
                                                            <NButton v-if="formModel[subItem.key]" size="tiny" quaternary type="error" @click="clearAsset(subItem.key)">🗑️</NButton>
                                                            <NButton size="tiny" quaternary @click="triggerUpload(subItem.key, subItem.key, 'branding')">📁</NButton>
                                                        </NSpace>
                                                    </template>
                                                </NInput>
                                                
                                                <NSwitch v-else-if="subItem.type === 'switch'" v-model:value="formModel[subItem.key]" />

                                                <!-- Audio Files with 3 Modes (nested in collapse-group) -->
                                                <div v-else-if="subItem.type === 'file' && isAudioField(subItem.key)" class="space-y-3">
                                                  <NRadioGroup :value="getAudioMode(subItem.key)" @update:value="(val) => setAudioMode(subItem.key, val)">
                                                    <NSpace>
                                                      <NRadio value="theme">
                                                        <span class="text-sm">🎵 使用主题默认音效</span>
                                                      </NRadio>
                                                      <NRadio value="custom">
                                                        <span class="text-sm">📤 自定义上传</span>
                                                      </NRadio>
                                                      <NRadio value="none">
                                                        <span class="text-sm">🔇 不使用音效</span>
                                                      </NRadio>
                                                    </NSpace>
                                                  </NRadioGroup>
                                                  
                                                  <div v-if="getAudioMode(subItem.key) === 'custom'" class="space-y-2">
                                                    <NInput 
                                                      :value="formModel[subItem.key] === '__CUSTOM_PENDING__' ? '' : formModel[subItem.key]" 
                                                      placeholder="请上传音效文件" 
                                                      size="small" 
                                                      readonly>
                                                      <template #prefix>🎵</template>
                                                    </NInput>
                                                    <NSpace size="small">
                                                      <NButton 
                                                        size="small" 
                                                        @click="triggerUpload(subItem.key, subItem.key, 'audio', null, 'audio/*')">
                                                        <template #icon><icon-mdi-upload /></template>
                                                        上传音效文件
                                                      </NButton>
                                                      <NButton 
                                                        v-if="formModel[subItem.key] && formModel[subItem.key] !== '__THEME_DEFAULT__' && formModel[subItem.key] !== '__CUSTOM_PENDING__'" 
                                                        size="small" 
                                                        quaternary
                                                        @click="() => toggleAudioPreview(`custom_${subItem.key}`, formModel[subItem.key])">
                                                        {{ getPreviewButtonText(`custom_${subItem.key}`, false) }}
                                                      </NButton>
                                                    </NSpace>
                                                    <div class="text-xs text-gray-500">
                                                      💡 文件将保存到您的专属文件夹，不会影响主题文件
                                                    </div>
                                                  </div>
                                                  
                                                  <div v-else-if="getAudioMode(subItem.key) === 'theme'" class="space-y-2">
                                                    <div class="text-sm text-gray-600">
                                                      当前主题：{{ formModel.visualTemplate || 'Cyberpunk Elite' }}
                                                    </div>
                                                    <NButton 
                                                      size="small" 
                                                      quaternary
                                                      @click="() => toggleAudioPreview(`theme_${subItem.key}`, getThemeAudioUrl(subItem.key))">
                                                      {{ getPreviewButtonText(`theme_${subItem.key}`, true) }}
                                                    </NButton>
                                                  </div>
                                                </div>

                                                <NInput v-else v-model:value="formModel[subItem.key]" />
                                             </NFormItem>
                                        </NGridItem>
                                    </template>
                                </NGrid>
                            </div>
                        </NCollapseItem>
                     </NCollapse>
                </div>

                <!-- Font Select with Preview -->
                <NFormItem v-else-if="item.type === 'font-select'" :label="getItemLabel(item)" :path="item.key">
                    <template #label>
                        <span class="font-bold text-gray-700 text-sm">{{ getItemLabel(item) }}</span>
                    </template>
                    <NSelect 
                        v-model:value="formModel[item.key]" 
                        :options="getOptions(item.options)"
                        size="large"
                        :render-label="renderFontOption"
                        :render-tag="renderFontTag"
                    />
                </NFormItem>

                <!-- Radio Group -->
                 <NFormItem v-else-if="item.type === 'radio'" :label="getItemLabel(item)" :path="item.key">
                    <template #label>
                        <span class="font-bold text-gray-700 text-sm">{{ getItemLabel(item) }}</span>
                    </template>
                    <NRadioGroup v-model:value="formModel[item.key]" :name="item.key">
                       <NSpace>
                          <NRadio v-for="opt in getOptions(item.options)" :key="opt.value" :value="opt.value" :label="opt.label" />
                       </NSpace>
                    </NRadioGroup>
                 </NFormItem>

                 <!-- Slider -->
                 <NFormItem v-else-if="item.type === 'slider'" :label="getItemLabel(item)" :path="item.key">
                    <template #label>
                        <span class="font-bold text-gray-700 text-sm">{{ getItemLabel(item) }}</span>
                    </template>
                    <div class="flex items-center gap-4 w-full">
                        <NSlider v-model:value="formModel[item.key]" :min="item.min" :max="item.max" :step="item.step" class="flex-1" />
                        <NInputNumber v-model:value="formModel[item.key]" size="small" class="w-20" :show-button="false">
                            <template v-if="item.suffix" #suffix>{{ item.suffix }}</template>
                        </NInputNumber>
                    </div>
                 </NFormItem>

                <!-- Standard Fields -->
                <NFormItem v-else :label="getItemLabel(item)" :path="item.key">
                  <template #label>
                    <span class="font-bold text-gray-700 text-sm">{{ getItemLabel(item) }}</span>
                  </template>
                  
                  <NInputNumber v-if="item.type === 'number'" v-model:value="formModel[item.key]" class="w-full" :show-button="false" size="large">
                       <template v-if="item.suffix" #suffix>{{ item.suffix }}</template>
                  </NInputNumber>
                  
                  <NColorPicker v-else-if="item.type === 'color'" v-model:value="formModel[item.key]" :show-alpha="false" />
                  
                  <NSelect 
                    v-else-if="item.type === 'select'" 
                    v-model:value="formModel[item.key]" 
                    :options="getOptions(item.options)" 
                    @update:value="val => handleFieldChange(item.key, val)" 
                    size="large"
                    :render-label="isFontSelect(item) ? renderFontOption : undefined"
                    :render-tag="isFontSelect(item) ? renderFontTag : undefined"
                  />
                  
                  <NInput v-else-if="item.type === 'image'" v-model:value="formModel[item.key]" :placeholder="getItemLabel(item)" size="large">
                    <template #suffix>
                        <NSpace size="small">
                            <NButton v-if="formModel[item.key]" size="tiny" quaternary type="error" @click="clearAsset(item.key)">
                                🗑️
                            </NButton>
                            <NButton size="tiny" quaternary @click="triggerUpload(item.key, item.key, 'branding')">
                                📁
                            </NButton>
                        </NSpace>
                    </template>
                  </NInput>
                  
                  <!-- Audio Files with 3 Modes -->
                  <div v-else-if="item.type === 'file' && isAudioField(item.key)" class="space-y-3">
                    <NRadioGroup :value="getAudioMode(item.key)" @update:value="(val) => setAudioMode(item.key, val)">
                      <NSpace>
                        <NRadio value="theme">
                          <span class="text-sm">🎵 使用主题默认音效</span>
                        </NRadio>
                        <NRadio value="custom">
                          <span class="text-sm">📤 自定义上传</span>
                        </NRadio>
                        <NRadio value="none">
                          <span class="text-sm">🔇 不使用音效</span>
                        </NRadio>
                      </NSpace>
                    </NRadioGroup>
                    
                    <!-- Show current file when custom mode -->
                    <div v-if="getAudioMode(item.key) === 'custom'" class="space-y-2">
                      <NInput 
                        :value="formModel[item.key] === '__CUSTOM_PENDING__' ? '' : formModel[item.key]" 
                        placeholder="请上传音效文件" 
                        size="small" 
                        readonly>
                        <template #prefix>🎵</template>
                      </NInput>
                      <NSpace size="small">
                        <NButton 
                          size="small" 
                          @click="triggerUpload(item.key, item.key, 'audio', null, 'audio/*')">
                          <template #icon><icon-mdi-upload /></template>
                          上传音效文件
                        </NButton>
                        <NButton 
                          v-if="formModel[item.key] && formModel[item.key] !== '__THEME_DEFAULT__' && formModel[item.key] !== '__CUSTOM_PENDING__'" 
                          size="small" 
                          quaternary
                          @click="() => toggleAudioPreview(`custom_${item.key}`, formModel[item.key])">
                          {{ getPreviewButtonText(`custom_${item.key}`, false) }}
                        </NButton>
                      </NSpace>
                      <div class="text-xs text-gray-500">
                        💡 文件将保存到您的专属文件夹，不会影响主题文件
                      </div>
                    </div>
                    
                    <!-- Show theme preview when theme mode -->
                    <div v-else-if="getAudioMode(item.key) === 'theme'" class="space-y-2">
                      <div class="text-sm text-gray-600">
                        当前主题：{{ formModel.visualTemplate || 'Cyberpunk Elite' }}
                      </div>
                      <NButton 
                        size="small" 
                        quaternary
                        @click="() => toggleAudioPreview(`theme_${item.key}`, getThemeAudioUrl(item.key))">
                        {{ getPreviewButtonText(`theme_${item.key}`, true) }}
                      </NButton>
                    </div>
                  </div>
                  
                  <!-- Non-Audio Files (Fonts, etc.) -->
                  <NInput v-else-if="item.type === 'file'" v-model:value="formModel[item.key]" :placeholder="getItemLabel(item)" size="large" readonly>
                    <template #prefix>📄</template>
                    <template #suffix>
                        <NSpace size="small">
                            <NButton v-if="formModel[item.key]" size="tiny" quaternary type="error" @click="clearAsset(item.key)">
                                🗑️
                            </NButton>
                            <NButton 
                              size="tiny" 
                              quaternary 
                              @click="triggerUpload(item.key, item.key, 'fonts', null, '.ttf,.otf,.woff,.woff2')">
                                <template #icon><icon-mdi-upload /></template>
                                Upload Font
                            </NButton>
                        </NSpace>
                    </template>
                  </NInput>

                  <NInput v-else v-model:value="formModel[item.key]" :placeholder="getItemLabel(item)" size="large" />
                </NFormItem>

                </NGridItem>
              </template>
            </NGrid>
          </div>
        </NTabPane>
      </NTabs>
    </template>
    
    <template v-else>
      <!-- Non-tabbed fallback layout (omitted for brevity, assume similar updates if needed) -->
      <NGrid :x-gap="24" :y-gap="16" :cols="24">
        <!-- ... -->
      </NGrid>
    </template>
  </NForm>
  
  <input type="file" ref="uploadRef" class="hidden" :accept="currentUploadTarget?.accept || 'image/*'" :key="currentUploadTarget?.accept" @change="handleFileChange" />
</template>
