<script setup lang="tsx">
import { ref } from 'vue';
import { NCard, NDataTable, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetBudgetTracking } from '@/service/api/management';
import { useLoading } from '@sa/hooks';
import { useAuthStore } from '@/store/modules/auth';

const { loading, startLoading, endLoading } = useLoading();
const authStore = useAuthStore();
const budgetTracking = ref<Api.Management.BudgetTracking[]>([]);

const columns: DataTableColumns<Api.Management.BudgetTracking> = [
  {
    title: 'Date',
    key: 'trackingDate',
    width: 150,
    render(row) {
      return <span>{new Date(row.trackingDate).toLocaleDateString()}</span>;
    }
  },
  {
    title: 'Game Instance',
    key: 'instance',
    render(row: any) {
      return <div>
        <div class="font-bold">{row.instance?.name || '-'}</div>
        <div class="text-xs text-gray-500">{row.instance?.company?.name}</div>
      </div>;
    }
  },
  {
    title: 'Total Cost',
    key: 'totalCost',
    width: 150,
    render(row) {
      return <span class="font-bold text-red-500">${parseFloat(row.totalCost.toString()).toFixed(2)}</span>;
    }
  },
  {
    title: 'Play Count',
    key: 'playCount',
    width: 120,
    render(row) {
      return <span class="font-bold">{row.playCount}</span>;
    }
  },
  {
    title: 'Avg Cost/Play',
    key: 'avgCost',
    width: 150,
    render(row) {
      const avg = row.playCount > 0 ? parseFloat(row.totalCost.toString()) / row.playCount : 0;
      return <span class="font-mono text-sm">${avg.toFixed(3)}</span>;
    }
  }
];

async function getBudgetTracking() {
  startLoading();
  const currentCompanyId = authStore.userInfo.currentCompanyId;
  const { data, error } = await fetchGetBudgetTracking({ companyId: currentCompanyId || undefined });
  if (!error) {
    budgetTracking.value = data;
  }
  endLoading();
}

getBudgetTracking();
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="Budget Tracking" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NSpace>
          <span class="text-sm text-gray-500">Records: {{ budgetTracking.length }}</span>
        </NSpace>
      </template>
      <NDataTable
        :columns="columns"
        :data="budgetTracking"
        :loading="loading"
        flex-height
        class="h-full"
        :pagination="{ pageSize: 30 }"
      />
    </NCard>
  </div>
</template>
