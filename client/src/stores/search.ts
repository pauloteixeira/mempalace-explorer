import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/services/api';
import type { SearchResponse, SearchResult } from '@/types';

export const useSearchStore = defineStore('search', () => {
  const query = ref('');
  const results = ref<SearchResult[]>([]);
  const totalBeforeFilter = ref(0);
  const loading = ref(false);
  const isOpen = ref(false);

  async function search(q: string, options?: { wing?: string; room?: string; limit?: number }) {
    if (!q.trim()) {
      results.value = [];
      return;
    }

    query.value = q;
    loading.value = true;
    try {
      const params = new URLSearchParams({ q });
      if (options?.wing) params.set('wing', options.wing);
      if (options?.room) params.set('room', options.room);
      if (options?.limit) params.set('limit', String(options.limit));

      const data = await api.get<SearchResponse>(`/search?${params}`);
      results.value = data.results;
      totalBeforeFilter.value = data.total_before_filter;
    } finally {
      loading.value = false;
    }
  }

  function open() {
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
    query.value = '';
    results.value = [];
  }

  function toggle() {
    if (isOpen.value) close();
    else open();
  }

  return {
    query,
    results,
    totalBeforeFilter,
    loading,
    isOpen,
    search,
    open,
    close,
    toggle,
  };
});
