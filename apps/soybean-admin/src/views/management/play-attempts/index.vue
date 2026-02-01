<script setup lang="tsx">
import { ref } from 'vue';
import { NCard, NDataTable, NTag, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetPlayAttempts } from '@/service/api/management';
import { useLoading } from '@sa/hooks';
import { useAuthStore } from '@/store/modules/auth';

const { loading, startLoading, endLoading } = useLoading();
const authStore = useAuthStore();
const playAttempts = ref<Api.Management.PlayAttempt[]>([]);

const columns: DataTableColumns<Api.Management.PlayAttempt> = [
  {
    title: 'Time',
    key: 'attemptedAt',
    width: 180,
    render(row) {
      return <span>{new Date(row.attemptedAt).toLocaleString()}</span>;
    }
  },
  {
    title: 'Player',
    key: 'member',
    render(row: any) {
      return <span>{row.member?.username || row.member?.externalId || 'Guest'}</span>;
    }
  },
  {
    title: 'Game Instance',
    key: 'instance',
    render(row: any) {
      return <span>{row.instance?.name || '-'}</span>;
    }
  },
  {
    title: 'Company',
    key: 'company',
    render(row: any) {
      return <span>{row.instance?.company?.name || '-'}</span>;
    }
  },
  {
    title: 'Status',
    key: 'success',
    width: 100,
    render(row) {
      return row.success 
        ? <NTag type="success">Success</NTag> 
        : <NTag type="error">Failed</NTag>;
    }
  },
  {
    title: 'IP Address',
    key: 'ipAddress',
    width: 150,
    render(row) {
      return <span class="font-mono text-xs">{row.ipAddress || '-'}</span>;
    }
  }
];

async function getPlayAttempts() {
  startLoading();
  const currentCompanyId = authStore.userInfo.currentCompanyId;
  const { data, error } = await fetchGetPlayAttempts({ companyId: currentCompanyId || undefined });
  if (!error) {
    playAttempts.value = data;
  }
  endLoading();
}

getPlayAttempts();
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="Play Attempts (Transaction History)" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NSpace>
          <span class="text-sm text-gray-500">Total: {{ playAttempts.length }}</span>
        </NSpace>
      </template>
      <NDataTable
        :columns="columns"
        :data="playAttempts"
        :loading="loading"
        flex-height
        class="h-full"
        :pagination="{ pageSize: 50 }"
      />
    </NCard>
  </div>
</template>
