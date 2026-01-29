<script setup lang="ts">
import { computed } from 'vue';
import { useSvgIcon } from '@/hooks/common/icon';

defineOptions({
  name: 'PasswordCriteria'
});

interface Props {
  password?: string;
}

const props = withDefaults(defineProps<Props>(), {
  password: ''
});

const { SvgIconVNode } = useSvgIcon();

type Criterion = {
  key: string;
  label: string;
  met: boolean;
};

const criteria = computed<Criterion[]>(() => {
  const pwd = props.password || '';
  return [
    { key: 'length', label: 'Min 9 characters', met: pwd.length >= 9 },
    { key: 'upper', label: 'At least 1 Uppercase', met: /[A-Z]/.test(pwd) },
    { key: 'lower', label: 'At least 1 Lowercase', met: /[a-z]/.test(pwd) },
    { key: 'number', label: 'At least 1 Number', met: /\d/.test(pwd) },
    { key: 'special', label: 'At least 1 Special Char', met: /[\W_]/.test(pwd) },
    { key: 'safe', label: 'Safe from unsafe patterns', met: !/(select|update|delete|insert|drop|alter|script|<|>)/i.test(pwd) }
  ];
});

const isAllMet = computed(() => criteria.value.every(c => c.met));
</script>

<template>
  <div class="p-2 border rounded-8px bg-card shadow-sm text-12px">
    <div v-for="item in criteria" :key="item.key" class="flex items-center gap-2 mb-1 last:mb-0">
      <component
        :is="SvgIconVNode({ icon: item.met ? 'ph:check-circle-fill' : 'ph:x-circle-fill', fontSize: 16, color: item.met ? '#52c41a' : '#ff4d4f' })"
      />
      <span :class="{ 'text-success': item.met, 'text-error': !item.met, 'text-gray-400': !props.password }">
        {{ item.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.text-success { color: #52c41a; }
.text-error { color: #ff4d4f; }
.bg-card { background-color: var(--n-card-color, #fff); }
</style>
