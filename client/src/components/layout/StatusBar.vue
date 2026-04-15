<template>
  <footer class="h-7 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 flex items-center px-4 text-xs text-gray-500 shrink-0">
    <div class="flex items-center gap-4">
      <span>{{ palace.totalDrawers }} memories</span>
      <span class="text-surface-700">|</span>
      <span>{{ palace.wings.length }} wings</span>
    </div>

    <div class="flex-1" />

    <div class="flex items-center gap-2">
      <span
        class="inline-block w-2 h-2 rounded-full"
        :class="statusDotClass"
      />
      <span>{{ statusLabel }}</span>

      <span
        v-if="showRetryCountdown"
        class="text-yellow-500 dark:text-yellow-400 tabular-nums"
      >
        — next retry in {{ countdownLabel }}
      </span>

      <span
        v-else-if="showErrorMessage"
        class="text-red-400 dark:text-red-500 max-w-[260px] truncate"
        :title="settings.connectionMessage"
      >
        — {{ settings.connectionMessage }}
      </span>

      <button
        v-if="showReconnectButton"
        class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors
          border-surface-300 dark:border-surface-600
          text-gray-500 dark:text-gray-400
          hover:border-palace-500 hover:text-palace-500 dark:hover:text-palace-400
          disabled:opacity-50 disabled:cursor-not-allowed"
        title="Reconnect"
        :disabled="isBusy"
        @click="settings.reconnect()"
      >
        <span v-if="isBusy" class="animate-spin inline-block">↻</span>
        <span v-else>↻ Reconnect</span>
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePalaceStore } from '@/stores/palace';
import { useSettingsStore } from '@/stores/settings';

const palace = usePalaceStore();
const settings = useSettingsStore();

const now = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  settings.startHealthCheck(120000);
  tickTimer = setInterval(() => { now.value = Date.now(); }, 1000);
});

onUnmounted(() => {
  settings.stopHealthCheck();
  if (tickTimer) clearInterval(tickTimer);
});

const isBusy = computed(() =>
  settings.connectionStatus === 'testing' || settings.connectionStatus === 'reconnecting',
);

const showReconnectButton = computed(() => {
  const s = settings.connectionStatus;
  return s === 'disconnected' || s === 'failed' || s === 'testing' || s === 'reconnecting';
});

const showRetryCountdown = computed(() =>
  settings.connectionStatus === 'reconnecting' && settings.nextRetryAt !== null,
);

const showErrorMessage = computed(() => {
  const s = settings.connectionStatus;
  return (s === 'disconnected' || s === 'failed') && settings.connectionMessage;
});

const countdownLabel = computed(() => {
  if (!settings.nextRetryAt) return '';
  const remaining = Math.max(0, settings.nextRetryAt - now.value);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});

const statusDotClass = computed(() => {
  switch (settings.connectionStatus) {
    case 'connected': return 'bg-green-400';
    case 'testing': return 'bg-yellow-400 animate-pulse';
    case 'reconnecting': return 'bg-yellow-400 animate-pulse';
    case 'disconnected': return 'bg-red-400';
    case 'failed': return 'bg-red-500';
    default: return 'bg-gray-600';
  }
});

const statusLabel = computed(() => {
  switch (settings.connectionStatus) {
    case 'connected': return `${settings.provider.toUpperCase()} connected`;
    case 'testing': return 'Testing...';
    case 'reconnecting': return `Reconnecting (${settings.retryAttempt}/3)...`;
    case 'disconnected': return 'Disconnected';
    case 'failed': return 'Connection failed';
    default: return 'Not configured';
  }
});
</script>
