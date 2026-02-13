<template>
  <div class="h-full flex-col-stretch gap-16px overflow-hidden">
    <NCard title="Prize Management" :bordered="false" size="small" class="flex-col-stretch sm:flex-1-hidden card-wrapper">
      <template #header-extra>
        <NSpace>
          <NSelect
            v-model:value="statusFilter"
            placeholder="Status"
            :options="statusOptions"
            clearable
            style="width: 150px"
            @update:value="loadData"
          />
          <NButton type="primary" @click="loadData">Refresh</NButton>
        </NSpace>
      </template>

      <NDataTable
        :columns="columns"
        :data="data"
        :loading="loading"
        :pagination="pagination"
        remote
        class="flex-1-hidden"
      />
    </NCard>

    <NModal v-model:show="showUpdateModal" title="Update Prize Status" preset="card" style="width: 600px">
      <!-- Prize Details Section -->
      <div v-if="currentPrize" class="mb-20px p-16px bg-gray-50 rounded-8px border border-gray-200">
        <div class="text-sm font-bold text-gray-600 mb-12px">Prize Details</div>
        <div class="flex gap-16px">
          <!-- Prize Image/Icon -->
          <div class="flex-shrink-0">
            <NImage
              v-if="getPrizeIcon(currentPrize)?.isImage"
              :src="getPrizeIcon(currentPrize).value"
              width="60"
              height="60"
              class="rounded shadow-sm"
              :preview-disabled="false"
            />
            <div v-else class="text-4xl">{{ getPrizeIcon(currentPrize)?.value || '🎁' }}</div>
          </div>
          
          <!-- Prize Info -->
          <div class="flex-1">
            <div class="font-bold text-lg mb-4px">{{ getPrizeName(currentPrize) }}</div>
            <div class="mb-8px">
              <component :is="renderPrizeType(currentPrize)" />
            </div>
            <div v-if="currentPrize.metadata?.config?.description" class="text-sm text-gray-600 mb-4px">
              {{ currentPrize.metadata.config.description }}
            </div>
            <div class="text-xs text-gray-500">
              <div><strong>Member:</strong> {{ currentPrize.member?.username }} ({{ currentPrize.member?.id?.split('-')[0] }}...)</div>
              <div><strong>Game:</strong> {{ currentPrize.instance?.name }}</div>
              <div><strong>Current Status:</strong> {{ currentPrize.status.toUpperCase() }}</div>
            </div>
          </div>
        </div>
      </div>

      <NForm :model="updateForm" label-placement="left" label-width="80">
        <NFormItem label="Status" path="status">
          <NSelect v-model:value="updateForm.status" :options="statusOptions" />
        </NFormItem>
        
        <!-- Receipt Upload Section - Show only for fulfilled/shipped -->
        <NFormItem 
          v-if="updateForm.status === 'fulfilled' || updateForm.status === 'shipped'"
          label="Receipt" 
          path="receipt"
        >
          <div class="w-full">
            <NUpload
              :max="1"
              accept="image/*,.pdf"
              :custom-request="handleReceiptUpload"
              @before-upload="beforeReceiptUpload"
              :show-file-list="false"
            >
              <NButton :loading="uploadingReceipt">
                {{ updateForm.receipt ? 'Change Receipt' : 'Upload Receipt/Proof' }}
              </NButton>
            </NUpload>
            <div v-if="updateForm.receipt" class="mt-8px">
              <div class="flex items-center gap-8px text-sm">
                <span class="text-green-600">✓ Receipt uploaded</span>
                <NButton text type="primary" size="tiny" @click="viewReceipt">View</NButton>
                <NButton text type="error" size="tiny" @click="removeReceipt">Remove</NButton>
              </div>
            </div>
            <div v-else-if="currentPrize?.metadata?.receipt" class="mt-8px">
              <div class="flex items-center gap-8px text-sm text-gray-500">
                <span>Existing receipt on file</span>
                <NButton text type="primary" size="tiny" @click="viewExistingReceipt">View</NButton>
              </div>
            </div>
            <div class="text-xs text-gray-400 mt-4px">
              Optional. Accepts images (jpg, png) or PDF up to 5MB
            </div>
          </div>
        </NFormItem>
        
        <NFormItem label="Note" path="note">
          <NInput v-model:value="updateForm.note" type="textarea" placeholder="Optional fulfillment note" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showUpdateModal = false">Cancel</NButton>
          <NButton type="primary" :loading="updating" @click="submitStatusUpdate">Save</NButton>
        </NSpace>
      </template>
    </NModal>

  </div>
</template>

<script setup lang="tsx">
import { ref, onMounted, reactive } from 'vue';
import { NTag, NButton, NSpace, NSelect, NModal, NForm, NFormItem, NInput, NCard, NDataTable, NImage, NUpload } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { request } from '@/service/request';
import { $t } from '@/locales';

const { loading, startLoading, endLoading } = useLoading();
const data = ref<any[]>([]);
const statusFilter = ref<string | null>(null);
const showUpdateModal = ref(false);
const updating = ref(false);
const uploadingReceipt = ref(false);
const currentPrize = ref<any>(null);

