<template>
  <aside class="w-64 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 flex flex-col overflow-hidden shrink-0">
    <div class="px-3 py-2 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
      <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Palace Structure</h2>
      <button
        class="p-1 rounded-md text-gray-400 hover:text-palace-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        :class="{ 'animate-spin': refreshing }"
        title="Refresh tree"
        :disabled="refreshing"
        @click="refresh"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 14.652" />
        </svg>
      </button>
    </div>
    <div class="flex-1 overflow-auto px-1 py-1">
      <TreeView />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePalaceStore } from '@/stores/palace';
import { useUiStore } from '@/stores/ui';
import TreeView from '@/components/tree/TreeView.vue';

const palace = usePalaceStore();
const ui = useUiStore();
const refreshing = ref(false);

async function refresh() {
  refreshing.value = true;
  try {
    await palace.loadTaxonomy();
    ui.showToast('Árvore atualizada');
  } catch {
    ui.showToast('Falha ao atualizar');
  } finally {
    refreshing.value = false;
  }
}
</script>
