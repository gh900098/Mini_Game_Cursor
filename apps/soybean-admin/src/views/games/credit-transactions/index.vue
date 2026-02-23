<script setup lang="tsx">
import { ref, reactive, watch } from 'vue';
import { NCard, NDataTable, NTag, NInput, NButton, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetCreditTransactions } from '@/service/api/management';
import { useLoading } from '@sa/hooks';
import { useAuthStore } from '@/store/modules/auth';
import { $t } from '@/locales';

const { loading, startLoading, endLoading } = useLoading();
const authStore = useAuthStore();

const tableData = ref<Api.Management.CreditTransaction[]>([]);
const total = ref(0);

const searchParams = reactive({
  memberId: '',
  type: ''
});

const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  itemCount: 0,
  onChange: (page: number) => {
    pagination.page = page;
    getData();
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    getData();
  }
});

const columns: DataTableColumns<Api.Management.CreditTransaction> = [

  {
    key: 'member',
    title: $t('page.manage.creditTransactions.member'),
    align: 'center',
    render: (row) => {
      // In TSX, we use type assertions or check structure
      const member = (row as any).member;
      return member ? `${member.username} (${member.externalId})` : '-';
    }
  },
  {
    key: 'type',
    title: $t('page.manage.creditTransactions.type'),
    align: 'center',
    render: (row) => {
      const typeMap: Record<string, { type: 'default' | 'error' | 'primary' | 'success' | 'warning'; label: string }> = {
        DEPOSIT_CONVERSION: { type: 'success', label: 'Deposit' },
        MANUAL_ADJUSTMENT: { type: 'warning', label: 'Manual' },
        GAME_CONSUME: { type: 'error', label: 'Game Consume' },
        REWARD: { type: 'primary', label: 'Reward' }
      };
      const config = typeMap[row.type] || { type: 'default', label: row.type };
      return <NTag type={config.type} bordered={false} round={true}>{config.label}</NTag>;
    }
  },
  {
    key: 'amount',
    title: $t('page.manage.creditTransactions.amount'),
    align: 'center',
    render: (row) => {
      const isPositive = row.amount > 0;
      return <span class={isPositive ? 'text-success font-bold' : 'text-error font-bold'}>
        {isPositive ? '+' : ''}{row.amount.toFixed(2)}
      </span>;
    }
  },
  {
    key: 'balanceBefore',
    title: $t('page.manage.creditTransactions.balanceBefore'),
    align: 'center',
    render: (row) => row.balanceBefore.toFixed(2)
  },
  {
    key: 'balanceAfter',
    title: $t('page.manage.creditTransactions.balanceAfter'),
    align: 'center',
    render: (row) => row.balanceAfter.toFixed(2)
  },
  {
    key: 'reason',
    title: $t('page.manage.creditTransactions.reason'),
    align: 'center',
    minWidth: 150
  },
  {
    key: 'createdAt',
    title: $t('page.manage.creditTransactions.time'),
    align: 'center',
    render: (row) => new Date(row.createdAt).toLocaleString()
  }
];

async function getData() {
  startLoading();
  const currentCompanyId = authStore.userInfo.currentCompanyId;
  const companyId = currentCompanyId === 'ALL' || !currentCompanyId ? undefined : currentCompanyId;

  const { data, error } = await fetchGetCreditTransactions({
    page: pagination.page,
    limit: pagination.pageSize,
    companyId,
    memberId: searchParams.memberId || undefined,
    type: searchParams.type || undefined
  });

  if (!error && data) {
    try {
      if ('items' in (data as any)) {
        const paginatedData = data as { items: Api.Management.CreditTransaction[]; meta: { total: number } };
        tableData.value = paginatedData.items || [];
        total.value = paginatedData.meta?.total || 0;
        pagination.itemCount = paginatedData.meta?.total || 0;
      } else {
        const listData = data as Api.Management.CreditTransaction[];
        tableData.value = listData || [];
        total.value = listData?.length || 0;
        pagination.itemCount = listData?.length || 0;
      }
    } catch (e) {
      console.error('Data processing error:', e);
    }
  }
  endLoading();
}

function handleSearch() {
  pagination.page = 1;
  getData();
}

function handleReset() {
  searchParams.memberId = '';
  searchParams.type = '';
  handleSearch();
}

watch(
  () => authStore.userInfo.currentCompanyId,
  () => {
    handleSearch();
  }
);

getData();
</script>

<template>
  <div class="h-full flex-col gap-16px">
    <NCard :title="$t('page.manage.creditTransactions.title')" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NSpace align="center">
          <NInput
            v-model:value="searchParams.memberId"
            :placeholder="$t('page.manage.creditTransactions.searchPlaceholder')"
            clearable
            class="w-200px"
            @keypress.enter="handleSearch"
          />
          <NInput
            v-model:value="searchParams.type"
            :placeholder="$t('page.manage.creditTransactions.filterByType')"
            clearable
            class="w-200px"
            @keypress.enter="handleSearch"
          />
          <NButton type="primary" @click="handleSearch">
            <template #icon>
              <IconUilSearch class="text-18px" />
            </template>
            {{ $t('common.search') }}
          </NButton>
          <NButton @click="handleReset">
            <template #icon>
              <IconAntDesignReloadOutlined class="text-18px" />
            </template>
            {{ $t('common.reset') }}
          </NButton>
        </NSpace>
      </template>
      <div class="flex-col h-full">
        <NDataTable
          remote
          :columns="columns"
          :data="tableData"
          :loading="loading"
          :pagination="pagination"
          :item-count="total"
          flex-height
          class="flex-1-hidden"
        />
      </div>
    </NCard>
  </div>
</template>

<style scoped></style>
