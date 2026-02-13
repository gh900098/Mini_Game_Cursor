<script setup lang="tsx">
import { ref, reactive, computed } from 'vue';
import { NCard, NButton, NTag, NSpace, NModal, NForm, NFormItem, NInput, NSelect, NSwitch, NGrid, NGridItem, NEmpty, NImage, NDivider } from 'naive-ui';
import { fetchGetGameInstances, fetchCreateGameInstance, fetchUpdateGameInstance, fetchDeleteGameInstance, fetchCheckGameInstanceUsage, fetchValidateGameInstanceSlug } from '@/service/api/management';
import { fetchGetGames } from '@/service/api/game';
import { useLoading, useBoolean } from '@sa/hooks';
import { useAuthStore } from '@/store/modules/auth';
import { useNaiveForm } from '@/hooks/common/form';
import ConfigForm from './components/ConfigForm.vue';
import fallbackImage from '@/assets/imgs/soybean.jpg';

const { loading, startLoading, endLoading } = useLoading();
const { bool: visible, setTrue: openModal, setFalse: closeModal } = useBoolean();
const { bool: configVisible, setTrue: openConfig, setFalse: closeConfig } = useBoolean();
const { bool: previewVisible, setTrue: openPreview, setFalse: closePreview } = useBoolean();
const { formRef, validate } = useNaiveForm();
const authStore = useAuthStore();

const instances = ref<Api.Management.GameInstance[]>([]);
const templates = ref<Api.Game.Game[]>([]);
const isEdit = ref(false);
const editingId = ref('');
const selectedTemplate = ref<Api.Game.Game | null>(null);
const previewSlug = ref('');
const selectedSlug = ref('');

const formModel = reactive({
  name: '',
  slug: '',
  gameId: '',
  isActive: true
});

const configModel = ref<Record<string, any>>({});

const templateOptions = computed(() => templates.value.map(t => ({ label: t.name, value: t.id })));

const previewUrl = computed(() => {
  if (!previewSlug.value) return '';
  const webAppUrl = import.meta.env.VITE_WEBAPP_BASE_URL || window.location.origin.replace(':9527', ':9529');
  const companySlug = authStore.userInfo.currentCompanySlug || 'demo-company';
  return `${webAppUrl}/${companySlug}/${previewSlug.value}?isPreview=true&hideHeader=true`;
});

function getInstanceImage(item: Api.Management.GameInstance): string {
  // Helper to ensure URL has correct prefix
  const normalizeUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    if (url.startsWith('/api/uploads/')) return url;
    if (url.startsWith('uploads/')) return `/api/${url}`;
    if (url.startsWith('/uploads/')) return `/api${url}`; 
    // If it's just a filename or other path, assume it needs /api/uploads/ if it doesn't look like an absolute command
    if (!url.startsWith('/')) return `/api/uploads/${url}`;
    return url;
  };

  // 1. Try Config Background
  if (item.config?.bgImage) return normalizeUrl(item.config.bgImage);
  
  // 2. Try Config Title Image (Logo)
  if (item.config?.titleImage) return normalizeUrl(item.config.titleImage);

  // 3. Fallback to Template Thumbnail
  if (item.gameTemplate?.thumbnailUrl) {
    return normalizeUrl(item.gameTemplate.thumbnailUrl);
  }

  return '';
}

async function getData() {
  startLoading();
  const currentCompanyId = authStore.userInfo.currentCompanyId;
  const [instancesRes, templatesRes] = await Promise.all([
    fetchGetGameInstances({ companyId: currentCompanyId || undefined }),
    fetchGetGames()
  ]);
  
  if (!instancesRes.error) instances.value = instancesRes.data;
  if (!templatesRes.error) templates.value = templatesRes.data;
  endLoading();
}

function handleAdd() {
  isEdit.value = false;
  Object.assign(formModel, { name: '', slug: '', gameId: '', isActive: true });
  openModal();
}

function handleEdit(row: Api.Management.GameInstance) {
  isEdit.value = true;
  editingId.value = row.id;
  Object.assign(formModel, {
    name: row.name,
    slug: row.slug,
    gameId: row.gameId,
    isActive: row.isActive
  });
  openModal();
}

