<template>
  <div class="h-full flex flex-col">
    <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center gap-4 shrink-0 bg-white dark:bg-surface-900">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Palace View</h2>

      <div class="text-xs text-gray-400 dark:text-gray-500">
        <span v-if="!palace.loading && palace.wings.length > 0">
          {{ palace.wings.length }} wing{{ palace.wings.length !== 1 ? 's' : '' }} &middot;
          {{ totalRooms }} room{{ totalRooms !== 1 ? 's' : '' }} &middot;
          {{ palace.totalDrawers }} memories
        </span>
      </div>

      <div class="flex-1" />

      <div class="flex items-center gap-1">
        <button
          class="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Zoom in"
          @click="canvasRef?.zoomIn()"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
          </svg>
        </button>
        <button
          class="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Zoom out"
          @click="canvasRef?.zoomOut()"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
          </svg>
        </button>
        <button
          class="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Reset zoom"
          @click="canvasRef?.resetZoom()"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-hidden bg-surface-50 dark:bg-surface-950">
      <PalaceCanvas
        ref="canvasRef"
        :wings="palace.taxonomyTree"
        :loading="palace.loading"
        :expanded-room="expandedRoom"
        :room-drawers="roomDrawers"
        :room-drawers-loading="roomDrawersLoading"
        :room-drawers-error="roomDrawersError"
        @room-click="onRoomClick"
        @drawer-click="onDrawerClick"
        @wing-click="onWingClick"
        @collapse-room="collapseRoom"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePalaceStore } from '@/stores/palace';
import { useMemoryStore } from '@/stores/memory';
import { useUiStore } from '@/stores/ui';
import type { Drawer } from '@/types';
import PalaceCanvas from '@/components/palace/PalaceCanvas.vue';

const router = useRouter();
const palace = usePalaceStore();
const memory = useMemoryStore();
const ui = useUiStore();

const canvasRef = ref<InstanceType<typeof PalaceCanvas> | null>(null);
const expandedRoom = ref<{ wing: string; room: string } | null>(null);
const roomDrawers = ref<Drawer[]>([]);
const roomDrawersLoading = ref(false);
const roomDrawersError = ref('');

const totalRooms = computed(() =>
  palace.wings.reduce((sum, w) => sum + w.rooms.length, 0),
);

async function onRoomClick(wing: string, room: string) {
  if (expandedRoom.value?.wing === wing && expandedRoom.value?.room === room) {
    collapseRoom();
    return;
  }

  expandedRoom.value = { wing, room };
  roomDrawersLoading.value = true;
  roomDrawersError.value = '';
  roomDrawers.value = [];

  try {
    await memory.loadDrawers(wing, room, 50, 0);
    roomDrawers.value = [...memory.drawers];
  } catch (err) {
    roomDrawersError.value = (err as Error).message || 'Failed to load memories';
  } finally {
    roomDrawersLoading.value = false;
  }
}

function collapseRoom() {
  expandedRoom.value = null;
  roomDrawers.value = [];
}

async function onDrawerClick(drawer: Drawer) {
  memory.activeDrawer = drawer;
  memory.editing = false;
  ui.openDetailPanel();
  await memory.loadDrawer(drawer.drawer_id);
}

function onWingClick(wing: string) {
  palace.selectWing(wing);
  router.push('/');
}

onMounted(async () => {
  if (palace.wings.length === 0) {
    await palace.loadTaxonomy();
  }
});
</script>
