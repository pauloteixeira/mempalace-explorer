<template>
  <div class="min-h-screen bg-surface-950 text-gray-100">
    <div v-if="initializing" class="flex items-center justify-center h-screen">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-palace-400 mb-2">MemPalace Explorer</h1>
        <p class="text-gray-400">Initializing...</p>
      </div>
    </div>
    <AppLayout v-else>
      <router-view />
    </AppLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import AppLayout from '@/components/layout/AppLayout.vue';

const router = useRouter();
const settings = useSettingsStore();
const initializing = ref(true);

onMounted(async () => {
  try {
    await settings.loadSettings();

    if (!settings.isConfigured) {
      router.replace({ name: 'settings', query: { setup: 'true' } });
    }
  } catch {
    router.replace({ name: 'settings', query: { setup: 'true' } });
  } finally {
    initializing.value = false;
  }
});
</script>
