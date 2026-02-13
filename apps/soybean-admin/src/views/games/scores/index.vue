<script setup lang="tsx">
import { ref, type VNode } from 'vue';
import { NCard, NDataTable, NSpace, NStatistic, NGrid, NGi, NTag, NTooltip } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetScores, fetchGetScoresStats } from '@/service/api/management';
import { useLoading } from '@sa/hooks';
import { useAuthStore } from '@/store/modules/auth';

const { loading, startLoading, endLoading } = useLoading();
const authStore = useAuthStore();
const scores = ref<Api.Management.Score[]>([]);
const stats = ref<any>(null);

const columns: DataTableColumns<Api.Management.Score> = [
  {
    title: 'Time',
    key: 'createdAt',
    width: 200,
    fixed: 'left',
    render(row) {
      return (
        <span class="text-gray-500 whitespace-nowrap">
          {row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}
        </span>
      );
    }
  },
  {
    title: 'Player',
    key: 'member',
    minWidth: 120,
    render(row: any) {
      return <span class="font-medium whitespace-nowrap">{row.member?.username || row.member?.externalId || 'Guest'}</span>;
    }
  },
  {
    title: 'Game Instance',
    key: 'instance',
    minWidth: 150,
    ellipsis: { tooltip: true },
    render(row: any) {
      return <span class="text-gray-600">{row.instance?.name || '-'}</span>;
    }
  },
  {
    title: 'Points',
    key: 'finalPoints',
    width: 80,
    align: 'center',
    render(row) {
      return <span class="font-bold text-primary text-base">{row.finalPoints ?? 0}</span>;
    }
  },
  {
    title: 'Deduction',
    key: 'tokenCost',
    width: 90,
    align: 'center',
    render(row) {
      return <span class="text-error font-medium">-{row.tokenCost}</span>;
    }
  },
  {
    title: 'Metadata',
    key: 'metadata',
    minWidth: 300,
    render(row) {
      if (!row.metadata) return <span class="text-gray-400">-</span>;
      
      const meta = row.metadata;
      const tags: VNode[] = [];
      
      if (meta.isLose === true) {
        tags.push(<NTag size="small" type="default" round bordered={false} class="opacity-60">Try Again</NTag>);
      }
      
      if (meta.prize) {
        const isBig = String(meta.prize).toLowerCase().includes('big') || String(meta.prize).toLowerCase().includes('jackpot');
        tags.push(
          <NTag size="small" type={isBig ? 'warning' : 'success'} round strong>
            {isBig ? '🏆' : '🎁'} {meta.prize}
          </NTag>
        );
      }
      
      if (row.multiplier && row.multiplier > 1) {
        tags.push(<NTag size="small" type="info" round bordered={false}>x{row.multiplier}</NTag>);
      }

      // If no specific tags were matched, or to show extra info
      const hasTags = tags.length > 0;
      
      return (
        <NTooltip trigger="hover" placement="left">
          {{
            trigger: () => (
              <NSpace size={[4, 4]} wrap>
                {hasTags ? tags : <span class="text-xs opacity-50 font-mono">Check Details</span>}
              </NSpace>
            ),
            default: () => (
              <pre class="text-[10px] m-0 p-4px leading-tight">
                {JSON.stringify(meta, null, 2)}
              </pre>
            )
          }}
        </NTooltip>
      );
    }
  }
];

async function getScores() {
  startLoading();
  const currentCompanyId = authStore.userInfo.currentCompanyId;
  const [scoresRes, statsRes] = await Promise.all([
    fetchGetScores({ companyId: currentCompanyId || undefined }),
    fetchGetScoresStats({ companyId: currentCompanyId || undefined })
  ]);
  
  if (!scoresRes.error) {
    scores.value = scoresRes.data;
  }
  if (!statsRes.error) {
    stats.value = statsRes.data;
  }
  endLoading();
}

getScores();
</script>

<template>
  <div class="h-full flex-col gap-16px">
    <NCard v-if="stats" title="Statistics" :bordered="false" class="rounded-16px shadow-sm">
      <NGrid cols="5" x-gap="16" responsive="screen">
        <NGi>
          <NStatistic label="Total Wins" :value="stats.totalScores" />
        </NGi>
        <NGi>
          <NStatistic label="Total Awarded Points" :value="stats.totalAwardedPoints">
             <template #suffix>
               <span class="text-sm font-normal text-gray-400">Pts</span>
             </template>
          </NStatistic>
        </NGi>
        <NGi>
          <NStatistic label="Total Attempts" :value="stats.totalAttempts" />
        </NGi>
        <NGi>
          <NStatistic label="Successful Attempts" :value="stats.successfulAttempts" />
        </NGi>
        <NGi>
          <NStatistic label="Success Rate" :value="`${stats.successRate}%`" />
        </NGi>
      </NGrid>
    </NCard>

    <NCard title="Score History" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NSpace>
          <span class="text-sm text-gray-500">Total: {{ scores.length }}</span>
        </NSpace>
      </template>
      <NDataTable
        :columns="columns"
        :data="scores"
        :loading="loading"
        flex-height
        class="h-full"
        :pagination="{ pageSize: 50 }"
      />
    </NCard>
  </div>
</template>
