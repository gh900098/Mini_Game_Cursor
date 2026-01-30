import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  // 从 localStorage 读取初始值，默认开启
  const soundEnabled = ref<boolean>(
    localStorage.getItem('soundEnabled') !== 'false'
  );

  // 监听变化并同步到 localStorage
  watch(soundEnabled, (newValue) => {
    localStorage.setItem('soundEnabled', String(newValue));
  });

  function toggleSound() {
    soundEnabled.value = !soundEnabled.value;
  }

  function setSoundEnabled(enabled: boolean) {
    soundEnabled.value = enabled;
  }

  return {
    soundEnabled,
    toggleSound,
    setSoundEnabled,
  };
});
