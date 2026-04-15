<template>
  <div>
    <label class="text-sm font-medium text-gray-400 dark:text-gray-400 mb-3 block">Appearance</label>

    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="opt in options"
        :key="opt.value"
        class="flex flex-col items-center gap-2.5 p-4 rounded-lg border-2 transition-all"
        :class="modelValue === opt.value
          ? 'border-palace-500 bg-palace-600/10'
          : 'border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-400 dark:hover:border-surface-600'"
        @click="selectTheme(opt.value)"
      >
        <div
          class="w-full h-20 rounded-md flex items-center justify-center overflow-hidden"
          :class="opt.previewClass"
        >
          <div class="flex gap-1">
            <div class="w-4 h-12 rounded-sm" :class="opt.sidebarClass" />
            <div class="flex flex-col gap-1 flex-1">
              <div class="w-16 h-2 rounded-sm" :class="opt.barClass" />
              <div class="w-12 h-2 rounded-sm" :class="opt.barClass" />
              <div class="w-14 h-2 rounded-sm" :class="opt.barClass" />
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <svg v-if="opt.value === 'dark'" class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
          <svg v-else class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
          <span class="text-sm font-medium" :class="modelValue === opt.value ? 'text-palace-400' : 'text-gray-600 dark:text-gray-400'">
            {{ opt.label }}
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ThemeMode } from '@/stores/settings';

defineProps<{
  modelValue: ThemeMode;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ThemeMode];
}>();

function selectTheme(value: ThemeMode) {
  const html = document.documentElement;
  html.classList.remove('dark', 'light');
  html.classList.add(value);
  emit('update:modelValue', value);
}

const options: Array<{ value: ThemeMode; label: string; previewClass: string; sidebarClass: string; barClass: string }> = [
  {
    value: 'dark',
    label: 'Dark',
    previewClass: 'bg-gray-900 border border-gray-700',
    sidebarClass: 'bg-gray-800',
    barClass: 'bg-gray-700',
  },
  {
    value: 'light',
    label: 'Light',
    previewClass: 'bg-gray-100 border border-gray-300',
    sidebarClass: 'bg-gray-200',
    barClass: 'bg-gray-300',
  },
];
</script>
