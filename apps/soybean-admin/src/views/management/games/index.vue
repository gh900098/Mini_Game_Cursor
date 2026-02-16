<script setup lang="ts">
import { ref, h } from 'vue';
import { NCard, NDataTable, NTag, NSpace, NImage, NButton, NPopconfirm } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetAdminGames, fetchCreateGame, fetchUpdateGame, fetchDeleteGame } from '@/service/api/management';
import { useLoading, useBoolean } from '@sa/hooks';
import GameForm from './components/GameForm.vue';
import fallbackImage from '@/assets/imgs/soybean.jpg';

const { loading, startLoading, endLoading } = useLoading();
const { bool: visible, setTrue: openModal, setFalse: closeModal } = useBoolean();
const games = ref<Api.Management.Game[]>([]);
const modalType = ref<'add' | 'edit'>('add');
const editData = ref<Api.Management.Game | null>(null);

function handleAdd() {
  modalType.value = 'add';
  editData.value = null;
  openModal();
}

function handleEdit(row: Api.Management.Game) {
  modalType.value = 'edit';
  editData.value = row;
  openModal();
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteGame(id);
  if (!error) {
    window.$message?.success('Game template deleted successfully');
    getGames();
  }
}

const columns: DataTableColumns<Api.Management.Game> = [
  {
    title: 'Thumbnail',
    key: 'thumbnailUrl',
    width: 80,
    render(row) {
      if (!row.thumbnailUrl) return h('span', { class: 'text-gray-400' }, '-');
      return h(NImage, {
        src: row.thumbnailUrl || fallbackImage,
        'fallback-src': fallbackImage,
        width: 48,
        height: 48,
        'object-fit': 'cover',
        class: 'rounded-8px border border-gray-100'
      });
    }
  },
  {
    title: 'Name',
    key: 'name',
    render(row) {
      return h('div', null, [
        h('div', { class: 'font-bold' }, row.name),
        h('div', { class: 'text-xs text-gray-500 font-mono' }, row.slug)
      ]);
    }
  },
  {
    title: 'Type',
    key: 'type',
    width: 100,
    render(row) {
      return h(NTag, { type: 'info', size: 'small', round: true }, { default: () => row.type });
    }
  },
  {
    title: 'Instances',
    key: 'usageCount',
    width: 100,
    align: 'center',
    render(row) {
      const count = (row as any).usageCount || 0;
      return h(NTag, { type: count > 0 ? 'success' : 'default', bordered: false, round: true }, { default: () => `${count} Active` });
    }
  },
  {
    title: 'Dimensions',
    key: 'dimensions',
    width: 120,
    render(row) {
      if (!row.baseWidth || !row.baseHeight) return h('span', { class: 'text-gray-400' }, '-');
      return h('span', { class: 'font-mono text-xs text-gray-500' }, `${row.baseWidth} × ${row.baseHeight}`);
    }
  },
  {
    title: 'Status',
    key: 'isActive',
    width: 80,
    render(row) {
      return row.isActive 
        ? h('div', { class: 'w-2 h-2 rounded-full bg-green-500 mx-auto', title: 'Active' })
        : h('div', { class: 'w-2 h-2 rounded-full bg-gray-300 mx-auto', title: 'Inactive' });
    }
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    align: 'right',
    render(row) {
      return h(NSpace, { justify: 'end' }, {
        default: () => [
          h(NButton, { size: 'tiny', secondary: true, type: 'primary', onClick: () => handleEdit(row) }, { default: () => 'Edit' }),
          h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
             default: () => 'Are you sure you want to delete this template?',
             trigger: () => h(NButton, { size: 'tiny', secondary: true, type: 'error', disabled: (row as any).usageCount > 0 }, { default: () => 'Del' })
          })
        ]
      });
    }
  }
];

async function getGames() {
  startLoading();
  const { data, error } = await fetchGetAdminGames();
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
          <NButton type="primary" @click="handleAdd">
            Archive Template (Add)
          </NButton>
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
      
      <GameForm
        v-model:visible="visible"
        :type="modalType"
        :edit-data="editData"
        @success="getGames"
      />
    </NCard>
  </div>
</template>
