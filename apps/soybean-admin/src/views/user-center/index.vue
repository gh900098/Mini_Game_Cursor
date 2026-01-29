<script setup lang="tsx">
import { ref, reactive, onMounted } from 'vue';
import { NCard, NForm, NFormItem, NInput, NButton, NSpace } from 'naive-ui';
import { fetchGetUserInfo, fetchUpdateUserProfile } from '@/service/api/auth';
import { $t } from '@/locales';
import { useLoading } from '@sa/hooks';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';

const { loading, startLoading, endLoading } = useLoading();
const { formRules } = useFormRules();
const { formRef, validate } = useNaiveForm();

const rules = {
  mobile: formRules.phone,
  // email is read-only
};

const formModel = reactive({
  email: '',
  name: '',
  mobile: '',
  bio: '',
  description: '',
});

async function getProfile() {
  startLoading();
  const { data, error } = await fetchGetUserInfo();
  if (!error && data) {
    Object.assign(formModel, {
      email: data.email,
      name: data.name || '',
      mobile: data.mobile || '',
      bio: data.bio || '',
      description: data.description || '',
    });
  }
  endLoading();
}

async function handleSubmit() {
  await validate();
  startLoading();
  // Delta update logic
  const { data: originalData } = await fetchGetUserInfo();
  if (!originalData) return;

  const updates: Record<string, any> = {};
  const fields = ['name', 'mobile', 'bio', 'description'] as const;

  fields.forEach(field => {
    const originalValue = originalData[field] || '';
    const currentValue = formModel[field] || '';

    if (originalValue !== currentValue) {
      updates[field] = currentValue || null;
    }
  });

  if (Object.keys(updates).length > 0) {
    const { error } = await fetchUpdateUserProfile(updates);
    if (!error) {
      window.$message?.success($t('common.updateSuccess'));
      getProfile(); // Refresh
    }
  } else {
    window.$message?.info('No changes detected');
  }
  endLoading();
}

onMounted(() => {
  getProfile();
});
</script>

<template>
  <div class="h-full">
    <NCard title="User Profile" :bordered="false" class="rounded-16px shadow-sm max-w-800px mx-auto">
      <NForm ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="100" size="large" autocomplete="off">
        <!-- Hidden inputs to trick browser autofill -->
        <div style="width: 0; height: 0; overflow: hidden; opacity: 0; position: absolute;">
            <input type="text" tabindex="-1" />
            <input type="password" tabindex="-1" />
        </div>
        <NFormItem label="Email">
          <NInput v-model:value="formModel.email" disabled />
        </NFormItem>
        <NFormItem label="Name" path="name">
          <NInput v-model:value="formModel.name" placeholder="Enter full name" />
        </NFormItem>
        <NFormItem label="Mobile" path="mobile">
          <NInput v-model:value="formModel.mobile" placeholder="Enter mobile number" />
        </NFormItem>
        <NFormItem label="Bio" path="bio">
          <NInput v-model:value="formModel.bio" placeholder="Enter short bio" />
        </NFormItem>
        <NFormItem label="Description" path="description">
          <NInput v-model:value="formModel.description" type="textarea" placeholder="Enter detailed description" />
        </NFormItem>
        
        <NSpace justify="end" class="mt-6">
          <NButton type="primary" :loading="loading" @click="handleSubmit">
            {{ $t('common.save') }}
          </NButton>
        </NSpace>
      </NForm>
    </NCard>
  </div>
</template>
