<template>
  <div class="h-full flex flex-col border-r border-surface-200 dark:border-surface-800 overflow-hidden">
    <div class="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-800 shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Memory Detail</h2>
        <span
          v-if="drawer"
          class="text-xs px-1.5 py-0.5 rounded bg-surface-800 text-gray-500 font-mono"
        >
          {{ drawer.drawer_id.split('_').pop()?.slice(0, 8) }}
        </span>
      </div>
      <button
        class="p-1 rounded hover:bg-surface-800 text-gray-500 hover:text-gray-300 transition-colors"
        @click="close"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div v-if="!drawer" class="flex-1 flex items-center justify-center text-gray-600 text-sm">
      Select a memory to view details
    </div>

    <div v-else class="flex-1 overflow-auto">
      <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-800 space-y-3">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs px-2 py-0.5 rounded bg-palace-600/20 text-palace-300">{{ drawer.wing }}</span>
          <span class="text-xs text-gray-600">/</span>
          <span class="text-xs px-2 py-0.5 rounded bg-blue-600/15 text-blue-300">{{ drawer.room }}</span>
        </div>

        <div class="flex items-center gap-2 text-xs text-gray-500">
          <span v-if="drawer.metadata?.filed_at">
            {{ formatDate(drawer.metadata.filed_at) }}
          </span>
          <span v-if="drawer.metadata?.added_by" class="text-gray-600">
            by {{ drawer.metadata.added_by }}
          </span>
          <span v-if="drawer.metadata?.source_file" class="truncate text-gray-600 font-mono">
            {{ drawer.metadata.source_file }}
          </span>
        </div>

        <div v-if="contentTags.length" class="flex items-center gap-1.5 flex-wrap">
          <span
            v-for="tag in contentTags"
            :key="tag"
            class="text-xs px-1.5 py-0.5 rounded bg-palace-600/15 text-palace-300 cursor-pointer hover:bg-palace-600/25"
            @click="emit('tagClick', tag)"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <div class="px-4 py-4 prose-content text-sm text-gray-700 dark:text-gray-300 leading-relaxed" v-html="renderedContent"></div>
    </div>

    <div v-if="drawer" class="px-4 py-3 border-t border-surface-200 dark:border-surface-800 flex items-center gap-2 shrink-0">
      <button
        class="p-1.5 rounded hover:bg-surface-800 transition-colors"
        :class="drawer.isFavorite ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'"
        title="Toggle favorite"
        @click="emit('toggleFavorite', drawer)"
      >
        <svg class="w-4 h-4" :fill="drawer.isFavorite ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      </button>

      <button
        class="p-1.5 rounded text-gray-500 hover:text-blue-400 hover:bg-surface-800 transition-colors"
        title="Edit"
        @click="emit('edit', drawer)"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      </button>

      <button
        class="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-surface-800 transition-colors"
        title="Delete"
        @click="emit('delete', drawer)"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import type { Drawer } from '@/types';

marked.setOptions({ breaks: true, gfm: true });

const props = defineProps<{
  drawer: Drawer | null;
}>();

const emit = defineEmits<{
  close: [];
  edit: [drawer: Drawer];
  delete: [drawer: Drawer];
  toggleFavorite: [drawer: Drawer];
  tagClick: [tag: string];
}>();

const renderedContent = computed(() => {
  if (!props.drawer?.content) return '';
  return marked.parse(props.drawer.content) as string;
});

const contentTags = computed(() => {
  if (!props.drawer?.content) return [];
  const match = props.drawer.content.match(/#[\w-]+/g);
  return match ? [...new Set(match)].slice(0, 10) : [];
});

function close() {
  emit('close');
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
</script>

<style scoped>
.prose-content :deep(h1),
.prose-content :deep(h2),
.prose-content :deep(h3),
.prose-content :deep(h4),
.prose-content :deep(h5),
.prose-content :deep(h6) {
  font-weight: 600;
  margin-top: 1.25em;
  margin-bottom: 0.5em;
  line-height: 1.3;
}

.prose-content :deep(h1) { font-size: 1.5em; }
.prose-content :deep(h2) { font-size: 1.25em; }
.prose-content :deep(h3) { font-size: 1.1em; }

.prose-content :deep(p) {
  margin-bottom: 0.75em;
}

.prose-content :deep(a) {
  color: #60a5fa;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.prose-content :deep(a:hover) {
  color: #93bbfd;
}

.prose-content :deep(strong) {
  font-weight: 600;
}

.prose-content :deep(ul),
.prose-content :deep(ol) {
  margin-bottom: 0.75em;
  padding-left: 1.5em;
}
.prose-content :deep(ul) { list-style-type: disc; }
.prose-content :deep(ol) { list-style-type: decimal; }
.prose-content :deep(li) {
  margin-bottom: 0.25em;
}
.prose-content :deep(li > ul),
.prose-content :deep(li > ol) {
  margin-top: 0.25em;
  margin-bottom: 0;
}

.prose-content :deep(blockquote) {
  border-left: 3px solid #6b7280;
  padding-left: 1em;
  margin: 0.75em 0;
  color: #9ca3af;
  font-style: italic;
}

.prose-content :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875em;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.15em 0.35em;
  border-radius: 4px;
}

.prose-content :deep(pre) {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 0.875em 1em;
  margin: 0.75em 0;
  overflow-x: auto;
}
.prose-content :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 0.8125em;
  line-height: 1.6;
}

.prose-content :deep(hr) {
  border: none;
  border-top: 1px solid rgba(107, 114, 128, 0.3);
  margin: 1.25em 0;
}

.prose-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75em 0;
  font-size: 0.875em;
}
.prose-content :deep(th),
.prose-content :deep(td) {
  border: 1px solid rgba(107, 114, 128, 0.3);
  padding: 0.4em 0.75em;
  text-align: left;
}
.prose-content :deep(th) {
  font-weight: 600;
  background: rgba(255, 255, 255, 0.04);
}

.prose-content :deep(img) {
  max-width: 100%;
  border-radius: 6px;
  margin: 0.75em 0;
}

.prose-content :deep(input[type="checkbox"]) {
  margin-right: 0.4em;
  pointer-events: none;
}
</style>
