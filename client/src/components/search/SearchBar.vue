<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
    @click.self="close"
    @keydown.escape="close"
  >
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

    <div class="relative w-full max-w-xl bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-xl shadow-2xl overflow-hidden">
      <div class="flex items-center gap-3 px-4 py-3 border-b border-surface-200 dark:border-surface-800">
        <svg class="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          ref="inputRef"
          v-model="localQuery"
          type="text"
          class="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 outline-none"
          placeholder="Search memories..."
          @input="onInput"
          @keydown.enter="onEnter"
        />
        <span v-if="searchStore.loading" class="text-xs text-gray-500">Searching...</span>
        <kbd class="text-xs text-gray-500 dark:text-gray-600 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
      </div>

      <SearchResults
        v-if="searchStore.results.length > 0 || searchStore.loading"
        :results="searchStore.results"
        :query="localQuery"
        :loading="searchStore.loading"
        @select="onSelect"
      />

      <div
        v-else-if="localQuery.length > 0 && !searchStore.loading"
        class="px-4 py-8 text-center text-sm text-gray-500"
      >
        No results found for "{{ localQuery }}"
      </div>

      <div v-else class="px-4 py-6 text-center text-xs text-gray-600">
        Type to search across all memories semantically
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSearchStore } from '@/stores/search';
import { useMemoryStore } from '@/stores/memory';
import { usePalaceStore } from '@/stores/palace';
import { useUiStore } from '@/stores/ui';
import { api } from '@/services/api';
import type { SearchResult, DrawerListResponse } from '@/types';
import SearchResults from './SearchResults.vue';

const router = useRouter();
const searchStore = useSearchStore();
const memory = useMemoryStore();
const palace = usePalaceStore();
const ui = useUiStore();

const inputRef = ref<HTMLInputElement | null>(null);
const localQuery = ref('');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const isOpen = computed(() => searchStore.isOpen);

watch(isOpen, async (open) => {
  if (open) {
    localQuery.value = '';
    await nextTick();
    inputRef.value?.focus();
  }
});

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (localQuery.value.trim().length >= 2) {
      searchStore.search(localQuery.value, { limit: 10 });
    }
  }, 300);
}

function onEnter() {
  if (localQuery.value.trim().length >= 2) {
    searchStore.search(localQuery.value, { limit: 10 });
  }
}

async function onSelect(result: SearchResult) {
  close();

  // Navigate to Explorer via the router; await + nextTick lets the route
  // watcher in AppLayout fire (and close any stale detail panel) BEFORE
  // we open the fresh one below.
  if (router.currentRoute.value.path !== '/') {
    await router.push('/');
    await nextTick();
  }

  palace.selectRoom(result.wing, result.room);

  // mempalace_search doesn't always return drawer_id — fall back to a
  // content-based lookup in the wing/room when it's missing.
  let drawerId = result.drawer_id;
  if (!drawerId) {
    try {
      const params = new URLSearchParams({
        wing: result.wing,
        room: result.room,
        limit: '100',
      });
      const data = await api.get<DrawerListResponse>(`/memories?${params}`);
      const resultTitle = result.text.split('\n')[0].trim().replace(/^#+\s*/, '');
      const match = data.drawers.find(d => {
        const preview = (d.content_preview || d.content || '').trim();
        // Primary: match by title (first line, stripped of heading markers)
        const drawerTitle = preview.split('\n')[0].trim().replace(/^#+\s*/, '');
        if (drawerTitle && resultTitle && drawerTitle === resultTitle) return true;
        // Fallback: adaptive prefix comparison (handles previews shorter than 80 chars)
        const len = Math.min(preview.length, result.text.length, 100);
        return len >= 20 && preview.slice(0, len) === result.text.slice(0, len);
      });
      drawerId = match?.drawer_id;
    } catch {
      // ignore — just navigate without opening detail panel
    }
  }

  if (drawerId) {
    await memory.loadDrawer(drawerId);
    memory.editing = false;
    ui.openDetailPanel();
  }
}

function close() {
  searchStore.close();
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    searchStore.toggle();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>
