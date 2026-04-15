import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { api } from '@/services/api';
import type { AppSettings, ProviderType, ConnectionTestResult } from '@/types';

export type ThemeMode = 'dark' | 'light';
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'testing' | 'failed' | 'unconfigured';

export const DEFAULT_PROMPT_TEMPLATE = `Search the memory using the tags {{tags}} within the "{{wing}}" project.
Prioritize memories that are already loaded in the current context (RAM) to minimize unnecessary disk access.
Only query persistent storage if the required information is not available in the current context.`;

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_INTERVAL_MS = 120_000; // 2 minutes
const HEALTH_CHECK_INTERVAL_MS = 120_000;

function applyTheme(mode: ThemeMode) {
  const html = document.documentElement;
  if (mode === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
  } else {
    html.classList.add('light');
    html.classList.remove('dark');
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const provider = ref<ProviderType>('mcp');
  const mcpCommand = ref('python3');
  const mcpArgs = ref('-m mempalace.mcp_server');
  const cliCommand = ref('python3');
  const cliArgs = ref('-m mempalace');
  const configured = ref(false);
  const connectionStatus = ref<ConnectionStatus>('unconfigured');
  const connectionMessage = ref('');
  const loading = ref(false);
  const theme = ref<ThemeMode>('dark');
  const promptTemplate = ref(DEFAULT_PROMPT_TEMPLATE);

  const retryAttempt = ref(0);
  const retryTimerId = ref<ReturnType<typeof setTimeout> | null>(null);
  const nextRetryAt = ref<number | null>(null);
  const wasConnected = ref(false);
  const showRefreshPrompt = ref(false);

  const isConfigured = computed(() => configured.value);
  const isRetrying = computed(() => connectionStatus.value === 'reconnecting' && retryAttempt.value > 0);
  const hasFailed = computed(() => connectionStatus.value === 'failed');

  watch(theme, (mode) => applyTheme(mode), { immediate: true });

  // --- Settings CRUD ---

  async function loadSettings() {
    loading.value = true;
    try {
      const data = await api.get<AppSettings & { all: Record<string, string> }>('/settings');
      provider.value = data.provider;
      mcpCommand.value = data.mcp_command;
      mcpArgs.value = data.mcp_args;
      cliCommand.value = data.cli_command;
      cliArgs.value = data.cli_args;
      configured.value = data.configured;
      connectionStatus.value = data.configured ? 'testing' : 'unconfigured';

      if (data.configured) {
        wasConnected.value = true;
      }

      if (data.all?.theme === 'light' || data.all?.theme === 'dark') {
        theme.value = data.all.theme;
      }

      if (data.all?.prompt_template) {
        promptTemplate.value = data.all.prompt_template;
      }
    } finally {
      loading.value = false;
    }
  }

  async function saveSettings(settings: {
    provider?: ProviderType;
    mcp_command?: string;
    mcp_args?: string;
    cli_command?: string;
    cli_args?: string;
    theme?: ThemeMode;
    prompt_template?: string;
  }) {
    loading.value = true;
    try {
      const data = await api.put<AppSettings & { all: Record<string, string> }>('/settings', settings);
      provider.value = data.provider;
      mcpCommand.value = data.mcp_command;
      mcpArgs.value = data.mcp_args;
      cliCommand.value = data.cli_command;
      cliArgs.value = data.cli_args;
      configured.value = data.configured;

      if (settings.theme) {
        theme.value = settings.theme;
      }
      if (settings.prompt_template !== undefined) {
        promptTemplate.value = settings.prompt_template;
      }
    } finally {
      loading.value = false;
    }
  }

  async function testConnection(
    testProvider?: ProviderType,
    testCommand?: string,
    testArgs?: string,
  ): Promise<ConnectionTestResult> {
    connectionStatus.value = 'testing';
    try {
      const p = testProvider || provider.value;
      const params = new URLSearchParams({ provider: p });
      if (testCommand) params.set('command', testCommand);
      if (testArgs) params.set('args', testArgs);
      const result = await api.get<ConnectionTestResult>(`/settings/test-connection?${params}`);
      connectionStatus.value = result.ok ? 'connected' : 'disconnected';
      connectionMessage.value = result.message;
      if (result.ok) onConnectionRestored();
      return result;
    } catch (err) {
      connectionStatus.value = 'disconnected';
      const msg = (err as Error).message;
      connectionMessage.value = msg;
      return { ok: false, message: msg, provider: provider.value };
    }
  }

  // --- Health check (non-destructive: preserves screen data on failure) ---

  let healthInterval: ReturnType<typeof setInterval> | null = null;

  async function checkHealth() {
    if (!configured.value) return;
    if (connectionStatus.value === 'reconnecting' || connectionStatus.value === 'failed') return;

    try {
      const result = await api.get<{ ok: boolean; status: string; provider: string; message?: string }>(
        '/settings/health',
      );

      if (result.ok) {
        onConnectionRestored();
      } else {
        onConnectionLost(result.message || 'Health check returned not ok');
      }
    } catch {
      onConnectionLost('Health check failed — server unreachable');
    }
  }

  function startHealthCheck(intervalMs = HEALTH_CHECK_INTERVAL_MS) {
    stopHealthCheck();
    checkHealth();
    healthInterval = setInterval(checkHealth, intervalMs);
  }

  function stopHealthCheck() {
    if (healthInterval) {
      clearInterval(healthInterval);
      healthInterval = null;
    }
  }

  // --- Connection state transitions ---

  function onConnectionRestored() {
    const wasDisrupted = connectionStatus.value === 'reconnecting'
      || connectionStatus.value === 'failed'
      || connectionStatus.value === 'disconnected';

    connectionStatus.value = 'connected';
    connectionMessage.value = '';
    const hadPriorConnection = wasConnected.value;
    wasConnected.value = true;
    clearRetryState();

    if (hadPriorConnection && wasDisrupted) {
      showRefreshPrompt.value = true;
    }
  }

  function onConnectionLost(message: string) {
    if (connectionStatus.value === 'reconnecting' || connectionStatus.value === 'failed') return;

    connectionMessage.value = message;

    if (wasConnected.value) {
      startRetrySequence();
    } else {
      connectionStatus.value = 'disconnected';
    }
  }

  // --- Retry engine ---

  function startRetrySequence() {
    clearRetryState();
    connectionStatus.value = 'reconnecting';
    retryAttempt.value = 0;
    attemptReconnect();
  }

  async function attemptReconnect(): Promise<void> {
    retryAttempt.value++;

    if (retryAttempt.value > MAX_RETRY_ATTEMPTS) {
      connectionStatus.value = 'failed';
      connectionMessage.value = `Connection lost after ${MAX_RETRY_ATTEMPTS} retry attempts. Click Reconnect to try again.`;
      nextRetryAt.value = null;
      return;
    }

    connectionMessage.value = `Reconnecting... attempt ${retryAttempt.value}/${MAX_RETRY_ATTEMPTS}`;

    try {
      const result = await api.post<{ ok: boolean; status: string; provider: string; message?: string }>(
        '/settings/reconnect', {},
      );

      if (result.ok) {
        onConnectionRestored();
        return;
      }

      connectionMessage.value = result.message || 'Reconnect failed';
    } catch {
      connectionMessage.value = `Reconnect attempt ${retryAttempt.value} failed — server unreachable`;
    }

    if (retryAttempt.value < MAX_RETRY_ATTEMPTS) {
      scheduleNextRetry();
    } else {
      connectionStatus.value = 'failed';
      connectionMessage.value = `Connection lost after ${MAX_RETRY_ATTEMPTS} attempts. Click Reconnect to try again.`;
      nextRetryAt.value = null;
    }
  }

  function scheduleNextRetry() {
    nextRetryAt.value = Date.now() + RETRY_INTERVAL_MS;
    retryTimerId.value = setTimeout(() => {
      nextRetryAt.value = null;
      attemptReconnect();
    }, RETRY_INTERVAL_MS);
  }

  function clearRetryState() {
    if (retryTimerId.value) {
      clearTimeout(retryTimerId.value);
      retryTimerId.value = null;
    }
    retryAttempt.value = 0;
    nextRetryAt.value = null;
  }

  // --- Manual reconnect (user-initiated, resets everything) ---

  async function reconnect() {
    clearRetryState();
    connectionStatus.value = 'testing';
    connectionMessage.value = '';

    try {
      const result = await api.post<{ ok: boolean; status: string; provider: string; message?: string }>(
        '/settings/reconnect', {},
      );

      if (result.ok) {
        onConnectionRestored();
        startHealthCheck();
        return;
      }

      connectionMessage.value = result.message || 'Reconnect failed';
    } catch {
      connectionMessage.value = 'Reconnect request failed';
    }

    startRetrySequence();
    startHealthCheck();
  }

  function dismissFailure() {
    if (connectionStatus.value === 'failed') {
      connectionStatus.value = 'disconnected';
    }
  }

  function acceptRefresh() {
    showRefreshPrompt.value = false;
    window.location.reload();
  }

  function dismissRefresh() {
    showRefreshPrompt.value = false;
  }

  return {
    provider,
    mcpCommand,
    mcpArgs,
    cliCommand,
    cliArgs,
    configured,
    connectionStatus,
    connectionMessage,
    loading,
    theme,
    promptTemplate,
    isConfigured,
    retryAttempt,
    nextRetryAt,
    isRetrying,
    hasFailed,
    showRefreshPrompt,
    loadSettings,
    saveSettings,
    testConnection,
    checkHealth,
    startHealthCheck,
    stopHealthCheck,
    reconnect,
    dismissFailure,
    acceptRefresh,
    dismissRefresh,
  };
});
