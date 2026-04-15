<template>
  <div class="max-w-2xl mx-auto px-6 py-8">
    <div v-if="isSetup" class="mb-8">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Welcome to MemPalace Explorer</h1>
      <p class="text-gray-500 dark:text-gray-400">
        Configure how the application connects to your MemPalace memory store.
        Select a connection provider and test the connection before continuing.
      </p>
    </div>

    <div v-else class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Settings</h1>
      <p class="text-gray-500 dark:text-gray-400">Manage your connection and application preferences.</p>
    </div>

    <nav class="flex gap-1 mb-6 border-b border-surface-200 dark:border-surface-800">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="px-4 py-2.5 text-sm font-medium transition-colors relative"
        :class="activeTab === tab.id
          ? 'text-palace-500 dark:text-palace-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span
          v-if="activeTab === tab.id"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-palace-500 dark:bg-palace-400 rounded-full"
        />
      </button>
    </nav>

    <div class="space-y-8">
      <section
        v-if="activeTab === 'appearance'"
        class="p-6 rounded-xl bg-white dark:bg-surface-850 border border-surface-200 dark:border-surface-800"
      >
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Appearance</h2>
        <ThemeSelector v-model="form.theme" />
      </section>

      <section
        v-if="activeTab === 'connection'"
        class="p-6 rounded-xl bg-white dark:bg-surface-850 border border-surface-200 dark:border-surface-800"
      >
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Connection</h2>

        <ProviderSelector
          v-model="form.provider"
          :mcp-command="form.mcpCommand"
          :mcp-args="form.mcpArgs"
          :cli-command="form.cliCommand"
          :cli-args="form.cliArgs"
          :disabled="isTesting"
          @update:mcp-command="form.mcpCommand = $event"
          @update:mcp-args="form.mcpArgs = $event"
          @update:cli-command="form.cliCommand = $event"
          @update:cli-args="form.cliArgs = $event"
        />

        <div class="mt-6 pt-6 border-t border-surface-200 dark:border-surface-700">
          <ConnectionTester
            :provider="form.provider"
            :command="form.provider === 'mcp' ? form.mcpCommand : form.cliCommand"
            :args="form.provider === 'mcp' ? form.mcpArgs : form.cliArgs"
            @tested="onTested"
            @update:testing="isTesting = $event"
          />
        </div>
      </section>

      <section
        v-if="activeTab === 'prompt'"
        class="p-6 rounded-xl bg-white dark:bg-surface-850 border border-surface-200 dark:border-surface-800"
      >
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Prompt Template</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-5">
          Customize the prompt generated when you click the copy button on a memory card.
          Use variables to dynamically insert memory data.
        </p>
        <PromptTemplateEditor v-model="form.promptTemplate" />
      </section>

      <div class="flex items-center gap-3">
        <button
          class="px-6 py-2.5 rounded-md text-sm font-medium transition-colors"
          :class="saveButtonClass"
          :disabled="saving || isTesting"
          @click="save"
        >
          {{ saveButtonLabel }}
        </button>

        <span v-if="saved" class="text-sm text-green-400 flex items-center gap-1">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          Settings saved
        </span>

        <span v-if="saveError" class="text-sm text-red-400">{{ saveError }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSettingsStore, DEFAULT_PROMPT_TEMPLATE } from '@/stores/settings';
import { usePalaceStore } from '@/stores/palace';
import type { ConnectionTestResult } from '@/types';
import type { ThemeMode } from '@/stores/settings';
import ProviderSelector from '@/components/settings/ProviderSelector.vue';
import ConnectionTester from '@/components/settings/ConnectionTester.vue';
import ThemeSelector from '@/components/settings/ThemeSelector.vue';
import PromptTemplateEditor from '@/components/settings/PromptTemplateEditor.vue';

const route = useRoute();
const router = useRouter();
const settings = useSettingsStore();
const palace = usePalaceStore();

type SettingsTab = 'connection' | 'prompt' | 'appearance';

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: 'connection', label: 'Connection' },
  { id: 'prompt', label: 'Prompt Template' },
  { id: 'appearance', label: 'Appearance' },
];

const isSetup = computed(() => route.query.setup === 'true');
const activeTab = ref<SettingsTab>(isSetup.value ? 'connection' : 'connection');
const saving = ref(false);
const saved = ref(false);
const saveError = ref('');
const lastTestOk = ref(false);
const isTesting = ref(false);

const form = reactive({
  provider: settings.provider,
  mcpCommand: settings.mcpCommand,
  mcpArgs: settings.mcpArgs,
  cliCommand: settings.cliCommand,
  cliArgs: settings.cliArgs,
  theme: settings.theme as ThemeMode,
  promptTemplate: settings.promptTemplate || DEFAULT_PROMPT_TEMPLATE,
});

onMounted(() => {
  form.provider = settings.provider;
  form.mcpCommand = settings.mcpCommand;
  form.mcpArgs = settings.mcpArgs;
  form.cliCommand = settings.cliCommand;
  form.cliArgs = settings.cliArgs;
  form.theme = settings.theme;
  form.promptTemplate = settings.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
});

const saveButtonClass = computed(() => {
  if (saving.value || isTesting.value) return 'bg-surface-700 text-gray-400 cursor-not-allowed';
  return 'bg-palace-600 hover:bg-palace-500 text-white';
});

const saveButtonLabel = computed(() => {
  if (saving.value) return 'Saving...';
  if (isTesting.value) return 'Testing connection...';
  return isSetup.value ? 'Save & Continue' : 'Save Settings';
});

function onTested(result: ConnectionTestResult) {
  lastTestOk.value = result.ok;
}

async function save() {
  if (isTesting.value) return;
  saving.value = true;
  saved.value = false;
  saveError.value = '';

  try {
    await settings.saveSettings({
      provider: form.provider,
      mcp_command: form.mcpCommand,
      mcp_args: form.mcpArgs,
      cli_command: form.cliCommand,
      cli_args: form.cliArgs,
      theme: form.theme,
      prompt_template: form.promptTemplate,
    });

    saved.value = true;
    setTimeout(() => { saved.value = false; }, 3000);

    if (isSetup.value) {
      const cmd = form.provider === 'mcp' ? form.mcpCommand : form.cliCommand;
      const args = form.provider === 'mcp' ? form.mcpArgs : form.cliArgs;
      await settings.testConnection(form.provider, cmd, args);
      if (settings.connectionStatus === 'connected') {
        await palace.loadTaxonomy();
        router.replace('/');
      }
    }
  } catch (err) {
    saveError.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}
</script>
