<template>
  <div class="h-full flex flex-col">
    <div class="px-4 pt-2 shrink-0">
      <Breadcrumb />
    </div>

    <div class="px-4 py-2 flex items-center justify-between shrink-0">
      <h2 class="text-sm text-gray-400">
        <span v-if="palace.selectedRoom">{{ palace.selectedRoom }}</span>
        <span v-else-if="palace.selectedWing">{{ palace.selectedWing }}</span>
        <span v-else>All Memories</span>
        <span class="ml-2 text-gray-600">({{ memory.drawers.length }} of {{ memory.total }})</span>
      </h2>
      <button
        class="px-3 py-1 rounded-md text-xs font-medium bg-palace-600 hover:bg-palace-500 text-white transition-colors"
        @click="startCreate"
      >
        + New Memory
      </button>
    </div>

    <div v-if="memory.loading && memory.drawers.length === 0" class="flex-1 flex items-center justify-center text-gray-500">
      Loading memories...
    </div>

    <div v-else-if="memory.drawers.length === 0" class="flex-1 flex items-center justify-center">
      <div class="text-center text-gray-500">
        <p class="mb-2">No memories found</p>
        <p class="text-xs text-gray-600">Select a wing or room from the sidebar, or create a new memory.</p>
      </div>
    </div>

    <div v-else class="flex-1 overflow-auto px-4 pb-4">
      <div class="grid gap-3 grid-cols-1">
        <template v-for="(drawer, idx) in memory.drawers" :key="drawer.drawer_id">
          <div
            v-if="isPageBoundary(idx)"
            class="flex items-center gap-3 pt-2 pb-2 mt-1"
          >
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-palace-500/30 to-transparent" />
            <span class="text-[10px] font-semibold uppercase tracking-widest text-palace-400/70 shrink-0 px-2">
              Page {{ getPage(idx) + 1 }}
            </span>
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-palace-500/30 to-transparent" />
          </div>

          <div :class="{ 'exp-fade-in': getPage(idx) === lastLoadedPage && lastLoadedPage > 0 }">
            <MemoryCard
              :drawer="drawer"
              :is-active="memory.activeDrawer?.drawer_id === drawer.drawer_id"
              @select="openDrawer"
              @tag-click="searchByTag"
            />
          </div>
        </template>
      </div>

      <div v-if="hasMore" class="flex justify-center py-6">
        <button
          class="px-5 py-2 rounded-lg text-sm font-medium transition-colors border"
          :class="loadingMore
            ? 'border-surface-300 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 text-gray-400 dark:text-gray-500 cursor-wait'
            : 'border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-gray-600 dark:text-gray-300 hover:border-palace-500 hover:text-palace-500 dark:hover:text-palace-400'"
          :disabled="loadingMore"
          @click="loadMoreDrawers"
        >
          {{ loadingMore ? 'Loading...' : 'Load more content' }}
        </button>
      </div>

      <div v-if="!hasMore && memory.drawers.length > 0" class="text-center py-6">
        <span class="text-xs text-gray-500 dark:text-gray-600">All entries loaded</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { usePalaceStore } from '@/stores/palace';
import { useMemoryStore } from '@/stores/memory';
import { useUiStore } from '@/stores/ui';
import { useSearchStore } from '@/stores/search';
import type { Drawer } from '@/types';
import Breadcrumb from '@/components/layout/Breadcrumb.vue';
import MemoryCard from '@/components/memory/MemoryCard.vue';

const PAGE_SIZE = 20;

const palace = usePalaceStore();
const memory = useMemoryStore();
const ui = useUiStore();
const searchStore = useSearchStore();

const offset = ref(0);
const hasMore = ref(true);
const loadingMore = ref(false);
const currentPage = ref(0);
const lastLoadedPage = ref(0);
const pageBoundaries = ref<number[]>([]);

function getPage(idx: number): number {
  let page = 0;
  for (const b of pageBoundaries.value) {
    if (idx >= b) page++;
    else break;
  }
  return page;
}

function isPageBoundary(idx: number): boolean {
  return pageBoundaries.value.includes(idx) && idx > 0;
}

async function loadCurrent() {
  offset.value = 0;
  hasMore.value = true;
  currentPage.value = 0;
  lastLoadedPage.value = 0;
  pageBoundaries.value = [];

  await memory.loadDrawers(
    palace.selectedWing || undefined,
    palace.selectedRoom || undefined,
    PAGE_SIZE,
    0,
  );

  if (memory.drawers.length < PAGE_SIZE) {
    hasMore.value = false;
  }
  offset.value = PAGE_SIZE;
}

async function loadMoreDrawers() {
  if (loadingMore.value || !hasMore.value) return;
  loadingMore.value = true;

  try {
    const wing = palace.selectedWing || undefined;
    const room = palace.selectedRoom || undefined;

    const boundaryIdx = memory.drawers.length;

    await memory.appendDrawers(wing, room, PAGE_SIZE, offset.value);

    currentPage.value++;
    lastLoadedPage.value = currentPage.value;
    pageBoundaries.value.push(boundaryIdx);

    if (memory.lastAppendCount < PAGE_SIZE) {
      hasMore.value = false;
    }
    offset.value += PAGE_SIZE;
  } finally {
    loadingMore.value = false;
  }
}

watch(
  () => [palace.selectedWing, palace.selectedRoom],
  () => loadCurrent(),
);

onMounted(() => {
  if (palace.wings.length > 0) {
    loadCurrent();
  }
});

async function openDrawer(drawer: Drawer) {
  await memory.loadDrawer(drawer.drawer_id);
  memory.editing = false;
  ui.openDetailPanel();
}

function startCreate() {
  memory.clearActive();
  memory.editing = true;
  ui.openDetailPanel();
}

function searchByTag(tag: string) {
  searchStore.search(tag);
  searchStore.open();
}
</script>

<style scoped>
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.exp-fade-in {
  animation: fadeSlideIn 0.5s ease-out both;
}

.exp-fade-in:nth-child(1) { animation-delay: 0ms; }
.exp-fade-in:nth-child(2) { animation-delay: 30ms; }
.exp-fade-in:nth-child(3) { animation-delay: 60ms; }
.exp-fade-in:nth-child(4) { animation-delay: 90ms; }
.exp-fade-in:nth-child(5) { animation-delay: 120ms; }
.exp-fade-in:nth-child(6) { animation-delay: 150ms; }
.exp-fade-in:nth-child(7) { animation-delay: 180ms; }
.exp-fade-in:nth-child(8) { animation-delay: 210ms; }
.exp-fade-in:nth-child(9) { animation-delay: 240ms; }
.exp-fade-in:nth-child(10) { animation-delay: 270ms; }
</style>