const prizeTypesMap = ref<Record<string, any>>({});

async function loadPrizeTypes() {
  const { data: types } = await fetchGetPrizeTypes();
  if (types) {
    const map: Record<string, any> = {};
    types.forEach(t => {
      map[t.slug] = t;
    });
    prizeTypesMap.value = map;
  }
}

const updateForm = reactive({
  status: 'pending',
  note: '',
  receipt: ''
});

const statusOptions = [
  { label: $t('page.manage.prizes.status_pending'), value: 'pending' },
  { label: $t('page.manage.prizes.status_claimed'), value: 'claimed' },
  { label: $t('page.manage.prizes.status_fulfilled'), value: 'fulfilled' },
  { label: $t('page.manage.prizes.status_shipped'), value: 'shipped' },
  { label: $t('page.manage.prizes.status_rejected'), value: 'rejected' }
];

const pagination = reactive({
  page: 1,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (page: number) => {
    pagination.page = page;
    loadData();
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    loadData();
  }
});

const columns = [
  {
    title: $t('page.manage.prizes.time'),
    key: 'createdAt',
    width: 170,
    render(row: any) {
      return <span>{new Date(row.createdAt).toLocaleString()}</span>;
    }
  },
  {
    title: $t('page.manage.prizes.member'),
    key: 'member',
    render(row: any) {
      return (
        <div>
          <div class="font-medium">{row.member?.username}</div>
          <div class="text-xs text-gray-400">{row.member?.id?.split('-')[0]}...</div>
        </div>
      );
    }
  },
  {
    title: $t('page.manage.prizes.image'),
    key: 'image',
    width: 80,
    render(row: any) {
      const icon = row.metadata?.config?.icon;
      if (icon && (icon.startsWith('http') || icon.startsWith('/api/uploads'))) {
        return (
          <NImage
            width="40"
            src={icon}
            preview-disabled={false}
            class="rounded shadow-sm cursor-pointer"
          />
        );
      }
      return <span class="text-2xl">{icon || '🎁'}</span>;
    }
  },
  {
    title: $t('page.manage.prizes.prize'),
    key: 'prizeName',
    width: 200,
    render(row: any) {
      let name = row.prizeName;
      if (typeof name === 'string' && (name.startsWith('http') || name.includes('/api/uploads'))) {
        name = row.metadata?.config?.label || 'Image Prize';
      }
      return (
        <div>
          <div class="font-medium text-15px">{name}</div>
        </div>
      );
    }
  },
  {
    title: $t('page.manage.prizes.type'),
    key: 'prizeType',
    width: 120,
    render(row: any) {
      const typeSlug = String(row.prizeType || '').toLowerCase(); // Normalize to lowercase
      const typeInfo = prizeTypesMap.value[typeSlug];

      if (typeInfo) {
         return <NTag size="small" vertical-align="middle">{typeInfo.icon} {typeInfo.name}</NTag>;
      }

      // Fallback for legacy static types if not found in DB
      const typeMap: any = {
        physical: { tag: 'warning', label: $t('page.manage.prizes.type_physical') },
        bonus_credit: { tag: 'success', label: $t('page.manage.prizes.type_bonus_credit') },
        virtual: { tag: 'info', label: $t('page.manage.prizes.type_virtual') },
        points: { tag: 'default', label: 'Points' }
      };
      
      const config = typeMap[typeSlug] || { tag: 'default', label: typeSlug };
      return <NTag type={config.tag} size="small" vertical-align="middle">{config.label}</NTag>;
    }
  },
  {
    title: $t('page.manage.prizes.details'),
    key: 'details',
    render(row: any) {
      const description = row.metadata?.config?.description;
      const note = row.metadata?.note;
      const value = Number(row.prizeValue);
      const showValue = row.prizeType !== 'physical' && row.prizeType !== 'points' && value > 0;

      return (
        <div class="max-w-220px">
          {description && <div class="text-sm leading-tight mb-4px">{description}</div>}
          {showValue && (
            <div class="inline-block px-4px py-1px bg-gray-100 text-gray-600 rounded text-11px font-bold">
              Value: {value.toFixed(2)}
            </div>
          )}
          {note && <div class="text-xs text-primary italic mt-1">Note: {note}</div>}
          {!description && !showValue && !note && <div class="text-xs text-gray-400">--</div>}
        </div>
      );
    }
  },
  {
    title: $t('page.manage.prizes.gameInstance'),
    key: 'instance',
    render(row: any) {
      return (
        <div>
          <div class="text-sm">{row.instance?.name}</div>
          <div class="text-xs text-gray-400">{row.instance?.company?.name}</div>
        </div>
      );
    }
  },
  {
    title: $t('page.manage.prizes.status'),
    key: 'status',
    render(row: any) {
      const statusMap: any = {
        pending: 'warning',
        claimed: 'info',
        fulfilled: 'success',
        shipped: 'success',
        rejected: 'error'
      };
      return <NTag type={statusMap[row.status] || 'default'}>{row.status.toUpperCase()}</NTag>;
    }
  },
  {
    title: $t('page.manage.prizes.actions'),
    key: 'actions',
    width: 100,
    render(row: any) {
      return (
        <NButton size="tiny" type="primary" ghost onClick={() => openUpdate(row)}>
          {$t('common.operate')}
        </NButton>
      );
    }
  }
];

