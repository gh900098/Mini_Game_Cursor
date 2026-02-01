<script setup lang="tsx">
import { ref } from 'vue';
import { NCard, NDataTable, NTag, NSpace, NImage } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetGames } from '@/service/api/management';
import { useLoading } from '@sa/hooks';

const { loading, startLoading, endLoading } = useLoading();
const games = ref<Api.Management.Game[]>([]);

const columns: DataTableColumns<Api.Management.Game> = [
  {
    title: 'Thumbnail',
    key: 'thumbnailUrl',
    width: 100,
    render(row) {
      if (!row.thumbnailUrl) return <span class="text-gray-400">-</span>;
      return <NImage 
        src={row.thumbnailUrl} 
        width={60} 
        height={60} 
        object-fit="cover"
        class="rounded-8px"
      />;
    }
  },
  {
    title: 'Name',
    key: 'name',
    render(row) {
      return <div>
        <div class="font-bold">{row.name}</div>
        <div class="text-xs text-gray-500">{row.slug}</div>
      </div>;
    }
  },
  {
    title: 'Type',
    key: 'type',
    width: 150,
    render(row) {
      return <NTag type="info">{row.type}</NTag>;
    }
  },
  {
    title: 'Dimensions',
    key: 'dimensions',
    width: 150,
    render(row) {
      if (!row.baseWidth || !row.baseHeight) return <span class="text-gray-400">-</span>;
      return <span class="font-mono text-sm">{row.baseWidth} × {row.baseHeight}</span>;
    }
  },
  {
    title: 'Orientation',
    key: 'isPortrait',
    width: 120,
    render(row) {
      return row.isPortrait 
        ? <NTag type="warning">Portrait</NTag> 
        : <NTag type="success">Landscape</NTag>;
    }
  },
  {
    title: 'Status',
    key: 'isActive',
    width: 100,
    render(row) {
      return row.isActive 
        ? <NTag type="success">Active</NTag> 
        : <NTag type="default">Inactive</NTag>;
    }
  },
  {
    title: 'Created',
    key: 'createdAt',
    width: 180,
    render(row) {
      return <span>{new Date(row.createdAt).toLocaleString()}</span>;
    }
  }
];

async function getGames() {
  startLoading();
  const { data, error } = await fetchGetGames();
  if (!error) {
    games.value = data;
  }
  endLoading();
}

getGames();
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="Game Templates" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <template #header-extra>
        <NSpace>
          <span class="text-sm text-gray-500">Total: {{ games.length }}</span>
        </NSpace>
      </template>
      <NDataTable
        :columns="columns"
        :data="games"
        :loading="loading"
        flex-height
        class="h-full"
        :pagination="{ pageSize: 20 }"
      />
    </NCard>
  </div>
</template>
