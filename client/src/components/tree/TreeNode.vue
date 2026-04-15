<template>
  <div>
    <button
      class="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors group"
      :class="isSelected
        ? 'bg-palace-600/20 text-palace-600 dark:text-palace-300'
        : 'text-gray-700 dark:text-gray-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-gray-900 dark:hover:text-gray-100'"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      @click="handleClick"
    >
      <span
        v-if="hasChildren"
        class="w-4 h-4 flex items-center justify-center text-gray-500 transition-transform"
        :class="{ 'rotate-90': expanded }"
        @click.stop="toggleExpand"
      >
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
        </svg>
      </span>
      <span v-else class="w-4" />

      <span class="w-4 h-4 flex items-center justify-center shrink-0">
        <svg v-if="node.type === 'wing'" class="w-4 h-4 text-palace-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
        <svg v-else class="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clip-rule="evenodd" />
        </svg>
      </span>

      <span class="truncate flex-1 text-left">{{ node.name }}</span>

      <span class="text-xs text-gray-600 group-hover:text-gray-500 tabular-nums">
        {{ node.drawerCount }}
      </span>
    </button>

    <div v-if="expanded && hasChildren">
      <TreeNode
        v-for="child in node.children"
        :key="child.name"
        :node="child"
        :depth="depth + 1"
        :parent-wing="node.type === 'wing' ? node.name : parentWing"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { usePalaceStore } from '@/stores/palace';
import type { TaxonomyNode } from '@/types';

const props = withDefaults(defineProps<{
  node: TaxonomyNode;
  depth?: number;
  parentWing?: string;
}>(), {
  depth: 0,
  parentWing: '',
});

const palace = usePalaceStore();
const router = useRouter();
const route = useRoute();
const expanded = ref(false);

const hasChildren = computed(() => props.node.children && props.node.children.length > 0);

const isSelected = computed(() => {
  if (props.node.type === 'wing') {
    return palace.selectedWing === props.node.name && !palace.selectedRoom;
  }
  return palace.selectedWing === props.parentWing && palace.selectedRoom === props.node.name;
});

function toggleExpand() {
  expanded.value = !expanded.value;
}

function handleClick() {
  if (props.node.type === 'wing') {
    palace.selectWing(props.node.name);
    if (hasChildren.value) expanded.value = true;
  } else {
    palace.selectRoom(props.parentWing, props.node.name);
  }

  if (route.path !== '/' && route.path !== '/graph') {
    router.push('/');
  }
}
</script>
