<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { NButton, NCard, NForm, NFormItem, NInput, NInputNumber, NRadio, NRadioGroup, NSpace, NSwitch, useMessage } from 'naive-ui';
import { request } from '@/service/request';

const message = useMessage();
const loading = ref(false);
const saving = ref(false);

const model = reactive({
  EMAIL_VERIFICATION_REQUIRED: false,
  EMAIL_PROVIDER: 'none',
  EMAIL_FROM: '',
  SMTP_HOST: '',
  SMTP_PORT: 587,
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_SECURE: 'false',
  RESEND_API_KEY: ''
});

async function fetchSettings() {
  loading.value = true;
  const { data, error } = await request<Record<string, any>>({ url: '/system-settings' });
  if (!error && data) {
    Object.assign(model, data);
    // Ensure boolean types for switch
    model.EMAIL_VERIFICATION_REQUIRED = String(model.EMAIL_VERIFICATION_REQUIRED) === 'true';
  }
  loading.value = false;
}

async function handleSave() {
  saving.value = true;
  const { error } = await request({
    url: '/system-settings',
    method: 'post',
    data: {
      ...model,
      EMAIL_VERIFICATION_REQUIRED: String(model.EMAIL_VERIFICATION_REQUIRED)
    }
  });

  if (!error) {
    message.success('Settings saved successfully');
  }
  saving.value = false;
}

onMounted(() => {
  fetchSettings();
});
</script>

<template>
  <div class="h-full overflow-y-auto">
    <NCard title="Email & Verification Settings" :bordered="false" class="rounded-8px shadow-sm">
      <NForm :model="model" label-placement="left" label-width="200" require-mark-placement="right" autocomplete="off">
        <!-- Hidden inputs to trick browser autofill -->
        <div style="width: 0; height: 0; overflow: hidden; opacity: 0; position: absolute;">
          <input type="text" name="fake_username_to_prevent_autofill" tabindex="-1" />
          <input type="password" name="fake_password_to_prevent_autofill" tabindex="-1" />
        </div>
        <NFormItem label="Enable Verification" path="EMAIL_VERIFICATION_REQUIRED">
          <NSwitch v-model:value="model.EMAIL_VERIFICATION_REQUIRED">
            <template #checked>On</template>
            <template #unchecked>Off</template>
          </NSwitch>
          <template #feedback>
            If enabled, users must verify their email address before they can log in.
          </template>
        </NFormItem>

        <NFormItem label="Email Provider" path="EMAIL_PROVIDER">
          <NRadioGroup v-model:value="model.EMAIL_PROVIDER">
            <NSpace>
              <NRadio value="none">None (Logs only)</NRadio>
              <NRadio value="smtp">SMTP</NRadio>
              <NRadio value="resend">Resend (API)</NRadio>
            </NSpace>
          </NRadioGroup>
        </NFormItem>

        <NFormItem label="Sender Email" path="EMAIL_FROM">
          <NInput v-model:value="model.EMAIL_FROM" placeholder="e.g. NoReply <noreply@example.com>" autocomplete="off" />
        </NFormItem>

        <template v-if="model.EMAIL_PROVIDER === 'smtp'">
          <NFormItem label="SMTP Host" path="SMTP_HOST">
            <NInput v-model:value="model.SMTP_HOST" placeholder="smtp.gmail.com" autocomplete="off" />
          </NFormItem>
          <NFormItem label="SMTP Port" path="SMTP_PORT">
            <NInputNumber v-model:value="model.SMTP_PORT" :min="1" :max="65535" />
          </NFormItem>
          <NFormItem label="SMTP User" path="SMTP_USER">
            <NInput v-model:value="model.SMTP_USER" placeholder="User email" autocomplete="off" />
          </NFormItem>
          <NFormItem label="SMTP Password" path="SMTP_PASS">
            <NInput v-model:value="model.SMTP_PASS" type="password" show-password-on="click" placeholder="Password or App Key" autocomplete="new-password" />
          </NFormItem>
        </template>

        <template v-if="model.EMAIL_PROVIDER === 'resend'">
          <NFormItem label="Resend API Key" path="RESEND_API_KEY">
            <NInput v-model:value="model.RESEND_API_KEY" type="password" show-password-on="click" placeholder="re_123456789" autocomplete="new-password" />
          </NFormItem>
        </template>

        <NSpace class="mt-20px">
          <NButton type="primary" :loading="saving" @click="handleSave">Save Settings</NButton>
          <NButton @click="fetchSettings">Reset</NButton>
        </NSpace>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped></style>
