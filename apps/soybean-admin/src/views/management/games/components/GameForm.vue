<template>
  <NModal v-model:show="modalVisible" :title="title" preset="card" class="w-800px">
    <NForm
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-placement="left"
      label-width="120"
      require-mark-placement="right-hanging"
    >
      <NGrid :cols="2" :x-gap="24">
        <!-- Basic Info -->
        <NFormItemGi label="Name" path="name">
          <NInput v-model:value="formModel.name" placeholder="E.g. Spin Wheel" />
        </NFormItemGi>
        
        <NFormItemGi label="Slug" path="slug">
          <NInput v-model:value="formModel.slug" placeholder="E.g. spin-wheel" />
        </NFormItemGi>

        <NFormItemGi label="Type" path="type">
          <NSelect v-model:value="formModel.type" :options="typeOptions" />
        </NFormItemGi>

        <NFormItemGi label="Status" path="isActive">
          <NSwitch v-model:value="formModel.isActive">
            <template #checked>Active</template>
            <template #unchecked>Inactive</template>
          </NSwitch>
        </NFormItemGi>

        <!-- Dimensions -->
        <NFormItemGi label="Width" path="baseWidth">
          <NInputNumber v-model:value="formModel.baseWidth" />
        </NFormItemGi>

        <NFormItemGi label="Height" path="baseHeight">
          <NInputNumber v-model:value="formModel.baseHeight" />
        </NFormItemGi>

        <NFormItemGi label="Orientation" path="isPortrait">
          <NSwitch v-model:value="formModel.isPortrait">
            <template #checked>Portrait</template>
            <template #unchecked>Landscape</template>
          </NSwitch>
        </NFormItemGi>

        <NFormItemGi :span="2" label="Thumbnail URL" path="thumbnailUrl">
          <NInput v-model:value="formModel.thumbnailUrl" placeholder="https://..." />
        </NFormItemGi>

        <NFormItemGi :span="2" label="Description" path="description">
          <NInput
            v-model:value="formModel.description"
            type="textarea"
            placeholder="Game description..."
          />
        </NFormItemGi>
      </NGrid>
      
      <div class="flex justify-end gap-3 mt-4">
        <NButton @click="closeModal">Cancel</NButton>
        <NButton type="primary" :loading="loading" @click="handleSubmit">
          Confirm
        </NButton>
      </div>
    </NForm>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { NModal, NForm, NFormItemGi, NInput, NInputNumber, NSelect, NSwitch, NGrid, NButton } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import type { FormInst } from 'naive-ui';

export interface Props {
  visible: boolean;
  type?: 'add' | 'edit';
  editData?: Api.Management.Game | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void;
  (e: 'success'): void;
}>();

const { loading, startLoading, endLoading } = useLoading();
const formRef = ref<FormInst | null>(null);

const defaultModel = {
  name: '',
  slug: '',
  type: 'arcade',
  isActive: true,
  baseWidth: 360,
  baseHeight: 640,
  isPortrait: true,
  thumbnailUrl: '',
  description: ''
};

const formModel = ref({ ...defaultModel });

const rules = {
  name: [{ required: true, message: 'Please enter game name', trigger: 'blur' }],
  slug: [{ required: true, message: 'Please enter slug', trigger: 'blur' }],
  type: [{ required: true, message: 'Please select type', trigger: 'change' }]
};

const typeOptions = [
  { label: 'Arcade', value: 'arcade' },
  { label: 'Puzzle', value: 'puzzle' },
  { label: 'Casino', value: 'casino' },
  { label: 'Instant', value: 'instant' },
  { label: 'Daily', value: 'daily' }
];

const modalVisible = computed({
  get() {
    return props.visible;
  },
  set(visible) {
    emit('update:visible', visible);
  }
});

const title = computed(() => (props.type === 'add' ? 'Add Game Template' : 'Edit Game Template'));

function closeModal() {
  modalVisible.value = false;
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.type === 'edit' && props.editData) {
        Object.assign(formModel.value, props.editData);
      } else {
        Object.assign(formModel.value, defaultModel);
      }
    }
  }
);

async function handleSubmit() {
  await formRef.value?.validate();
  startLoading();
  // TODO: Emit event to parent to handle API call
  emit('success'); // Placeholder, actual logic in parent
  endLoading();
  closeModal();
}
</script>
