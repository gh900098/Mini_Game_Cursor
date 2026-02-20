<script setup lang="tsx">
import { ref, reactive, computed, watch } from 'vue';
import { NButton, NCard, NDataTable, NForm, NFormItem, NInput, NSelect, NSpace, NTag, NModal, NScrollbar, NDescriptions, NDescriptionsItem, NSwitch, NEllipsis, NTabs, NTabPane } from 'naive-ui';
import type { DataTableColumns, DataTableRowKey } from 'naive-ui';
import { fetchGetAuditLogList, fetchGetAuditLogOptions } from '@/service/api/audit-log';
import { fetchGetAllSystemSettings, fetchUpdateSystemSettings } from '@/service/api/system-settings';
import { useLoading, useBoolean } from '@sa/hooks';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import type { Ref } from 'vue';
import { useAuthStore } from '@/store/modules/auth';
import { useStorage } from '@vueuse/core';
import { useClipboard } from '@vueuse/core';

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.userInfo.isSuperAdmin);

// Settings Modal Logic
const { bool: settingsVisible, setTrue: openSettings, setFalse: closeSettings } = useBoolean();
const auditConfig = reactive({
  enabled: true,
  modules: {} as Record<string, boolean>
});

// We need to access the options loaded by the search form
// In the setup script, we don't have direct access to internal variables of useTable if they aren't exposed.
// However, we can fetch options again or rely on the fact that we have 'moduleSelectOptions' if it's defined in top scope.
// We should define a separate fetch function or reuse the existing one if possible.
const settingsModuleList = ref<string[]>([]); 

async function handleOpenSettings() {
  if (!isSuperAdmin.value) return;
  startLoading();
  try {
    const settings = await fetchGetAllSystemSettings();
    if (settings.error) return;
    
    // Parse config
    const config = settings.data?.AUDIT_LOG_CONFIG || { enabled: true, modules: {} };
    auditConfig.enabled = config.enabled ?? true;
    auditConfig.modules = config.modules || {};

    // Load available modules
    const { data } = await fetchGetAuditLogOptions();
    if (data?.modules) {
        settingsModuleList.value = data.modules;
    }

    // Populate module keys if missing
    settingsModuleList.value.forEach(m => {
       if (auditConfig.modules[m] === undefined) {
          auditConfig.modules[m] = true;
       }
    });

    openSettings();
  } finally {
    endLoading();
  }
}

async function handleSaveSettings() {
  startLoading();
  try {
    const { error } = await fetchUpdateSystemSettings({
      AUDIT_LOG_CONFIG: { ...auditConfig }
    });
    if (!error) {
      window.$message?.success('Audit Log Settings Updated');
      closeSettings();
    }
  } finally {
    endLoading();
  }
}

const { loading, startLoading, endLoading } = useLoading();
const { bool: detailVisible, setTrue: openDetail, setFalse: closeDetail } = useBoolean();

// PERSISTENT DEV MODE
const devMode = useStorage('audit-log-dev-mode', false);
const toggleDevMode = () => {
    devMode.value = !devMode.value;
};

const { hasAuth } = useAuth();
const { copy, isSupported } = useClipboard();

const canSeeDevMode = computed(() => hasAuth('audit-logs:manage'));

const auditLogs = ref<Api.AuditLog.AuditLog[]>([]);
const total = ref(0);
const moduleOptions = ref<string[]>([]);
const actionOptions = ref<string[]>([]);

const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  itemCount: 0,
  onChange: (page: number) => {
    pagination.page = page;
    getAuditLogs();
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    getAuditLogs();
  }
});

const searchParams = reactive<Api.AuditLog.AuditLogSearchParams>({
  module: '',
  action: '',
  userName: ''
});

async function getOptions() {
  const { data, error } = await fetchGetAuditLogOptions();
  if (!error) {
    moduleOptions.value = data.modules;
    actionOptions.value = data.actions;
  }
}

async function getAuditLogs() {
  startLoading();
  const currentCompanyId = authStore.userInfo.currentCompanyId;
  const companyId = currentCompanyId === 'ALL' || !currentCompanyId ? undefined : currentCompanyId;

  const { data: resData, error } = await fetchGetAuditLogList({
    page: pagination.page,
    limit: pagination.pageSize,
    companyId,
    ...searchParams
  });
  
  if (!error && resData) {
    auditLogs.value = resData.items;
    total.value = resData.total;
    pagination.itemCount = resData.total;
  }
  endLoading();
}

function handleSearch() {
  pagination.page = 1;
  getAuditLogs();
}

function handleReset() {
  searchParams.module = '';
  searchParams.action = '';
  searchParams.userName = '';
  handleSearch();
}

