<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center gap-4 px-4 py-2 border-b border-surface-800 shrink-0">
      <h2 class="text-sm font-semibold text-gray-200">Query Lab</h2>

      <div class="flex-1" />

      <button
        v-if="history.length > 0"
        class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        @click="showHistory = !showHistory"
      >
        {{ showHistory ? 'Hide' : 'Show' }} History ({{ history.length }})
      </button>
    </div>

    <div v-if="showHistory" class="px-4 py-2 border-b border-surface-800 bg-surface-900/50 max-h-32 overflow-auto">
      <div
        v-for="entry in history"
        :key="entry.id"
        class="flex items-center gap-3 py-1 text-xs cursor-pointer hover:text-gray-200 text-gray-400"
        @click="loadFromHistory(entry.query)"
      >
        <span class="truncate flex-1 font-mono">{{ entry.query }}</span>
        <span class="text-gray-600 tabular-nums shrink-0">{{ entry.resultCt }} results</span>
        <span class="text-gray-700 shrink-0">{{ formatDate(entry.createdAt) }}</span>
      </div>
    </div>

    <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div class="h-48 shrink-0 p-4 pb-2">
        <QueryEditor
          v-model="queryText"
          @run="runQuery"
        />
      </div>

      <div class="flex-1 min-h-0 border-t border-surface-800">
        <QueryResults
          :results="results"
          :loading="loading"
          @select="onSelect"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/services/api';
import { useMemoryStore } from '@/stores/memory';
import { useUiStore } from '@/stores/ui';
import type { QueryLabResult, QueryLabResponse, QueryHistoryEntry } from '@/types';
import QueryEditor from '@/components/query/QueryEditor.vue';
import QueryResults from '@/components/query/QueryResults.vue';

const memory = useMemoryStore();
const ui = useUiStore();

const queryText = ref('');
const results = ref<QueryLabResult[]>([]);
const loading = ref(false);
const history = ref<QueryHistoryEntry[]>([]);
const showHistory = ref(false);

async function runQuery() {
  if (!queryText.value.trim()) return;
  loading.value = true;
  try {
    const data = await api.post<QueryLabResponse>('/query', { query: queryText.value });
    results.value = data.results;
    await loadHistory();
  } catch (err) {
    results.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadHistory() {
  try {
    const data = await api.get<{ history: QueryHistoryEntry[] }>('/query/history?limit=20');
    history.value = data.history;
  } catch {
    // ignore
  }
}

function loadFromHistory(q: string) {
  queryText.value = q;
  showHistory.value = false;
  runQuery();
}

async function onSelect(result: QueryLabResult) {
  if (result.drawer_id) {
    await memory.loadDrawer(result.drawer_id);
    ui.openDetailPanel();
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

onMounted(() => {
  loadHistory();
});
</script>
