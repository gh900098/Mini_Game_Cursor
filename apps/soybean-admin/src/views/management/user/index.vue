<script setup lang="tsx">
import { ref, computed, reactive, watch } from 'vue';
import { NTag, NSpace, NButton, NPopconfirm, NModal, NForm, NFormItem, NInput, NSelect, NCard, NDataTable, NRadio, NDivider, NTooltip, NTabs, NTabPane, NGrid, NGridItem } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { 
  fetchGetUsers, 
  fetchCreateUser, 
  fetchAddCompanyToUser, 
  fetchGetRoles, 
  fetchDeleteUser, 
  fetchUpdateUserCompanyRole, 
  fetchGetCompanies,
  fetchRemoveCompanyFromUser,
  fetchSetPrimaryCompany,
  fetchUpdateUser
} from '@/service/api/management';
import { useAuthStore } from '@/store/modules/auth';
import { useAuth } from '@/hooks/business/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useBoolean, useLoading } from '@sa/hooks';
import { $t } from '@/locales';
import PasswordCriteria from '@/components/common/password-criteria.vue';

const { hasAuth } = useAuth();
const { loading, startLoading, endLoading } = useLoading();
const { bool: visible, setTrue: openModal, setFalse: closeModal } = useBoolean();
const { formRef, validate } = useNaiveForm();
const authStore = useAuthStore();

const userData = ref<Api.Management.User[]>([]);
const availableRoles = ref<Api.Management.Role[]>([]);
const availableCompanies = ref<Api.Management.Company[]>([]);

const filteredUserData = computed(() => {
  const currentCompanyId = authStore.userInfo.currentCompanyId;
  if (!currentCompanyId) {
    return userData.value;
  }
  return userData.value.filter(user => 
    user.userCompanies?.some(uc => uc.companyId === currentCompanyId)
  );
});

const formModel = reactive({
  email: '',
  name: '',
  mobile: '',
  bio: '',
  description: '',
  remark: '',
  password: '',
  accesses: [] as Array<{ companyId: string; roleId: string; isPrimary: boolean; key: string }>
});

const { formRules } = useFormRules();

const rules = computed(() => {
  return {
    email: formRules.email,
    mobile: formRules.phone,
    // Add other rules as needed
  };
});

function addAccessRow() {
    const staffRole = availableRoles.value.find(r => r.slug === 'staff');
    formModel.accesses.push({
        companyId: '',
        roleId: staffRole?.id || '',
        isPrimary: formModel.accesses.length === 0,
        key: Math.random().toString(36).slice(2)
    });
}

function removeAccessRow(index: number) {
    if (formModel.accesses[index].isPrimary && formModel.accesses.length > 1) {
        const nextPrimary = index === 0 ? 1 : 0;
        formModel.accesses[nextPrimary].isPrimary = true;
    }
    formModel.accesses.splice(index, 1);
}

function setPrimaryRow(index: number) {
    formModel.accesses.forEach((acc, i) => {
        acc.isPrimary = i === index;
    });
}

const isSuper = computed(() => authStore.isStaticSuper || authStore.userInfo.roles.includes('R_SUPER') || authStore.userInfo.roles.includes('super_admin'));

const roleOptions = computed(() => {
  return availableRoles.value
    .filter(r => {
        if (r.slug === 'player') return false;
        if (isSuper.value) return true;
        return r.level <= (authStore.userInfo.currentRoleLevel || 0);
    })
    .map(r => ({
        label: r.name,
        value: r.id,
        disabled: !canAssignRole(r)
    }));
});

const companyOptions = computed(() => {
    return availableCompanies.value
        .filter(c => {
            if (isSuper.value) return true;
            const companyAuth = authStore.userInfo.companies.find(uc => uc.companyId === c.id);
            const perms = companyAuth?.permissions || [];
            return perms.includes('users:create') || perms.includes('users:update') || perms.includes('users:manage');
        })
        .map(c => ({
            label: c.name,
            value: c.id
        }));
});

function getFilteredCompanyOptions(currentIndex: number) {
    const selectedOtherCompanyIds = formModel.accesses
        .filter((_, i) => i !== currentIndex)
        .map(acc => acc.companyId)
        .filter(id => !!id);
    
    return companyOptions.value.filter(opt => !selectedOtherCompanyIds.includes(opt.value));
}