function isSensitiveField(key: string): boolean {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credit', 'card', 'cvv', 'cvc', 'pin', 'access_token', 'refresh_token', 'apiKey'];
  const lowerKey = key.toLowerCase();
  return sensitiveKeys.some(sk => lowerKey.includes(sk));
}

function redact(obj: any, isTechnical: boolean = false): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => redact(item, isTechnical));
  
  const redacted = { ...obj };
  for (const key in redacted) {
    if (isSensitiveField(key)) {
      redacted[key] = '********';
    } else if (!isTechnical && (key.endsWith('Id') || key.endsWith('Ids') || key === 'id')) {
        // Clean Mode: Remove all ID fields to show only human-readable data
        delete redacted[key];
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redact(redacted[key], isTechnical);
    }
  }
  return redacted;
}

async function viewDetail(row: Api.AuditLog.AuditLog) {
  // If in dev mode, we might want to fetch full details if not already present
  // But for now we just show what we have
  currentLog.value = row;
  openDetail();
}

function handleCopy(text: string) {
    copy(text);
    window.$message?.success('Copied to clipboard');
}

// Ensure options are loaded
getOptions();
getAuditLogs();

const currentLog = ref<Api.AuditLog.AuditLog | null>(null);

const expandedRowKeys = ref<DataTableRowKey[]>([]);
function handleExpandedUpdate(keys: DataTableRowKey[]) {
  // Only keep the last toggled key to ensure single-expansion mode
  expandedRowKeys.value = keys.length > 0 ? [keys[keys.length - 1]] : [];
}

