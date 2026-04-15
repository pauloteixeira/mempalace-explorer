<template>
  <div class="space-y-6" :class="{ 'opacity-60 pointer-events-none': disabled }">
    <div>
      <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Connection Provider</label>
      <div class="space-y-3">
        <label
          class="flex items-start gap-3 p-3 rounded-lg border transition-colors"
          :class="[
            modelValue === 'mcp'
              ? 'border-palace-500 bg-palace-600/10'
              : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 bg-white dark:bg-surface-900',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          ]"
        >
          <input
            type="radio"
            name="provider"
            value="mcp"
            :checked="modelValue === 'mcp'"
            :disabled="disabled"
            class="mt-0.5 accent-palace-500"
            @change="emit('update:modelValue', 'mcp')"
          />
          <div>
            <div class="text-sm font-medium text-gray-700 dark:text-gray-200">
              MCP Client
              <span class="ml-2 text-xs font-normal text-palace-400 bg-palace-600/20 px-1.5 py-0.5 rounded">recommended</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Persistent JSON-RPC connection over stdio. Faster, keeps a single process alive.
            </p>
          </div>
        </label>

        <label
          class="flex items-start gap-3 p-3 rounded-lg border transition-colors"
          :class="[
            modelValue === 'cli'
              ? 'border-palace-500 bg-palace-600/10'
              : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 bg-white dark:bg-surface-900',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          ]"
        >
          <input
            type="radio"
            name="provider"
            value="cli"
            :checked="modelValue === 'cli'"
            :disabled="disabled"
            class="mt-0.5 accent-palace-500"
            @change="emit('update:modelValue', 'cli')"
          />
          <div>
            <div class="text-sm font-medium text-gray-700 dark:text-gray-200">CLI Subprocess</div>
            <p class="text-xs text-gray-500 mt-1">
              Spawns a new process per request. Simpler setup, no persistent connection.
            </p>
          </div>
        </label>
      </div>
    </div>

    <div v-if="modelValue === 'mcp'" class="space-y-4">
      <h3 class="text-sm font-medium text-gray-600 dark:text-gray-300">MCP Client Settings</h3>
      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1" for="mcp-command">
          Command
        </label>
        <input
          id="mcp-command"
          type="text"
          :value="mcpCommand"
          :disabled="disabled"
          placeholder="python3"
          class="w-full px-3 py-2 rounded-md bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-palace-500 focus:ring-1 focus:ring-palace-500 transition-colors font-mono disabled:opacity-50"
          @input="emit('update:mcpCommand', ($event.target as HTMLInputElement).value)"
        />
        <p class="text-xs text-gray-500 mt-1">The executable to run (e.g. <code class="text-palace-400">python3</code>)</p>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1" for="mcp-args">
          Arguments
        </label>
        <input
          id="mcp-args"
          type="text"
          :value="mcpArgs"
          :disabled="disabled"
          placeholder="-m mempalace.mcp_server"
          class="w-full px-3 py-2 rounded-md bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-palace-500 focus:ring-1 focus:ring-palace-500 transition-colors font-mono disabled:opacity-50"
          @input="emit('update:mcpArgs', ($event.target as HTMLInputElement).value)"
        />
        <p class="text-xs text-gray-500 mt-1">Arguments for the MCP server module (e.g. <code class="text-palace-400">-m mempalace.mcp_server</code>)</p>
      </div>
    </div>

    <div v-if="modelValue === 'cli'" class="space-y-4">
      <h3 class="text-sm font-medium text-gray-600 dark:text-gray-300">CLI Subprocess Settings</h3>
      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1" for="cli-command">
          Command
        </label>
        <input
          id="cli-command"
          type="text"
          :value="cliCommand"
          :disabled="disabled"
          placeholder="python3"
          class="w-full px-3 py-2 rounded-md bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-palace-500 focus:ring-1 focus:ring-palace-500 transition-colors font-mono disabled:opacity-50"
          @input="emit('update:cliCommand', ($event.target as HTMLInputElement).value)"
        />
        <p class="text-xs text-gray-500 mt-1">The executable to run (e.g. <code class="text-palace-400">python3</code>)</p>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1" for="cli-args">
          Arguments
        </label>
        <input
          id="cli-args"
          type="text"
          :value="cliArgs"
          :disabled="disabled"
          placeholder="-m mempalace"
          class="w-full px-3 py-2 rounded-md bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-palace-500 focus:ring-1 focus:ring-palace-500 transition-colors font-mono disabled:opacity-50"
          @input="emit('update:cliArgs', ($event.target as HTMLInputElement).value)"
        />
        <p class="text-xs text-gray-500 mt-1">Arguments for the CLI module (e.g. <code class="text-palace-400">-m mempalace</code>)</p>
      </div>
    </div>

    <div class="p-3 rounded-lg bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
      <p class="text-xs text-gray-500 leading-relaxed">
        <span class="font-medium text-gray-600 dark:text-gray-400">How it works:</span>
        The app spawns <code class="text-palace-400">{{ activeCommand }} {{ activeArgs }}</code>
        as a local subprocess and communicates via JSON-RPC over stdio. No external server or tokens required.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ProviderType } from '@/types';

const props = defineProps<{
  modelValue: ProviderType;
  mcpCommand: string;
  mcpArgs: string;
  cliCommand: string;
  cliArgs: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ProviderType];
  'update:mcpCommand': [value: string];
  'update:mcpArgs': [value: string];
  'update:cliCommand': [value: string];
  'update:cliArgs': [value: string];
}>();

const activeCommand = computed(() => props.modelValue === 'mcp' ? props.mcpCommand : props.cliCommand);
const activeArgs = computed(() => props.modelValue === 'mcp' ? props.mcpArgs : props.cliArgs);
</script>