function handleConfig(row: Api.Management.GameInstance) {
  editingId.value = row.id;
  selectedSlug.value = row.slug;
  selectedTemplate.value = row.gameTemplate || null;
  configModel.value = { ...(row.config || {}) };
  openConfig();
}

function handlePreview(slug: string) {
  previewSlug.value = slug;
  openPreview();
}

async function handleSubmit() {
  await validate();

  // 1. Check slug availability
  startLoading();
  const { data: validationData, error: validationError } = await fetchValidateGameInstanceSlug({
    slug: formModel.slug,
    excludeId: isEdit.value ? editingId.value : undefined
  });
  endLoading();

  if (validationError) return;

  if (validationData && !validationData.isAvailable) {
    const suggestedSlug = validationData.suggestedSlug;
    const webAppUrl = import.meta.env.VITE_WEBAPP_BASE_URL || window.location.origin.replace(':9527', ':9529');
    const companySlug = authStore.userInfo.currentCompanySlug || 'demo-company';
    const fullUrl = `${webAppUrl}/${companySlug}/${suggestedSlug}`;

    const confirmed = await new Promise<boolean>((resolve) => {
      window.$dialog?.warning({
        title: 'Slug Already Taken',
        content: () => (
          <div class="flex flex-col gap-2 mt-2">
            <p>The slug <NTag size="small" type="error">{formModel.slug}</NTag> is already being used by another game.</p>
            <p>Would you like to use this unique suggestion instead?</p>
            <div class="bg-primary/5 p-4 rounded-12px border border-dashed border-primary/30 mt-2">
               <div class="font-bold text-primary text-18px mb-1">{suggestedSlug}</div>
               <div class="text-xs text-gray-400 break-all">{fullUrl}</div>
            </div>
            <p class="text-xs text-gray-500 mt-2 italic">You can also cancel and change the slug manually.</p>
          </div>
        ),
        positiveText: 'Use Suggestion',
        negativeText: 'Change Manually',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
        onMaskClick: () => resolve(false)
      });
    });

    if (confirmed) {
      formModel.slug = suggestedSlug;
    } else {
      return;
    }
  }

  // 2. Proceed with save
  startLoading();
  const { error } = isEdit.value 
    ? await fetchUpdateGameInstance(editingId.value, formModel)
    : await fetchCreateGameInstance(formModel);
  endLoading();

  if (!error) {
    window.$message?.success('Success');
    closeModal();
    getData();
  }
}

async function handleSaveConfig() {
  const { error } = await fetchUpdateGameInstance(editingId.value, { config: configModel.value });
  if (!error) {
    window.$message?.success('Configuration saved');
    closeConfig();
    getData();
  }
}

