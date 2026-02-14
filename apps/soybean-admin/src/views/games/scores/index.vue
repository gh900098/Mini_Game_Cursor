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
    render(row) {
      const name = row.member?.username || row.member?.externalId || 'Guest';
      return <span class="font-medium whitespace-nowrap">{name}</span>;
    }
  },
  {
    title: 'Game Info',
    key: 'instance',
    minWidth: 150,
    ellipsis: { tooltip: true },
    render(row) {
      return <span class="text-gray-600">{row.instance?.name || '-'}</span>;
    }
  },
  {
    title: 'Base Value',
    key: 'score',
    width: 100,
    align: 'right',
    render(row) {
      return <span class="text-gray-600 tabular-nums">{row.score ?? 0}</span>;
    }
  },
  {
    title: 'Multi',
    key: 'multiplier',
    width: 80,
    align: 'center',
    render(row) {
      if (row.multiplier && row.multiplier > 1) {
        return (
          <NTag size="small" type="info" round bordered={false} class="font-bold">
            x{row.multiplier}
          </NTag>
        );
      }
      return <span class="text-gray-300 text-xs">-</span>;
    }
  },
  {
    title: 'Final Award',
    key: 'finalPoints',
    width: 120,
    align: 'right',
    render(row) {
      const points = row.finalPoints ?? 0;
      if (points > 0) {
        return <span class="font-bold text-primary text-base tabular-nums">+{points}</span>;
      }
      return <span class="text-gray-400 tabular-nums">0</span>;
    }
  },
  {
    title: 'Cost',
    key: 'tokenCost',
    width: 100,
    align: 'right',
    render(row) {
      if (!row.tokenCost) return <span class="text-gray-300">-</span>;
      return <span class="text-error font-medium tabular-nums">-{row.tokenCost}</span>;
    }
  },
  {
    title: 'Prize Details',
    key: 'metadata',
    minWidth: 250,
    render(row) {
      if (!row.metadata) return <span class="text-gray-300">-</span>;
      
      const meta = row.metadata;
      const tags: VNode[] = [];
      
      // "Try Again" / Lose
      if (meta.isLose === true) {
        tags.push(<NTag size="small" type="default" bordered={false} class="opacity-50 text-xs">Try Again</NTag>);
      }
      
      // Prize Name (Physical or E-Gift)
      if (meta.prize) {
        const prizeName = String(meta.prize);
        const lowerName = prizeName.toLowerCase();
        const isBig = lowerName.includes('big') || lowerName.includes('jackpot');
        const isPhysical = meta.prizeType === 'PHYSICAL' || meta.isPhysical; // Fallback check
        
        let icon = '🎁';
        if (isBig) icon = '🏆';
        else if (isPhysical) icon = '📦';
        else if (lowerName.includes('coin') || lowerName.includes('point')) icon = '🪙';

        tags.push(
          <NTag size="small" type={isBig ? 'warning' : 'success'} round strong class={isBig ? 'shadow-sm' : ''}>
            {icon} {prizeName}
          </NTag>
        );
      }
      
      // Fallback if no specific tags
      if (tags.length === 0) {
         return (
            <NTooltip trigger="hover" placement="top">
              {{
                trigger: () => <span class="text-xs text-gray-400 cursor-help underline decoration-dotted">Raw Data</span>,
                default: () => <pre class="text-[10px] m-0">{JSON.stringify(meta, null, 2)}</pre>
              }}
            </NTooltip>
         );
      }

      // Render tags + tooltip for full data
      return (
        <NSpace size={[4, 0]} align="center" wrap>
          {tags}
             <NTooltip trigger="click" placement="left">
              {{
                trigger: () => <span class="i-carbon-information text-gray-300 hover:text-primary cursor-pointer text-xs" />,
                default: () => <pre class="text-[10px] m-0 p-1">{JSON.stringify(meta, null, 2)}</pre>
              }}
            </NTooltip>
        </NSpace>
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
