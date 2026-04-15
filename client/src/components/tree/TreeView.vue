<template>
  <div>
    <div v-if="palace.loading" class="px-4 py-3 text-sm text-gray-500">
      Loading...
    </div>
    <div v-else-if="palace.taxonomyTree.length === 0" class="px-4 py-3 text-sm text-gray-500">
      No data. Configure connection in Settings.
    </div>
    <TreeNode
      v-for="wing in palace.taxonomyTree"
      :key="wing.name"
      :node="wing"
      :depth="0"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { usePalaceStore } from '@/stores/palace';
import { useSettingsStore } from '@/stores/settings';
import TreeNode from './TreeNode.vue';

const palace = usePalaceStore();
const settings = useSettingsStore();

onMounted(async () => {
  if (settings.isConfigured && palace.taxonomyTree.length === 0) {
    await palace.loadTaxonomy();
  }
});
</script>
