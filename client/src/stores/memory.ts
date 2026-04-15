import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { api } from '@/services/api';
import type {
  Drawer,
  DrawerListResponse,
  CreateDrawerInput,
  UpdateDrawerInput,
  Favorite,
} from '@/types';

export const useMemoryStore = defineStore('memory', () => {
  const drawers = ref<Drawer[]>([]);
  const activeDrawer = ref<Drawer | null>(null);
  const favorites = ref<Favorite[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const editing = ref(false);

  const drawerCache = reactive<Map<string, Drawer>>(new Map());
  const lastAppendCount = ref(0);

  async function loadDrawers(wing?: string, room?: string, limit = 20, offset = 0) {
    loading.value = true;
    try {
      const params = new URLSearchParams();
      if (wing) params.set('wing', wing);
      if (room) params.set('room', room);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const data = await api.get<DrawerListResponse>(`/memories?${params}`);
      drawers.value = data.drawers;
      total.value = data.count;
    } finally {
      loading.value = false;
    }
  }

  async function appendDrawers(wing?: string, room?: string, limit = 20, offset = 0) {
    const params = new URLSearchParams();
    if (wing) params.set('wing', wing);
    if (room) params.set('room', room);
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    const data = await api.get<DrawerListResponse>(`/memories?${params}`);
    drawers.value.push(...data.drawers);
    lastAppendCount.value = data.drawers.length;
  }

  async function loadDrawer(id: string) {
    loading.value = true;
    try {
      const drawer = await api.get<Drawer>(`/memories/${encodeURIComponent(id)}`);
      drawerCache.set(id, drawer);
      activeDrawer.value = drawer;
    } finally {
      loading.value = false;
    }
  }

  async function batchLoadDrawers(ids: string[], requireMetadata = false): Promise<Drawer[]> {
    const uncached = ids.filter(id => {
      const cached = drawerCache.get(id);
      if (!cached) return true;
      if (requireMetadata && !cached.metadata?.filed_at) return true;
      return false;
    });

    if (uncached.length > 0) {
      try {
        const data = await api.post<{ drawers: Drawer[] }>('/memories/batch', { ids: uncached });
        for (const d of data.drawers) {
          drawerCache.set(d.drawer_id, d);
        }
      } catch {
        // batch failed, results will use whatever is cached
      }
    }

    return ids
      .map(id => drawerCache.get(id))
      .filter((d): d is Drawer => d !== undefined);
  }

  function getCached(id: string): Drawer | undefined {
    return drawerCache.get(id);
  }

  async function createDrawer(input: CreateDrawerInput) {
    const drawer = await api.post<Drawer>('/memories', input);
    drawers.value.unshift(drawer);
    drawerCache.set(drawer.drawer_id, drawer);
    return drawer;
  }

  async function updateDrawer(id: string, updates: UpdateDrawerInput) {
    const drawer = await api.put<Drawer>(`/memories/${encodeURIComponent(id)}`, updates);
    const idx = drawers.value.findIndex(d => d.drawer_id === id);
    if (idx >= 0) drawers.value[idx] = { ...drawers.value[idx], ...drawer };
    if (activeDrawer.value?.drawer_id === id) {
      activeDrawer.value = { ...activeDrawer.value, ...drawer };
    }
    drawerCache.set(id, drawer);
    return drawer;
  }

  async function deleteDrawer(id: string) {
    await api.delete(`/memories/${encodeURIComponent(id)}`);
    drawers.value = drawers.value.filter(d => d.drawer_id !== id);
    if (activeDrawer.value?.drawer_id === id) activeDrawer.value = null;
    drawerCache.delete(id);
  }

  async function toggleFavorite(drawer: Drawer) {
    const id = encodeURIComponent(drawer.drawer_id);
    if (drawer.isFavorite) {
      await api.delete(`/memories/favorites/${id}`);
      drawer.isFavorite = false;
    } else {
      await api.post(`/memories/favorites/${id}`, {
        wing: drawer.wing,
        room: drawer.room,
      });
      drawer.isFavorite = true;
    }
    if (activeDrawer.value?.drawer_id === drawer.drawer_id) {
      activeDrawer.value = { ...activeDrawer.value, isFavorite: drawer.isFavorite };
    }
  }

  async function loadFavorites(wing?: string) {
    const params = wing ? `?wing=${encodeURIComponent(wing)}` : '';
    const data = await api.get<{ favorites: Favorite[] }>(`/memories/favorites${params}`);
    favorites.value = data.favorites;
  }

  function clearActive() {
    activeDrawer.value = null;
    editing.value = false;
  }

  return {
    drawers,
    activeDrawer,
    favorites,
    total,
    loading,
    editing,
    loadDrawers,
    appendDrawers,
    lastAppendCount,
    loadDrawer,
    batchLoadDrawers,
    getCached,
    createDrawer,
    updateDrawer,
    deleteDrawer,
    toggleFavorite,
    loadFavorites,
    clearActive,
  };
});
