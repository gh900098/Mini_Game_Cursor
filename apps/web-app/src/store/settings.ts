import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  // 音效默认开启（每次重新加载都重置，不 persist）
  const soundEnabled = ref<boolean>(true);

  function toggleSound() {
    soundEnabled.value = !soundEnabled.value;
  }

  function setSoundEnabled(enabled: boolean) {
    soundEnabled.value = enabled;
  }

  function resetSound() {
    soundEnabled.value = true;
  }

  return {
    soundEnabled,
    toggleSound,
    setSoundEnabled,
    resetSound,
  };
});
