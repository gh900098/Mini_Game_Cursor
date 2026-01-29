<script setup lang="tsx">
import { ref } from 'vue';
import { NCard, NDataTable, NTag, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetMembers } from '@/service/api/management';
import { useLoading } from '@sa/hooks';
import { useAuthStore } from '@/store/modules/auth';

const { loading, startLoading, endLoading } = useLoading();
const authStore = useAuthStore();
const members = ref<Api.Management.Member[]>([]);

const columns: DataTableColumns<Api.Management.Member> = [
  {
    title: 'Username',
    key: 'username',
    render(row) {
      return <span>{row.username || 'Guest'}</span>;
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
    title: 'External ID',
    key: 'externalId',
    render(row) {
      return <span class="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{row.externalId || 'None'}</span>;
    }
  },
  {
    title: 'Points Balance',
    key: 'pointsBalance',
    render(row) {
      return <span class="font-bold text-primary">{row.pointsBalance}</span>;
    }
  },
  {
    title: 'Type',
    key: 'isAnonymous',
    render(row) {
      return row.isAnonymous ? <NTag type="warning">Guest</NTag> : <NTag type="success">Member</NTag>;
    }
  },
  {
    title: 'Creation Date',
    key: 'createdAt',
    render(row) {
      return <span>{new Date(row.createdAt).toLocaleString()}</span>;
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

getMembers();
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="Platform Members (Players)" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <NDataTable
        :columns="columns"
        :data="members"
        :loading="loading"
        flex-height
        class="h-full"
      />
    </NCard>
  </div>
</template>