const columns = computed<DataTableColumns<Api.AuditLog.AuditLog>>(() => {
  const cols: DataTableColumns<Api.AuditLog.AuditLog> = [
    {
      type: 'expand',
      width: 40,
      renderExpand: (row) => {
         if (!devMode.value) {
            return (
                <div class="p-3 bg-gray-50 rounded text-12px text-gray-600">
                    {(() => {
                        const payload = row.payload || {};
                        const actor = <span class="font-bold text-gray-800">{row.userName}</span>;
                        
                        // Scenario 1: Switch Company
                        if (payload.switchedToCompany) {
                            return <span>{actor} switched context to <span class="font-bold text-primary">{payload.switchedToCompany}</span>.</span>;
                        }

                        // Scenario 2: Role Assignment / Permissions (Both)
                        if (payload.targetRoleName && payload.targetCompanyName) {
                            return <span>{actor} assigned role <span class="font-bold text-primary">{payload.targetRoleName}</span> for company <span class="font-bold text-primary">{payload.targetCompanyName}</span>.</span>;
                        }

                        // Scenario 3: Target User Action
                        if (payload.targetUserEmail) {
                            return <span>{actor} performed <span class="font-bold text-gray-800">{row.action}</span> on user <span class="font-bold text-primary">{payload.targetUserEmail}</span>.</span>;
                        }

                        // Scenario 4: Target Company Action
                        if (payload.targetCompanyName) {
                             return <span>{actor} performed <span class="font-bold text-gray-800">{row.action}</span> on company <span class="font-bold text-primary">{payload.targetCompanyName}</span>.</span>;
                        }

                        // Scenario 5: Standalone Role Action
                        if (payload.targetRoleName) {
                             return <span>{actor} performed <span class="font-bold text-gray-800">{row.action}</span> on role <span class="font-bold text-primary">{payload.targetRoleName}</span>.</span>;
                        }

                        // Scenario 6: Standalone Permission Action
                        if (payload.targetPermissionSlug) {
                             return <span>{actor} performed <span class="font-bold text-gray-800">{row.action}</span> on permission <span class="font-bold text-primary">{payload.targetPermissionSlug}</span>.</span>;
                        }

                        // Fallback: Generic
                        return <span>{actor} performed <span class="font-bold text-gray-800">{row.action}</span> in module <span class="font-bold text-gray-800">{row.module}</span>.</span>;
                    })()}
                    
                    {(!row.status || row.status < 400) ? 
                        <span class="text-green-600 ml-1">Success.</span> : 
                        <span class="text-red-500 ml-1">Failed ({row.status}).</span>
                    }
                </div>
            );
         }
         return (
             <div class="bg-gray-50 p-3 rounded text-12px grid grid-cols-2 gap-4">
                <div><span class="font-bold text-gray-500">Method:</span> {row.method}</div>
                <div><span class="font-bold text-gray-500">Path:</span> <span class="font-mono">{row.path}</span></div>
                <div><span class="font-bold text-gray-500">User Agent:</span> {row.userAgent}</div>
                <div class="col-span-2">
                   <span class="font-bold text-gray-500 block mb-1">Duration:</span> 
                   <NTag size="small" type={(row.duration || 0) < 500 ? 'success' : 'warning'}>{row.duration || 0}ms</NTag>
                </div>
             </div>
         );
      }
    },
    {
      title: 'Time',
      key: 'createdAt',
      width: 160,
      render(row) {
        return <span class="text-12px">{new Date(row.createdAt).toLocaleString()}</span>;
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      render(row) {
        return <span class="font-bold text-12px">{row.action}</span>;
      }
    },
    {
      title: 'User',
      key: 'userName',
      width: 150,
      render(row) {
        return <span class="text-gray-400 text-11px">{row.userName || 'System'}</span>;
      }
    },
    {
      title: 'Module',
      key: 'module',
      width: 80,
      render(row) {
          return <NTag size="small" bordered={false} class="text-10px px-1 h-20px">{row.module}</NTag>;
      }
    }
  ];

  if (devMode.value) {
    cols.push(
      {
        title: 'Path',
        key: 'path',
        width: 240,
        render(row) {
            const typeMap: Record<string, 'success' | 'info' | 'warning' | 'error' | 'primary'> = {
                GET: 'success',
                POST: 'primary',
                PUT: 'warning',
                PATCH: 'warning',
                DELETE: 'error'
            };
            return (
                <NSpace align="center" size="small" wrap={false} class="w-full">
                    <NTag size="small" type={typeMap[row.method || ''] || 'default'} class="text-10px px-1 h-20px flex-shrink-0">{row.method}</NTag>
                    <NEllipsis tooltip={true} style="max-width: 140px" class="text-11px font-mono text-gray-400">
                        {row.path}
                    </NEllipsis>
                    <NButton size="tiny" quaternary circle onClick={() => handleCopy(row.path || '')}>
                        <icon-mdi-content-copy class="text-gray-400" />
                    </NButton>
                </NSpace>
            );
        }
      },
      {
        title: 'Status',
        key: 'status',
        width: 80,
        render(row) {
          const type = row.status && row.status >= 400 ? 'error' : 'success';
          return <NTag size="small" type={type}>{row.status}</NTag>;
        }
      },
      {
        title: 'IP',
        key: 'ip',
        width: 130,
        render(row) {
            return <span class="text-11px font-mono">{row.ip}</span>;
        }
      }
    );
  }

  cols.push({
    title: 'Details',
    key: 'operate',
    width: 80,
    render(row) {
      return (
        <NButton size="tiny" quaternary circle type="primary" onClick={() => viewDetail(row)}>
           <icon-carbon-view class="text-20px" />
        </NButton>
      );
    }
  });

  return cols;
});

const moduleSelectOptions = computed(() => moduleOptions.value.map(v => ({ label: v, value: v })));
const actionSelectOptions = computed(() => actionOptions.value.map(v => ({ label: v, value: v })));

watch(
  () => authStore.userInfo.currentCompanyId,
  () => {
    getAuditLogs();
  }
);

getAuditLogs();
getOptions();
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="Audit Log" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra v-if="canSeeDevMode">
        <NSpace align="center">
          <span class="text-12px text-gray-400">Developer Mode</span>
          <NSwitch :value="devMode" @update:value="toggleDevMode" size="small" />
        </NSpace>
      </template>
      <div class="flex-col h-full">
        <NForm inline :model="searchParams" label-placement="left" size="small" class="mb-4">
          <NFormItem label="Module">
            <NSelect 
              v-model:value="searchParams.module" 
              :options="moduleSelectOptions" 
              placeholder="Select" 
              clearable 
              class="w-160px"
              @update:value="handleSearch"
            />
          </NFormItem>
          <NFormItem label="Action">
            <NSelect 
              v-model:value="searchParams.action" 
              :options="actionSelectOptions" 
              placeholder="Select" 
              clearable 
              class="w-200px"
              :consistent-menu-width="false"
              @update:value="handleSearch"
            />
          </NFormItem>
          <NFormItem label="User">
            <NInput v-model:value="searchParams.userName" placeholder="Name" clearable class="w-160px" @keypress.enter="handleSearch" />
          </NFormItem>
          <NFormItem>
            <NSpace>
              <NButton type="primary" size="small" @click="handleSearch">Search</NButton>
              <NButton size="small" @click="handleReset">Reset</NButton>
             <NButton v-if="isSuperAdmin" size="small" type="primary" secondary @click="handleOpenSettings">
               <template #icon>
                 <icon-mdi-cog />
               </template>
               Log Settings
             </NButton>
            </NSpace>
          </NFormItem>
        </NForm>

        <NDataTable
          :columns="columns"
          :data="auditLogs"
          :loading="loading"
          :pagination="pagination"
          :remote="true"
          :item-count="total"
          :row-key="(row) => row.id"
          :expanded-row-keys="expandedRowKeys"
          size="small"
          flex-height
          class="flex-1-hidden"
          @update:expanded-row-keys="handleExpandedUpdate"
        />
      </div>
    </NCard>

    <NModal v-model:show="settingsVisible" preset="card" title="Audit Log Settings" class="w-600px">
      <div class="flex flex-col gap-4">
         <div class="flex items-center justify-between p-4 bg-gray-50 rounded border">
            <span class="font-bold">Global Audit Logging</span>
            <NSwitch v-model:value="auditConfig.enabled" />
         </div>

         <div v-if="auditConfig.enabled" class="grid grid-cols-2 gap-4">
             <div v-for="mod in settingsModuleList" :key="mod" class="flex items-center justify-between p-3 border rounded">
                <span>{{ mod }}</span>
                <NSwitch v-model:value="auditConfig.modules[mod]" size="small" />
             </div>
         </div>
      </div>
      <template #footer>
         <div class="flex justify-end gap-2">
            <NButton @click="closeSettings">Cancel</NButton>
            <NButton type="primary" :loading="loading" @click="handleSaveSettings">Save Configuration</NButton>
         </div>
      </template>
    </NModal>

    <NModal v-model:show="detailVisible" preset="card" :title="devMode ? 'Technical Log Detail' : 'Action Details'" class="w-800px">
      <NScrollbar class="max-h-600px pr-4">
        <!-- Summary Section -->
        <NDescriptions bordered :column="2" size="small" label-placement="left" class="mb-4">
          <NDescriptionsItem label="Time">{{ currentLog?.createdAt ? new Date(currentLog.createdAt).toLocaleString() : '' }}</NDescriptionsItem>
          <NDescriptionsItem label="User">{{ currentLog?.userName }} <span v-if="devMode" class="text-gray-400">({{ currentLog?.userId }})</span></NDescriptionsItem>
          <NDescriptionsItem label="Module"><NTag size="small">{{ currentLog?.module }}</NTag></NDescriptionsItem>
          <NDescriptionsItem label="Action">{{ currentLog?.action }}</NDescriptionsItem>
          
          <template v-if="devMode">
             <NDescriptionsItem label="Status">
                 <NTag :type="(currentLog?.status || 0) < 400 ? 'success' : 'error'" size="small">{{ currentLog?.status }}</NTag> 
                 <span class="ml-2 text-gray-400 text-12px">{{ currentLog?.duration }}ms</span>
             </NDescriptionsItem>
             <NDescriptionsItem label="Method">
                <NTag size="small" :type="currentLog?.method === 'GET' ? 'success' : 'info'">{{ currentLog?.method }}</NTag>
             </NDescriptionsItem>
             <NDescriptionsItem label="Path" :span="2">
                <span class="font-mono text-12px bg-gray-50 px-1 rounded">{{ currentLog?.path }}</span>
             </NDescriptionsItem>
          </template>
        </NDescriptions>

        <!-- Technical Tabs -->
        <NTabs type="line" animated>
           <NTabPane name="payload" tab="Payload (Changes)">
              <div v-if="!devMode" class="p-4 bg-gray-50 rounded mb-2">
                 User <span class="font-bold">{{ currentLog?.userName }}</span> performed <span class="font-bold">{{ currentLog?.action }}</span> in module <span class="font-bold">{{ currentLog?.module }}</span>.
              </div>
              <pre class="bg-gray-900 text-gray-100 p-3 rounded-md overflow-auto max-h-300px text-11px font-mono leading-relaxed custom-scrollbar">{{ JSON.stringify(redact(currentLog?.payload, devMode), null, 2) }}</pre>
           </NTabPane>
           
           <template v-if="devMode">
               <NTabPane name="params" tab="Query Params">
                  <pre class="bg-gray-50 p-3 rounded-md overflow-auto max-h-300px text-11px font-mono border border-gray-200">{{ JSON.stringify(redact(currentLog?.params, true), null, 2) }}</pre>
               </NTabPane>
               <NTabPane name="result" tab="Response / Result">
                  <pre class="bg-gray-50 p-3 rounded-md overflow-auto max-h-300px text-11px font-mono border border-gray-200">{{ JSON.stringify(redact(currentLog?.result, true), null, 2) }}</pre>
               </NTabPane>
               <NTabPane name="meta" tab="System Meta">
                  <NDescriptions bordered :column="1" size="small">
                      <NDescriptionsItem label="Log ID">{{ currentLog?.id }}</NDescriptionsItem>
                      <NDescriptionsItem label="IP Address">{{ currentLog?.ip }}</NDescriptionsItem>
                      <NDescriptionsItem label="User Agent">{{ currentLog?.userAgent }}</NDescriptionsItem>
                  </NDescriptions>
               </NTabPane>
           </template>
        </NTabs>
      </NScrollbar>
    </NModal>
  </div>
</template>

<style scoped></style>
