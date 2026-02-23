<script setup lang="tsx">
import { ref, reactive, watch, computed, onMounted } from 'vue';
import { NButton, NTag, NSpace, NPopconfirm, NCard, NDataTable, NModal, NForm, NFormItem, NInput, NSwitch, NDatePicker, NDivider, NInputNumber, NSelect, NTabs, NTabPane, NTooltip } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetCompanies, fetchCreateCompany, fetchUpdateCompany, fetchDeleteCompany, fetchIntegrationProviders } from '@/service/api/management';
import { useAuthStore } from '@/store/modules/auth';
import { useAuth } from '@/hooks/business/auth';
import { useBoolean, useLoading } from '@sa/hooks';
import { $t } from '@/locales';

const { hasAuth } = useAuth();

const { loading, startLoading, endLoading } = useLoading();
const { bool: visible, setTrue: openModal, setFalse: closeModal } = useBoolean();
const authStore = useAuthStore();

const companyData = ref<Api.Management.Company[]>([]);
const total = ref(0);

const integrationProviderOptions = ref<{ label: string; value: string }[]>([]);

async function initIntegrationProviders() {
  const { data, error } = await fetchIntegrationProviders();
  if (!error && data) {
    integrationProviderOptions.value = data;
  }
}

onMounted(() => {
  initIntegrationProviders();
});

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
    getCompanies();
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    getCompanies();
  }
});

const filteredCompanyData = computed(() => {
  return companyData.value;
});

const formModel = reactive({
  id: '',
  name: '',
  slug: '',
  isActive: true,
  inactiveAt: null as number | null,
  apiSecret: '',
  defaultTokenCost: 10,
  integration_config: {
    enabled: false,
    provider: 'JK',
    apiUrl: '',
    accessId: '',
    accessToken: '',
    ipWhitelistEnabled: false,
    ipWhitelist: '',
    proxy: {
      enabled: false,
      protocol: 'http' as 'http' | 'socks5',
      host: '',
      port: 8080,
      username: '',
      password: ''
    },
    syncConfigs: {
      member: { enabled: true, syncMode: 'incremental', maxPages: 200, syncCron: '', syncParams: {} },
      deposit: { enabled: false, syncMode: 'incremental', maxPages: 200, syncCron: '', syncParams: {}, depositConversionRate: 0, maxPointsPerDay: null, maxPointsPerMonth: null, maxEligibleDeposits: null },
      withdraw: { enabled: false, syncMode: 'incremental', maxPages: 200, syncCron: '', syncParams: {} }
    } as Record<string, any>
  }
});

const syncTypes = [
  { key: 'member', label: 'Members', icon: 'icon-carbon-user' },
  { key: 'deposit', label: 'Deposits', icon: 'icon-carbon-add-alt' },
  { key: 'withdraw', label: 'Withdrawals', icon: 'icon-carbon-subtract-alt' }
];

function addNewParam(type: string) {
  if (!formModel.integration_config.syncConfigs[type].syncParams) {
    formModel.integration_config.syncConfigs[type].syncParams = {};
  }
  const id = Math.random().toString(36).substring(7);
  formModel.integration_config.syncConfigs[type].syncParams[`param_${id}`] = '';
}

function deleteParam(type: string, key: string) {
  delete formModel.integration_config.syncConfigs[type].syncParams[key];
}

function renameParam(type: string, oldKey: string, newKey: string) {
  if (!newKey || oldKey === newKey) return;
  const val = formModel.integration_config.syncConfigs[type].syncParams[oldKey];
  delete formModel.integration_config.syncConfigs[type].syncParams[oldKey];
  formModel.integration_config.syncConfigs[type].syncParams[newKey] = val;
}

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
  const { data, error } = await fetchGetCompanies({
    page: pagination.page,
    limit: pagination.pageSize,
    keyword: searchParams.keyword || undefined
  });
  
  if (!error && data) {
    if ('items' in data) {
      // Filter if not super admin (backend handles multi-tenancy usually, but we keep this logic if needed)
      let items = data.items;
      if (!(authStore.userInfo.isSuperAdmin || authStore.userInfo.roles.includes('R_SUPER'))) {
        items = items.filter(c => c.id === authStore.userInfo.currentCompanyId);
      }
      companyData.value = items;
      total.value = data.total;
      pagination.itemCount = data.total;
    } else {
      let items = data;
      if (!(authStore.userInfo.isSuperAdmin || authStore.userInfo.roles.includes('R_SUPER'))) {
        items = items.filter(c => c.id === authStore.userInfo.currentCompanyId);
      }
      companyData.value = items;
      total.value = items.length;
      pagination.itemCount = items.length;
    }
  }
  endLoading();
}

function handleSearch() {
  pagination.page = 1;
  getCompanies();
}

