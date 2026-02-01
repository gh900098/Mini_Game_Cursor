<script setup lang="tsx">
import { ref } from 'vue';
import { NCard, NDataTable, NSpace, NStatistic, NGrid, NGi } from 'naive-ui';
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
    key: 'achievedAt',
    width: 180,
    render(row) {
      return <span>{new Date(row.achievedAt).toLocaleString()}</span>;
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
    title: 'Score',
    key: 'score',
    width: 120,
    render(row) {
      return <span class="font-bold text-primary text-lg">{row.score}</span>;
    }
  },
  {
    title: 'Metadata',
    key: 'metadata',
    width: 200,
    render(row) {
      if (!row.metadata) return <span class="text-gray-400">-</span>;
      return <span class="font-mono text-xs">{JSON.stringify(row.metadata)}</span>;
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
      <NGrid cols="4" x-gap="16" responsive="screen">
        <NGi>
          <NStatistic label="Total Scores" :value="stats.totalScores" />
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
