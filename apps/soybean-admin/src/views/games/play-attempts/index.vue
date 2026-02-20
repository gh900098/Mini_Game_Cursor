<script setup lang="tsx">
import { ref, reactive, watch } from 'vue';
import { NCard, NDataTable, NTag, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetPlayAttempts } from '@/service/api/management';
import { useLoading } from '@sa/hooks';
import { useAuthStore } from '@/store/modules/auth';

const { loading, startLoading, endLoading } = useLoading();
const authStore = useAuthStore();
const playAttempts = ref<Api.Management.PlayAttempt[]>([]);
const total = ref(0);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    pagination.page = page;
    getPlayAttempts();
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    getPlayAttempts();
  }
});

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
  const companyId = currentCompanyId === 'ALL' || !currentCompanyId ? undefined : currentCompanyId;

  const { data: resData, error } = await fetchGetPlayAttempts({ 
    companyId,
    page: pagination.page,
    limit: pagination.pageSize
  } as any);
  
  if (!error) {
    if (Array.isArray(resData)) {
      playAttempts.value = resData;
      total.value = resData.length;
    } else {
      playAttempts.value = (resData as any).items || [];
      total.value = (resData as any).total || 0;
    }
  }
  endLoading();
}

watch(
  () => authStore.userInfo.currentCompanyId,
  () => {
    getPlayAttempts();
  }
);

getPlayAttempts();
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="Play Attempts (Transaction History)" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NSpace>
          <span class="text-sm text-gray-500">Total: {{ total }}</span>
        </NSpace>
      </template>
      <div class="flex-col h-full">
        <NDataTable
          :columns="columns"
          :data="playAttempts"
          :loading="loading"
          flex-height
          class="flex-1-hidden"
          remote
          :pagination="pagination"
          :item-count="total"
        />
      </div>
    </NCard>
  </div>
</template>