async function handleDelete(id: string) {
  const { data, error } = await fetchCheckGameInstanceUsage(id);
  if (error) return;

  const hasRecords = data?.hasRecords;
  const count = data?.recordCount || 0;

  window.$dialog?.create({
    title: hasRecords ? 'Archive Game Instance?' : 'Delete Game Instance?',
    type: hasRecords ? 'warning' : 'error',
    showIcon: true,
    content: () => (
      <div class="flex flex-col gap-4 mt-2">
        <div class={`p-4 rounded-lg border ${hasRecords ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <div class="flex items-center gap-3 mb-2">
            <div class={`text-24px ${hasRecords ? 'text-amber-500' : 'text-red-500'}`}>
              {hasRecords ? <icon-mdi-archive /> : <icon-mdi-alert />}
            </div>
            <div class={`font-bold text-base ${hasRecords ? 'text-amber-800' : 'text-red-800'}`}>
              {hasRecords ? 'Preserving Data Integrity' : 'Irreversible Action'}
            </div>
          </div>
          <div class={`text-sm ${hasRecords ? 'text-amber-700' : 'text-red-700'}`}>
            {hasRecords 
              ? <span>This game has <strong>{count}</strong> gameplay records.</span>
              : <span>This game has <strong>NO</strong> records.</span>
            }
          </div>
        </div>
        
        <div class="text-gray-500 text-sm leading-relaxed">
          {hasRecords 
            ? 'To prevent data loss, this instance will be marked as INACTIVE. It can be reactivated later if needed.'
            : 'Since no data is associated with this instance, it will be PERMANENTLY DELETED. This action cannot be undone.'
          }
        </div>
      </div>
    ),
    positiveText: hasRecords ? 'Archive (Safe)' : 'Delete Permanently',
    negativeText: 'Cancel',
    positiveButtonProps: { 
      type: hasRecords ? 'warning' : 'error',
      size: 'medium'
    },
    onPositiveClick: async () => {
      const { error: deleteError } = await fetchDeleteGameInstance(id);
      if (!deleteError) {
        window.$message?.success(hasRecords ? 'Game archived successfully' : 'Game deleted permanently');
        getData();
      }
    }
  });
}

getData();
</script>

<template>
  <div class="h-full flex-col p-4">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-24px font-bold">Game Marketplace</h2>
      <NButton type="primary" size="large" @click="handleAdd">
        <template #icon>
          <icon-ic-round-plus class="text-20px" />
        </template>
        Deploy New Game
      </NButton>
    </div>

    <div v-if="loading && instances.length === 0" class="flex-1 flex items-center justify-center">
      <NEmpty description="Loading instances..." />
    </div>
    
    <NGrid v-else :x-gap="16" :y-gap="16" cols="1 s:2 m:3 l:4 xl:5" responsive="screen">
      <NGridItem v-for="item in instances" :key="item.id">
        <NCard hoverable class="h-full flex flex-col rounded-16px overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <template #cover>
            <div class="h-160px overflow-hidden bg-gray-100 relative group">
              <NImage
                :src="getInstanceImage(item) || fallbackImage"
                :fallback-src="fallbackImage"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                preview-disabled
                object-fit="cover"
              />


              <!-- Admin Quick Preview Button -->
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <NButton type="primary" strong round @click="handlePreview(item.slug)">
                   <template #icon><icon-mdi-play class="text-24px" /></template>
                   Live Preview
                 </NButton>
              </div>

              <div class="absolute top-2 right-2">
                <NTag :type="item.isActive ? 'success' : 'error'" size="small" round>
                  {{ item.isActive ? 'Active' : 'Inactive' }}
                </NTag>
              </div>
            </div>
          </template>

          <div class="py-2">
            <h3 class="text-18px font-bold mb-1 truncate" :title="item.name">{{ item.name }}</h3>
            <div class="text-gray-400 text-xs mb-3 flex items-center">
              <icon-mdi-tag class="mr-1" /> {{ item.slug }}
            </div>
            
            <div class="flex items-center text-14px text-gray-600 mb-4 bg-gray-50 p-2 rounded-8px">
              <icon-mdi-office-building class="mr-2 text-primary" />
              <span class="truncate">{{ item.company?.name || 'Unknown Company' }}</span>
            </div>

            <div class="text-12px text-gray-500 mb-4 line-clamp-2 min-h-32px">
              {{ item.gameTemplate?.description || 'No description available for this game template.' }}
            </div>

            <NDivider class="!my-3" />

            <NSpace justify="space-between">
              <NSpace size="small">
                <NButton secondary size="small" type="primary" @click="handleConfig(item)">
                  <template #icon><icon-mdi-cog class="text-16px" /></template>
                  Config
                </NButton>
                <NButton quaternary size="small" circle @click="handleEdit(item)">
                  <template #icon><icon-carbon-edit /></template>
                </NButton>
              </NSpace>
              
              <NButton quaternary size="small" type="error" circle @click="handleDelete(item.id)">
                <template #icon><icon-carbon-trash-can /></template>
              </NButton>
            </NSpace>
          </div>
        </NCard>
      </NGridItem>
    </NGrid>

    <!-- Create/Edit Modal -->
    <NModal v-model:show="visible" preset="card" :title="isEdit ? 'Update Game Instance' : 'Deploy New Game'" class="w-600px rounded-16px">
      <NForm ref="formRef" :model="formModel" label-placement="left" label-width="120" class="py-4">
        <NFormItem label="Display Name" path="name">
          <NInput v-model:value="formModel.name" placeholder="e.g. Christmas Spin Wheel" />
        </NFormItem>
        <NFormItem label="Unique Slug" path="slug">
          <NInput v-model:value="formModel.slug" placeholder="e.g. christmas-wheel" :disabled="isEdit" />
          <template v-if="isEdit" #feedback>
            <span class="text-gray-400 text-xs text-secondary-500">Slug cannot be changed after creation to ensure URL stability.</span>
          </template>
        </NFormItem>
        <NFormItem label="Game Template" path="gameId">
          <NSelect v-model:value="formModel.gameId" :options="templateOptions" placeholder="Select a game base" />
        </NFormItem>
        <NFormItem label="Status" path="isActive">
          <NSpace align="center" class="mt-1">
            <NSwitch v-model:value="formModel.isActive" />
            <span class="text-gray-500 text-xs">{{ formModel.isActive ? 'Game is live' : 'Game is hidden' }}</span>
          </NSpace>
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="closeModal">Cancel</NButton>
          <NButton type="primary" @click="handleSubmit">Confirm Deployment</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- Configuration Modal -->
    <NModal 
      v-model:show="configVisible" 
      preset="card" 
      title="Game Configuration" 
      class="w-1000px rounded-16px"
      :mask-closable="false"
      :close-on-esc="false"
    >
      <div v-if="selectedTemplate">
        <!-- Header Info -->
        <div class="mb-4 flex items-center bg-primary/5 p-4 rounded-12px border border-primary/10">
          <div class="w-48px h-48px rounded-8px bg-primary/10 flex items-center justify-center mr-4">
             <icon-mdi-gamepad-variant class="text-24px text-primary" />
          </div>
          <div>
            <div class="font-bold text-16px">{{ selectedTemplate.name }}</div>
            <div class="text-xs text-gray-500">Configure parameters for this instance</div>
          </div>
        </div>

        <!-- Warning Message -->
        <div class="mb-4 flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3">
          <icon-mdi-alert class="text-warning text-20px flex-shrink-0" />
          <div class="text-sm text-warning-700">
            <span class="font-semibold">Remember:</span> Changes are previewed instantly, but you must click 
            <span class="font-bold">"Apply Changes"</span> below to save permanently.
          </div>
        </div>

        <!-- ConfigForm with internal scrolling -->
        <ConfigForm
          v-if="selectedTemplate.configSchema"
          v-model:modelValue="configModel"
          :schema="selectedTemplate.configSchema"
          :image-spec="selectedTemplate.imageSpec"
          :instance-id="editingId"
          :slug="selectedSlug"
          :company-id="authStore.userInfo.currentCompanyId || undefined"
        />
        <div v-else class="text-center py-10 text-gray-400">
          <NEmpty description="This game has no custom parameters." />
        </div>
      </div>
      <template #footer>
        <div class="border-t pt-4">
          <NSpace justify="end">
            <NButton @click="closeConfig">Cancel</NButton>
            <NButton type="primary" @click="handleSaveConfig">
              <template #icon><icon-mdi-content-save /></template>
              Apply Changes
            </NButton>
          </NSpace>
        </div>
      </template>
    </NModal>

    <!-- Game Preview Modal -->
    <NModal v-model:show="previewVisible" preset="card" title="Simulator (Whole Screen Display)" class="w-auto rounded-16px">
      <div class="flex flex-col items-center">
        <!-- Mobile Device Frame -->
        <div class="mobile-frame">
          <div class="notch"></div>
          <div class="screen">
            <iframe
              v-if="previewVisible"
              :src="previewUrl"
              class="w-full h-full border-none"
              allow="autoplay; fullscreen"
            />
          </div>
          <div class="home-indicator"></div>
        </div>
        
        <div class="mt-6 text-center text-gray-400 text-xs max-w-300px">
          Previewing in "Whole Screen Display" mode (port 9529). 
          Authentication is bypassed for admin simulation.
        </div>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  overflow: hidden;
}

.mobile-frame {
  position: relative;
  width: 360px;
  height: 740px;
  background: #111;
  border-radius: 40px;
  border: 12px solid #222;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.notch {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 150px;
  height: 25px;
  background: #222;
  border-bottom-left-radius: 15px;
  border-bottom-right-radius: 15px;
  z-index: 10;
}

.screen {
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 28px;
  overflow: hidden;
}

.home-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  z-index: 10;
}
</style>