import { fetchGetPrizes } from '@/service/api/management';
import { fetchGetPrizeTypes } from '@/service/api/prizes';

async function loadData() {
  startLoading();
  try {
    const params: any = {};
    if (statusFilter.value) params.status = statusFilter.value;
    
    const { data: resData } = await fetchGetPrizes(params);
    data.value = resData || [];
  } finally {
    endLoading();
  }
}

function openUpdate(prize: any) {
  currentPrize.value = prize;
  updateForm.status = prize.status;
  updateForm.note = prize.metadata?.note || '';
  updateForm.receipt = ''; // Reset receipt for new upload
  showUpdateModal.value = true;
}

// Helper functions for prize details display
function getPrizeIcon(prize: any) {
  const icon = prize.metadata?.config?.icon;
  if (icon && (icon.startsWith('http') || icon.startsWith('/api/uploads'))) {
    return { isImage: true, value: icon };
  }
  return { isImage: false, value: icon || '🎁' };
}

function getPrizeName(prize: any) {
  let name = prize.prizeName;
  if (typeof name === 'string' && (name.startsWith('http') || name.includes('/api/uploads'))) {
    name = prize.metadata?.config?.label || 'Image Prize';
  }
  return name;
}

function renderPrizeType(prize: any) {
  const typeSlug = String(prize.prizeType || '').toLowerCase();
  const typeInfo = prizeTypesMap.value[typeSlug];

  if (typeInfo) {
    return <NTag size="small">{typeInfo.icon} {typeInfo.name}</NTag>;
  }

  // Fallback for legacy types
  const typeMap: any = {
    physical: { tag: 'warning', label: $t('page.manage.prizes.type_physical') },
    bonus_credit: { tag: 'success', label: $t('page.manage.prizes.type_bonus_credit') },
    virtual: { tag: 'info', label: $t('page.manage.prizes.type_virtual') },
    points: { tag: 'default', label: 'Points' }
  };
  
  const config = typeMap[typeSlug] || { tag: 'default', label: typeSlug };
  return <NTag type={config.tag} size="small">{config.label}</NTag>;
}

// Receipt upload handlers
function beforeReceiptUpload(data: { file: any }) {
  const file = data.file.file;
  const isImage = file?.type?.startsWith('image/');
  const isPDF = file?.type === 'application/pdf';
  
  if (!isImage && !isPDF) {
    window.$message?.error('Only images (jpg, png) or PDF files are allowed!');
    return false;
  }
  
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isLt5M) {
    window.$message?.error('File size must be smaller than 5MB!');
    return false;
  }
  
  return true;
}

async function handleReceiptUpload(options: { file: any; onFinish: () => void; onError: () => void }) {
  const formData = new FormData();
  formData.append('file', options.file.file);
  
  uploadingReceipt.value = true;
  try {
    const response = await request({
      url: `/admin/prizes/${currentPrize.value.id}/receipt`,
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (response.data?.url) {
      updateForm.receipt = response.data.url;
      window.$message?.success('Receipt uploaded successfully');
      options.onFinish();
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    window.$message?.error('Failed to upload receipt');
    options.onError();
  } finally {
    uploadingReceipt.value = false;
  }
}

function viewReceipt() {
  if (updateForm.receipt) {
    window.open(updateForm.receipt, '_blank');
  }
}

function removeReceipt() {
  updateForm.receipt = '';
  window.$message?.info('Receipt removed. Remember to save changes.');
}

function viewExistingReceipt() {
  if (currentPrize.value?.metadata?.receipt) {
    window.open(currentPrize.value.metadata.receipt, '_blank');
  }
}

async function submitStatusUpdate() {
  if (!currentPrize.value) return;
  updating.value = true;
  try {
    const metadata: any = { note: updateForm.note };
    
    // Include receipt in metadata if uploaded or keep existing
    if (updateForm.receipt) {
      metadata.receipt = updateForm.receipt;
    } else if (currentPrize.value.metadata?.receipt) {
      // Keep existing receipt if no new one uploaded
      metadata.receipt = currentPrize.value.metadata.receipt;
    }
    
    await request({
      url: `/admin/prizes/${currentPrize.value.id}/status`,
      method: 'patch',
      data: {
        status: updateForm.status,
        metadata
      }
    });
    window.$message?.success($t('common.modifySuccess'));
    showUpdateModal.value = false;
    loadData();
  } finally {
    updating.value = false;
  }
}


onMounted(() => {
  loadPrizeTypes();
  loadData();
});
</script>

<style scoped></style>
