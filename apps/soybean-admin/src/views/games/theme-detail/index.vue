<script setup lang="tsx">
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { NCard, NForm, NFormItem, NInput, NInputNumber, NSwitch, NButton, NSpace, NColorPicker, NGrid, NGridItem, NScrollbar, NTabs, NTabPane, NTag, NTooltip, NRadioGroup, NRadio, NModal, NSelect } from 'naive-ui';
import { fetchThemeDetail, createTheme, updateTheme } from '@/service/api/themes';
import { useRouterPush } from '@/hooks/common/router';
import { $t } from '@/locales';
import { request } from '@/service/request';
import SvgIcon from '@/components/custom/svg-icon.vue';

const route = useRoute();
const { routerPush } = useRouterPush();
const action = route.query.action as 'create' | 'edit';
const themeId = route.query.id as string;

const loading = ref(false);
const submitting = ref(false);
const formRef = ref<InstanceType<typeof NForm> | null>(null);

interface ThemeConfig {
  bgType: string;
  bgGradStart: string;
  bgGradEnd: string;
  bgGradDir: string;
  themeColor: string;
  secondaryColor: string;
  bgmUrl: string;
  winSound: string;
  pointerImage: string;
  wheelBorderImage: string;
  spinBtnImage: string;
  titleImage: string;
  centerImage: string;
  ledColor1: string;
  ledColor2: string;
  ledColor3: string;
  neonCyan: string;
  neonPink: string;
  neonPurple: string;
  neonGold: string;
  enableLedRing: boolean;
  enableHexagons: boolean;
  enableGridFloor: boolean;
  dividerImage: string;
  tokenBarImage: string;
  resultWinBackground: string;
  resultWinTitleImage: string;
  resultWinButtonImage: string;
  resultLoseBackground: string;
  resultLoseTitleImage: string;
  resultLoseButtonImage: string;
  jackpotResultBackground: string;
  jackpotResultTitleImage: string;
  jackpotResultButtonImage: string;
  loseSound?: string;
  jackpotSound?: string;
  tickSoundEnabled?: boolean;
  tickVolume?: number;
  bgmVolume?: number;
  bgmLoop?: boolean;
  [key: string]: any;
}

const formData = ref<{
  name: string;
  slug: string;
  description: string;
  gameTemplateSlug: string;
  isPremium: boolean;
  price: number;
  isActive: boolean;
  config: ThemeConfig;
}>({
  name: '',
  slug: '',
  description: '',
  gameTemplateSlug: 'spin-wheel',
  isPremium: false,
  price: 0,
  isActive: true,
  config: {
    bgType: 'gradient',
    bgGradStart: '#0a0a12',
    bgGradEnd: '#1a1a2e',
    bgGradDir: '135deg',
    themeColor: '#00f5ff',
    secondaryColor: '#ff00ff',
    bgmUrl: '',
    winSound: '',
    pointerImage: '',
    wheelBorderImage: '',
    spinBtnImage: '',
    titleImage: '',
    centerImage: '',
    ledColor1: '#00f5ff',
    ledColor2: '#ff00ff',
    ledColor3: '#ffd700',
    neonCyan: '#00f5ff',
    neonPink: '#ff00ff',
    neonPurple: '#9d00ff',
    neonGold: '#ffd700',
    enableLedRing: true,
    enableHexagons: true,
    enableGridFloor: true,
    dividerImage: '',
    tokenBarImage: '',
    resultWinBackground: '',
    resultWinTitleImage: '',
    resultWinButtonImage: '',
    resultLoseBackground: '',
    resultLoseTitleImage: '',
    resultLoseButtonImage: '',
    jackpotResultBackground: '',
    jackpotResultTitleImage: '',
    jackpotResultButtonImage: '',
    loseSound: '',
    jackpotSound: '',
    tickSoundEnabled: true,
    tickVolume: 30,
    bgmVolume: 40,
    bgmLoop: true
  }
});

const rules = {
  name: [{ required: true, message: $t('form.required'), trigger: 'blur' }],
  slug: [{ required: true, message: $t('form.required'), trigger: 'blur' }],
  gameTemplateSlug: [{ required: true, message: $t('form.required'), trigger: 'blur' }]
};

