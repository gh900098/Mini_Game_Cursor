<script setup lang="tsx">
import { ref, reactive, onMounted } from 'vue';
import { NButton, NTag, NSpace, NPopconfirm, NCard, NDataTable } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchThemes, deleteTheme } from '@/service/api/themes';
import { useRouterPush } from '@/hooks/common/router';
import { useAuth } from '@/hooks/business/auth';
import { useLoading } from '@sa/hooks';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

const { hasAuth } = useAuth();
const { routerPush } = useRouterPush();
const { loading, startLoading, endLoading } = useLoading();

const tableData = ref<Api.SystemManage.Theme[]>([]);
const total = ref(0);

const pagination = reactive({
  page: 1,
  pageSize: 20,
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

async function getData() {
  startLoading();
  const { data, error } = await fetchThemes({
    page: pagination.page,
    limit: pagination.pageSize
  });

  if (!error && data) {
    if ('items' in data) {
      tableData.value = data.items;
      total.value = data.total;
      pagination.itemCount = data.total;
    } else {
      tableData.value = data as any;
      total.value = (data as any).length;
      pagination.itemCount = (data as any).length;
    }
  }
  endLoading();
}

const columns: DataTableColumns<Api.SystemManage.Theme> = [
  {
    title: $t('page.manage.themes.thumbnail'),
    key: 'config.titleImage',
    width: 100,
    render(row) {
      return (row.thumbnailUrl || row.config?.titleImage) ? (
        <img src={(row.thumbnailUrl || row.config?.titleImage) as string} class="h-40px w-auto object-contain rounded bg-gray-100 p-2px" alt="thumbnail" />
      ) : (
        <div class="h-40px w-40px bg-gray-100 rounded flex items-center justify-center text-gray-300">
          <SvgIcon icon="material-symbols:image-outline" class="text-20px" />
        </div>
      );
    }
  },
  {
    title: $t('page.manage.themes.name'),
    key: 'name',
    minWidth: 200,
    render(row) {
      return (
        <div class="flex flex-col">
          <span class="font-bold">{row.name}</span>
          <span class="text-xs text-gray-400 font-mono italic">{row.slug}</span>
        </div>
      );
    }
  },
  {
    title: 'Template',
    key: 'gameTemplateSlug',
    width: 120,
    render(row) {
      return <NTag size="small" type="info" bordered={false}>{row.gameTemplateSlug}</NTag>;
    }
  },
  {
    title: $t('page.manage.themes.isPremium'),
    key: 'isPremium',
    width: 100,
    render(row) {
      return row.isPremium ? (
        <NTag type="error" size="small" bordered={false}>Premium</NTag>
      ) : (
        <NTag type="success" size="small" bordered={false}>Free</NTag>
      );
    }
  },
  {
    title: $t('page.manage.themes.price'),
    key: 'price',
    width: 100,
    render(row) {
      return row.isPremium ? <span class="font-bold text-error">${row.price}</span> : '-';
    }
  },
  {
    title: $t('page.manage.themes.status'),
    key: 'isActive',
    width: 100,
    render(row) {
      return (
        <NTag type={row.isActive ? 'success' : 'error'} size="small" bordered={false}>
          {row.isActive ? $t('page.manage.user.status.enable') : $t('page.manage.user.status.disable')}
        </NTag>
      );
    }
  },
  {
    title: $t('common.action'),
    key: 'action',
    width: 150,
    render(row) {
      return (
        <NSpace justify="center">
          <NButton quaternary size="small" onClick={() => routerPush({ name: 'games_theme-detail', query: { id: row.id, action: 'edit' } })}>
            {{ icon: () => <icon-carbon-edit class="text-16px" /> }}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton quaternary size="small" type="error">
                  {{ icon: () => <icon-carbon-trash-can class="text-16px" /> }}
                </NButton>
              )
            }}
          </NPopconfirm>
        </NSpace>
      );
    }
  }
];

async function handleDelete(id: string) {
  const { error } = await deleteTheme(id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    getData();
  }
}

function handleAdd() {
  routerPush({ name: 'games_theme-detail', query: { action: 'create' } });
}

onMounted(() => {
  getData();
});
</script>

<template>
  <div class="h-full flex-col p-16px">
    <NCard :title="$t('page.manage.themes.title')" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm card-wrapper">
      <template #header-extra>
        <NSpace>
          <NButton v-if="hasAuth('themes:create')" type="primary" @click="handleAdd">
            <template #icon><SvgIcon icon="material-symbols:add" /></template>
            {{ $t('page.manage.themes.add') }}
          </NButton>
          <NButton quaternary circle @click="getData">
            <template #icon><SvgIcon icon="material-symbols:refresh" /></template>
          </NButton>
        </NSpace>
      </template>

      <div class="flex-col h-full overflow-hidden">
        <NDataTable
          :columns="columns"
          :data="tableData"
          :loading="loading"
          :pagination="pagination"
          :remote="true"
          :item-count="total"
          flex-height
          size="small"
          class="flex-1"
        />
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.card-wrapper {
  display: flex;
  flex-direction: column;
}
:deep(.n-card-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
