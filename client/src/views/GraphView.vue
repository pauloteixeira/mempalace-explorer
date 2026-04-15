<template>
  <div class="h-full flex flex-col">
    <div class="px-4 py-3 border-b border-surface-800 flex items-center gap-4 shrink-0">
      <h2 class="text-sm font-semibold text-gray-200">Graph View</h2>

      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500">Room:</label>
        <select
          v-model="selectedRoom"
          class="px-2 py-1 rounded-md bg-surface-900 border border-surface-700 text-xs text-gray-300 focus:outline-none focus:border-palace-500"
        >
          <option value="">Select a room...</option>
          <option v-for="room in allRooms" :key="room" :value="room">{{ room }}</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500">Hops:</label>
        <select
          v-model.number="maxHops"
          class="px-2 py-1 rounded-md bg-surface-900 border border-surface-700 text-xs text-gray-300 focus:outline-none focus:border-palace-500"
        >
          <option :value="1">1</option>
          <option :value="2">2</option>
          <option :value="3">3</option>
        </select>
      </div>

      <button
        class="px-3 py-1 rounded-md text-xs font-medium bg-palace-600 hover:bg-palace-500 text-white transition-colors disabled:opacity-50"
        :disabled="!selectedRoom || loading"
        @click="loadGraph"
      >
        {{ loading ? 'Loading...' : 'Traverse' }}
      </button>

      <div class="flex-1" />

      <div v-if="graphData.nodes.length" class="flex items-center gap-3 text-xs text-gray-500">
        <span>{{ graphData.nodes.length }} nodes</span>
        <span>{{ graphData.edges.length }} edges</span>
      </div>

      <div class="flex items-center gap-3">
        <div
          v-for="wing in legendWings"
          :key="wing.name"
          class="flex items-center gap-1.5 text-xs text-gray-400"
        >
          <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: wing.color }" />
          {{ wing.name }}
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-hidden bg-surface-950">
      <GraphCanvas
        :nodes="graphData.nodes"
        :edges="graphData.edges"
        :loading="loading"
        @node-click="onNodeClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@/services/api';
import { usePalaceStore } from '@/stores/palace';
import { useMemoryStore } from '@/stores/memory';
import { useUiStore } from '@/stores/ui';
import type { GraphData, GraphNode } from '@/types';
import GraphCanvas from '@/components/graph/GraphCanvas.vue';

const palace = usePalaceStore();
const memory = useMemoryStore();
const ui = useUiStore();

const selectedRoom = ref('');
const maxHops = ref(2);
const loading = ref(false);
const graphData = ref<GraphData>({ nodes: [], edges: [] });

const palette = ['#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#fb923c'];

const allRooms = computed(() => {
  const rooms: string[] = [];
  for (const [, wingRooms] of Object.entries(palace.taxonomy)) {
    rooms.push(...Object.keys(wingRooms));
  }
  return [...new Set(rooms)].sort();
});

const legendWings = computed(() => {
  const wingSet = new Set(graphData.value.nodes.map(n => n.wing));
  let i = 0;
  return [...wingSet].map(name => ({
    name,
    color: palette[i++ % palette.length],
  }));
});

watch(() => palace.selectedWing, (wing) => {
  if (!wing) return;
  const wingRooms = palace.taxonomy[wing];
  if (wingRooms) {
    const firstRoom = Object.keys(wingRooms).sort()[0];
    if (firstRoom) {
      selectedRoom.value = firstRoom;
      loadGraph();
    }
  }
});

watch(() => palace.selectedRoom, (room) => {
  if (room) {
    selectedRoom.value = room;
    loadGraph();
  }
});

onMounted(() => {
  if (palace.selectedRoom) {
    selectedRoom.value = palace.selectedRoom;
    loadGraph();
  } else if (allRooms.value.length > 0) {
    selectedRoom.value = allRooms.value[0];
    loadGraph();
  } else if (palace.taxonomyTree.length === 0) {
    palace.loadTaxonomy().then(() => {
      if (allRooms.value.length > 0) {
        selectedRoom.value = allRooms.value[0];
        loadGraph();
      }
    });
  }
});

async function loadGraph() {
  if (!selectedRoom.value) return;
  loading.value = true;
  try {
    const data = await api.get<GraphData>(
      `/graph/traverse?room=${encodeURIComponent(selectedRoom.value)}&maxHops=${maxHops.value}`,
    );
    graphData.value = data;
  } catch {
    graphData.value = { nodes: [], edges: [] };
  } finally {
    loading.value = false;
  }
}

async function onNodeClick(node: GraphNode) {
  const rawId = node.id.replace(/^(drawer|room|wing):/, '');

  if (node.type === 'drawer') {
    try {
      await memory.loadDrawer(rawId);
      memory.editing = false;
      ui.openDetailPanel();
    } catch (err) {
      ui.showToast(`Could not load memory: ${(err as Error).message}`);
    }
  } else if (node.room) {
    selectedRoom.value = node.room;
    loadGraph();
  } else if (node.wing) {
    const wingRooms = palace.taxonomy[node.wing];
    if (wingRooms) {
      const firstRoom = Object.keys(wingRooms)[0];
      if (firstRoom) {
        selectedRoom.value = firstRoom;
        loadGraph();
      }
    }
  }
}
</script>