// No longer using single company watcher in multi-mode


function canAssignRole(role: Api.Management.Role) {
  if (authStore.isStaticSuper || authStore.userInfo.roles.includes('R_SUPER') || authStore.userInfo.roles.includes('super_admin')) {
      return true;
  }

  let myLevel = 0;
  authStore.userInfo.roles.forEach(slug => {
      const match = availableRoles.value.find(r => r.slug === slug || (slug === 'R_ADMIN' && r.slug === 'company_admin'));
      if (match && match.level > myLevel) {
          myLevel = match.level;
      }
  });

  if (myLevel === 0 && authStore.userInfo.roles.includes('R_ADMIN')) {
      myLevel = 80;
  }

  return myLevel >= role.level;
}

async function getUsers() {
  startLoading();
  const { data, error } = await fetchGetUsers();
  if (!error) {
    userData.value = data;
  }
  endLoading();
}

async function getRoles() {
  const { data, error } = await fetchGetRoles();
  if (!error) {
    availableRoles.value = data;
  }
}

async function getCompanies() {
    if (authStore.isStaticSuper || authStore.userInfo.roles.includes('R_SUPER')) {
        const { data, error } = await fetchGetCompanies();
        if (!error) {
            availableCompanies.value = data;
        }
    } else {
        // For Company Admins, populate from their own authorized companies
        availableCompanies.value = authStore.userInfo.companies.map(c => ({
            id: c.companyId,
            name: c.companyName,
            slug: '',
            isActive: true
        } as Api.Management.Company));
    }
}

