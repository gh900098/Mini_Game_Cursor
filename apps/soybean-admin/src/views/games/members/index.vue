<script setup lang="tsx">
import { ref, computed, reactive, watch } from 'vue';
import { NCard, NDataTable, NTag, NSpace, NButton, NPopconfirm, NModal, NInput } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetAdminMembers, fetchToggleMemberStatus, fetchDeleteMember, fetchImpersonateMember, fetchResetMemberPassword, fetchAdjustMemberCredits } from '@/service/api/management';
import { useLoading, useBoolean } from '@sa/hooks';
import { useAuthStore } from '@/store/modules/auth';
import ButtonIcon from '@/components/custom/button-icon.vue';
import OperateDrawer from './modules/operate-drawer.vue';
import MemberDetail from '../member-detail/[id].vue';

const { loading, startLoading, endLoading } = useLoading();
const { bool: drawerVisible, setTrue: openDrawer } = useBoolean();
const authStore = useAuthStore();
// const router = useRouter(); // No longer needed for details
const showDetailModal = ref(false);
const selectedMemberId = ref('');

const operateType = ref<'add' | 'edit'>('add');
const editingData = ref<Api.Management.Member | null>(null);

const hasDeletePermission = computed(() => {
  const roles = authStore.userInfo.roles || [];
  return roles.some(role => ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role));
});

const columns: DataTableColumns<Api.Management.Member> = [
  {
    title: 'Username',
    key: 'username',
    minWidth: 150,
    ellipsis: { tooltip: true },
    render(row: any) {
      return (
        <div class="flex flex-col">
          <span class="font-medium">{row.username || 'Guest'}</span>
          {row.externalId && (
            <span class="text-xs text-gray-500 font-mono">ext: {row.externalId}</span>
          )}
        </div>
      );
    }
  },
  {
    title: 'Company',
    key: 'company',
    minWidth: 150,
    ellipsis: { tooltip: true },
    render(row: any) {
      return <span>{row.company?.name || '-'}</span>;
    }
  },
  {
    title: 'Points',
    key: 'pointsBalance',
    width: 100,
    render(row: any) {
      return <span class="font-bold text-primary text-lg">{row.pointsBalance}</span>;
    }
  },
  {
    title: 'Level',
    key: 'level',
    width: 80,
    render(row: any) {
      return <span class="font-semibold">Lv.{row.level || 1}</span>;
    }
  },
  {
    title: 'VIP',
    key: 'vipTier',
    width: 80,
    render(row: any) {
      if (!row.vipTier) return <span class="text-gray-400">-</span>;
      return <NTag type="warning">VIP {row.vipTier}</NTag>;
    }
  },
  {
    title: 'Type',
    key: 'isAnonymous',
    width: 100,
    render(row: any) {
      return row.isAnonymous ? <NTag type="warning">Guest</NTag> : <NTag type="success">Member</NTag>;
    }
  },
  {
    title: 'Status',
    key: 'isActive',
    width: 100,
    render(row: any) {
      return row.isActive ? (
        <NTag type="success">Active</NTag>
      ) : (
        <NTag type="error">Disabled</NTag>
      );
    }
  },
  {
    title: 'Created',
    key: 'createdAt',
    width: 180,
    render(row: any) {
      return <span class="text-sm">{new Date(row.createdAt).toLocaleString()}</span>;
    }
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 280,
    fixed: 'right' as const,
    render(row: any) {
      return (
        <div class="flex-center gap-2">
          <NTooltip>
            {{
              trigger: () => (
                <NButton size="small" quaternary circle onClick={() => viewDetail(row.id)}>
                  <icon-mdi-eye class="text-xl" />
                </NButton>
              ),
              default: () => 'View Details'
            }}
          </NTooltip>
          
          <NTooltip>
             {{
              trigger: () => (
                <NButton size="small" quaternary circle type="primary" onClick={() => handleEdit(row)}>
                  <icon-mdi-pencil class="text-xl" />
                </NButton>
              ),
              default: () => 'Edit'
             }}
          </NTooltip>

          <NPopconfirm onPositiveClick={() => toggleStatus(row.id, !row.isActive)}>
            {{
              default: () => `${row.isActive ? 'Disable' : 'Enable'} this member?`,
              trigger: () => (
                <NTooltip>
                  {{
                    trigger: () => (
                      <NButton 
                        size="small" 
                        quaternary 
                        circle 
                        type={row.isActive ? 'warning' : 'success'}
                      >
                         {row.isActive ? <icon-mdi-account-off class="text-xl" /> : <icon-mdi-account-check class="text-xl" />}
                      </NButton>
                    ),
                    default: () => row.isActive ? 'Disable Member' : 'Enable Member'
                  }}
                </NTooltip>
              )
            }}
          </NPopconfirm>

          <NTooltip>
             {{
              trigger: () => (
                <NButton size="small" quaternary circle type="warning" onClick={() => handleImpersonate(row.id)}>
                  <icon-mdi-account-switch class="text-xl" />
                </NButton>
              ),
              default: () => 'Impersonate'
             }}
          </NTooltip>

          <NTooltip>
             {{
              trigger: () => (
                <NButton size="small" quaternary circle type="primary" onClick={() => handleResetPassword(row)}>
                  <icon-mdi-key-variant class="text-xl" />
                </NButton>
              ),
              default: () => 'Reset Password'
             }}
          </NTooltip>

          <NTooltip>
             {{
              trigger: () => (
                <NButton size="small" quaternary circle type="success" onClick={() => handleAdjustCredits(row)}>
                  <icon-mdi-cash-plus class="text-xl" />
                </NButton>
              ),
              default: () => 'Adjust Credits'
             }}
          </NTooltip>

          {hasDeletePermission.value && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
              {{
                  default: () => 'Are you sure to delete?',
                  trigger: () => (
                    <NTooltip>
                      {{
                        trigger: () => (
                          <NButton size="small" quaternary circle type="error">
                            <icon-mdi-delete class="text-xl" />
                          </NButton>
                        ),
                        default: () => 'Delete'
                      }}
                    </NTooltip>
                  )
              }}
            </NPopconfirm>
          )}
        </div>
      );
    }
  }
];