// --- Upload Logic ---
const uploadRef = ref<HTMLInputElement | null>(null);
const currentUploadTarget = ref<{ key: string; category: string } | null>(null);

async function triggerUpload(key: string, category: string = 'themes') {
  currentUploadTarget.value = { key, category };
  await nextTick();
  if (uploadRef.value) {
    uploadRef.value.value = '';
    uploadRef.value.click();
  }
}

async function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !currentUploadTarget.value) return;

  const body = new FormData();
  body.append('instanceId', `common-themes/${formData.value.slug || 'theme'}`);
  body.append('category', currentUploadTarget.value.category);
  body.append('customName', currentUploadTarget.value.key);
  body.append('file', file);

  const { data, error } = await request<{ url: string }>({
    url: '/game-instances/upload',
    method: 'post',
    data: body,
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  if (!error && data?.url) {
    formData.value.config[currentUploadTarget.value.key] = data.url;
    window.$message?.success($t('common.updateSuccess'));
  }
}

async function clearAsset(key: string) {
  const currentUrl = formData.value.config[key];
  if (currentUrl) {
    // Physically delete the file from the server
    await request({
      url: '/game-instances/upload',
      method: 'delete',
      data: { url: currentUrl }
    }).catch(() => {
      // Silently ignore deletion errors (file may already be gone)
    });
  }
  formData.value.config[key] = '';
  if (key === 'bgImage') {
    formData.value.config.bgType = 'gradient';
  }
}

function getAssetFilename(url: any): string {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:')) return 'Base64 Image';
  try {
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  } catch (e) {
    return url;
  }
}

const showAssetPreviewModal = ref(false);
const assetPreviewUrl = ref('');
const assetPreviewTitle = ref('');

function openAssetPreview(url: string, title: string) {
  assetPreviewUrl.value = url;
  assetPreviewTitle.value = title;
  showAssetPreviewModal.value = true;
}

// --- Data Loading ---
async function loadData() {
  if (action === 'edit' && themeId) {
    loading.value = true;
    try {
      const response = await fetchThemeDetail(themeId);
      if (response.data) {
        formData.value = {
          name: response.data.name,
          slug: response.data.slug,
          description: response.data.description || '',
          gameTemplateSlug: response.data.gameTemplateSlug,
          isPremium: response.data.isPremium,
          price: Number(response.data.price) || 0,
          isActive: response.data.isActive,
          config: { ...formData.value.config, ...(response.data.config as any) }
        };
      }
    } finally {
      loading.value = false;
    }
  }
}

async function handleSubmit() {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    if (action === 'create') {
      await createTheme(formData.value as any);
      window.$message?.success($t('common.addSuccess'));
    } else {
      await updateTheme(themeId, formData.value as any);
      window.$message?.success($t('common.updateSuccess'));
    }
    routerPush({ name: 'games_themes' });
  } finally {
    submitting.value = false;
  }
}

function handleBack() {
  routerPush({ name: 'games_themes' });
}

// --- Preview Logic ---
const previewIframe = ref<HTMLIFrameElement | null>(null);
const previewUrl = computed(() => {
  return `/api/game-instances/spin-wheel/play?isPreview=true&theme=${formData.value.slug}`;
});

function syncPreview() {
  if (previewIframe.value?.contentWindow) {
    previewIframe.value.contentWindow.postMessage({
      type: 'sync-config',
      config: JSON.parse(JSON.stringify(formData.value.config))
    }, '*');
  }
}

