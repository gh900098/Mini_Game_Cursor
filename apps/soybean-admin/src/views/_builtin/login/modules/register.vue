<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue';
import { useRouterPush } from '@/hooks/common/router';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useCaptcha } from '@/hooks/business/captcha';
import { $t } from '@/locales';
import PasswordCriteria from '@/components/common/password-criteria.vue';
import { fetchRegister, fetchVerificationRequired, fetchSendRegistrationCode } from '@/service/api/auth';

defineOptions({
  name: 'Register'
});

const { toggleLoginModule } = useRouterPush();
const { formRef, validate } = useNaiveForm();
const { label, isCounting, loading, start } = useCaptcha();
const isPwdFocused = ref(false);
const verificationRequired = ref(false);
const submitting = ref(false);

async function checkVerificationRequired() {
  const { data, error } = await fetchVerificationRequired();
  if (!error && data) {
    verificationRequired.value = data.required;
  }
}

onMounted(() => {
  checkVerificationRequired();
});

interface FormModel {
  email: string;
  code: string;
  name: string;
  bio: string;
  description: string;
  remark: string;
  password: string;
  confirmPassword: string;
}

const model: FormModel = reactive({
  email: '',
  code: '',
  name: '',
  bio: '',
  description: '',
  remark: '',
  password: '',
  confirmPassword: ''
});

const rules = computed<Record<keyof FormModel, App.Global.FormRule[]>>(() => {
  const { formRules, createConfirmPwdRule } = useFormRules();

  return {
    email: formRules.email,
    code: verificationRequired.value ? formRules.code : [],
    name: [],
    bio: [],
    description: [],
    remark: [],
    password: formRules.pwd,
    confirmPassword: createConfirmPwdRule(model.password)
  };
});

async function handleGetCode() {
  if (!model.email) {
    window.$message?.error('Please enter email first');
    return;
  }
  
  loading.value = true;
  const { error } = await fetchSendRegistrationCode(model.email);
  loading.value = false;
  
  if (!error) {
    window.$message?.success('Verification code sent to your email');
    start();
  }
}

async function handleSubmit() {
  await validate();
  
  submitting.value = true;
  
  const { error } = await fetchRegister({
    email: model.email,
    code: verificationRequired.value ? model.code : undefined,
    password: model.password,
    name: model.name,
    bio: model.bio,
    description: model.description,
    remark: model.remark
  });

  if (!error) {
    window.$message?.success('Registration successful!');
    toggleLoginModule('pwd-login');
  }
  
  submitting.value = false;
}
</script>

<template>
  <NForm ref="formRef" :model="model" :rules="rules" size="large" :show-label="false" @keyup.enter="handleSubmit">
    <NFormItem path="email">
      <NInput v-model:value="model.email" autocomplete="off" :placeholder="$t('page.login.common.emailPlaceholder')" />
    </NFormItem>
    <NFormItem v-if="verificationRequired" path="code">
      <div class="w-full flex-y-center gap-16px">
        <NInput v-model:value="model.code" autocomplete="off" :placeholder="$t('page.login.common.codePlaceholder')" />
        <NButton size="large" :disabled="isCounting" :loading="loading" @click="handleGetCode">
          {{ label }}
        </NButton>
      </div>
    </NFormItem>
    <NFormItem path="name">
      <NInput v-model:value="model.name" autocomplete="off" placeholder="Name" />
    </NFormItem>
    <NFormItem path="bio">
      <NInput v-model:value="model.bio" autocomplete="off" placeholder="Bio" />
    </NFormItem>
    <NFormItem path="description">
      <NInput v-model:value="model.description" type="textarea" autocomplete="off" placeholder="Description" />
    </NFormItem>
    <NFormItem path="remark">
      <NInput v-model:value="model.remark" type="textarea" autocomplete="off" placeholder="Remark" />
    </NFormItem>
    <NFormItem path="password">
      <NPopover trigger="manual" placement="bottom" :show="isPwdFocused && !!model.password">
        <template #trigger>
          <div class="w-full">
            <NInput
              v-model:value="model.password"
              type="password"
              show-password-on="click"
              autocomplete="new-password"
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
        autocomplete="new-password"
        :placeholder="$t('page.login.common.confirmPasswordPlaceholder')"
      />
    </NFormItem>
    
    <NSpace vertical :size="18" class="w-full">
      <NButton type="primary" size="large" round block :loading="submitting" @click="handleSubmit">
        {{ $t('common.confirm') }}
      </NButton>
      <NButton size="large" round block @click="toggleLoginModule('pwd-login')">
        {{ $t('page.login.common.back') }}
      </NButton>
    </NSpace>
  </NForm>
</template>

<style scoped></style>
