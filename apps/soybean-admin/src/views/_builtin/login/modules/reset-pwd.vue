<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouterPush } from '@/hooks/common/router';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useLoading } from '@sa/hooks';
import { $t } from '@/locales';
import { fetchSendPasswordResetCode, fetchVerifyPasswordResetCode, fetchResetPassword } from '@/service/api';
import PasswordCriteria from '@/components/common/password-criteria.vue';

defineOptions({
  name: 'ResetPwd'
});

const { toggleLoginModule } = useRouterPush();
const { formRef, validate } = useNaiveForm();
const { loading: codeLoading, startLoading: startCodeLoading, endLoading: endCodeLoading } = useLoading();
const { loading: submitLoading, startLoading: startSubmitLoading, endLoading: endSubmitLoading } = useLoading();

const isPwdFocused = ref(false);
const step = ref<1 | 2>(1); // 1: Verify Email & Code, 2: Reset Password
const codeSent = ref(false);

interface FormModel {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

const model: FormModel = reactive({
  email: '',
  code: '',
  password: '',
  confirmPassword: ''
});

const rules = computed(() => {
  const { formRules, createConfirmPwdRule } = useFormRules();

  return {
    email: formRules.email,
    code: formRules.code,
    password: formRules.pwd,
    confirmPassword: createConfirmPwdRule(model.password)
  };
});

async function handleGetCode() {
  if (!model.email) {
    window.$message?.warning($t('form.email.required'));
    return;
  }
  
  startCodeLoading();
  const { error } = await fetchSendPasswordResetCode(model.email);
  endCodeLoading();

  if (!error) {
    window.$message?.success($t('page.login.codeLogin.sendCodeSuccess'));
    codeSent.value = true;
  }
}

async function handleVerify() {
  await validate();
  
  startSubmitLoading();
  const { error } = await fetchVerifyPasswordResetCode(model.email, model.code);
  endSubmitLoading();

  if (!error) {
    step.value = 2;
  }
}

async function handleResetPassword() {
  await validate();
  
  startSubmitLoading();
  const { error } = await fetchResetPassword({
    email: model.email,
    code: model.code,
    password: model.password
  });
  endSubmitLoading();

  if (!error) {
    window.$message?.success($t('page.login.common.validateSuccess'));
    toggleLoginModule('pwd-login');
  }
}
</script>

<template>
  <NForm ref="formRef" :model="model" :rules="rules" size="large" :show-label="false" @keyup.enter="step === 1 ? handleVerify() : handleResetPassword()">
    <template v-if="step === 1">
      <NFormItem path="email">
        <NInput v-model:value="model.email" :placeholder="$t('page.login.common.emailPlaceholder')" :disabled="codeSent" />
      </NFormItem>
      <NFormItem path="code">
        <NInputGroup>
          <NInput v-model:value="model.code" :placeholder="$t('page.login.common.codePlaceholder')" />
          <NButton :disabled="!model.email || codeLoading" :loading="codeLoading" @click="handleGetCode">
            {{ codeSent ? $t('page.login.codeLogin.reGetCode', { time: '...' }) : $t('page.login.codeLogin.getCode') }}
          </NButton>
        </NInputGroup>
      </NFormItem>
      
      <NSpace vertical :size="18" class="w-full">
        <NButton type="primary" size="large" round block :loading="submitLoading" @click="handleVerify">
          {{ $t('common.confirm') }}
        </NButton>
        <NButton size="large" round block @click="toggleLoginModule('pwd-login')">
          {{ $t('page.login.common.back') }}
        </NButton>
      </NSpace>
    </template>

    <template v-else>
      <NFormItem path="password">
        <NPopover trigger="manual" placement="bottom" :show="isPwdFocused && !!model.password">
          <template #trigger>
            <div class="w-full">
              <NInput
                v-model:value="model.password"
                type="password"
                show-password-on="click"
                :placeholder="$t('page.login.common.passwordPlaceholder')"
                @focus="isPwdFocused = true"
                @blur="isPwdFocused = false"
              />
            </div>
          </template>
          <PasswordCriteria :password="model.password" />
        </NPopover>
      </NFormItem>
      <NFormItem path="confirmPassword">
        <NInput
          v-model:value="model.confirmPassword"
          type="password"
          show-password-on="click"
          :placeholder="$t('page.login.common.confirmPasswordPlaceholder')"
        />
      </NFormItem>
      <NSpace vertical :size="18" class="w-full">
        <NButton type="primary" size="large" round block :loading="submitLoading" @click="handleResetPassword">
          {{ $t('common.confirm') }}
        </NButton>
        <NButton size="large" round block @click="step = 1">
          {{ $t('page.login.common.back') }}
        </NButton>
      </NSpace>
    </template>
  </NForm>
</template>

<style scoped></style>