watch(() => formData.value.config, () => {
  syncPreview();
}, { deep: true });

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="h-full flex-col-stretch gap-16px overflow-hidden p-16px">
    <NCard 
      :title="action === 'create' ? $t('page.manage.themes.add') : `${$t('page.manage.themes.edit')}: ${formData.name}`" 
      :bordered="false" 
      size="small" 
      class="h-full card-wrapper flex-col-stretch min-h-0 max-h-[calc(100vh-100px)]"
      content-style="flex: 1; display: flex; flex-direction: column; overflow: hidden; padding-bottom: 0; min-height: 0;"
    >
      <template #header-extra>
        <NSpace>
          <NButton @click="handleBack">{{ $t('page.manage.themes.back') }}</NButton>
          <NButton type="primary" :loading="submitting" @click="handleSubmit">
            <template #icon><SvgIcon icon="material-symbols:save" /></template>
            {{ $t('page.manage.themes.save') }}
          </NButton>
        </NSpace>
      </template>

      <div class="flex h-full gap-16px overflow-hidden min-h-0">
        <!-- Editor Side -->
        <div class="flex-1 overflow-hidden h-full flex flex-col min-h-0">
          <div class="flex-1 overflow-hidden h-full flex flex-col min-h-0">
            <NForm
              ref="formRef"
              :model="formData"
              :rules="rules"
              label-placement="top"
              require-mark-placement="right-hanging"
              class="h-full flex flex-col"
            >
              <NTabs type="line" animated class="flex-1 overflow-hidden flex flex-col" pane-class="flex-1 overflow-hidden">
                <NTabPane name="basic" :tab="$t('page.manage.themes.basicInfo')">
                  <NScrollbar class="pr-12px max-h-full">
                  <NGrid :cols="2" :x-gap="16">
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.themes.name')" path="name">
                        <NInput v-model:value="formData.name" placeholder="E.g., Zeus Mount Olympus" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.themes.slug')" path="slug">
                        <NInput v-model:value="formData.slug" placeholder="zeus-mount-olympus" :disabled="action === 'edit'" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem :span="2">
                      <NFormItem label="Description" path="description">
                        <NInput v-model:value="formData.description" type="textarea" placeholder="Theme description..." />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem label="Game Template" path="gameTemplateSlug">
                        <NInput v-model:value="formData.gameTemplateSlug" placeholder="spin-wheel" disabled />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.themes.status')">
                        <NSpace>
                          <NTag :type="formData.isActive ? 'success' : 'error'">{{ formData.isActive ? $t('page.manage.user.status.enable') : $t('page.manage.user.status.disable') }}</NTag>
                          <NSwitch v-model:value="formData.isActive" />
                        </NSpace>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.themes.isPremium')">
                        <NSwitch v-model:value="formData.isPremium" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="formData.isPremium">
                      <NFormItem :label="$t('page.manage.themes.price')" path="price">
                        <NInputNumber v-model:value="formData.price" :min="0" :step="0.01" style="width: 100%" />
                      </NFormItem>
                    </NGridItem>
                  </NGrid>
                  </NScrollbar>
                </NTabPane>

                <NTabPane name="visuals" :tab="$t('page.manage.themes.visualStyles')">
                   <NScrollbar class="pr-12px max-h-full">
                  <NGrid :cols="2" :x-gap="16">
                    <NGridItem :span="2">
                      <div class="font-bold mb-8px border-b pb-4px mb-16px text-primary">{{ $t('page.manage.themes.mainColors') }}</div>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem label="Primary Theme Color">
                        <NColorPicker v-model:value="formData.config.themeColor" :actions="['confirm']" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem label="Secondary Color">
                        <NColorPicker v-model:value="formData.config.secondaryColor" :actions="['confirm']" />
                      </NFormItem>
                    </NGridItem>

                    <NGridItem :span="2">
                      <div class="font-bold mb-8px border-b pb-4px mb-16px text-primary mt-8px">{{ $t('page.manage.themes.bgSettings') }}</div>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.bgType')">
                        <NRadioGroup v-model:value="formData.config.bgType">
                          <NSpace>
                            <NRadio value="gradient">Gradient</NRadio>
                            <NRadio value="image">Image</NRadio>
                            <NRadio value="color">Solid</NRadio>
                          </NSpace>
                        </NRadioGroup>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="formData.config.bgType === 'gradient'">
                      <NFormItem :label="$t('page.manage.game.visuals.bgGradDir')">
                        <NSelect v-model:value="formData.config.bgGradDir" :options="[
                          { label: 'Top to Bottom', value: 'to bottom' },
                          { label: 'Left to Right', value: 'to right' },
                          { label: 'Bottom Left to Top Right', value: '135deg' },
                          { label: 'Top Left to Bottom Right', value: '45deg' },
                          { label: 'Radial (Center)', value: 'radial' }
                        ]" />
                      </NFormItem>
                    </NGridItem>
                    
                    <NGridItem v-if="formData.config.bgType === 'gradient'">
                      <NFormItem :label="$t('page.manage.game.visuals.bgGradStart')">
                        <NColorPicker v-model:value="formData.config.bgGradStart" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="formData.config.bgType === 'gradient'">
                      <NFormItem :label="$t('page.manage.game.visuals.bgGradEnd')">
                        <NColorPicker v-model:value="formData.config.bgGradEnd" />
                      </NFormItem>
                    </NGridItem>

                    <NGridItem v-if="formData.config.bgType === 'image'" :span="2">
                      <NFormItem :label="$t('page.manage.game.visuals.bgImage')">
                        <NInput :value="getAssetFilename(formData.config.bgImage)" size="small" readonly>
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.bgImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.bgImage, $t('page.manage.game.visuals.bgImage'))">👁️</NButton>
                              <NButton v-if="formData.config.bgImage" size="tiny" quaternary type="error" @click="clearAsset('bgImage')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('bgImage', 'backgrounds')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>

                    <NGridItem :span="2">
                      <div class="font-bold mb-8px border-b pb-4px mb-16px text-primary mt-8px">{{ $t('page.manage.themes.gameAssets') }}</div>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.brandLogo')">
                        <NInput :value="getAssetFilename(formData.config.titleImage)" size="small" readonly>
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.titleImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.titleImage, $t('page.manage.game.visuals.brandLogo'))">👁️</NButton>
                              <NButton v-if="formData.config.titleImage" size="tiny" quaternary type="error" @click="clearAsset('titleImage')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('titleImage', 'logos')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.pointer')">
                        <NInput :value="getAssetFilename(formData.config.pointerImage)" size="small" readonly>
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.pointerImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.pointerImage, $t('page.manage.game.visuals.pointer'))">👁️</NButton>
                              <NButton v-if="formData.config.pointerImage" size="tiny" quaternary type="error" @click="clearAsset('pointerImage')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('pointerImage', 'pointers')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.wheelBorder')">
                        <NInput :value="getAssetFilename(formData.config.wheelBorderImage)" size="small" readonly>
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.wheelBorderImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.wheelBorderImage, $t('page.manage.game.visuals.wheelBorder'))">👁️</NButton>
                              <NButton v-if="formData.config.wheelBorderImage" size="tiny" quaternary type="error" @click="clearAsset('wheelBorderImage')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('wheelBorderImage', 'borders')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.spinButton')">
                        <NInput :value="getAssetFilename(formData.config.spinBtnImage)" size="small" readonly>
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.spinBtnImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.spinBtnImage, $t('page.manage.game.visuals.spinButton'))">👁️</NButton>
                              <NButton v-if="formData.config.spinBtnImage" size="tiny" quaternary type="error" @click="clearAsset('spinBtnImage')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('spinBtnImage', 'buttons')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.tokenBarSection')">
                        <NInput :value="getAssetFilename(formData.config.tokenBarImage)" size="small" readonly>
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.tokenBarImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.tokenBarImage, $t('page.manage.game.visuals.tokenBarSection'))">👁️</NButton>
                              <NButton v-if="formData.config.tokenBarImage" size="tiny" quaternary type="error" @click="clearAsset('tokenBarImage')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('tokenBarImage', 'ui')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.centerHubSection')">
                        <NInput :value="getAssetFilename(formData.config.centerImage)" size="small" readonly>
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.centerImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.centerImage, $t('page.manage.game.visuals.centerHubSection'))">👁️</NButton>
                              <NButton v-if="formData.config.centerImage" size="tiny" quaternary type="error" @click="clearAsset('centerImage')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('centerImage', 'hubs')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.sliceDividers')">
                        <NInput :value="getAssetFilename(formData.config.dividerImage)" size="small" readonly>
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.dividerImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.dividerImage, $t('page.manage.game.visuals.sliceDividers'))">👁️</NButton>
                              <NButton v-if="formData.config.dividerImage" size="tiny" quaternary type="error" @click="clearAsset('dividerImage')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('dividerImage', 'dividers')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem :span="2">
                      <div class="font-bold mb-8px border-b pb-4px mb-16px text-primary mt-8px">{{ $t('page.manage.game.visuals.resultPrompts') }}</div>
                    </NGridItem>
                    
                    <NGridItem :span="2"><div class="text-sm text-gray-400 mt-2 mb-1">- {{ $t('page.manage.game.visuals.winOutcome') }} -</div></NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.winBackground')">
                        <NInput :value="getAssetFilename(formData.config.resultWinBackground)" size="small" readonly>
                          <template #suffix>
                             <NSpace size="small">
                               <NButton v-if="formData.config.resultWinBackground" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.resultWinBackground, $t('page.manage.game.visuals.winBackground'))">👁️</NButton>
                               <NButton v-if="formData.config.resultWinBackground" size="tiny" quaternary type="error" @click="clearAsset('resultWinBackground')">🗑️</NButton>
                               <NButton size="tiny" quaternary @click="triggerUpload('resultWinBackground', 'prompts')">📁</NButton>
                             </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.winTitleImage')">
                        <NInput :value="getAssetFilename(formData.config.resultWinTitleImage)" size="small" readonly>
                          <template #suffix>
                             <NSpace size="small">
                               <NButton v-if="formData.config.resultWinTitleImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.resultWinTitleImage, $t('page.manage.game.visuals.winTitleImage'))">👁️</NButton>
                               <NButton v-if="formData.config.resultWinTitleImage" size="tiny" quaternary type="error" @click="clearAsset('resultWinTitleImage')">🗑️</NButton>
                               <NButton size="tiny" quaternary @click="triggerUpload('resultWinTitleImage', 'prompts')">📁</NButton>
                             </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.winButtonImage')">
                        <NInput :value="getAssetFilename(formData.config.resultWinButtonImage)" size="small" readonly>
                          <template #suffix>
                             <NSpace size="small">
                               <NButton v-if="formData.config.resultWinButtonImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.resultWinButtonImage, $t('page.manage.game.visuals.winButtonImage'))">👁️</NButton>
                               <NButton v-if="formData.config.resultWinButtonImage" size="tiny" quaternary type="error" @click="clearAsset('resultWinButtonImage')">🗑️</NButton>
                               <NButton size="tiny" quaternary @click="triggerUpload('resultWinButtonImage', 'prompts')">📁</NButton>
                             </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>

                    <NGridItem :span="2"><div class="text-sm text-gray-400 mt-2 mb-1">- {{ $t('page.manage.game.visuals.loseOutcome') }} -</div></NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.loseBackground')">
                        <NInput :value="getAssetFilename(formData.config.resultLoseBackground)" size="small" readonly>
                          <template #suffix>
                             <NSpace size="small">
                               <NButton v-if="formData.config.resultLoseBackground" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.resultLoseBackground, $t('page.manage.game.visuals.loseBackground'))">👁️</NButton>
                               <NButton v-if="formData.config.resultLoseBackground" size="tiny" quaternary type="error" @click="clearAsset('resultLoseBackground')">🗑️</NButton>
                               <NButton size="tiny" quaternary @click="triggerUpload('resultLoseBackground', 'prompts')">📁</NButton>
                             </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.loseTitleImage')">
                        <NInput :value="getAssetFilename(formData.config.resultLoseTitleImage)" size="small" readonly>
                          <template #suffix>
                             <NSpace size="small">
                               <NButton v-if="formData.config.resultLoseTitleImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.resultLoseTitleImage, $t('page.manage.game.visuals.loseTitleImage'))">👁️</NButton>
                               <NButton v-if="formData.config.resultLoseTitleImage" size="tiny" quaternary type="error" @click="clearAsset('resultLoseTitleImage')">🗑️</NButton>
                               <NButton size="tiny" quaternary @click="triggerUpload('resultLoseTitleImage', 'prompts')">📁</NButton>
                             </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.loseButtonImage')">
                        <NInput :value="getAssetFilename(formData.config.resultLoseButtonImage)" size="small" readonly>
                          <template #suffix>
                             <NSpace size="small">
                               <NButton v-if="formData.config.resultLoseButtonImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.resultLoseButtonImage, $t('page.manage.game.visuals.loseButtonImage'))">👁️</NButton>
                               <NButton v-if="formData.config.resultLoseButtonImage" size="tiny" quaternary type="error" @click="clearAsset('resultLoseButtonImage')">🗑️</NButton>
                               <NButton size="tiny" quaternary @click="triggerUpload('resultLoseButtonImage', 'prompts')">📁</NButton>
                             </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>

                    <NGridItem :span="2"><div class="text-sm text-gray-400 mt-2 mb-1">- {{ $t('page.manage.game.visuals.jackpotOutcome') }} -</div></NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.jackpotBackground')">
                        <NInput :value="getAssetFilename(formData.config.jackpotResultBackground)" size="small" readonly>
                          <template #suffix>
                             <NSpace size="small">
                               <NButton v-if="formData.config.jackpotResultBackground" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.jackpotResultBackground, $t('page.manage.game.visuals.jackpotBackground'))">👁️</NButton>
                               <NButton v-if="formData.config.jackpotResultBackground" size="tiny" quaternary type="error" @click="clearAsset('jackpotResultBackground')">🗑️</NButton>
                               <NButton size="tiny" quaternary @click="triggerUpload('jackpotResultBackground', 'prompts')">📁</NButton>
                             </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.jackpotTitleImage')">
                        <NInput :value="getAssetFilename(formData.config.jackpotResultTitleImage)" size="small" readonly>
                          <template #suffix>
                             <NSpace size="small">
                               <NButton v-if="formData.config.jackpotResultTitleImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.jackpotResultTitleImage, $t('page.manage.game.visuals.jackpotTitleImage'))">👁️</NButton>
                               <NButton v-if="formData.config.jackpotResultTitleImage" size="tiny" quaternary type="error" @click="clearAsset('jackpotResultTitleImage')">🗑️</NButton>
                               <NButton size="tiny" quaternary @click="triggerUpload('jackpotResultTitleImage', 'prompts')">📁</NButton>
                             </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.jackpotButtonImage')">
                        <NInput :value="getAssetFilename(formData.config.jackpotResultButtonImage)" size="small" readonly>
                          <template #suffix>
                             <NSpace size="small">
                               <NButton v-if="formData.config.jackpotResultButtonImage" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.jackpotResultButtonImage, $t('page.manage.game.visuals.jackpotButtonImage'))">👁️</NButton>
                               <NButton v-if="formData.config.jackpotResultButtonImage" size="tiny" quaternary type="error" @click="clearAsset('jackpotResultButtonImage')">🗑️</NButton>
                               <NButton size="tiny" quaternary @click="triggerUpload('jackpotResultButtonImage', 'prompts')">📁</NButton>
                             </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                  </NGrid>
                  </NScrollbar>
                </NTabPane>

                <NTabPane name="effects" :tab="$t('page.manage.themes.vfxAudio')">
                   <NScrollbar class="pr-12px max-h-full">
                  <NGrid :cols="2" :x-gap="16">
                    <NGridItem :span="2">
                      <div class="font-bold mb-8px border-b pb-4px mb-16px text-primary">{{ $t('page.manage.themes.audioAssets') }}</div>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.bgmUrl')">
                        <NInput :value="getAssetFilename(formData.config.bgmUrl)" size="small" readonly placeholder=".mp3 URL">
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.bgmUrl" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.bgmUrl, $t('page.manage.game.effects.bgmUrl'))">👁️</NButton>
                              <NButton v-if="formData.config.bgmUrl" size="tiny" quaternary type="error" @click="clearAsset('bgmUrl')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('bgmUrl', 'audio')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="formData.config.bgmUrl">
                      <NFormItem :label="$t('page.manage.game.effects.bgmVolume')">
                        <div class="flex items-center gap-4 w-full">
                          <NSlider v-model:value="formData.config.bgmVolume" :min="0" :max="100" :step="5" class="flex-1" />
                          <NInputNumber v-model:value="formData.config.bgmVolume" size="small" class="w-20" :show-button="false">
                            <template #suffix>%</template>
                          </NInputNumber>
                        </div>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="formData.config.bgmUrl">
                      <NFormItem :label="$t('page.manage.game.effects.bgmLoop')">
                        <NSwitch v-model:value="formData.config.bgmLoop" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem :span="2">
                      <div class="font-bold mb-8px border-b pb-4px mb-16px text-primary mt-8px">{{ $t('page.manage.game.effects.resultSounds') }}</div>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.winSound')">
                        <NInput :value="getAssetFilename(formData.config.winSound)" size="small" readonly>
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.winSound" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.winSound, $t('page.manage.game.effects.winSound'))">👁️</NButton>
                              <NButton v-if="formData.config.winSound" size="tiny" quaternary type="error" @click="clearAsset('winSound')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('winSound', 'audio')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.loseSound')">
                        <NInput :value="getAssetFilename(formData.config.loseSound)" size="small" readonly>
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.loseSound" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.loseSound, $t('page.manage.game.effects.loseSound'))">👁️</NButton>
                              <NButton v-if="formData.config.loseSound" size="tiny" quaternary type="error" @click="clearAsset('loseSound')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('loseSound', 'audio')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.jackpotSoundFile')">
                        <NInput :value="getAssetFilename(formData.config.jackpotSound)" size="small" readonly>
                          <template #suffix>
                            <NSpace size="small">
                              <NButton v-if="formData.config.jackpotSound" size="tiny" quaternary type="primary" @click="openAssetPreview(formData.config.jackpotSound, $t('page.manage.game.effects.jackpotSoundFile'))">👁️</NButton>
                              <NButton v-if="formData.config.jackpotSound" size="tiny" quaternary type="error" @click="clearAsset('jackpotSound')">🗑️</NButton>
                              <NButton size="tiny" quaternary @click="triggerUpload('jackpotSound', 'audio')">📁</NButton>
                            </NSpace>
                          </template>
                        </NInput>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.tickSound')">
                        <NSwitch v-model:value="formData.config.tickSoundEnabled" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem v-if="formData.config.tickSoundEnabled">
                      <NFormItem :label="$t('page.manage.game.effects.tickVolume')">
                        <div class="flex items-center gap-4 w-full">
                          <NSlider v-model:value="formData.config.tickVolume" :min="0" :max="100" :step="5" class="flex-1" />
                          <NInputNumber v-model:value="formData.config.tickVolume" size="small" class="w-20" :show-button="false">
                            <template #suffix>%</template>
                          </NInputNumber>
                        </div>
                      </NFormItem>
                    </NGridItem>

                    <NGridItem :span="2">
                      <div class="font-bold mb-8px border-b pb-4px mb-16px text-primary mt-8px">{{ $t('page.manage.themes.neonEffects') }}</div>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.neonCyan')">
                        <NColorPicker v-model:value="formData.config.neonCyan" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.neonPink')">
                        <NColorPicker v-model:value="formData.config.neonPink" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.neonPurple')">
                        <NColorPicker v-model:value="formData.config.neonPurple" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.neonGold')">
                        <NColorPicker v-model:value="formData.config.neonGold" />
                      </NFormItem>
                    </NGridItem>
                    
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.enableLedRing')">
                        <NSwitch v-model:value="formData.config.enableLedRing" />
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.enableGridFloor')">
                         <NSwitch v-model:value="formData.config.enableGridFloor" />
                      </NFormItem>
                    </NGridItem>
                  </NGrid>
                  </NScrollbar>
                </NTabPane>
              </NTabs>
            </NForm>
          </div>
        </div>

        <!-- Preview Side -->
        <div class="w-380px bg-gray-100 rounded-12px overflow-hidden border-4 border-gray-800 flex flex-col relative min-h-0">
          <div class="bg-gray-800 text-white p-8px text-center font-bold text-12px tracking-wider">LIVE PREVIEW</div>
          <div class="flex-1 relative bg-black">
            <iframe
              ref="previewIframe"
              :src="previewUrl"
              class="w-full h-full border-none pointer-events-none"
              title="Theme Preview"
              @load="syncPreview"
            ></iframe>
            <!-- Overlay to prevent interaction in preview mode -->
            <div class="absolute inset-0 z-10"></div>
          </div>
          <div class="p-8px bg-white border-t flex justify-center">
            <NButton size="small" ghost type="primary" @click="syncPreview">
              <template #icon><SvgIcon icon="material-symbols:refresh" /></template>
              Sync Preview
            </NButton>
          </div>
        </div>
      </div>
    </NCard>

    <!-- Hidden Upload Input -->
    <input
      ref="uploadRef"
      type="file"
      class="hidden"
      @change="handleFileChange"
    />
  </div>
</template>

<style scoped>
.card-wrapper {
  display: flex;
  flex-direction: column;
}
:deep(.n-card__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 0 !important;
  min-height: 0;
}
:deep(.n-tabs-pane-wrapper) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
:deep(.n-tab-pane) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