function handleReset() {
  searchParams.keyword = '';
  handleSearch();
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
  Object.assign(formModel, { 
    id: '', 
    name: '', 
    slug: '', 
    isActive: true,
    apiSecret: '',
    defaultTokenCost: 10,
    integration_config: { 
      enabled: false, 
      provider: 'JK',
      apiUrl: '', 
      accessId: '', 
      accessToken: '', 
      ipWhitelistEnabled: false,
      ipWhitelist: '',
      proxy: {
        enabled: false,
        protocol: 'http',
        host: '',
        port: 8080,
        username: '',
        password: ''
      },
      syncConfigs: {
        member: { enabled: true, syncMode: 'incremental', maxPages: 200, syncCron: '', syncParams: {} },
        deposit: { enabled: false, syncMode: 'incremental', maxPages: 200, syncCron: '', syncParams: {}, depositConversionRate: 0, maxPointsPerDay: null, maxPointsPerMonth: null, maxEligibleDeposits: null },
        withdraw: { enabled: false, syncMode: 'incremental', maxPages: 200, syncCron: '', syncParams: {} }
      }
    }
  });
// Parameters are now managed directly in the syncConfigs object
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
    inactiveAt: row.inactiveAt ? new Date(row.inactiveAt).getTime() : null,
    defaultTokenCost: row.settings?.defaultTokenCost ?? 10,
    integration_config: {
        enabled: row.integration_config?.enabled ?? false,
        provider: row.integration_config?.provider ?? 'JK',
        apiUrl: row.integration_config?.apiUrl ?? '',
        accessId: row.integration_config?.accessId ?? '',
        accessToken: row.integration_config?.accessToken ?? '',
        ipWhitelistEnabled: row.integration_config?.ipWhitelistEnabled ?? false,
        ipWhitelist: row.integration_config?.ipWhitelist ?? '',
        proxy: {
            enabled: row.integration_config?.proxy?.enabled ?? false,
            protocol: row.integration_config?.proxy?.protocol ?? 'http',
            host: row.integration_config?.proxy?.host ?? '',
            port: row.integration_config?.proxy?.port ?? 8080,
            username: row.integration_config?.proxy?.username ?? '',
            password: row.integration_config?.proxy?.password ?? ''
        },
        syncConfigs: {
            member: row.integration_config?.syncConfigs?.member ?? { enabled: true, syncMode: row.integration_config?.syncMode ?? 'incremental', maxPages: row.integration_config?.maxPages ?? 200, syncCron: row.integration_config?.syncCron ?? '', syncParams: row.integration_config?.syncParams ?? {} },
            deposit: row.integration_config?.syncConfigs?.deposit ?? { enabled: false, syncMode: 'incremental', maxPages: 200, syncCron: '', syncParams: {}, depositConversionRate: 0, maxPointsPerDay: null, maxPointsPerMonth: null, maxEligibleDeposits: null },
            withdraw: row.integration_config?.syncConfigs?.withdraw ?? { enabled: false, syncMode: 'incremental', maxPages: 200, syncCron: '', syncParams: {} }
        }
    }
  });

// Parameters are now managed directly in the syncConfigs object
  
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
    inactiveAt: formModel.inactiveAt ? new Date(formModel.inactiveAt).toISOString() : null,
    settings: {
      defaultTokenCost: formModel.defaultTokenCost
    },
    integration_config: formModel.integration_config 
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

