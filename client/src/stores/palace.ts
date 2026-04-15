import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/services/api';
import type { Wing, Room, RawTaxonomy, TaxonomyNode } from '@/types';

export const usePalaceStore = defineStore('palace', () => {
  const taxonomy = ref<RawTaxonomy>({});
  const wings = ref<Wing[]>([]);
  const rooms = ref<Room[]>([]);
  const selectedWing = ref<string | null>(null);
  const selectedRoom = ref<string | null>(null);
  const loading = ref(false);

  const taxonomyTree = computed<TaxonomyNode[]>(() => {
    return Object.entries(taxonomy.value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([wingName, wingRooms]) => ({
        name: wingName,
        type: 'wing' as const,
        drawerCount: Object.values(wingRooms).reduce((s, c) => s + c, 0),
        children: Object.entries(wingRooms)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([roomName, count]) => ({
            name: roomName,
            type: 'room' as const,
            drawerCount: count,
          })),
      }));
  });

  const breadcrumb = computed(() => {
    const parts: Array<{ label: string; type: string }> = [];
    if (selectedWing.value) parts.push({ label: selectedWing.value, type: 'wing' });
    if (selectedRoom.value) parts.push({ label: selectedRoom.value, type: 'room' });
    return parts;
  });

  const totalDrawers = computed(() =>
    wings.value.reduce((sum, w) => sum + w.drawerCount, 0),
  );

  async function loadTaxonomy() {
    loading.value = true;
    try {
      const data = await api.get<{ taxonomy: RawTaxonomy }>('/taxonomy');
      taxonomy.value = data.taxonomy;

      wings.value = Object.entries(data.taxonomy)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, rooms]) => ({
          name,
          rooms: Object.keys(rooms).sort((a, b) => a.localeCompare(b)),
          drawerCount: Object.values(rooms).reduce((s, c) => s + c, 0),
        }));
    } finally {
      loading.value = false;
    }
  }

  async function loadRooms(wing?: string) {
    const data = await api.get<{ rooms: Room[] }>(
      wing ? `/taxonomy/rooms?wing=${encodeURIComponent(wing)}` : '/taxonomy/rooms',
    );
    rooms.value = data.rooms.sort((a, b) => a.name.localeCompare(b.name));
  }

  function selectWing(wing: string | null) {
    selectedWing.value = wing;
    selectedRoom.value = null;
  }

  function selectRoom(wing: string, room: string | null) {
    selectedWing.value = wing;
    selectedRoom.value = room;
  }

  return {
    taxonomy,
    wings,
    rooms,
    selectedWing,
    selectedRoom,
    loading,
    taxonomyTree,
    breadcrumb,
    totalDrawers,
    loadTaxonomy,
    loadRooms,
    selectWing,
    selectRoom,
  };
});
