<template>
  <div class="h-screen flex flex-col bg-surface-50 dark:bg-surface-950 text-gray-800 dark:text-gray-100 overflow-hidden">
    <Topbar />

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="-translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-full opacity-0"
    >
      <div
        v-if="settings.hasFailed"
        class="shrink-0 flex items-center gap-3 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-sm"
      >
        <svg class="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <span class="text-red-300 flex-1">
          Memory palace connection failed after 3 attempts. Data on screen is preserved but may be stale.
        </span>
        <button
          class="px-2.5 py-1 rounded text-xs font-medium border transition-colors
            border-red-500/30 text-red-300 hover:bg-red-500/20 hover:border-red-400"
          @click="settings.reconnect()"
        >
          ↻ Retry now
        </button>
        <button
          class="px-2 py-1 text-red-400/60 hover:text-red-300 transition-colors"
          title="Dismiss"
          @click="settings.dismissFailure()"
        >
          ✕
        </button>
      </div>
    </Transition>

    <div class="flex flex-1 overflow-hidden">
      <Sidebar v-if="ui.sidebarOpen" />
      <main class="flex-1 overflow-auto">
        <slot />
      </main>
      <aside
        v-if="ui.detailPanelOpen"
        class="w-[40%] border-l border-surface-200 dark:border-surface-800 overflow-hidden bg-white dark:bg-surface-900 shrink-0"
      >
        <MemoryEditor
          v-if="memory.editing"
          :drawer="memory.activeDrawer"
          @cancel="closeDetail"
          @saved="onSaved"
        />
        <MemoryDetail
          v-else
          :drawer="memory.activeDrawer"
          @close="closeDetail"
          @edit="startEdit"
          @delete="handleDelete"
          @toggle-favorite="handleFavorite"
          @tag-click="searchByTag"
        />
      </aside>
    </div>
    <SearchBar />
    <StatusBar />

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="ui.toastVisible"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 dark:bg-surface-700 text-white text-sm shadow-lg border border-gray-700 dark:border-surface-600"
      >
        <svg class="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        {{ ui.toastMessage }}
      </div>
    </Transition>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="settings.showRefreshPrompt"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          @click.self="settings.dismissRefresh()"
        >
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="scale-95 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-95 opacity-0"
          >
            <div
              v-if="settings.showRefreshPrompt"
              class="w-full max-w-sm mx-4 rounded-xl bg-white dark:bg-surface-850 border border-surface-200 dark:border-surface-700 shadow-2xl overflow-hidden"
            >
              <div class="px-5 pt-5 pb-4">
                <div class="flex items-start gap-3">
                  <div class="shrink-0 w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      Connection restored
                    </h3>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      The memory palace is connected again. Do you want to refresh the data on screen with the latest information?
                    </p>
                  </div>
                </div>
              </div>
              <div class="flex border-t border-surface-200 dark:border-surface-700">
                <button
                  class="flex-1 px-4 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400
                    hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                  @click="settings.dismissRefresh()"
                >
                  No, keep current data
                </button>
                <button
                  class="flex-1 px-4 py-2.5 text-sm font-medium text-palace-500 dark:text-palace-400
                    hover:bg-palace-500/10 transition-colors border-l border-surface-200 dark:border-surface-700"
                  @click="settings.acceptRefresh()"
                >
                  Yes, refresh
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUiStore } from '@/stores/ui';
import { useMemoryStore } from '@/stores/memory';
import { useSearchStore } from '@/stores/search';
import { usePalaceStore } from '@/stores/palace';
import { useSettingsStore } from '@/stores/settings';
import { useKeyboard } from '@/composables/useKeyboard';
import type { Drawer } from '@/types';
import Topbar from './Topbar.vue';
import Sidebar from './Sidebar.vue';
import StatusBar from './StatusBar.vue';
import SearchBar from '@/components/search/SearchBar.vue';
import MemoryDetail from '@/components/memory/MemoryDetail.vue';
import MemoryEditor from '@/components/memory/MemoryEditor.vue';

const route = useRoute();
const ui = useUiStore();
const memory = useMemoryStore();
const searchStore = useSearchStore();
const palace = usePalaceStore();
const settings = useSettingsStore();

useKeyboard();

watch(() => route.path, () => {
  if (ui.detailPanelOpen) {
    ui.closeDetailPanel();
    memory.clearActive();
  }
});

function closeDetail() {
  ui.closeDetailPanel();
  memory.clearActive();
}

function startEdit(drawer: Drawer) {
  memory.activeDrawer = drawer;
  memory.editing = true;
}

async function onSaved(_drawer: Drawer) {
  memory.editing = false;
  await memory.loadDrawers(
    palace.selectedWing || undefined,
    palace.selectedRoom || undefined,
  );
  await palace.loadTaxonomy();
}

async function handleDelete(drawer: Drawer) {
  if (!confirm(`Delete this memory from ${drawer.wing}/${drawer.room}?`)) return;
  await memory.deleteDrawer(drawer.drawer_id);
  ui.closeDetailPanel();
  await palace.loadTaxonomy();
}

async function handleFavorite(drawer: Drawer) {
  await memory.toggleFavorite(drawer);
}

function searchByTag(tag: string) {
  searchStore.search(tag);
  searchStore.open();
}
</script>
