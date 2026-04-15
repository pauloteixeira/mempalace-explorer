import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ViewMode } from '@/types';

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(true);
  const detailPanelOpen = ref(false);
  const currentView = ref<ViewMode>('explorer');
  const toastMessage = ref('');
  const toastVisible = ref(false);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const sidebarWidth = computed(() => (sidebarOpen.value ? 280 : 0));

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }

  function openDetailPanel() {
    detailPanelOpen.value = true;
  }

  function closeDetailPanel() {
    detailPanelOpen.value = false;
  }

  function setView(view: ViewMode) {
    currentView.value = view;
  }

  function showToast(message: string, duration = 2500) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.value = message;
    toastVisible.value = true;
    toastTimer = setTimeout(() => {
      toastVisible.value = false;
    }, duration);
  }

  return {
    sidebarOpen,
    detailPanelOpen,
    currentView,
    toastMessage,
    toastVisible,
    sidebarWidth,
    toggleSidebar,
    openDetailPanel,
    closeDetailPanel,
    setView,
    showToast,
  };
});
