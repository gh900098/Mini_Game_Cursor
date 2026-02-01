<script setup lang="tsx">
import { ref } from 'vue';
import { NCard, NDataTable, NTag, NSpace, NButton, NPopconfirm } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useRouter } from 'vue-router';
import { fetchGetMembers, fetchToggleMemberStatus } from '@/service/api/management';
import { useLoading } from '@sa/hooks';
import { useAuthStore } from '@/store/modules/auth';

const { loading, startLoading, endLoading } = useLoading();
const authStore = useAuthStore();
const router = useRouter();
const members = ref<Api.Management.Member[]>([]);

const columns: DataTableColumns<Api.Management.Member> = [
  {
    title: 'ID',
    key: 'id',
    width: 80,
    render(row) {
      return <span class="font-mono text-gray-600">#{row.id}</span>;
    }
  },
  {
    title: 'Username',
    key: 'username',
    render(row) {
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
    render(row: any) {
      return <span>{row.company?.name || '-'}</span>;
    }
  },
  {
    title: 'Points',
    key: 'pointsBalance',
    width: 100,
    render(row) {
      return <span class="font-bold text-primary text-lg">{row.pointsBalance}</span>;
    }
  },
  {
    title: 'Level',
    key: 'level',
    width: 80,
    render(row) {
      return <span class="font-semibold">Lv.{row.level || 1}</span>;
    }
  },
  {
    title: 'VIP',
    key: 'vipTier',
    width: 80,
    render(row) {
      if (!row.vipTier) return <span class="text-gray-400">-</span>;
      return <NTag type="warning">VIP {row.vipTier}</NTag>;
    }
  },
  {
    title: 'Type',
    key: 'isAnonymous',
    width: 100,
    render(row) {
      return row.isAnonymous ? <NTag type="warning">Guest</NTag> : <NTag type="success">Member</NTag>;
    }
  },
  {
    title: 'Status',
    key: 'isActive',
    width: 100,
    render(row) {
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
    render(row) {
      return <span class="text-sm">{new Date(row.createdAt).toLocaleString()}</span>;
    }
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 220,
    fixed: 'right' as const,
    render(row) {
      return (
        <NSpace>
          <NButton
            size="small"
            type="primary"
            onClick={() => viewDetail(row.id)}
          >
            View
          </NButton>
          <NPopconfirm
            onPositiveClick={() => toggleStatus(row.id, !row.isActive)}
          >
            {{
              default: () => `${row.isActive ? 'Disable' : 'Enable'} this member?`,
              trigger: () => (
                <NButton
                  size="small"
                  type={row.isActive ? 'warning' : 'success'}
                >
                  {row.isActive ? 'Disable' : 'Enable'}
                </NButton>
              )
            }}
          </NPopconfirm>
        </NSpace>
      );
    }
  }
];

async function getMembers() {
  startLoading();
  const currentCompanyId = authStore.userInfo.currentCompanyId;
  const { data, error } = await fetchGetMembers({ companyId: currentCompanyId || undefined });
  if (!error) {
    members.value = data;
  }
  endLoading();
}

function viewDetail(memberId: number) {
  router.push(`/management/member/${memberId}`);
}

async function toggleStatus(memberId: number, isActive: boolean) {
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
      <NDataTable
        :columns="columns"
        :data="members"
        :loading="loading"
        :scroll-x="1400"
        flex-height
        class="h-full"
      />
    </NCard>
  </div>
</template>
