<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NCard, NForm, NFormItem, NInput, NButton, NSpace, NInputNumber, NAlert } from 'naive-ui';
import { fetchGetAllSystemSettings, fetchUpdateSystemSettings } from '@/service/api/system-settings';

const loading = ref(false);
const settings = ref({
  sync_hourly_cron: '0 */4 * * *',
  sync_parallel_batch_size: 30,
  sync_incremental_default_pages: 200
});

async function getSettings() {
  loading.value = true;
  const { data, error } = await fetchGetAllSystemSettings();
  if (!error && data) {
    if (data.sync_hourly_cron) settings.value.sync_hourly_cron = data.sync_hourly_cron;
    if (data.sync_parallel_batch_size) settings.value.sync_parallel_batch_size = Number(data.sync_parallel_batch_size);
    if (data.sync_incremental_default_pages) settings.value.sync_incremental_default_pages = Number(data.sync_incremental_default_pages);
  }
  loading.value = false;
}

async function handleSave() {
  loading.value = true;
  const { error } = await fetchUpdateSystemSettings(settings.value);
  if (!error) {
    window.$message?.success('Settings updated successfully. Changes will take effect on next sync trigger or server restart.');
  }
  loading.value = false;
}

onMounted(() => {
  getSettings();
});
</script>

<template>
  <div class="h-full">
    <NCard title="Global Sync Settings" :bordered="false" class="rounded-16px shadow-sm">
      <NAlert title="Configuration Note" type="info" class="mb-6">
        These settings apply to the background synchronization orchestrator. 
        The "Schedule" determines how often the master sync starts.
      </NAlert>

      <NForm label-placement="left" label-width="200" :disabled="loading">
        <NFormItem label="Sync Schedule (Cron)" path="sync_hourly_cron">
          <NInput v-model:value="settings.sync_hourly_cron" placeholder="0 */4 * * *" />
          <template #feedback>
            Standard Cron expression. Default: <code>0 */4 * * *</code> (Every 4 hours).
          </template>
        </NFormItem>

        <NFormItem label="Parallel Batch Size" path="sync_parallel_batch_size">
          <NInputNumber v-model:value="settings.sync_parallel_batch_size" :min="1" :max="100" class="w-full" />
          <template #feedback>
            How many companies to process at the same time. Default: 30.
          </template>
        </NFormItem>

        <NFormItem label="Default Incremental Pages" path="sync_incremental_default_pages">
          <NInputNumber v-model:value="settings.sync_incremental_default_pages" :min="1" :max="1000" class="w-full" />
          <template #feedback>
            Fallback page limit for incremental sync. Default: 200.
          </template>
        </NFormItem>

        <NSpace justify="end" class="mt-4">
          <NButton type="primary" :loading="loading" @click="handleSave">
            Save Settings
          </NButton>
        </NSpace>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped></style>
