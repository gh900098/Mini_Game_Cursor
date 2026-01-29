<script setup lang="tsx">
import { ref, reactive, watch, computed } from 'vue';
import { NButton, NTag, NSpace, NPopconfirm, NCard, NDataTable, NModal, NForm, NFormItem, NInput, NSwitch, NDatePicker } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetCompanies, fetchCreateCompany, fetchUpdateCompany, fetchDeleteCompany } from '@/service/api/management';
import { useAuthStore } from '@/store/modules/auth';
import { useAuth } from '@/hooks/business/auth';
import { useBoolean, useLoading } from '@sa/hooks';
import { $t } from '@/locales';

const { hasAuth } = useAuth();

const { loading, startLoading, endLoading } = useLoading();
const { bool: visible, setTrue: openModal, setFalse: closeModal } = useBoolean();
const authStore = useAuthStore();

const companyData = ref<Api.Management.Company[]>([]);

const filteredCompanyData = computed(() => {
  if (authStore.userInfo.isSuperAdmin || authStore.userInfo.roles.includes('R_SUPER')) {
    return companyData.value;
  }
  return companyData.value.filter(c => c.id === authStore.userInfo.currentCompanyId);
});

const formModel = reactive({
  id: '',
  name: '',
  slug: '',
  isActive: true,
  inactiveAt: null as number | null,
  apiSecret: ''
});

const slugValidationStatus = ref<'success' | 'warning' | 'error' | undefined>(undefined);

watch(() => formModel.slug, (val) => {
  if (!val) {
    slugValidationStatus.value = undefined;
    return;
  }
  const reg = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  slugValidationStatus.value = reg.test(val) ? 'success' : 'error';
});

watch(() => formModel.isActive, (val) => {
  if (!val && !formModel.inactiveAt) {
    formModel.inactiveAt = Date.now();
  } else if (val) {
    formModel.inactiveAt = null;
  }
});

const isEdit = ref(false);

async function getCompanies() {
  startLoading();
  const { data, error } = await fetchGetCompanies();
  if (!error) {
    companyData.value = data;
  }
  endLoading();
}

const columns: DataTableColumns<Api.Management.Company> = [
  {
    title: 'Name',
    key: 'name',
    minWidth: 150
  },
  {
    title: 'Slug',
    key: 'slug',
    minWidth: 120,
    render(row) {
      return <NTag type="info">{row.slug}</NTag>;
    }
  },
  {
    title: 'Status',
    key: 'isActive',
    width: 100,
    render(row) {
      return <NTag type={row.isActive ? 'success' : 'error'}>{row.isActive ? 'Active' : 'Inactive'}</NTag>;
    }
  },
  {
    title: 'API Secret',
    key: 'apiSecret',
    width: 150,
    render(row) {
      return row.apiSecret ? <span class="font-mono text-xs">••••••••</span> : '-';
    }
  },
  {
    title: 'Created At',
    key: 'createdAt',
    width: 180,
    render(row) {
      return row.createdAt ? new Date(row.createdAt).toLocaleString() : '-';
    }
  },
  {
    title: 'Inactive Date',
    key: 'inactiveAt',
    width: 180,
    render(row) {
      return row.inactiveAt ? new Date(row.inactiveAt).toLocaleString() : '-';
    }
  },
  {
    title: 'Action',
    key: 'action',
    width: 120,
    render(row) {
      return (
        <NSpace justify="center">
          {hasAuth('companies:update') && (
            <NButton quaternary size="small" type="primary" onClick={() => handleEdit(row)}>
               {{ icon: () => <icon-carbon-edit class="text-20px" /> }}
            </NButton>
          )}
          {hasAuth('companies:delete') && (
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
  Object.assign(formModel, { id: '', name: '', slug: '', isActive: true });
  openModal();
}

function handleEdit(row: Api.Management.Company) {
  isEdit.value = true;
  Object.assign(formModel, {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.isActive,
    apiSecret: row.apiSecret || '',
    inactiveAt: row.inactiveAt ? new Date(row.inactiveAt).getTime() : null
  });
  openModal();
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteCompany(id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    getCompanies();
  }
}

async function handleSubmit() {
  if (!formModel.name || !formModel.slug) {
    window.$message?.error('Please fill required fields');
    return;
  }

  const payload = { 
    name: formModel.name,
    slug: formModel.slug,
    isActive: formModel.isActive,
    apiSecret: formModel.apiSecret,
    inactiveAt: formModel.inactiveAt ? new Date(formModel.inactiveAt).toISOString() : null
  };

  let error;
  if (isEdit.value) {
    ({ error } = await fetchUpdateCompany(formModel.id, payload));
  } else {
    ({ error } = await fetchCreateCompany(payload));
  }
  
  if (!error) {
    window.$message?.success(isEdit.value ? $t('common.modifySuccess') : $t('common.addSuccess'));
    closeModal();
    getCompanies();
  }
}

// Init
getCompanies();
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="Company" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NButton v-if="hasAuth('companies:create')" type="primary" @click="handleAdd">
          <icon-ic-round-plus class="text-20px mr-1" />
          {{ $t('common.add') }}
        </NButton>
      </template>

      <NDataTable
        :columns="columns"
        :data="filteredCompanyData"
        :loading="loading"
        flex-height
        class="h-full"
      />
    </NCard>

    <NModal v-model:show="visible" preset="card" :title="isEdit ? $t('common.edit') : $t('common.add')" class="w-600px">
      <NForm :model="formModel" label-placement="left" label-width="100">
        <NFormItem label="Company Name" path="name">
          <NInput v-model:value="formModel.name" placeholder="Enter company name" />
        </NFormItem>
        <NFormItem label="Slug" path="slug" :validation-status="slugValidationStatus">
          <NInput v-model:value="formModel.slug" placeholder="Enter unique slug" :disabled="isEdit" />
          <template #feedback>
            Lowercase alphanumeric with hyphens, must be unique.
          </template>
        </NFormItem>
        <NFormItem label="API Secret" path="apiSecret">
          <NInput v-model:value="formModel.apiSecret" placeholder="Enter API secret for 3rd party integration" />
        </NFormItem>
        <NFormItem label="Active" path="isActive">
          <NSwitch v-model:value="formModel.isActive" />
        </NFormItem>
        <NFormItem v-if="!formModel.isActive" label="Inactive Date" path="inactiveAt">
          <NDatePicker v-model:value="formModel.inactiveAt" type="date" clearable placeholder="Select deactivation date" class="w-full" />
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
