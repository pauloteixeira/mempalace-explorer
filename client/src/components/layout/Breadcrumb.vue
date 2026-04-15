<template>
  <nav v-if="palace.breadcrumb.length > 0" class="flex items-center gap-1 text-sm px-1 py-2">
    <button
      class="text-gray-500 hover:text-gray-300 transition-colors"
      @click="palace.selectWing(null)"
    >
      Palace
    </button>

    <template v-for="(crumb, i) in palace.breadcrumb" :key="i">
      <svg class="w-3 h-3 text-gray-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
      </svg>
      <button
        class="transition-colors truncate max-w-48"
        :class="i === palace.breadcrumb.length - 1
          ? 'text-palace-300 font-medium'
          : 'text-gray-400 hover:text-gray-200'"
        @click="handleCrumbClick(crumb)"
      >
        {{ crumb.label }}
      </button>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { usePalaceStore } from '@/stores/palace';

const palace = usePalaceStore();

function handleCrumbClick(crumb: { label: string; type: string }) {
  if (crumb.type === 'wing') {
    palace.selectWing(crumb.label);
  }
}
</script>
