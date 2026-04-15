<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center justify-between px-4 py-3 border-b border-surface-800 shrink-0">
      <h2 class="text-sm font-semibold text-gray-200">
        {{ isNew ? 'New Memory' : 'Edit Memory' }}
      </h2>
      <button
        class="p-1 rounded hover:bg-surface-800 text-gray-500 hover:text-gray-300 transition-colors"
        @click="emit('cancel')"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-auto p-4 space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">Wing</label>
          <input
            v-model="form.wing"
            type="text"
            class="w-full px-2.5 py-1.5 rounded-md bg-surface-900 border border-surface-700 text-sm text-gray-200 focus:outline-none focus:border-palace-500"
            placeholder="wing name"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">Room</label>
          <input
            v-model="form.room"
            type="text"
            class="w-full px-2.5 py-1.5 rounded-md bg-surface-900 border border-surface-700 text-sm text-gray-200 focus:outline-none focus:border-palace-500"
            placeholder="room name"
          />
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-400 mb-1">Content</label>
        <textarea
          v-model="form.content"
          rows="20"
          class="w-full px-3 py-2 rounded-md bg-surface-900 border border-surface-700 text-sm text-gray-200 font-mono leading-relaxed resize-y focus:outline-none focus:border-palace-500"
          placeholder="Memory content..."
        />
      </div>
    </div>

    <div class="px-4 py-3 border-t border-surface-800 flex items-center gap-3 shrink-0">
      <button
        class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="saving
          ? 'bg-surface-700 text-gray-400 cursor-wait'
          : 'bg-palace-600 hover:bg-palace-500 text-white'"
        :disabled="saving || !isValid"
        @click="save"
      >
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
      <button
        class="px-4 py-1.5 rounded-md text-sm text-gray-400 hover:text-gray-200 hover:bg-surface-800 transition-colors"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <span v-if="error" class="text-xs text-red-400">{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue';
import type { Drawer } from '@/types';
import { useMemoryStore } from '@/stores/memory';
import { usePalaceStore } from '@/stores/palace';

const props = defineProps<{
  drawer?: Drawer | null;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [drawer: Drawer];
}>();

const memory = useMemoryStore();
const palace = usePalaceStore();

const isNew = computed(() => !props.drawer);
const saving = ref(false);
const error = ref('');

const form = reactive({
  wing: '',
  room: '',
  content: '',
});

const isValid = computed(() =>
  form.wing.trim() && form.room.trim() && form.content.trim()
);

onMounted(() => {
  if (props.drawer) {
    form.wing = props.drawer.wing;
    form.room = props.drawer.room;
    form.content = props.drawer.content;
  } else {
    form.wing = palace.selectedWing || '';
    form.room = palace.selectedRoom || '';
  }
});

async function save() {
  saving.value = true;
  error.value = '';
  try {
    let result: Drawer;
    if (props.drawer) {
      result = await memory.updateDrawer(props.drawer.drawer_id, {
        content: form.content,
        wing: form.wing,
        room: form.room,
      });
    } else {
      result = await memory.createDrawer({
        wing: form.wing,
        room: form.room,
        content: form.content,
        added_by: 'mempalace-explorer',
      });
    }
    emit('saved', result);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    saving.value = false;
  }
}
</script>
