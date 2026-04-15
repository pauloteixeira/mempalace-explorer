<template>
  <div class="relative flex gap-4 pb-8 group">
    <div class="flex flex-col items-center shrink-0 w-20">
      <span class="text-xs font-medium text-gray-400 tabular-nums">{{ formattedDate }}</span>
      <span class="text-[10px] text-gray-600 tabular-nums">{{ formattedTime }}</span>
    </div>

    <div class="relative flex flex-col items-center shrink-0">
      <div
        class="w-3 h-3 rounded-full border-2 z-10"
        :class="dotClass"
      />
      <div class="w-px flex-1 bg-surface-700 -mb-8" />
    </div>

    <button
      class="flex-1 text-left p-3 rounded-lg border transition-colors min-w-0"
      :class="isActive
        ? 'border-palace-500 bg-palace-600/10'
        : 'border-surface-800 bg-surface-900 hover:border-surface-700'"
      @click="emit('select', entry)"
    >
      <div class="flex items-center gap-2 mb-1.5 flex-wrap">
        <span
          class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
          :class="badgeClass"
        >
          {{ entry.type || 'general' }}
        </span>
        <span class="text-xs px-1.5 py-0.5 rounded bg-surface-800 text-gray-400">{{ entry.wing }}</span>
        <span class="text-xs px-1.5 py-0.5 rounded bg-surface-800 text-blue-400">{{ entry.room }}</span>
      </div>

      <h3 class="text-sm font-medium text-gray-200 line-clamp-1 mb-1">{{ entry.title }}</h3>
      <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed">{{ entry.content_preview }}</p>

      <div v-if="entry.tags && entry.tags.length" class="flex gap-1 mt-2 flex-wrap">
        <span
          v-for="tag in entry.tags.slice(0, 4)"
          :key="tag"
          class="text-[10px] px-1 py-0.5 rounded bg-palace-600/15 text-palace-300"
        >
          {{ tag }}
        </span>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TimelineEntry } from '@/types';

const props = defineProps<{
  entry: TimelineEntry;
  isActive?: boolean;
}>();

const emit = defineEmits<{
  select: [entry: TimelineEntry];
}>();

const formattedDate = computed(() => {
  if (!props.entry.date) return '—';
  try {
    const d = new Date(props.entry.date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return '—'; }
});

const formattedTime = computed(() => {
  if (!props.entry.date) return '';
  try {
    const d = new Date(props.entry.date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
});

const typeColors: Record<string, { dot: string; badge: string }> = {
  decision: { dot: 'border-yellow-400 bg-yellow-400/30', badge: 'bg-yellow-500/20 text-yellow-300' },
  insight:  { dot: 'border-green-400 bg-green-400/30',  badge: 'bg-green-500/20 text-green-300' },
  rule:     { dot: 'border-blue-400 bg-blue-400/30',    badge: 'bg-blue-500/20 text-blue-300' },
  general:  { dot: 'border-gray-500 bg-gray-500/30',    badge: 'bg-gray-600/30 text-gray-400' },
};

const dotClass = computed(() => typeColors[props.entry.type || 'general']?.dot || typeColors.general.dot);
const badgeClass = computed(() => typeColors[props.entry.type || 'general']?.badge || typeColors.general.badge);
</script>
