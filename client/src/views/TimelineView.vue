<template>
  <div class="h-full flex flex-col">
    <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center gap-4 shrink-0 flex-wrap">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Timeline</h2>

      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500">Wing:</label>
        <select
          v-model="filterWing"
          class="px-2 py-1 rounded-md bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-palace-500"
          @change="resetAndLoad"
        >
          <option value="">All wings</option>
          <option v-for="w in wings" :key="w" :value="w">{{ w }}</option>
        </select>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          v-for="t in typeFilters"
          :key="t.value"
          class="px-2 py-0.5 rounded text-xs transition-colors"
          :class="filterType === t.value
            ? t.activeClass
            : 'bg-surface-100 dark:bg-surface-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          @click="filterType = filterType === t.value ? '' : t.value"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="flex-1" />
      <span class="text-xs text-gray-500 dark:text-gray-600">{{ filtered.length }} entries</span>
    </div>

    <div v-if="loading && entries.length === 0" class="flex-1 flex items-center justify-center text-gray-500 text-sm">
      Loading timeline...
    </div>

    <div v-else-if="entries.length === 0" class="flex-1 flex items-center justify-center text-gray-500 text-sm">
      No entries found
    </div>

    <div v-else ref="scrollContainer" class="flex-1 overflow-auto px-4 pt-4">
      <template v-for="(entry, idx) in filtered" :key="entry.drawer_id">
        <div
          v-if="isPageBoundary(idx)"
          :ref="el => { if (entry._page === lastLoadedPage) dividerRef = el as HTMLElement }"
          class="flex items-center gap-3 pt-2 pb-4 mt-2"
        >
          <div class="flex-1 h-px bg-gradient-to-r from-transparent via-palace-500/30 to-transparent" />
          <span class="text-[10px] font-semibold uppercase tracking-widest text-palace-400/70 shrink-0 px-2">
            Page {{ entry._page + 1 }}
          </span>
          <div class="flex-1 h-px bg-gradient-to-r from-transparent via-palace-500/30 to-transparent" />
        </div>

        <div :class="{ 'tl-fade-in': entry._page === lastLoadedPage && lastLoadedPage > 0 }">
          <TimelineItem
            :entry="entry"
            :is-active="memory.activeDrawer?.drawer_id === entry.drawer_id"
            @select="onSelect"
          />
        </div>
      </template>

      <div v-if="hasMore" class="flex justify-center py-6">
        <button
          class="px-5 py-2 rounded-lg text-sm font-medium transition-colors border"
          :class="loadingMore
            ? 'border-surface-300 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 text-gray-400 dark:text-gray-500 cursor-wait'
            : 'border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-gray-600 dark:text-gray-300 hover:border-palace-500 hover:text-palace-500 dark:hover:text-palace-400'"
          :disabled="loadingMore"
          @click="loadMore"
        >
          {{ loadingMore ? 'Loading...' : 'Load more content' }}
        </button>
      </div>

      <div v-if="!hasMore && entries.length > 0" class="text-center py-6">
        <span class="text-xs text-gray-500 dark:text-gray-600">All entries loaded</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { api } from '@/services/api';
import { usePalaceStore } from '@/stores/palace';
import { useMemoryStore } from '@/stores/memory';
import { useUiStore } from '@/stores/ui';
import type { Drawer, DrawerListResponse, TimelineEntry } from '@/types';
import TimelineItem from '@/components/timeline/TimelineItem.vue';

interface PagedEntry extends TimelineEntry {
  _page: number;
}

const PAGE_SIZE = 20;

const palace = usePalaceStore();
const memory = useMemoryStore();
const ui = useUiStore();

