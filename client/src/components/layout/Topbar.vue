<template>
  <header class="h-12 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 flex items-center px-4 shrink-0">
    <button
      class="mr-3 p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      title="Toggle sidebar"
      @click="ui.toggleSidebar()"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>

    <div class="flex items-center gap-2 mr-6">
      <svg class="w-6 h-6 text-blue-600 dark:text-palace-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 2L3 8h18L12 2Z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 8v1h16V8" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 9v9M10 9v9M14 9v9M18 9v9" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 18h18v2H3z" />
      </svg>
      <span class="text-sm font-semibold text-blue-600 dark:text-palace-300 tracking-wide">MemPalace Explorer</span>
    </div>

    <nav class="flex items-center gap-1">
      <router-link
        v-for="tab in tabs"
        :key="tab.route"
        :to="tab.route"
        class="px-3 py-1.5 text-sm rounded-md transition-colors"
        :class="isActive(tab.route)
          ? 'bg-surface-100 dark:bg-surface-800 text-palace-600 dark:text-palace-300 font-medium'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-surface-100/50 dark:hover:bg-surface-800/50'"
      >
        {{ tab.label }}
      </router-link>
    </nav>

    <div class="flex-1" />

    <button
      class="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors"
      @click="searchStore.toggle()"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <span>Search</span>
      <kbd class="hidden sm:inline text-xs bg-surface-200 dark:bg-surface-700 px-1.5 py-0.5 rounded font-mono">{{ isMac ? '⌘' : 'Ctrl+' }}K</kbd>
    </button>

    <router-link
      to="/settings"
      class="ml-3 p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      title="Settings"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    </router-link>
  </header>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useSearchStore } from '@/stores/search';
import { useUiStore } from '@/stores/ui';

const route = useRoute();
const searchStore = useSearchStore();
const ui = useUiStore();

const isMac = navigator.platform.toUpperCase().includes('MAC');

const tabs = [
  { label: 'Explorer', route: '/' },
  { label: 'Graph', route: '/graph' },
  { label: 'Query Lab', route: '/query-lab' },
  { label: 'Timeline', route: '/timeline' },
];

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}
</script>