const members = ref<Api.Management.Member[]>([]);
const searchForm = ref({
  username: '',
  externalId: ''
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix: (info: { itemCount: number | undefined }) => `Total ${info.itemCount || 0}`,
});

watch(
  () => authStore.userInfo.currentCompanyId,
  () => {
    pagination.page = 1;
    getMembers();
  }
);

async function getMembers() {
  startLoading();
  const currentCompanyId = authStore.userInfo.currentCompanyId;
  const companyId = (currentCompanyId && currentCompanyId !== 'ALL') ? currentCompanyId : undefined;
  
  const { data, error } = await fetchGetAdminMembers({ 
    companyId,
    page: pagination.page,
    limit: pagination.pageSize,
    username: searchForm.value.username || undefined,
    externalId: searchForm.value.externalId || undefined
  });
  
  if (!error && data) {
    if (Array.isArray(data)) {
        // Fallback for legacy response or flat array
        members.value = data;
        pagination.itemCount = data.length;
    } else {
        // New paginated response
        members.value = data.items;
        pagination.itemCount = data.meta.total;
    }
  }
  endLoading();
}

function handlePageChange(page: number) {
  pagination.page = page;
  getMembers();
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize;
  pagination.page = 1;
  getMembers();
}

function handleSearch() {
  pagination.page = 1;
  getMembers();
}

function handleResetSearch() {
  searchForm.value.username = '';
  searchForm.value.externalId = '';
  handleSearch();
}

function handleAdd() {
  operateType.value = 'add';
  editingData.value = null;
  openDrawer();
}

function handleEdit(row: Api.Management.Member) {
  operateType.value = 'edit';
  editingData.value = row;
  openDrawer();
}

async function handleResetPassword(row: Api.Management.Member) {
  const d = window.$dialog?.info({
    title: 'Reset Password',
    content: () => (
        <div class="pt-4">
            <p class="mb-2">Enter new password for <b>{row.username}</b>:</p>
            <input 
                type="password" 
                id="reset-password-input"
                class="w-full p-2 border rounded border-gray-300 dark:bg-gray-800 dark:border-gray-700" 
                placeholder="New Password"
            />
        </div>
    ),
    positiveText: 'Reset',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      const input = document.getElementById('reset-password-input') as HTMLInputElement;
      const password = input?.value;
      if (!password) {
        window.$message?.error('Password is required');
        return false;
      }
      if (password.length < 6) {
        window.$message?.error('Password must be at least 6 characters');
        return false;
      }
      
      const { error } = await fetchResetMemberPassword(row.id, { password });
      if (!error) {
        window.$message?.success('Password reset successfully');
        return true;
      }
      return false;
    }
  });
}

