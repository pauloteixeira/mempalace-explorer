<template>
  <div
    class="w-full text-left p-4 rounded-lg border transition-colors group"
    :class="isActive
      ? 'border-palace-500 bg-palace-600/10'
      : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-850'"
  >
    <div class="flex items-start justify-between gap-2 mb-2 cursor-pointer" @click="emit('select', drawer)">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-200 line-clamp-1 group-hover:text-gray-900 dark:group-hover:text-gray-100">
        {{ title }}
      </h3>
      <div class="flex items-center gap-1 shrink-0">
        <button
          v-if="drawer.isFavorite"
          class="text-yellow-400"
          title="Favorited"
          @click.stop
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      </div>
    </div>

    <p
      class="snippet-content text-xs text-gray-500 line-clamp-3 mb-3 leading-relaxed cursor-pointer"
      @click="emit('select', drawer)"
      v-html="snippet"
    />

    <div class="flex items-center gap-2 flex-wrap">
      <span class="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-gray-500 dark:text-gray-400">
        {{ drawer.wing }}
      </span>
      <span class="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-blue-500 dark:text-blue-400">
        {{ drawer.room }}
      </span>
      <span
        v-for="tag in tags"
        :key="tag"
        class="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-palace-600/15 text-palace-400 dark:text-palace-300 cursor-pointer hover:bg-palace-600/25"
        @click.stop="emit('tagClick', tag)"
      >
        {{ tag }}
      </span>

      <span class="ml-auto flex items-center gap-2">
        <button
          class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md text-gray-400 hover:text-palace-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors opacity-0 group-hover:opacity-100"
          title="Copy agent prompt to clipboard"
          @click.stop="copyPrompt"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
          </svg>
          Prompt
        </button>
        <span v-if="date" class="text-xs text-gray-600">{{ date }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import type { Drawer } from '@/types';
import { useUiStore } from '@/stores/ui';
import { useSettingsStore, DEFAULT_PROMPT_TEMPLATE } from '@/stores/settings';

marked.setOptions({ breaks: true, gfm: true });

function replaceAaakStars(text: string): string {
  return text.replace(/AAAK:\s*(\*+)/g, (_, stars) => `AAAK: ${'★'.repeat(stars.length)}`);
}

const props = defineProps<{
  drawer: Drawer;
  isActive?: boolean;
}>();

const emit = defineEmits<{
  select: [drawer: Drawer];
  tagClick: [tag: string];
}>();

const ui = useUiStore();
const settingsStore = useSettingsStore();

const title = computed(() => {
  const text = props.drawer.content_preview || props.drawer.content || '';
  const firstLine = text.split('\n')[0].trim().replace(/^#+\s*/, '');
  return firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine;
});

const snippet = computed(() => {
  const text = props.drawer.content_preview || props.drawer.content || '';
  const lines = text.split('\n').slice(1).join('\n').trim();
  const truncated = lines.length > 200 ? lines.slice(0, 200) + '...' : lines;
  return marked.parseInline(replaceAaakStars(truncated)) as string;
});

const tags = computed(() => {
  const text = props.drawer.content_preview || props.drawer.content || '';
  const match = text.match(/#[\w-]+/g);
  return match ? match.slice(0, 5) : [];
});

const date = computed(() => {
  const filed = props.drawer.metadata?.filed_at;
  if (!filed) return '';
  try {
    return new Date(filed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
});

async function copyPrompt() {
  const template = settingsStore.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
  const tagList = tags.value.length > 0
    ? tags.value.join(', ')
    : `#${props.drawer.room}`;

  const prompt = template
    .replace(/\{\{tags\}\}/g, tagList)
    .replace(/\{\{wing\}\}/g, props.drawer.wing)
    .replace(/\{\{room\}\}/g, props.drawer.room)
    .replace(/\{\{title\}\}/g, title.value)
    .replace(/\{\{drawer_id\}\}/g, props.drawer.drawer_id)
    .replace(/\{\{date\}\}/g, date.value);

  try {
    await navigator.clipboard.writeText(prompt);
    ui.showToast('Prompt copied to clipboard');
  } catch {
    ui.showToast('Failed to copy prompt');
  }
}
</script>

<style scoped>
.snippet-content :deep(strong) {
  font-weight: 600;
  color: inherit;
}
.snippet-content :deep(em) {
  font-style: italic;
  color: inherit;
}
.snippet-content :deep(code) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  background: rgba(148, 163, 184, 0.12);
  border-radius: 3px;
  padding: 0 3px;
}
.snippet-content :deep(a) {
  color: #60a5fa;
  text-decoration: underline;
}
.snippet-content :deep(del) {
  text-decoration: line-through;
  opacity: 0.7;
}
</style>
