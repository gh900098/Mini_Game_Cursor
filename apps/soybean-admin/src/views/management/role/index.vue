<script setup lang="tsx">
import { ref, reactive, computed } from 'vue';
import { NButton, NTag, NSpace, NPopconfirm, NModal, NForm, NFormItem, NInput, NInputNumber, NCard, NDataTable, NTabs, NTabPane, NCheckbox, NCheckboxGroup, NScrollbar, NDivider, NCollapse, NCollapseItem } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetRoles, fetchCreateRole, fetchUpdateRole, fetchDeleteRole, fetchGetPermissionOptions } from '@/service/api/management';
import { useAuthStore } from '@/store/modules/auth';
import { useAuth } from '@/hooks/business/auth';
import { useBoolean, useLoading } from '@sa/hooks';
import { $t } from '@/locales';

const { hasAuth } = useAuth();
const authStore = useAuthStore();
const { loading, startLoading, endLoading } = useLoading();
const { bool: visible, setTrue: openModal, setFalse: closeModal } = useBoolean();

const roleData = ref<Api.Management.Role[]>([]);
const total = ref(0);
const availablePermissions = ref<Api.Management.Permission[]>([]);

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
    getRoles();
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    getRoles();
  }
});

const formModel = reactive({
  id: '',
  name: '',
  slug: '',
  description: '',
  level: 1,
  permissionIds: [] as string[]
});

const tabName = ref('general');

const groupedPermissions = computed(() => {
  const groups: Record<string, Api.Management.Permission[]> = {};
  availablePermissions.value.forEach(p => {
    if (!groups[p.resource]) groups[p.resource] = [];
    groups[p.resource].push(p);
  });
  return groups;
});

async function getPermissions() {
  const { data, error } = await fetchGetPermissionOptions();
  if (!error) {
    availablePermissions.value = data;
  }
}

const expandedGroups = ref<string[]>([]);

function toggleAllExpanded() {
  const allGroupNames = Object.keys(groupedPermissions.value);
  if (expandedGroups.value.length === allGroupNames.length) {
    expandedGroups.value = [];
  } else {
    expandedGroups.value = allGroupNames;
  }
}

const isEdit = ref(false);
const isView = ref(false);

const selectedGroupedPermissions = computed(() => {
  const groups: Record<string, Api.Management.Permission[]> = {};
  availablePermissions.value.forEach(p => {
    if (formModel.permissionIds.includes(p.id)) {
      if (!groups[p.resource]) groups[p.resource] = [];
      groups[p.resource].push(p);
    }
  });
  return groups;
});

function getPermissionStatus(resource: string) {
  const perms = groupedPermissions.value[resource] || [];
  const assignedCount = perms.filter(p => formModel.permissionIds.includes(p.id)).length;
  const totalCount = perms.length;

  let type: 'default' | 'success' | 'warning' | 'error' | 'primary' | 'info' = 'default';
  if (assignedCount === 0) {
    type = 'default';
  } else if (assignedCount === totalCount) {
    type = 'success';
  } else {
    type = 'warning';
  }

  return {
    assigned: assignedCount,
    total: totalCount,
    text: `${assignedCount} / ${totalCount}`,
    type
  };
}

async function getRoles() {
  startLoading();
  const { data, error } = await fetchGetRoles({
    page: pagination.page,
    limit: pagination.pageSize,
    keyword: searchParams.keyword || undefined
  });
  
  if (!error && data) {
    if ('items' in data) {
      // Filter out player role and roles higher than current user's level (unless super admin)
      roleData.value = data.items.filter(role => {
        if (role.slug === 'player') return false;
        if (authStore.isStaticSuper || authStore.userInfo.roles.includes('R_SUPER')) return true;
        return role.level <= (authStore.userInfo.currentRoleLevel || 0);
      });
      total.value = data.total;
      pagination.itemCount = data.total;
    } else {
      roleData.value = data.filter(role => {
        if (role.slug === 'player') return false;
        if (authStore.isStaticSuper || authStore.userInfo.roles.includes('R_SUPER')) return true;
        return role.level <= (authStore.userInfo.currentRoleLevel || 0);
      });
      total.value = data.length;
      pagination.itemCount = data.length;
    }
  }
  endLoading();
}

function handleSearch() {
  pagination.page = 1;
  getRoles();
}

function handleReset() {
  searchParams.keyword = '';
  handleSearch();
}

const canViewLevel = computed(() => {
  return authStore.isStaticSuper || authStore.userInfo.roles.includes('R_SUPER') || (authStore.userInfo.currentRoleLevel === 100);
});

