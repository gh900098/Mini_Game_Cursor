<script setup lang="ts">
import { ref, computed } from 'vue';
import { NPopover, NInput, NButton, NScrollbar, NInputGroup } from 'naive-ui';

interface Props {
  value?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: ''
});

const emit = defineEmits<{
  (e: 'update:value', val: string): void;
}>();

const showPicker = ref(false);
const searchQuery = ref('');

// Curated emoji categories for prize types
const emojiCategories = [
  {
    name: '🏆 Prizes & Rewards',
    emojis: ['🎁', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '🎗️', '💎', '👑', '🎯', '🎪', '🎠', '🎡', '🎢', '🎟️', '🎫', '🎉', '🎊', '🎈']
  },
  {
    name: '💰 Money & Finance',
    emojis: ['💰', '💵', '💴', '💶', '💷', '💳', '💲', '🪙', '🏦', '📈', '📊', '💹', '🤑', '💸', '💱']
  },
  {
    name: '🛍️ Shopping & Items',
    emojis: ['🛍️', '🛒', '🎒', '👜', '👝', '🧳', '📦', '📫', '📬', '📮', '🏷️', '🔖', '🎀', '🧧', '🪅']
  },
  {
    name: '📧 Digital & Tech',
    emojis: ['📧', '📩', '📨', '💻', '📱', '🖥️', '⌨️', '🖱️', '💿', '📀', '🔗', '🔐', '🔑', '📲', '🌐']
  },
  {
    name: '⭐ Stars & Points',
    emojis: ['⭐', '🌟', '✨', '💫', '🔆', '🔅', '⚡', '🔥', '💥', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '🖤', '❤️‍🔥', '💝', '💖']
  },
  {
    name: '🍔 Food & Drink',
    emojis: ['🍔', '🍕', '🍟', '🌮', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍯', '☕', '🍵', '🧃', '🥤', '🍷', '🍺', '🥂']
  },
  {
    name: '🎮 Games & Fun',
    emojis: ['🎮', '🕹️', '🎲', '♠️', '♥️', '♦️', '♣️', '🃏', '🀄', '🎳', '🎯', '🎱', '🧩', '🎰', '🎵']
  },
  {
    name: '😀 Faces',
    emojis: ['😀', '😃', '😄', '😁', '😆', '🥹', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😎', '🤗', '🤠']
  },
  {
    name: '🐾 Animals',
    emojis: ['🐱', '🐶', '🐻', '🐼', '🦊', '🦁', '🐯', '🐮', '🐷', '🐸', '🐵', '🦄', '🐉', '🦋', '🐝']
  },
  {
    name: '✋ Hands & Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🤟', '🤘', '👌', '🤙', '💪', '✋', '🖐️', '🫰']
  }
];

const filteredCategories = computed(() => {
  if (!searchQuery.value) return emojiCategories;
  const q = searchQuery.value.toLowerCase();
  return emojiCategories
    .map(cat => ({
      ...cat,
      emojis: cat.emojis.filter(() => cat.name.toLowerCase().includes(q))
    }))
    .filter(cat => cat.emojis.length > 0);
});

function selectEmoji(emoji: string) {
  emit('update:value', emoji);
  showPicker.value = false;
}
</script>

<template>
  <NInputGroup style="width: 100%">
    <NInput :value="value" @update:value="$emit('update:value', $event)" placeholder="Emoji" style="flex: 1; text-align: center;" />
    <NPopover v-model:show="showPicker" trigger="click" placement="bottom-end" :width="360" raw>
      <template #trigger>
        <NButton type="primary" secondary style="padding: 0 12px;">
          😀
        </NButton>
      </template>
      <div class="emoji-picker">
        <div class="emoji-picker__search">
          <NInput v-model:value="searchQuery" placeholder="Search category..." size="small" clearable>
            <template #prefix>🔍</template>
          </NInput>
        </div>
        <NScrollbar style="max-height: 320px;">
          <div class="emoji-picker__body">
            <div v-for="category in filteredCategories" :key="category.name" class="emoji-picker__category">
              <div class="emoji-picker__category-name">{{ category.name }}</div>
              <div class="emoji-picker__grid">
                <button
                  v-for="emoji in category.emojis"
                  :key="emoji"
                  class="emoji-picker__item"
                  :class="{ 'emoji-picker__item--selected': emoji === value }"
                  @click="selectEmoji(emoji)"
                >
                  {{ emoji }}
                </button>
              </div>
            </div>
          </div>
        </NScrollbar>
      </div>
    </NPopover>
  </NInputGroup>
</template>

<style scoped>
.emoji-picker {
  background: var(--n-color-popover, #fff);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.emoji-picker__search {
  padding: 10px 12px 6px;
  border-bottom: 1px solid var(--n-border-color, #e0e0e6);
}

.emoji-picker__body {
  padding: 6px 12px 12px;
}

.emoji-picker__category {
  margin-bottom: 8px;
}

.emoji-picker__category-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--n-text-color-3, #999);
  padding: 6px 0 4px;
  user-select: none;
}

.emoji-picker__grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

.emoji-picker__item {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
  line-height: 1;
}

.emoji-picker__item:hover {
  background: var(--n-color-hover, rgba(24, 160, 88, 0.08));
  transform: scale(1.2);
}

.emoji-picker__item--selected {
  background: var(--n-color-hover, rgba(24, 160, 88, 0.15));
  box-shadow: 0 0 0 2px var(--n-color-focus, rgba(24, 160, 88, 0.3));
}
</style>
