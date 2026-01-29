<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useAuthStore } from '@/store/modules/auth';
import type { DropdownOption } from 'naive-ui';
import { useSvgIcon } from '@/hooks/common/icon';
import { fetchGetCompanies } from '@/service/api/management';

defineOptions({
  name: 'CompanySelector'
});

const authStore = useAuthStore();
const { SvgIconVNode } = useSvgIcon();

const allCompanies = ref<Api.Management.Company[]>([]);

async function getAllCompanies() {
  if (authStore.userInfo.roles.includes('R_SUPER') || authStore.isStaticSuper) {
    const { data, error } = await fetchGetCompanies();
    if (!error && data) {
      allCompanies.value = data;
    }
  }
}

const options = computed<DropdownOption[]>(() => {
  const opts: DropdownOption[] = [];
  
  // Add "All" option for Super Admins
  if (authStore.userInfo.roles.includes('R_SUPER') || authStore.isStaticSuper) {
    opts.push({
      label: 'All',
      key: 'ALL',
      disabled: authStore.userInfo.currentCompanyId === null,
      icon: SvgIconVNode({ icon: 'ph:globe', fontSize: 18 })
    });

    // For Super Admin, show ALL companies
    if (allCompanies.value.length > 0) {
       const allCompanyOpts = allCompanies.value.map(company => ({
        label: company.name,
        key: company.id,
        disabled: company.id === authStore.userInfo.currentCompanyId,
        icon: SvgIconVNode({ icon: 'ph:buildings', fontSize: 18 })
      }));
      return [...opts, ...allCompanyOpts];
    }
  }

  // Fallback for regular admins or if allCompanies empty (should only show assigned)
  const companyOpts = authStore.userInfo.companies.map(company => ({
    label: company.companyName,
    key: company.companyId,
    disabled: company.companyId === authStore.userInfo.currentCompanyId,
    icon: SvgIconVNode({ icon: 'ph:buildings', fontSize: 18 })
  }));

  return [...opts, ...companyOpts];
});

const currentCompanyName = computed(() => {
  if (!authStore.userInfo.currentCompanyId) return 'All';
  
  // Try to find in assigned companies
  const assigned = authStore.userInfo.companies.find(c => c.companyId === authStore.userInfo.currentCompanyId);
  if (assigned) return assigned.companyName;

  // Try to find in all companies (for super admin)
  const fromAll = allCompanies.value.find(c => c.id === authStore.userInfo.currentCompanyId);
  if (fromAll) return fromAll.name;

  return 'Unknown Company';
});

function handleSelect(key: string) {
  authStore.switchCompany(key);
}

onMounted(() => {
  getAllCompanies();
});
</script>

<template>
  <NDropdown 
    v-if="options.length > 0" 
    trigger="click" 
    :options="options" 
    @select="handleSelect"
  >
    <div>
      <ButtonIcon>
        <SvgIcon icon="ph:buildings" class="text-icon-large" />
        <span class="text-16px font-medium ml-2">{{ currentCompanyName }}</span>
      </ButtonIcon>
    </div>
  </NDropdown>
</template>

<style scoped></style>
