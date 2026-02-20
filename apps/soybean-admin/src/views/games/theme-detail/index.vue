<script setup lang="tsx">
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { NCard, NForm, NFormItem, NInput, NInputNumber, NSwitch, NButton, NSpace, NColorPicker, NGrid, NGridItem, NScrollbar, NTabs, NTabPane, NTag, NTooltip, NRadioGroup, NRadio } from 'naive-ui';
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
    enableGridFloor: true
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
  body.append('instanceId', 'common-themes');
  body.append('category', currentUploadTarget.value.category);
  body.append('file', file);
  body.append('customName', `${formData.value.slug || 'theme'}-${currentUploadTarget.value.key}`);

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
    <NCard :title="action === 'create' ? $t('page.manage.themes.add') : `${$t('page.manage.themes.edit')}: ${formData.name}`" :bordered="false" size="small" class="h-full card-wrapper">
      <template #header-extra>
        <NSpace>
          <NButton @click="handleBack">{{ $t('page.manage.themes.back') }}</NButton>
          <NButton type="primary" :loading="submitting" @click="handleSubmit">
            <template #icon><SvgIcon icon="material-symbols:save" /></template>
            {{ $t('page.manage.themes.save') }}
          </NButton>
        </NSpace>
      </template>

      <div class="flex h-full gap-16px overflow-hidden">
        <!-- Editor Side -->
        <div class="flex-1 overflow-hidden h-full">
          <NScrollbar class="pr-12px">
            <NForm
              ref="formRef"
              :model="formData"
              :rules="rules"
              label-placement="top"
              require-mark-placement="right-hanging"
            >
              <NTabs type="line" animated>
                <NTabPane name="basic" :tab="$t('page.manage.themes.basicInfo')">
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
                </NTabPane>

                <NTabPane name="visuals" :tab="$t('page.manage.themes.visualStyles')">
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
                        <NInput v-model:value="formData.config.bgGradDir" placeholder="135deg or radial" />
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
                        <div class="flex-1 flex gap-8px">
                          <NInput v-model:value="formData.config.bgImage" placeholder="Upload or enter URL" />
                          <NButton @click="triggerUpload('bgImage', 'backgrounds')">{{ $t('page.manage.themes.upload') }}</NButton>
                        </div>
                      </NFormItem>
                    </NGridItem>

                    <NGridItem :span="2">
                      <div class="font-bold mb-8px border-b pb-4px mb-16px text-primary mt-8px">{{ $t('page.manage.themes.gameAssets') }}</div>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.brandLogo')">
                        <div class="flex-1 flex gap-4px">
                          <NInput v-model:value="formData.config.titleImage" size="small" />
                          <NButton size="small" @click="triggerUpload('titleImage', 'logos')">{{ $t('page.manage.themes.upload') }}</NButton>
                        </div>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.pointer')">
                        <div class="flex-1 flex gap-4px">
                          <NInput v-model:value="formData.config.pointerImage" size="small" />
                          <NButton size="small" @click="triggerUpload('pointerImage', 'pointers')">{{ $t('page.manage.themes.upload') }}</NButton>
                        </div>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.wheelBorder')">
                        <div class="flex-1 flex gap-4px">
                          <NInput v-model:value="formData.config.wheelBorderImage" size="small" />
                          <NButton size="small" @click="triggerUpload('wheelBorderImage', 'borders')">{{ $t('page.manage.themes.upload') }}</NButton>
                        </div>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.visuals.spinButton')">
                        <div class="flex-1 flex gap-4px">
                          <NInput v-model:value="formData.config.spinBtnImage" size="small" />
                          <NButton size="small" @click="triggerUpload('spinBtnImage', 'buttons')">{{ $t('page.manage.themes.upload') }}</NButton>
                        </div>
                      </NFormItem>
                    </NGridItem>
                  </NGrid>
                </NTabPane>

                <NTabPane name="effects" :tab="$t('page.manage.themes.vfxAudio')">
                  <NGrid :cols="2" :x-gap="16">
                    <NGridItem :span="2">
                      <div class="font-bold mb-8px border-b pb-4px mb-16px text-primary">{{ $t('page.manage.themes.audioAssets') }}</div>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.bgmUrl')">
                        <div class="flex-1 flex gap-4px">
                          <NInput v-model:value="formData.config.bgmUrl" size="small" placeholder=".mp3 URL" />
                          <NButton size="small" @click="triggerUpload('bgmUrl', 'audio')">{{ $t('page.manage.themes.upload') }}</NButton>
                        </div>
                      </NFormItem>
                    </NGridItem>
                    <NGridItem>
                      <NFormItem :label="$t('page.manage.game.effects.winSound')">
                        <div class="flex-1 flex gap-4px">
                          <NInput v-model:value="formData.config.winSound" size="small" />
                          <NButton size="small" @click="triggerUpload('winSound', 'audio')">{{ $t('page.manage.themes.upload') }}</NButton>
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
                </NTabPane>
              </NTabs>
            </NForm>
          </NScrollbar>
        </div>

        <!-- Preview Side -->
        <div class="w-380px bg-gray-100 rounded-12px overflow-hidden border-4 border-gray-800 flex flex-col relative">
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
:deep(.n-card-content) {
  flex: 1;
  overflow: hidden;
  padding-bottom: 0 !important;
}
</style>

<style scoped></style>
