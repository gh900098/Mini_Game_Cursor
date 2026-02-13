<script setup lang="tsx">
import { ref, reactive, onMounted } from 'vue';
import { NCard, NDataTable, NButton, NInput, NForm, NFormItem, NSelect, NTag, NSpace, NPopconfirm, NModal } from 'naive-ui';
import { $t } from '@/locales';
import { useMessage } from 'naive-ui';
import { fetchGetPrizeTypes, fetchCreatePrizeType, fetchUpdatePrizeType, fetchDeletePrizeType } from '@/service/api/prizes';
import EmojiPicker from '@/components/common/EmojiPicker.vue';

// I'll need to implement the API service for this, or use the base generic one if it exists
// For now I'll mock the fetching and saving logic or assume a service exists

const message = useMessage();

const loading = ref(false);
const showModal = ref(false);
const editMode = ref(false);

const strategies = [
  { label: $t('page.manage.prizeTypes.strategies.manual_fulfill'), value: 'manual_fulfill' },
  { label: $t('page.manage.prizeTypes.strategies.balance_credit'), value: 'balance_credit' },
  { label: $t('page.manage.prizeTypes.strategies.external_hook'), value: 'external_hook' },
  { label: $t('page.manage.prizeTypes.strategies.virtual_code'), value: 'virtual_code' },
];

const formModel = reactive({
  id: '',
  name: '',
  slug: '',
  strategy: 'manual_fulfill',
  icon: '🎁',
  description: '',
  config: '{}',
});

const data = ref<any[]>([]);

async function init() {
  loading.value = true;
  const { data: res, error } = await fetchGetPrizeTypes();
  if (!error) {
    data.value = res;
  }
  loading.value = false;
}

onMounted(() => {
  init();
});

const columns = [
  { title: $t('page.manage.prizeTypes.icon'), key: 'icon', width: 60, render: (row: any) => row.icon },
  { title: $t('page.manage.prizeTypes.name'), key: 'name' },
  { title: $t('page.manage.prizeTypes.slug'), key: 'slug' },
  { 
    title: $t('page.manage.prizeTypes.strategy'), 
    key: 'strategy',
    render: (row: any) => {
        const strategy = strategies.find(s => s.value === row.strategy);
        return <NTag type="info">{strategy?.label || row.strategy}</NTag>;
    }
  },
  { title: $t('page.manage.prizeTypes.description'), key: 'description' },
  {
    title: $t('common.action'),
    key: 'actions',
    width: 150,
    render: (row: any) => (
      <NSpace>
        <NButton size="small" onClick={() => handleEdit(row)}>{$t('common.edit')}</NButton>
        <NPopconfirm onPositiveClick={() => handleDelete(row.slug)}>
          {{
            trigger: () => <NButton size="small" type="error" ghost>{$t('common.delete')}</NButton>,
            default: () => $t('common.confirmDelete')
          }}
        </NPopconfirm>
      </NSpace>
    )
  }
];

function handleAdd() {
  editMode.value = false;
  Object.assign(formModel, {
    id: '',
    name: '',
    slug: '',
    strategy: 'manual_fulfill',
    icon: '🎁',
    description: '',
    config: '{}',
  });
  showModal.value = true;
}

function handleEdit(row: any) {
  editMode.value = true;
  Object.assign(formModel, {
      ...row,
      config: typeof row.config === 'object' ? JSON.stringify(row.config, null, 2) : row.config
  });
  showModal.value = true;
}

async function handleDelete(slug: string) {
  const { error } = await fetchDeletePrizeType(slug);
  if (!error) {
    message.success($t('common.deleteSuccess'));
    init();
  }
}

async function handleSave() {
    let configObj = {};
    try {
        configObj = JSON.parse(formModel.config || '{}');
    } catch (e) {
        message.error('Invalid JSON in config');
        return;
    }

    const submitData = {
        ...formModel,
        config: configObj
    };

    if (editMode.value) {
        const { error } = await fetchUpdatePrizeType(formModel.slug, submitData);
        if (!error) {
            message.success($t('common.modifySuccess'));
            showModal.value = false;
            init();
        }
    } else {
        const { error } = await fetchCreatePrizeType(submitData);
        if (!error) {
            message.success($t('common.addSuccess'));
            showModal.value = false;
            init();
        }
    }
}

</script>

<template>
  <div class="h-full">
    <NCard :title="$t('page.manage.prizeTypes.title')" :bordered="false" size="small" class="shadow-sm rounded-16px">
      <template #header-extra>
        <NButton type="primary" secondary @click="handleAdd">
          <template #icon>
            <icon-ic:baseline-add />
          </template>
          {{ $t('page.manage.prizeTypes.add') }}
        </NButton>
      </template>
      <NSpace vertical :size="16">
        <NDataTable
          :columns="columns"
          :data="data"
          :loading="loading"
          :bordered="false"
        />
      </NSpace>
    </NCard>

    <NModal v-model:show="showModal" preset="card" :title="editMode ? $t('page.manage.prizeTypes.edit') : $t('page.manage.prizeTypes.add')" class="w-600px">
      <NForm :model="formModel" label-placement="left" :label-width="120">
        <div class="grid grid-cols-24 gap-16px">
          <div class="col-span-14">
            <NFormItem :label="$t('page.manage.prizeTypes.name')" path="name">
              <NInput v-model:value="formModel.name" />
            </NFormItem>
          </div>
          <div class="col-span-10">
            <NFormItem :label="$t('page.manage.prizeTypes.icon')" path="icon" :label-width="50">
              <EmojiPicker v-model:value="formModel.icon" />
            </NFormItem>
          </div>
        </div>
        <NFormItem :label="$t('page.manage.prizeTypes.slug')" path="slug" :disabled="editMode">
          <NInput v-model:value="formModel.slug" />
        </NFormItem>
        <NFormItem :label="$t('page.manage.prizeTypes.strategy')" path="strategy">
          <NSelect v-model:value="formModel.strategy" :options="strategies" />
        </NFormItem>
        <NFormItem :label="$t('page.manage.prizeTypes.description')" path="description">
          <NInput v-model:value="formModel.description" type="textarea" />
        </NFormItem>
        <NFormItem :label="$t('page.manage.prizeTypes.config')" path="config">
          <NInput v-model:value="formModel.config" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" placeholder='{"webhookUrl": "..."}' />
        </NFormItem>
        <div class="flex justify-end gap-12px">
          <NButton @click="showModal = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSave">{{ $t('common.confirm') }}</NButton>
        </div>
      </NForm>
    </NModal>
  </div>
</template>

<style scoped></style>
