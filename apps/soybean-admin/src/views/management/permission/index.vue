<script setup lang="tsx">
import { ref, reactive } from 'vue';
import { NButton, NTag, NSpace, NPopconfirm, NCard, NDataTable, NModal, NForm, NFormItem, NInput } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetPermissions, fetchCreatePermission, fetchUpdatePermission, fetchDeletePermission } from '@/service/api/management';
import { useAuth } from '@/hooks/business/auth';
import { useBoolean, useLoading } from '@sa/hooks';
import { $t } from '@/locales';

const { hasAuth } = useAuth();
const { loading, startLoading, endLoading } = useLoading();
const { bool: visible, setTrue: openModal, setFalse: closeModal } = useBoolean();

const permissionData = ref<Api.Management.Permission[]>([]);
const total = ref(0);

const searchParams = reactive({
  keyword: ''
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  itemCount: 0,
  onChange: (page: number) => {
    pagination.page = page;
    getPermissions();
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    getPermissions();
  }
});

async function getPermissions() {
  startLoading();
  const { data, error } = await fetchGetPermissions({
    page: pagination.page,
    limit: pagination.pageSize,
    keyword: searchParams.keyword || undefined
  });
  
  if (!error && data) {
    if ('items' in data) {
      permissionData.value = data.items;
      total.value = data.total;
      pagination.itemCount = data.total;
    } else {
      permissionData.value = data;
      total.value = data.length;
      pagination.itemCount = data.length;
    }
  }
  endLoading();
}

function handleSearch() {
  pagination.page = 1;
  getPermissions();
}

function handleReset() {
  searchParams.keyword = '';
  handleSearch();
}

const formModel = reactive({
  id: '',
  name: '',
  slug: '',
  resource: '',
  action: '',
  description: ''
});

const isEdit = ref(false);

const columns: DataTableColumns<Api.Management.Permission> = [
  {
    title: 'Name',
    key: 'name',
    minWidth: 150
  },
  {
    title: 'Slug',
    key: 'slug',
    minWidth: 150,
    render(row) {
      return <NTag type="info">{row.slug}</NTag>;
    }
  },
  {
    title: 'Resource',
    key: 'resource',
    minWidth: 120,
    render(row) {
      return <NTag type="warning">{row.resource}</NTag>;
    }
  },
  {
    title: 'Action',
    key: 'action',
    minWidth: 100,
    render(row) {
      return <NTag type="success">{row.action}</NTag>;
    }
  },
  {
    title: 'Description',
    key: 'description',
    minWidth: 200
  },
  {
    title: 'Action',
    key: 'action_buttons',
    width: 120,
    render(row) {
      return (
        <NSpace justify="center">
          {hasAuth('permissions:update') && (
            <NButton quaternary size="small" type="primary" onClick={() => handleEdit(row)}>
               {{ icon: () => <icon-carbon-edit class="text-20px" /> }}
            </NButton>
          )}
          {hasAuth('permissions:delete') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
              {{
                default: () => $t('common.confirmDelete'),
                trigger: () => (
                  <NButton quaternary size="small" type="error">
                    {{ icon: () => <icon-carbon-trash-can class="text-20px" /> }}
                  </NButton>
                )
              }}
            </NPopconfirm>
          )}
        </NSpace>
      );
    }
  }
];

function handleAdd() {
  isEdit.value = false;
  Object.assign(formModel, { id: '', name: '', slug: '', resource: '', action: '', description: '' });
  openModal();
}

function handleEdit(row: Api.Management.Permission) {
  isEdit.value = true;
  Object.assign(formModel, {
    id: row.id,
    name: row.name,
    slug: row.slug,
    resource: row.resource,
    action: row.action,
    description: row.description || ''
  });
  openModal();
}

async function handleDelete(id: string) {
  const { error } = await fetchDeletePermission(id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    getPermissions();
  }
}

async function handleSubmit() {
  if (!formModel.name || !formModel.slug || !formModel.resource || !formModel.action) {
    window.$message?.error('Please fill required fields');
    return;
  }

  const payload = { 
    name: formModel.name,
    slug: formModel.slug,
    resource: formModel.resource,
    action: formModel.action,
    description: formModel.description
  };

  let error;
  if (isEdit.value) {
    ({ error } = await fetchUpdatePermission(formModel.id, payload));
  } else {
    ({ error } = await fetchCreatePermission(payload));
  }
  
  if (!error) {
    window.$message?.success(isEdit.value ? $t('common.modifySuccess') : $t('common.addSuccess'));
    closeModal();
    getPermissions();
  }
}

// Init
getPermissions();
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="Permission" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NButton v-if="hasAuth('permissions:create')" type="primary" @click="handleAdd">
          <icon-ic-round-plus class="text-20px mr-1" />
          {{ $t('common.add') }}
        </NButton>
      </template>

      <div class="flex-col h-full">
        <NForm inline :model="searchParams" label-placement="left" size="small" class="mb-4">
          <NFormItem label="Keyword">
            <NInput v-model:value="searchParams.keyword" placeholder="Search name, slug, resource..." clearable class="w-240px" @keypress.enter="handleSearch" />
          </NFormItem>
          <NFormItem>
            <NSpace>
              <NButton type="primary" size="small" @click="handleSearch">Search</NButton>
              <NButton size="small" @click="handleReset">Reset</NButton>
            </NSpace>
          </NFormItem>
        </NForm>

        <NDataTable
          :columns="columns"
          :data="permissionData"
          :loading="loading"
          :pagination="pagination"
          :remote="true"
          :item-count="total"
          flex-height
          class="flex-1-hidden"
        />
      </div>
    </NCard>

    <NModal v-model:show="visible" preset="card" :title="isEdit ? $t('common.edit') : $t('common.add')" class="w-600px">
      <NForm :model="formModel" label-placement="left" label-width="100">
        <NFormItem label="Name" path="name">
          <NInput v-model:value="formModel.name" placeholder="Enter permission name" />
        </NFormItem>
        <NFormItem label="Slug" path="slug">
          <NInput v-model:value="formModel.slug" placeholder="Enter unique slug" :disabled="isEdit" />
        </NFormItem>
        <NFormItem label="Resource" path="resource">
          <NInput v-model:value="formModel.resource" placeholder="e.g. user, game, company" />
        </NFormItem>
        <NFormItem label="Action" path="action">
          <NInput v-model:value="formModel.action" placeholder="e.g. create, read, update, delete" />
        </NFormItem>
        <NFormItem label="Description" path="description">
          <NInput v-model:value="formModel.description" type="textarea" placeholder="Enter description" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="closeModal">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