const columns: DataTableColumns<Api.Management.User> = [
  {
    title: 'Email',
    key: 'email',
    minWidth: 150
  },
  {
    title: 'System Role',
    key: 'isSuperAdmin',
    width: 120,
    render(row) {
      if (row.isSuperAdmin) {
        return <NTag type="error">Super Admin</NTag>;
      }
      return <NTag type="success">User</NTag>;
    }
  },
  {
    title: 'Company Access',
    key: 'userCompanies',
    render(row) {
      if (!row.userCompanies || row.userCompanies.length === 0) return <span class="text-gray-400">None</span>;
      
      return (
        <NSpace vertical size="small">
          {row.userCompanies.map(uc => {
            const roleName = uc.role?.name || 'Unknown Role';
            const companyName = uc.company?.name || 'Unknown Company';
            
            return (
              <NTag size="small" type="info">
                {companyName} : {roleName}
              </NTag>
            );
          })}
        </NSpace>
      );
    }
  },
  {
    title: 'Action',
    key: 'action',
    width: 120,
    render(row) {
      const isSelf = row.email === authStore.userInfo.email;
      const targetIsSuper = row.isSuperAdmin;
      const amISuper = authStore.isStaticSuper || authStore.userInfo.roles.includes('R_SUPER');
      
      if (isSelf) return null;
      if (targetIsSuper && !amISuper) return null;

      return (
        <NSpace justify="center">
          {hasAuth('users:update') && (
            <NButton quaternary size="small" type="primary" onClick={() => handleEdit(row)}>
               {{ icon: () => <icon-carbon-edit class="text-20px" /> }}
            </NButton>
          )}
          {hasAuth('users:delete') && (
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

const isEdit = ref(false);
const editingUserId = ref('');
const isPwdFocused = ref(false);

function handleAdd() {
  isEdit.value = false;
  editingUserId.value = '';
  const currentCompanyId = authStore.userInfo.currentCompanyId;
  const staffRole = availableRoles.value.find(r => r.slug === 'staff');
  
  Object.assign(formModel, { 
      email: '', 
      name: '',
      mobile: '',
      bio: '',
      description: '',
      remark: '',
      password: '', 
      accesses: []
  });

  if (currentCompanyId) {
      formModel.accesses.push({
          companyId: currentCompanyId,
          roleId: staffRole?.id || '',
          isPrimary: true,
          key: 'init'
      });
  }
  
  openModal();
}

function handleEdit(row: Api.Management.User) {
  isEdit.value = true;
  editingUserId.value = row.id;
  
  Object.assign(formModel, {
    email: row.email,
    name: row.name || '',
    mobile: row.mobile || '',
    bio: row.bio || '',
    description: row.description || '',
    remark: row.remark || '',
    password: '',
    accesses: (row.userCompanies || []).map(uc => ({
        companyId: uc.companyId,
        roleId: uc.roleId,
        isPrimary: uc.isPrimary,
        key: uc.id
    }))
  });
  
  openModal();
}

async function handleDelete(id: string) {
    const { error } = await fetchDeleteUser(id);
    if (!error) {
        window.$message?.success($t('common.deleteSuccess'));
        getUsers();
    }
}

async function handleSubmit() {
    await validate();
    
    if (!formModel.email || (!isEdit.value && !formModel.password) || formModel.accesses.length === 0) {
        window.$message?.error('Please fill required fields and add at least one company access');
        return;
    }

    // Validate no duplicate companies
    const companyIds = formModel.accesses.map(a => a.companyId);
    if (new Set(companyIds).size !== companyIds.length) {
        window.$message?.error('Duplicate companies selected');
        return;
    }

    let userId = editingUserId.value;

    if (!isEdit.value) {
        // 1. Create User
        const { data: newUser, error: createError } = await fetchCreateUser({
            email: formModel.email,
            name: formModel.name || null,
            mobile: formModel.mobile || null,
            bio: formModel.bio || null,
            description: formModel.description || null,
            remark: formModel.remark || null,
            password: formModel.password
        });
        if (createError) return;
        userId = newUser.id;
    } else {
        // Update User Profile - Delta Update
        const originalUser = userData.value.find(u => u.id === userId);
        if (originalUser) {
            const updates: Record<string, any> = {};
            const fields = ['email', 'name', 'mobile', 'bio', 'description', 'remark'] as const;

            fields.forEach(field => {
                const originalValue = originalUser[field] || ''; // Normalize null/undefined to empty string
                const currentValue = formModel[field] || '';     // formModel is already normalized to strings

                if (originalValue !== currentValue) {
                    updates[field] = currentValue || null; // Send null if empty string
                }
            });

            // Handle password separately (it's not in originalUser as plain text)
            if (formModel.password) {
                updates.password = formModel.password;
            }

            // Only call update if there are changes
            if (Object.keys(updates).length > 0) {
                await fetchUpdateUser(userId, updates);
            }
        }
    }

    // 2. Sync Accesses
    const user = isEdit.value ? userData.value.find(u => u.id === userId) : null;
    const currentAccesses = user?.userCompanies || [];
    
    // Add or Update
    for (const acc of formModel.accesses) {
        const existing = currentAccesses.find(ca => ca.companyId === acc.companyId);
        if (!existing) {
            // Add new
            await fetchAddCompanyToUser(userId, {
                companyId: acc.companyId,
                roleId: acc.roleId,
                isPrimary: acc.isPrimary,
                isActive: true
            });
        } else {
            // Update role if changed
            if (existing.roleId !== acc.roleId) {
                await fetchUpdateUserCompanyRole(userId, acc.companyId, acc.roleId);
            }
            // Update primary if changed
            if (existing.isPrimary !== acc.isPrimary && acc.isPrimary) {
                await fetchSetPrimaryCompany(userId, acc.companyId);
            }
        }
    }

    // Remove
    if (isEdit.value) {
        const removed = currentAccesses.filter(ca => !formModel.accesses.find(a => a.companyId === ca.companyId));
        for (const r of removed) {
            await fetchRemoveCompanyFromUser(userId, r.companyId);
        }
    }

    window.$message?.success(isEdit.value ? $t('common.modifySuccess') : $t('common.addSuccess'));
    closeModal();
    getUsers();
}

getUsers();
getRoles();
getCompanies();
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="User" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NButton v-if="hasAuth('users:create')" type="primary" @click="handleAdd">
          <icon-ic-round-plus class="text-20px mr-1" />
          Add Staff
        </NButton>
      </template>

      <NDataTable
        :columns="columns"
        :data="filteredUserData"
        :loading="loading"
        flex-height
        class="h-full"
      />
    </NCard>

    <NModal v-model:show="visible" preset="card" :title="isEdit ? 'Edit Staff / Assign Company' : 'Add New Staff'" class="w-800px">
      <NForm ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="100">
        <!-- Hidden inputs to trick browser autofill -->
        <div style="width: 0; height: 0; overflow: hidden; opacity: 0; position: absolute;">
            <input type="text" name="fake_username_to_prevent_autofill" tabindex="-1" />
            <input type="password" name="fake_password_to_prevent_autofill" tabindex="-1" />
        </div>
        <NTabs type="line" animated>
          <NTabPane name="general" tab="General Info">
            <div class="py-4">
              <NFormItem label="Email" path="email">
                <NInput v-model:value="formModel.email" placeholder="Enter email" :disabled="isEdit" />
              </NFormItem>
              <NFormItem label="Name" path="name">
                <NInput v-model:value="formModel.name" placeholder="Enter full name" />
              </NFormItem>
              <NFormItem label="Mobile" path="mobile">
                <NInput v-model:value="formModel.mobile" placeholder="Enter mobile number" />
              </NFormItem>
              <NFormItem label="Bio" path="bio">
                <NInput v-model:value="formModel.bio" placeholder="Enter short bio" />
              </NFormItem>
              <NFormItem label="Description" path="description">
                <NInput v-model:value="formModel.description" type="textarea" placeholder="Enter detailed description" />
              </NFormItem>
              <NFormItem label="Remark" path="remark">
                <NInput v-model:value="formModel.remark" type="textarea" placeholder="Enter admin remark" />
              </NFormItem>
              <NFormItem label="Password" path="password">
                  <NPopover trigger="manual" placement="bottom" :show="isPwdFocused && !!formModel.password">
                    <template #trigger>
                      <div class="w-full">
                        <NInput
                            v-model:value="formModel.password"
                            type="password"
                            show-password-on="click"
                            :placeholder="isEdit ? 'Leave empty to keep unchanged' : 'Enter password'"
                            @focus="isPwdFocused = true"
                            @blur="isPwdFocused = false"
                            autocomplete="new-password"
                        />
                      </div>
                    </template>
                    <PasswordCriteria :password="formModel.password" />
                  </NPopover>
              </NFormItem>
            </div>
          </NTabPane>
          
          <NTabPane name="access" tab="Company Access">
            <div class="py-4">
              <NSpace vertical class="w-full">
                <div v-if="formModel.accesses.length > 0" class="grid grid-cols-12 gap-4 px-4 mb-2 text-gray-500 font-bold">
                  <div class="col-span-5">Company</div>
                  <div class="col-span-4">Role</div>
                  <div class="col-span-2 text-center">Primary</div>
                  <div class="col-span-1"></div>
                </div>

                <div v-for="(access, index) in formModel.accesses" :key="access.key" class="grid grid-cols-12 gap-4 items-center bg-gray-50/50 p-4 rounded-8px border border-gray-100 hover:border-primary/30 transition-colors">
                  <div class="col-span-5">
                    <NSelect v-model:value="access.companyId" :options="getFilteredCompanyOptions(index)" placeholder="Select Company" />
                  </div>
                  <div class="col-span-4">
                    <NSelect v-model:value="access.roleId" :options="roleOptions" placeholder="Select Role" />
                  </div>
                  <div class="col-span-2 flex justify-center">
                    <NTooltip trigger="hover">
                      <template #trigger>
                        <NRadio :checked="access.isPrimary" @change="() => setPrimaryRow(index)" />
                      </template>
                      Set as primary company
                    </NTooltip>
                  </div>
                  <div class="col-span-1 flex justify-end">
                    <NButton circle type="error" quaternary @click="() => removeAccessRow(index)">
                      <template #icon>
                        <icon-carbon-trash-can class="text-16px" />
                      </template>
                    </NButton>
                  </div>
                </div>
                
                <NButton dashed block class="mt-4" @click="addAccessRow">
                  <icon-ic-round-plus class="text-18px mr-1" />
                  Add More Company Access
                </NButton>
              </NSpace>
            </div>
          </NTabPane>
        </NTabs>
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
