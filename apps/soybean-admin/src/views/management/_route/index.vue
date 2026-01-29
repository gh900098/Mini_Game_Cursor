<script setup lang="ts">
</script>

<template>
  <div class="h-full flex-col">
    <NCard title="Route" :bordered="false" class="flex-1-hidden rounded-16px shadow-sm">
      <div class="flex-center h-full flex-col">
        <icon-local-empty-data class="text-120px text-primary opacity-20" />
        <h3 class="mt-4 text-20px font-medium">Coming Soon</h3>
        <p class="mt-2 text-gray-500 text-center max-w-400px">
          This module is designed for managing dynamic system menus and navigation routes. 
          The backend API for menu management is currently under development.
        </p>
        <NSpace class="mt-6">
          <NButton type="primary" secondary @click="() => $router.back()">Go Back</NButton>
        </NSpace>
      </div>
    </NCard>
  </div>
</template>


