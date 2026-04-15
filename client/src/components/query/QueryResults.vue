<template>
  <div class="h-full flex flex-col">
    <div v-if="results.length === 0 && !loading" class="flex-1 flex items-center justify-center text-gray-600 text-sm">
      Run a query to see results
    </div>

    <div v-else-if="loading" class="flex-1 flex items-center justify-center text-gray-500 text-sm">
      Executing query...
    </div>

    <div v-else class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-surface-900 z-10">
          <tr class="border-b border-surface-700">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 select-none"
              @click="toggleSort(col.key)"
            >
              <div class="flex items-center gap-1">
                {{ col.label }}
                <span v-if="sortKey === col.key" class="text-palace-400">
                  {{ sortDir === 'asc' ? '↑' : '↓' }}
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in sortedResults"
            :key="row.drawer_id"
            class="border-b border-surface-800/50 hover:bg-surface-800/50 cursor-pointer transition-colors"
            @click="emit('select', row)"
          >
            <td class="px-3 py-2 text-gray-300 max-w-xs truncate">{{ row.title }}</td>
            <td class="px-3 py-2">
              <span class="text-xs px-1.5 py-0.5 rounded bg-palace-600/20 text-palace-300">{{ row.wing }}</span>
            </td>
            <td class="px-3 py-2">
              <span class="text-xs px-1.5 py-0.5 rounded bg-blue-600/15 text-blue-300">{{ row.room }}</span>
            </td>
            <td class="px-3 py-2 text-xs text-gray-500 tabular-nums">
              {{ row.distance != null ? row.distance.toFixed(2) : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="results.length > 0" class="px-3 py-1.5 border-t border-surface-700 text-xs text-gray-500 shrink-0">
      {{ results.length }} result{{ results.length === 1 ? '' : 's' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { QueryLabResult } from '@/types';

const props = defineProps<{
  results: QueryLabResult[];
  loading: boolean;
}>();

const emit = defineEmits<{
  select: [result: QueryLabResult];
}>();

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'wing', label: 'Wing' },
  { key: 'room', label: 'Room' },
  { key: 'distance', label: 'Score' },
];

const sortKey = ref<string>('');
const sortDir = ref<'asc' | 'desc'>('asc');

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
}

const sortedResults = computed(() => {
  if (!sortKey.value) return props.results;
  const k = sortKey.value as keyof QueryLabResult;
  const dir = sortDir.value === 'asc' ? 1 : -1;
  return [...props.results].sort((a, b) => {
    const va = a[k] ?? '';
    const vb = b[k] ?? '';
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
});
</script>
