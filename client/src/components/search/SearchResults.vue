<template>
  <div class="max-h-80 overflow-auto">
    <div v-if="loading && results.length === 0" class="px-4 py-6 text-center text-sm text-gray-500">
      Searching...
    </div>

    <ul class="py-1">
      <li
        v-for="(result, i) in results"
        :key="i"
        class="px-4 py-2.5 cursor-pointer hover:bg-surface-800 transition-colors border-b border-surface-800/50 last:border-0"
        @click="emit('select', result)"
      >
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs px-1.5 py-0.5 rounded bg-palace-600/20 text-palace-300">{{ result.wing }}</span>
          <span class="text-xs text-gray-600">/</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-blue-600/15 text-blue-300">{{ result.room }}</span>
          <span class="ml-auto text-xs text-gray-600 tabular-nums">
            {{ (result.distance).toFixed(2) }}
          </span>
        </div>

        <h4 class="text-sm font-medium text-gray-200 line-clamp-1 mb-0.5" v-html="highlightTitle(result)" />

        <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed" v-html="highlightSnippet(result)" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { SearchResult } from '@/types';

const props = defineProps<{
  results: SearchResult[];
  query: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  select: [result: SearchResult];
}>();

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightText(text: string): string {
  if (!props.query.trim()) return escapeHtml(text);
  const words = props.query.trim().split(/\s+/).filter(w => w.length >= 2);
  if (words.length === 0) return escapeHtml(text);

  const escaped = escapeHtml(text);
  const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  return escaped.replace(regex, '<mark class="bg-palace-600/30 text-palace-200 rounded px-0.5">$1</mark>');
}

function highlightTitle(result: SearchResult): string {
  const firstLine = result.text.split('\n')[0].trim();
  const title = firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine;
  return highlightText(title);
}

function highlightSnippet(result: SearchResult): string {
  const lines = result.text.split('\n').slice(1).join(' ').trim();
  const snippet = lines.length > 160 ? lines.slice(0, 160) + '...' : lines;
  return highlightText(snippet);
}
</script>