async function handleAdjustCredits(row: Api.Management.Member) {
  const d = window.$dialog?.info({
    title: 'Adjust Credits',
    content: () => (
        <div class="pt-4 flex flex-col gap-4">
            <div>
                <p class="mb-2">Adjust credits for <b>{row.username}</b>:</p>
                <select 
                    id="adjust-type-select"
                    class="w-full p-2 border rounded border-gray-300 dark:bg-gray-800 dark:border-gray-700 mb-2"
                >
                    <option value="credit">Credit (Add Points)</option>
                    <option value="debit">Debit (Deduct Points)</option>
                </select>
                <input 
                    type="number" 
                    id="adjust-amount-input"
                    class="w-full p-2 border rounded border-gray-300 dark:bg-gray-800 dark:border-gray-700" 
                    placeholder="Amount"
                    min="1"
                />
            </div>
            <div>
                <p class="mb-2">Reason:</p>
                <textarea 
                    id="adjust-reason-input"
                    class="w-full p-2 border rounded border-gray-300 dark:bg-gray-800 dark:border-gray-700" 
                    placeholder="Enter reason for adjustment"
                    rows={3}
                ></textarea>
            </div>
        </div>
    ),
    positiveText: 'Submit',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      const typeInput = document.getElementById('adjust-type-select') as HTMLSelectElement;
      const amountInput = document.getElementById('adjust-amount-input') as HTMLInputElement;
      const reasonInput = document.getElementById('adjust-reason-input') as HTMLTextAreaElement;
      
      const type = typeInput?.value as 'credit' | 'debit';
      const amount = parseInt(amountInput?.value || '0', 10);
      const reason = reasonInput?.value || '';
      
      if (!amount || amount <= 0) {
        window.$message?.error('Amount must be greater than 0');
        return false;
      }
      if (!reason.trim()) {
        window.$message?.error('Reason is required');
        return false;
      }
      
      const { error } = await fetchAdjustMemberCredits(row.id, { amount, reason, type });
      if (!error) {
        window.$message?.success('Credits adjusted successfully');
        getMembers(); // Refresh list
        return true;
      }
      return false;
    }
  });
}

async function handleImpersonate(id: string) {
  try {
    const result = await fetchImpersonateMember(id);
    if (result.data) {
      const { token, redirectUrl } = result.data;
      if (token && redirectUrl) {
          const finalUrl = `${redirectUrl}?token=${token}`;
          window.open(finalUrl, '_blank');
          window.$message?.success('Impersonation started in new tab');
      }
    }
  } catch (error) {
      // Error handled by interceptor or just log
      console.error(error);
  }
}

async function handleDelete(id: string) {
    const { error } = await fetchDeleteMember(id);
    if (!error) {
        window.$message?.success('Deleted successfully');
        getMembers();
    }
}

function viewDetail(memberId: string) {
  console.log('viewDetail clicked with ID:', memberId);
  if (!memberId) {
      window.$message?.error('Error: Member ID is missing!');
      return;
  }
  selectedMemberId.value = memberId;
  showDetailModal.value = true;
}

async function toggleStatus(memberId: string, isActive: boolean) {
  const { error } = await fetchToggleMemberStatus(memberId, { isActive });
  if (!error) {
    window.$message?.success(`Member ${isActive ? 'enabled' : 'disabled'} successfully`);
    getMembers(); // Refresh list
  }
}

getMembers();
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="Platform Members (Players)" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NButton type="primary" @click="handleAdd">
          Add Member
        </NButton>
      </template>
      <div class="flex-col h-full">
        <div class="mb-4 flex gap-4">
          <NInput v-model:value="searchForm.username" placeholder="Search by Username" clearable @keypress.enter="handleSearch" />
          <NInput v-model:value="searchForm.externalId" placeholder="Search by External ID" clearable @keypress.enter="handleSearch" />
          <NButton type="primary" @click="handleSearch">Search</NButton>
          <NButton @click="handleResetSearch">Reset</NButton>
        </div>

        <NDataTable
          remote
          :columns="columns"
          :data="members"
          :loading="loading"
          :pagination="pagination"
          :scroll-x="1200"
          flex-height
          class="flex-1-hidden"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
      <OperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getMembers"
      />
      
      <!-- Member Detail Modal -->
      <NModal
        v-model:show="showDetailModal"
        class="w-11/12 max-w-7xl h-[90vh] flex flex-col"
        preset="card"
        title="Member Details"
        :bordered="false"
        :content-style="{ flex: '1', overflowY: 'auto' }"
      >
        <MemberDetail :member-id="selectedMemberId" :show-back="false" />
      </NModal>
    </NCard>
  </div>
</template>