const columns = computed<DataTableColumns<Api.Management.Role>>(() => {
  const cols: DataTableColumns<Api.Management.Role> = [
    {
      title: 'Name',
      key: 'name',
      minWidth: 120
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
      title: 'Description',
      key: 'description',
      minWidth: 200
    },
    // Conditionally include Level column
    ...(canViewLevel.value ? [{
      title: 'Level',
      key: 'level',
      width: 80,
      sorter: (row1: Api.Management.Role, row2: Api.Management.Role) => row1.level - row2.level
    }] : []),
    {
      title: 'System Role',
      key: 'isSystem',
      width: 100,
      render(row) {
        return <NTag type={row.isSystem ? 'warning' : 'default'}>{row.isSystem ? 'System' : 'Custom'}</NTag>;
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render(row) {
        return (
          <NSpace justify="center">
            <NButton quaternary size="small" type="primary" onClick={() => handleView(row)}>
               {{ icon: () => <icon-carbon-view class="text-20px" /> }}
            </NButton>
            {hasAuth('roles:update') && (
              <NButton quaternary size="small" type="primary" onClick={() => handleEdit(row)}>
                 {{ icon: () => <icon-carbon-edit class="text-20px" /> }}
              </NButton>
            )}
            {hasAuth('roles:delete') && !row.isSystem && (
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
  return cols;
});

function handleAdd() {
  isEdit.value = false;
  isView.value = false;
  tabName.value = 'general';
  Object.assign(formModel, { id: '', name: '', slug: '', description: '', level: 1, permissionIds: [] });
  openModal();
}

function handleEdit(row: Api.Management.Role) {
  isEdit.value = true;
  isView.value = false;
  tabName.value = 'general';
  Object.assign(formModel, {
    ...row,
    permissionIds: row.permissions?.map(p => p.id) || []
  });
  openModal();
}

function handleView(row: Api.Management.Role) {
  isView.value = true;
  isEdit.value = false;
  tabName.value = 'general';
  Object.assign(formModel, {
    ...row,
    permissionIds: row.permissions?.map(p => p.id) || []
  });
  openModal();
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteRole(id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    getRoles();
  }
}

async function handleSubmit() {
  const api = isEdit.value ? fetchUpdateRole : fetchCreateRole;
  const payload = { ...formModel };
  
  // Clean payload
  if (!isEdit.value) delete (payload as any).id;

  let error;
  if (isEdit.value) {
    ({ error } = await fetchUpdateRole(formModel.id, payload));
  } else {
    ({ error } = await fetchCreateRole(payload));
  }
  
  if (!error) {
    window.$message?.success(isEdit.value ? $t('common.modifySuccess') : $t('common.addSuccess'));
    closeModal();
    getRoles();
  }
}

// Init
getRoles();
getPermissions();
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="Role" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NButton v-if="hasAuth('roles:create')" type="primary" @click="handleAdd">
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
          :data="roleData"
          :loading="loading"
          :pagination="pagination"
          :remote="true"
          :item-count="total"
          flex-height
          class="flex-1-hidden"
        />
      </div>
    </NCard>

    <NModal v-model:show="visible" preset="card" :title="isView ? $t('common.view') : (isEdit ? $t('common.edit') : $t('common.add'))" class="w-800px">
      <NForm :model="formModel" label-placement="left" label-width="100">
        <NTabs v-model:value="tabName" type="line" animated>
          <template #suffix>
            <div v-if="tabName === 'permissions'" class="pr-4 flex items-center h-full">
              <NButton size="tiny" quaternary @click="toggleAllExpanded">
                {{ expandedGroups.length === Object.keys(groupedPermissions).length ? 'Collapse All' : 'Expand All' }}
              </NButton>
            </div>
          </template>
          <NTabPane name="general" tab="General Info">
            <div class="py-4">
              <NFormItem label="Name" path="name">
                <NInput v-model:value="formModel.name" placeholder="Enter role name" :disabled="isView || formModel.slug === 'super_admin'" />
              </NFormItem>
              <NFormItem label="Slug" path="slug">
                <NInput v-model:value="formModel.slug" placeholder="Enter role slug" :disabled="isView || isEdit" />
              </NFormItem>
              <NFormItem v-if="canViewLevel" label="Level" path="level">
                <NInputNumber 
                  v-model:value="formModel.level" 
                  :min="1" 
                  :max="formModel.level === 100 || formModel.slug === 'super_admin' ? 100 : 99" 
                  :disabled="isView || formModel.slug === 'super_admin' || formModel.level === 100"
                  class="w-full"
                />
              </NFormItem>
              <NFormItem label="Description" path="description">
                <NInput v-model:value="formModel.description" type="textarea" placeholder="Enter description" :disabled="isView" />
              </NFormItem>
            </div>
          </NTabPane>
          
          <NTabPane name="permissions" tab="Permissions">
            <NScrollbar class="max-h-500px pr-4">
              <div class="py-2 px-1">
                <NCollapse v-model:expanded-names="expandedGroups">
                  <template v-if="isView">
                    <NCollapseItem v-for="(perms, resource) in selectedGroupedPermissions" :key="resource" :name="resource">
                      <template #header>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-gray-700 capitalize text-15px">{{ resource }}</span>
                          <NTag size="small" round :bordered="false" class="ml-2">
                            {{ perms.length }}
                          </NTag>
                        </div>
                      </template>
                      <div class="pl-4 py-2 border-l-2 border-gray-100 ml-1">
                         <NGrid :cols="3" :x-gap="12" :y-gap="12">
                           <NGridItem v-for="p in perms" :key="p.id">
                             <NTag :bordered="false" type="info" size="small">{{ p.name }}</NTag>
                           </NGridItem>
                         </NGrid>
                      </div>
                    </NCollapseItem>
                  </template>
                  <template v-else>
                    <NCollapseItem v-for="(perms, resource) in groupedPermissions" :key="resource" :name="resource">
                      <template #header>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-gray-700 capitalize text-15px">{{ resource }}</span>
                          <NTag size="small" round :bordered="false" class="ml-2" :type="getPermissionStatus(resource).type">
                            {{ getPermissionStatus(resource).text }}
                          </NTag>
                        </div>
                      </template>
                      <div class="pl-4 py-2 border-l-2 border-gray-100 ml-1">
                        <NCheckboxGroup v-model:value="formModel.permissionIds">
                          <NGrid :cols="3" :x-gap="12" :y-gap="12">
                            <NGridItem v-for="p in perms" :key="p.id">
                              <NCheckbox :value="p.id" :label="p.name" />
                            </NGridItem>
                          </NGrid>
                        </NCheckboxGroup>
                      </div>
                    </NCollapseItem>
                  </template>
                </NCollapse>
              </div>
            </NScrollbar>
          </NTabPane>
        </NTabs>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="closeModal">{{ $t('common.cancel') }}</NButton>
          <NButton v-if="!isView" type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>
