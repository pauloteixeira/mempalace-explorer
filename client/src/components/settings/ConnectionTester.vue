<template>
  <div class="flex items-center gap-4">
    <button
      class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
      :class="buttonClass"
      :disabled="testing || !canTest"
      @click="runTest"
    >
      <svg
        v-if="testing"
        class="w-4 h-4 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <svg
        v-else
        class="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
      {{ testing ? 'Testing...' : 'Test Connection' }}
    </button>

    <p v-if="!canTest" class="text-xs text-gray-500">
      Fill in the Command and Arguments fields first.
    </p>

    <div v-if="result" class="flex items-center gap-2 text-sm">
      <span
        class="w-3 h-3 rounded-full shrink-0"
        :class="result.ok ? 'bg-green-400' : 'bg-red-400'"
      />
      <span :class="result.ok ? 'text-green-300' : 'text-red-300'">
        {{ result.message }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ProviderType, ConnectionTestResult } from '@/types';
import { useSettingsStore } from '@/stores/settings';

const props = defineProps<{
  provider: ProviderType;
  command: string;
  args: string;
}>();

const emit = defineEmits<{
  tested: [result: ConnectionTestResult];
  'update:testing': [value: boolean];
}>();

const settings = useSettingsStore();
const testing = ref(false);
const result = ref<ConnectionTestResult | null>(null);

const canTest = computed(() => props.command.trim() !== '' && props.args.trim() !== '');

const buttonClass = computed(() => {
  if (testing.value) return 'bg-surface-700 text-gray-400 cursor-wait';
  if (!canTest.value) return 'bg-surface-700 text-gray-500 cursor-not-allowed opacity-60';
  return 'bg-palace-600 hover:bg-palace-500 text-white';
});

async function runTest() {
  if (!canTest.value) return;
  testing.value = true;
  emit('update:testing', true);
  result.value = null;
  try {
    const res = await settings.testConnection(props.provider, props.command, props.args);
    result.value = res;
    emit('tested', res);
  } finally {
    testing.value = false;
    emit('update:testing', false);
  }
}
</script>