const entries = ref<PagedEntry[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const filterWing = ref('');
const filterType = ref('');
const offset = ref(0);
const hasMore = ref(true);
const currentPage = ref(0);
const lastLoadedPage = ref(0);
const scrollContainer = ref<HTMLDivElement | null>(null);
const dividerRef = ref<HTMLElement | null>(null);

const wings = computed(() => palace.wings.map(w => w.name));

const typeFilters = [
  { value: 'decision', label: 'Decisions', activeClass: 'bg-yellow-500/20 text-yellow-300' },
  { value: 'insight',  label: 'Insights',  activeClass: 'bg-green-500/20 text-green-300' },
  { value: 'rule',     label: 'Rules',     activeClass: 'bg-blue-500/20 text-blue-300' },
  { value: 'general',  label: 'General',   activeClass: 'bg-gray-600/30 text-gray-300' },
];

const filtered = computed<PagedEntry[]>(() => {
  if (!filterType.value) return entries.value;
  return entries.value.filter(e => e.type === filterType.value);
});

function isPageBoundary(idx: number): boolean {
  const entry = filtered.value[idx];
  if (entry._page === 0) return false;
  if (idx === 0) return true;
  return filtered.value[idx - 1]._page !== entry._page;
}

function inferType(content: string): TimelineEntry['type'] {
  const lower = content.toLowerCase();
  if (lower.includes('decision') || lower.includes('decided') || lower.includes('chose')) return 'decision';
  if (lower.includes('insight') || lower.includes('learned') || lower.includes('discovered')) return 'insight';
  if (lower.includes('rule') || lower.includes('always') || lower.includes('never') || lower.includes('must')) return 'rule';
  return 'general';
}

function extractTags(content: string): string[] {
  const match = content.match(/#[\w-]+/g);
  return match ? [...new Set(match)].slice(0, 5) : [];
}

function drawerToEntry(d: Drawer, page: number): PagedEntry {
  const text = d.content || d.content_preview || '';
  const firstLine = text.split('\n')[0].trim();
  const rest = text.split('\n').slice(1).join(' ').trim();

  const meta = d.metadata || {};
  const rawDate = meta.filed_at
    || meta.created_at as string
    || meta.date as string
    || meta.timestamp as string
    || '';

  return {
    drawer_id: d.drawer_id,
    title: firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine,
    content_preview: rest.length > 200 ? rest.slice(0, 200) + '...' : rest,
    wing: d.wing,
    room: d.room,
    date: rawDate,
    type: inferType(text),
    tags: extractTags(text),
    _page: page,
  };
}

async function fetchPage(pageOffset: number, page: number): Promise<PagedEntry[]> {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(pageOffset),
  });
  if (filterWing.value) params.set('wing', filterWing.value);

  const data = await api.get<DrawerListResponse>(`/memories?${params}`);

  if (data.drawers.length < PAGE_SIZE) {
    hasMore.value = false;
  }

  if (data.drawers.length === 0) return [];

  const ids = data.drawers.map(d => d.drawer_id);
  const detailed = await memory.batchLoadDrawers(ids, true);
  const drawerMap = new Map(detailed.map(d => [d.drawer_id, d]));

  const merged = data.drawers.map(d => {
    const full = drawerMap.get(d.drawer_id);
    if (full) return full;
    return d;
  });

  return merged.map(d => drawerToEntry(d, page));
}

function sortEntries() {
  entries.value.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return tb - ta;
  });
}

async function loadEntries() {
  loading.value = true;
  offset.value = 0;
  hasMore.value = true;
  currentPage.value = 0;
  lastLoadedPage.value = 0;
  entries.value = [];

  try {
    const page = await fetchPage(0, 0);
    entries.value = page;
    sortEntries();
    offset.value = PAGE_SIZE;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  loadingMore.value = true;
  currentPage.value++;
  lastLoadedPage.value = currentPage.value;

  try {
    const page = await fetchPage(offset.value, currentPage.value);
    entries.value.push(...page);
    sortEntries();
    offset.value += PAGE_SIZE;

    await nextTick();
    if (dividerRef.value) {
      dividerRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } finally {
    loadingMore.value = false;
  }
}

function resetAndLoad() {
  loadEntries();
}

async function onSelect(entry: TimelineEntry) {
  await memory.loadDrawer(entry.drawer_id);
  ui.openDetailPanel();
}

onMounted(() => {
  loadEntries();
});
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

.tl-fade-in {
  animation: fadeSlideIn 0.5s ease-out both;
}

.tl-fade-in:nth-child(1) { animation-delay: 0ms; }
.tl-fade-in:nth-child(2) { animation-delay: 30ms; }
.tl-fade-in:nth-child(3) { animation-delay: 60ms; }
.tl-fade-in:nth-child(4) { animation-delay: 90ms; }
.tl-fade-in:nth-child(5) { animation-delay: 120ms; }
.tl-fade-in:nth-child(6) { animation-delay: 150ms; }
.tl-fade-in:nth-child(7) { animation-delay: 180ms; }
.tl-fade-in:nth-child(8) { animation-delay: 210ms; }
.tl-fade-in:nth-child(9) { animation-delay: 240ms; }
.tl-fade-in:nth-child(10) { animation-delay: 270ms; }
</style>
