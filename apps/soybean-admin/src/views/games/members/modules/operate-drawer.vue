<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useBoolean, useLoading } from '@sa/hooks';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { fetchCreateMember, fetchUpdateMember, fetchGetCompanies, fetchGetAdminMember } from '@/service/api/management';
import { useAuthStore } from '@/store/modules/auth';
import { $t } from '@/locales';

defineOptions({
  name: 'OperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: 'add' | 'edit';
  /** the edit row data */
  rowData?: Api.Management.Member | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { loading, startLoading, endLoading } = useLoading();
const authStore = useAuthStore();

const title = computed(() => {
  const titles: Record<string, string> = {
    add: 'Add Member',
    edit: 'Edit Member'
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.Management.Member,
  'username' | 'realName' | 'phoneNumber' | 'email' | 'address' | 'password' | 'externalId' | 'companyId' | 'vipTier' | 'level' | 'pointsBalance'
>;

const model: Model = reactive(createDefaultModel());

function createDefaultModel(): Model {
  return {
    username: '',
    realName: '',
    phoneNumber: '',
    email: '',
    address: '',
    password: '',
    externalId: '',
    companyId: authStore.userInfo.currentCompanyId || '',
    vipTier: '',
    level: 1,
    pointsBalance: 0
  };
}

type RuleKey = Extract<keyof Model, 'username' | 'companyId'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  username: { required: true, message: 'Please enter username', trigger: 'blur' },
  companyId: { required: true, message: 'Please select company', trigger: 'change' }
};

const companies = reactive<Api.Management.Company[]>([]);

async function getCompanies() {
  const { data, error } = await fetchGetCompanies();
  if (!error) {
    Object.assign(companies, data);
  }
}

const companyOptions = computed(() => {
  return companies.map(item => ({
    label: item.name,
    value: item.id
  }));
});

// Check if current user can select company (Super Admin)
const canSelectCompany = computed(() => {
  return authStore.userInfo.roles?.includes('R_SUPER') ?? false;
});

async function handleInitModel() {
  Object.assign(model, createDefaultModel());

  if (props.operateType === 'edit' && props.rowData) {
    // Fetch fresh data to get unmasked values if allowed
    const { data, error } = await fetchGetAdminMember(props.rowData.id);
    if (!error && data) {
        Object.assign(model, data);
    } else {
        // Fallback to row data if fetch fails
        Object.assign(model, props.rowData);
    }
    model.password = ''; // Always clear password on edit init
  } else {
      // If creating and not super admin, pre-fill company
      if (!canSelectCompany.value && authStore.userInfo.currentCompanyId) {
          model.companyId = authStore.userInfo.currentCompanyId;
      }
  }
}

function close() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  startLoading();
  
  const api = props.operateType === 'add' ? fetchCreateMember : fetchUpdateMember;
  const data = { ...model };
  
  // Clean up empty strings
  if (!data.externalId) delete data.externalId;
  if (!data.vipTier) delete data.vipTier;
  if (!data.realName) delete data.realName;
  if (!data.phoneNumber) delete data.phoneNumber;
  if (!data.email) delete data.email;
  if (!data.address) delete data.address;

  // SAFETY CHECK: Do not submit masked values
  if (data.email && data.email.includes('****')) {
      delete data.email;
  }
  if (data.phoneNumber && data.phoneNumber.includes('****')) {
      delete data.phoneNumber;
  }

  // Handle password logic
  if (props.operateType === 'edit') {
      if (!data.password) delete data.password; // Don't update if empty
  }
  
  // For update, we need ID
  const args = props.operateType === 'add' ? [data] : [props.rowData!.id, data];

  // @ts-ignore - dynamic call
  const { error } = await api(...args);
  
  if (!error) {
    window.$message?.success(props.operateType === 'add' ? 'Added successfully' : 'Modified successfully');
    close();
    emit('submitted');
  }
  
  endLoading();
}

watch(visible, val => {
  if (val) {
    handleInitModel();
    restoreValidation();
    if (canSelectCompany.value && companies.length === 0) {
        getCompanies();
    }
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="100">
      <NGrid :cols="2" :x-gap="24">
        <NFormItemGi label="Username" path="username">
          <NInput v-model:value="model.username" placeholder="Enter username" />
        </NFormItemGi>
        <NFormItemGi label="Real Name" path="realName">
          <NInput v-model:value="model.realName" placeholder="Enter real name (Optional)" />
        </NFormItemGi>
        <NFormItemGi label="Password" path="password">
          <NInput
            v-model:value="model.password"
            type="password"
            show-password-on="click"
            :placeholder="operateType === 'add' ? 'Required' : 'Leave empty to keep current'"
          />
        </NFormItemGi>
        <NFormItemGi label="Phone" path="phoneNumber">
          <NInput v-model:value="model.phoneNumber" placeholder="Phone Number" />
        </NFormItemGi>
        <NFormItemGi label="Email" path="email">
          <NInput v-model:value="model.email" placeholder="Email Address" />
        </NFormItemGi>
        <NFormItemGi :span="2" label="Address" path="address">
          <NInput v-model:value="model.address" type="textarea" placeholder="Full Address" />
        </NFormItemGi>
        <NFormItemGi label="External ID" path="externalId">
          <NInput v-model:value="model.externalId" placeholder="External System ID (Optional)" />
        </NFormItemGi>
        <NFormItemGi v-if="canSelectCompany" label="Company" path="companyId">
          <NSelect v-model:value="model.companyId" :options="companyOptions" placeholder="Select Company" />
        </NFormItemGi>
        <NFormItemGi label="VIP Tier" path="vipTier">
          <NInput v-model:value="model.vipTier" placeholder="e.g. Gold, Platinum" />
        </NFormItemGi>
        <NFormItemGi label="Level" path="level">
          <NInputNumber v-model:value="model.level" :min="1" />
        </NFormItemGi>
        <NFormItemGi v-if="operateType === 'add'" label="Initial Points" path="pointsBalance">
          <NInputNumber v-model:value="model.pointsBalance" :min="0" />
        </NFormItemGi>
      </NGrid>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="close">Cancel</NButton>
        <NButton type="primary" :loading="loading" @click="handleSubmit">Confirm</NButton>
      </NSpace>
    </template>
  </NModal>
</template>