const webhookBaseUrl = computed(() => {
  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}/api/webhooks/sync`;
});

const webhookUrls = computed(() => {
  if (!formModel.id) return [];
  const base = webhookBaseUrl.value;
  return [
    { type: 'member', url: `${base}/member/${formModel.id}` },
    { type: 'deposit', url: `${base}/deposit/${formModel.id}` },
    { type: 'withdraw', url: `${base}/withdraw/${formModel.id}` },
    { type: 'ticket', url: `${base}/ticket/${formModel.id}` }
  ];
});

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    window.$message?.success('Copied to clipboard');
  });
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

      <div class="flex-col h-full">
        <NForm inline :model="searchParams" label-placement="left" size="small" class="mb-4">
          <NFormItem label="Keyword">
            <NInput v-model:value="searchParams.keyword" placeholder="Search name or slug..." clearable class="w-240px" @keypress.enter="handleSearch" />
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
          :data="filteredCompanyData"
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
      <NTabs type="line" animated>
        <NTabPane name="basic" tab="Basic Info">
          <NForm :model="formModel" label-placement="left" label-width="120" class="pt-4">
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
            <NFormItem label="Default Token Cost" path="defaultTokenCost">
              <NInputNumber v-model:value="formModel.defaultTokenCost" :min="0" placeholder="Default tokens per play" class="w-full" />
            </NFormItem>
            <NFormItem label="Active" path="isActive">
              <NSwitch v-model:value="formModel.isActive" />
            </NFormItem>
            <NFormItem v-if="!formModel.isActive" label="Inactive Date" path="inactiveAt">
              <NDatePicker v-model:value="formModel.inactiveAt" type="date" clearable placeholder="Select deactivation date" class="w-full" />
            </NFormItem>
          </NForm>
        </NTabPane>

        <NTabPane name="platform" tab="Integration">
          <NForm :model="formModel" label-placement="left" label-width="120" class="pt-4">
             <NFormItem label="Enable Sync" path="integration_config.enabled">
               <NSwitch v-model:value="formModel.integration_config.enabled" />
             </NFormItem>
             <template v-if="formModel.integration_config.enabled">
               <NFormItem label="Provider" path="integration_config.provider">
                 <NSelect v-model:value="formModel.integration_config.provider" :options="integrationProviderOptions" />
               </NFormItem>
               <NFormItem label="API URL" path="integration_config.apiUrl">
                  <NInput v-model:value="formModel.integration_config.apiUrl" placeholder="https://api.jk-backend.com" />
               </NFormItem>
               <NFormItem label="Access ID" path="integration_config.accessId">
                  <NInput v-model:value="formModel.integration_config.accessId" placeholder="Numeric Access ID" />
               </NFormItem>
               <NFormItem label="Access Token" path="integration_config.accessToken">
                  <NInput v-model:value="formModel.integration_config.accessToken" type="password" show-password-on="click" placeholder="Secret Token" />
               </NFormItem>
               
               <NDivider title-placement="left" dashed>Proxy Settings (Shared)</NDivider>
               <NFormItem label="Enable Proxy" path="integration_config.proxy.enabled">
                 <NSwitch v-model:value="formModel.integration_config.proxy.enabled" />
               </NFormItem>
               <template v-if="formModel.integration_config.proxy.enabled">
                 <NFormItem label="Protocol" path="integration_config.proxy.protocol">
                   <NSelect v-model:value="formModel.integration_config.proxy.protocol" :options="[{ label: 'HTTP / HTTPS', value: 'http' }, { label: 'SOCKS5', value: 'socks5' }]" />
                 </NFormItem>
                 <NSpace>
                   <NFormItem label="Host" path="integration_config.proxy.host">
                     <NInput v-model:value="formModel.integration_config.proxy.host" placeholder="e.g. 85.28.61.160" />
                   </NFormItem>
                   <NFormItem label="Port" path="integration_config.proxy.port">
                     <NInputNumber v-model:value="formModel.integration_config.proxy.port" :min="1" :max="65535" placeholder="8080" />
                   </NFormItem>
                 </NSpace>
                 <NSpace>
                   <NFormItem label="Username" path="integration_config.proxy.username">
                     <NInput v-model:value="formModel.integration_config.proxy.username" placeholder="Optional" />
                   </NFormItem>
                   <NFormItem label="Password" path="integration_config.proxy.password">
                     <NInput v-model:value="formModel.integration_config.proxy.password" type="password" show-password-on="click" placeholder="Optional" />
                   </NFormItem>
                 </NSpace>
               </template>
             </template>
          </NForm>
        </NTabPane>

        <NTabPane name="sync" tab="Sync Settings" :disabled="!formModel.integration_config.enabled">
          <NTabs type="segment" animated class="mt-2">
            <NTabPane v-for="type in syncTypes" :key="type.key" :name="type.key" :tab="type.label">
              <NForm :model="formModel.integration_config.syncConfigs[type.key]" label-placement="left" label-width="120" class="pt-4">
                <NFormItem label="Type Status">
                  <NSwitch v-model:value="formModel.integration_config.syncConfigs[type.key].enabled" />
                  <span class="ml-2 text-xs text-gray-500">Enable automatic {{ type.label.toLowerCase() }} sync</span>
                </NFormItem>
                
                <template v-if="formModel.integration_config.syncConfigs[type.key].enabled">
                  <template v-if="type.key === 'member'">
                    <NFormItem label="Sync Mode">
                      <NSelect 
                        v-model:value="formModel.integration_config.syncConfigs[type.key].syncMode" 
                        :options="[{ label: 'Incremental (Fast)', value: 'incremental' }, { label: 'Full Sync', value: 'full' }]" 
                      />
                    </NFormItem>
                    <NFormItem v-if="formModel.integration_config.syncConfigs[type.key].syncMode === 'incremental'" label="Max Pages">
                       <NInputNumber v-model:value="formModel.integration_config.syncConfigs[type.key].maxPages" :min="1" class="w-full" />
                    </NFormItem>
                  </template>
                  <NFormItem label="Schedule (Cron)">
                    <NInput v-model:value="formModel.integration_config.syncConfigs[type.key].syncCron" placeholder="e.g. 0 */4 * * * (Optional)" />
                  </NFormItem>

                  <template v-if="type.key === 'deposit'">
                    <NDivider title-placement="left" dashed>{{ $t('company.depositConfigTitle') || 'Deposit Configuration' }}</NDivider>
                    <NFormItem :label="$t('company.depositConversionRate') || 'Conversion Rate'">
                      <NInputNumber 
                        v-model:value="formModel.integration_config.syncConfigs[type.key].depositConversionRate" 
                        :min="0"
                        :precision="2"
                        class="w-full"
                        placeholder="e.g 100" />
                      <template #feedback>
                         {{ $t('company.depositConversionRateHint') || 'How many points is 1 deposit currency worth? Set to 0 to disable automated conversion.' }}
                      </template>
                    </NFormItem>
                    
                    <NFormItem :label="$t('company.depositSyncDays') || 'Sync Window (Days)'">
                      <NInputNumber 
                        v-model:value="formModel.integration_config.syncConfigs[type.key].syncDays" 
                        :min="1"
                        :max="30"
                        class="w-full"
                        placeholder="Default: 2" />
                      <template #feedback>
                         {{ $t('company.depositSyncDaysHint') || 'How many days back should the scheduled sync fetch? (Default: 2, Max: 30)' }}
                      </template>
                    </NFormItem>

                    <NDivider title-placement="left" dashed>Deposit Rules Engine (Limits)</NDivider>
                    <NFormItem label="Max Eligible Deposits">
                      <NInputNumber 
                        v-model:value="formModel.integration_config.syncConfigs[type.key].maxEligibleDeposits" 
                        :min="1"
                        class="w-full"
                        clearable
                        placeholder="e.g. 5 (Points awarded ONLY for first 5 deposits)" />
                      <template #feedback>
                        Restrict points strictly to the first N deposits ever made by the user. Leave blank for unlimited.
                      </template>
                    </NFormItem>

                    <NFormItem label="Max Daily Points">
                      <NInputNumber 
                        v-model:value="formModel.integration_config.syncConfigs[type.key].maxPointsPerDay" 
                        :min="1"
                        class="w-full"
                        clearable
                        placeholder="e.g. 5000 (Max 5,000 pts per day)" />
                    </NFormItem>

                    <NFormItem label="Max Monthly Points">
                      <NInputNumber 
                        v-model:value="formModel.integration_config.syncConfigs[type.key].maxPointsPerMonth" 
                        :min="1"
                        class="w-full"
                        clearable
                        placeholder="e.g. 50000 (Max 50,000 pts per month)" />
                    </NFormItem>

                  </template>

                  <NDivider title-placement="left" dashed>Custom API Parameters</NDivider>
                  <NSpace vertical>
                    <NSpace v-for="(val, key) in formModel.integration_config.syncConfigs[type.key].syncParams" :key="key" align="center">
                      <NInput :value="String(key)" @update:value="(newKey) => renameParam(type.key, String(key), newKey)" placeholder="Key" style="width: 150px" />
                      <NInput v-model:value="formModel.integration_config.syncConfigs[type.key].syncParams[key]" placeholder="Value" style="width: 250px" />
                      <NButton quaternary circle type="error" @click="deleteParam(type.key, String(key))">
                        <template #icon><icon-carbon-trash-can /></template>
                      </NButton>
                    </NSpace>
                    <NButton size="small" type="primary" ghost @click="addNewParam(type.key)">
                      <template #icon><icon-ic-round-plus /></template>
                      Add Parameter
                    </NButton>
                  </NSpace>
                </template>
                <div v-else class="py-10 text-center text-gray-400">
                  {{ type.label }} synchronization is disabled for this company.
                </div>
              </NForm>
            </NTabPane>
          </NTabs>
        </NTabPane>

        <NTabPane name="webhooks" tab="Webhooks" :disabled="!formModel.id">
          <div class="bg-gray-50 p-4 rounded-8px border border-dashed border-gray-300 mt-4">
            <p class="text-xs text-gray-500 mb-4 italic">Provide these URLs to the JK Platform to receive real-time updates.</p>
            <div class="space-y-4">
              <div v-for="item in webhookUrls" :key="item.type" class="flex flex-col space-y-1">
                <div class="flex justify-between items-center pr-2">
                  <span class="text-xs font-bold uppercase text-primary">{{ item.type }}</span>
                  <NButton size="tiny" quaternary type="primary" @click="copyToClipboard(item.url)">Copy</NButton>
                </div>
                <code class="text-[11px] bg-white p-2 rounded border font-mono break-all whitespace-normal">
                  {{ item.url }}
                </code>
              </div>
            </div>
          </div>
        </NTabPane>
      </NTabs>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="closeModal">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
