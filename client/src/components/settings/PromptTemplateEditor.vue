<template>
  <div class="space-y-5">
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Prompt Template
      </label>
      <textarea
        :value="modelValue"
        class="w-full h-40 px-3 py-2.5 rounded-lg bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-700 text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed resize-y focus:outline-none focus:border-palace-500 focus:ring-1 focus:ring-palace-500 placeholder-gray-400 dark:placeholder-gray-600"
        placeholder="Write your prompt template here..."
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <div class="p-4 rounded-lg bg-surface-50 dark:bg-surface-900/60 border border-surface-200 dark:border-surface-800">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
        Available Variables
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="v in variables"
          :key="v.key"
          class="flex items-start gap-2 p-2 rounded-md hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer group"
          @click="insertVariable(v.key)"
        >
          <code class="shrink-0 text-xs px-1.5 py-0.5 rounded bg-palace-600/15 text-palace-400 font-mono">
            {{ v.key }}
          </code>
          <span class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{{ v.desc }}</span>
        </div>
      </div>
    </div>

    <div class="p-4 rounded-lg bg-surface-50 dark:bg-surface-900/60 border border-surface-200 dark:border-surface-800">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
        Preview
      </h3>
      <p class="text-xs text-gray-600 dark:text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">{{ preview }}</p>
    </div>

    <div class="flex items-center gap-3">
      <button
        class="text-xs text-gray-500 hover:text-palace-400 transition-colors"
        @click="emit('update:modelValue', defaultTemplate)"
      >
        Reset to default
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DEFAULT_PROMPT_TEMPLATE } from '@/stores/settings';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const defaultTemplate = DEFAULT_PROMPT_TEMPLATE;

const variables = [
  { key: '{{tags}}', desc: 'Comma-separated list of tags extracted from the memory content (e.g. #prisma, #sqlite)' },
  { key: '{{wing}}', desc: 'Wing (top-level project) the memory belongs to' },
  { key: '{{room}}', desc: 'Room (sub-category) the memory belongs to' },
  { key: '{{title}}', desc: 'First line of the memory content' },
  { key: '{{drawer_id}}', desc: 'Unique identifier of the memory drawer' },
  { key: '{{date}}', desc: 'Date the memory was filed (if available)' },
];

const preview = computed(() => {
  return props.modelValue
    .replace(/\{\{tags\}\}/g, '#prisma, #sqlite, #database')
    .replace(/\{\{wing\}\}/g, 'mempalace-explorer')
    .replace(/\{\{room\}\}/g, 'settings-ui')
    .replace(/\{\{title\}\}/g, '[mempalace-explorer] Connection Provider Architecture')
    .replace(/\{\{drawer_id\}\}/g, 'abc-123-def')
    .replace(/\{\{date\}\}/g, 'Apr 14, 2026');
});

function insertVariable(key: string) {
  const current = props.modelValue;
  emit('update:modelValue', current + key);
}
</script>
