<script setup lang="tsx">
import { ref } from 'vue';
import { NCard, NDataTable, NSpace, NProgress, NButton, NDrawer, NDrawerContent, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetBudgetTracking, fetchGetBudgetLedger } from '@/service/api/management';
import { useLoading } from '@sa/hooks';
import { useAuthStore } from '@/store/modules/auth';

const { loading, startLoading, endLoading } = useLoading();
const authStore = useAuthStore();
const budgetTracking = ref<Api.Management.BudgetTracking[]>([]);
const ledgerList = ref<Api.Management.BudgetLedger[]>([]);
const isLedgerVisible = ref(false);
const ledgerLoading = ref(false);

const columns: DataTableColumns<Api.Management.BudgetTracking> = [
  {
    title: 'Date',
    key: 'trackingDate',
    width: 120,
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
    title: 'Spent / Budget',
    key: 'budget',
    width: 200,
    render(row) {
      const budget = Number(row.totalBudget || 0);
      const spent = parseFloat(row.totalCost.toString());
      const percent = budget > 0 ? (spent / budget) * 100 : 0;
      const status = percent >= 100 ? 'error' : percent >= 80 ? 'warning' : 'success';
      
      return (
        <div class="w-full">
          <div class="flex justify-between text-xs mb-1">
            <span class="font-bold text-red-500">${spent.toFixed(2)}</span>
            <span class="text-gray-400">/ ${budget > 0 ? budget.toFixed(0) : '∞'}</span>
          </div>
          {budget > 0 && (
            <NProgress
              type="line"
              percentage={Math.min(100, Math.round(percent))}
              status={status}
              indicator-placement="inside"
              height={16}
              border-radius={4}
            />
          )}
        </div>
      );
    }
  },
  {
    title: 'Play Count',
    key: 'playCount',
    width: 100,
    render(row) {
      return <span class="font-bold">{row.playCount}</span>;
    }
  },
  {
    title: 'Avg Cost/Play',
    key: 'avgCost',
    width: 120,
    render(row) {
      const avg = row.playCount > 0 ? parseFloat(row.totalCost.toString()) / row.playCount : 0;
      return <span class="font-mono text-sm">${avg.toFixed(3)}</span>;
    }
  }
];

const ledgerColumns: DataTableColumns<Api.Management.BudgetLedger> = [
  {
    title: 'Time',
    key: 'createdAt',
    width: 180,
    render(row) {
      return <span>{new Date(row.createdAt).toLocaleString()}</span>;
    }
  },
  {
    title: 'Type',
    key: 'type',
    width: 100,
    render(row) {
      const typeMap: Record<string, { label: string; type: 'error' | 'success' | 'info' }> = {
        DEDUCTION: { label: 'Deduction', type: 'error' },
        TOP_UP: { label: 'Top-up', type: 'success' },
        REFUND: { label: 'Refund', type: 'info' }
      };
      const { label, type } = typeMap[row.type] || { label: row.type, type: 'info' };
      return <NTag type={type} size="small">{label}</NTag>;
    }
  },
  {
    title: 'Amount',
    key: 'amount',
    width: 100,
    render(row) {
      return <span class="font-bold text-red-500">-${parseFloat(row.amount.toString()).toFixed(2)}</span>;
    }
  },
  {
    title: 'Reference',
    key: 'reference',
    render(row) {
      return (
        <div class="text-xs">
          <div class="font-bold">{row.referenceType}: {row.referenceId?.slice(-8)}</div>
          <div class="text-gray-500">{row.metadata?.prizeName || '-'}</div>
        </div>
      );
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

async function viewLedger() {
  isLedgerVisible.value = true;
  ledgerLoading.value = true;
  const currentCompanyId = authStore.userInfo.currentCompanyId;
  const { data, error } = await fetchGetBudgetLedger({ companyId: currentCompanyId || undefined });
  if (!error) {
    ledgerList.value = data;
  }
  ledgerLoading.value = false;
}

getBudgetTracking();
</script>

<template>
  <div class="h-full flex-col p-4">
    <NCard title="Budget Tracking" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NSpace align="center">
          <span class="text-sm text-gray-500">Records: {{ budgetTracking.length }}</span>
          <NButton type="primary" secondary size="small" @click="viewLedger">
            View Ledger
          </NButton>
          <NButton type="primary" size="small" @click="getBudgetTracking">
            Refresh
          </NButton>
        </NSpace>
      </template>
      <NDataTable
        :columns="columns"
        :data="budgetTracking"
        :loading="loading"
        flex-height
        class="h-full"
        :pagination="{ pageSize: 20 }"
      />
    </NCard>

    <NDrawer v-model:show="isLedgerVisible" :width="700" placement="right">
      <NDrawerContent title="Budget Audit Ledger" closable>
        <NDataTable
          :columns="ledgerColumns"
          :data="ledgerList"
          :loading="ledgerLoading"
          :pagination="{ pageSize: 15 }"
        />
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
:deep(.n-data-table-table) {
  width: 100% !important;
}
</style>
