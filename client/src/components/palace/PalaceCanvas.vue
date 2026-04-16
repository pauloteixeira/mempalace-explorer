<template>
  <div
    ref="containerRef"
    class="palace-canvas w-full h-full relative overflow-auto"
    @wheel="onWheel"
  >
    <!-- Zoomable layer -->
    <div
      class="origin-top-left will-change-transform pt-6 pb-8"
      :style="worldStyle"
    >
      <!-- Empty state -->
      <div
        v-if="wings.length === 0 && !loading"
        class="flex flex-col items-center justify-center py-32 text-gray-400 dark:text-gray-500 gap-3"
      >
        <svg class="w-12 h-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 2L3 8h18L12 2Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 8v1h16V8" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 9v9M10 9v9M14 9v9M18 9v9" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 18h18v2H3z" />
        </svg>
        <span class="text-sm">No wings found. Configure your connection in Settings.</span>
      </div>

      <!-- Corridors (wings) -->
      <div
        v-for="(wing, wIdx) in wings"
        :key="wing.name"
        class="mx-6 mb-7 rounded-xl border overflow-hidden transition-all duration-300"
        :class="[
          'bg-slate-50/80 dark:bg-slate-900/60',
          'border-opacity-30',
        ]"
        :style="{ borderColor: getWingColor(wIdx) }"
      >
        <!-- Corridor header -->
        <div
          class="flex items-center gap-3 px-5 py-3 cursor-pointer group"
          :style="{ background: `${getWingColor(wIdx)}15` }"
          @click="$emit('wingClick', wing.name)"
        >
          <svg class="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" :stroke="getWingColor(wIdx)">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 2L3 8h18L12 2Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 9v8M9 9v8M15 9v8M19 9v8" />
            <rect x="3" y="17" width="18" height="2" rx="1" opacity="0.5" :fill="getWingColor(wIdx)" />
          </svg>
          <span
            class="text-[15px] font-semibold tracking-wide group-hover:underline"
            :style="{ color: getWingColor(wIdx) }"
          >{{ wing.name }}</span>
          <span class="ml-auto text-xs opacity-60" :style="{ color: getWingColor(wIdx) }">
            {{ wing.drawerCount }} memories
          </span>
        </div>

        <!-- Rooms grid -->
        <div class="flex flex-wrap gap-4 p-5 pt-4">
          <div
            v-for="room in (wing.children || [])"
            :key="`${wing.name}/${room.name}`"
            class="room-card"
            :class="[
              isExpanded(wing.name, room.name) ? 'room-card--expanded' : 'room-card--collapsed',
            ]"
            :style="{
              '--wing-color': getWingColor(wIdx),
              '--wing-color-15': getWingColor(wIdx) + '26',
              '--wing-color-30': getWingColor(wIdx) + '4d',
            }"
          >
            <!-- Room header (always visible) -->
            <div
              class="room-header"
              @click="onRoomHeaderClick(wing.name, room.name)"
            >
              <!-- Door arch -->
              <div class="door-arch" :style="{ borderColor: getWingColor(wIdx) + '80' }">
                <div class="door-knob" :style="{ background: getWingColor(wIdx) + '60' }" />
              </div>

              <div class="flex flex-col items-center gap-1.5 mt-1">
                <span class="room-name">{{ room.name }}</span>
                <span class="room-badge" :style="{ background: getWingColor(wIdx) + '20', color: getWingColor(wIdx) }">
                  {{ room.drawerCount }}
                </span>
              </div>

              <!-- Expand chevron -->
              <svg
                class="expand-chevron"
                :class="{ 'rotate-180': isExpanded(wing.name, room.name) }"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <!-- Expanded drawer list -->
            <Transition
              @before-enter="onBeforeEnter"
              @enter="onEnter"
              @after-enter="onAfterEnter"
              @before-leave="onBeforeLeave"
              @leave="onLeave"
              @after-leave="onAfterLeave"
            >
              <div
                v-if="isExpanded(wing.name, room.name)"
                class="drawer-list"
              >
                <div class="drawer-list-divider" :style="{ background: `linear-gradient(90deg, transparent, ${getWingColor(wIdx)}30, transparent)` }" />

                <!-- Loading -->
                <div v-if="roomDrawersLoading" class="flex items-center justify-center py-6 gap-2">
                  <div
                    class="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    :style="{ borderColor: getWingColor(wIdx), borderTopColor: 'transparent' }"
                  />
                  <span class="text-xs text-gray-400 dark:text-gray-500">Loading memories...</span>
                </div>

                <!-- Error -->
                <div v-else-if="roomDrawersError" class="text-center py-6 text-xs text-red-400 dark:text-red-500">
                  {{ roomDrawersError }}
                </div>

                <!-- Empty -->
                <div v-else-if="roomDrawers.length === 0" class="text-center py-6 text-xs text-gray-400 dark:text-gray-500">
                  No memories in this room
                </div>

                <!-- Drawer items -->
                <template v-else>
                  <div
                    v-for="(drawer, dIdx) in roomDrawers"
                    :key="drawer.drawer_id"
                    class="drawer-item"
                    :style="{ animationDelay: `${dIdx * 40}ms` }"
                    @click.stop="$emit('drawerClick', drawer)"
                  >
                    <div class="drawer-icon" :style="{ color: getWingColor(wIdx) }">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="drawer-title">{{ getContentTitle(drawer) }}</div>
                      <div class="drawer-preview">{{ getContentPreview(drawer) }}</div>
                    </div>
                    <svg class="w-4 h-4 shrink-0 text-gray-300 dark:text-gray-600 group-hover/item:text-gray-400 dark:group-hover/item:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </template>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div class="w-8 h-8 border-2 border-palace-400 border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { TaxonomyNode, Drawer } from '@/types';

const props = defineProps<{
  wings: TaxonomyNode[];
  loading?: boolean;
  expandedRoom: { wing: string; room: string } | null;
  roomDrawers: Drawer[];
  roomDrawersLoading?: boolean;
  roomDrawersError?: string;
}>();

const emit = defineEmits<{
  roomClick: [wing: string, room: string];
  drawerClick: [drawer: Drawer];
  wingClick: [wing: string];
  collapseRoom: [];
}>();

const containerRef = ref<HTMLDivElement | null>(null);

const PALETTE = ['#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#fb923c'];

function getWingColor(wingIndex: number): string {
  return PALETTE[wingIndex % PALETTE.length];
}

function isExpanded(wing: string, room: string): boolean {
  return props.expandedRoom?.wing === wing && props.expandedRoom?.room === room;
}

function onRoomHeaderClick(wing: string, room: string) {
  if (isExpanded(wing, room)) {
    emit('collapseRoom');
  } else {
    emit('roomClick', wing, room);
  }
}

function getContentTitle(drawer: Drawer): string {
  const raw = drawer.content || drawer.content_preview || '';
  const firstLine = raw.split('\n').find(l => l.trim().length > 0) || '';
  let title = firstLine.replace(/^#+\s*/, '').replace(/^\[.*?\]\s*/, '').trim();
  if (title.length > 60) title = title.slice(0, 58) + '...';
  return title || '(untitled)';
}

function getContentPreview(drawer: Drawer): string {
  const raw = drawer.content || drawer.content_preview || '';
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  const line = lines.length > 1 ? lines[1] : lines[0] || '';
  let preview = line.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').trim();
  if (preview.length > 80) preview = preview.slice(0, 78) + '...';
  return preview;
}

// --- Zoom state ---
const scale = ref(1);
const transformOriginX = ref(0);
const transformOriginY = ref(0);

const worldStyle = computed(() => ({
  transform: `scale(${scale.value})`,
  transformOrigin: `${transformOriginX.value}px ${transformOriginY.value}px`,
  transition: 'transform 0.15s ease-out',
}));

function onWheel(e: WheelEvent) {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();

  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.min(3, Math.max(0.3, scale.value * delta));

  const rect = containerRef.value!.getBoundingClientRect();
  transformOriginX.value = e.clientX - rect.left + containerRef.value!.scrollLeft;
  transformOriginY.value = e.clientY - rect.top + containerRef.value!.scrollTop;
  scale.value = newScale;
}

function zoomIn() {
  scale.value = Math.min(3, scale.value * 1.3);
}

function zoomOut() {
  scale.value = Math.max(0.3, scale.value * 0.7);
}

function resetZoom() {
  scale.value = 1;
}

defineExpose({ zoomIn, zoomOut, resetZoom });

// --- Transition hooks for height animation ---
function onBeforeEnter(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '0';
  htmlEl.style.opacity = '0';
  htmlEl.style.overflow = 'hidden';
}

function onEnter(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement;
  const targetH = htmlEl.scrollHeight;
  requestAnimationFrame(() => {
    htmlEl.style.transition = 'height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease-in 0.1s';
    htmlEl.style.height = targetH + 'px';
    htmlEl.style.opacity = '1';
  });
  htmlEl.addEventListener('transitionend', function handler(e: TransitionEvent) {
    if (e.propertyName === 'height') {
      htmlEl.removeEventListener('transitionend', handler);
      done();
    }
  });
}

function onAfterEnter(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = 'auto';
  htmlEl.style.overflow = 'visible';
}

function onBeforeLeave(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = htmlEl.scrollHeight + 'px';
  htmlEl.style.overflow = 'hidden';
}

function onLeave(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement;
  requestAnimationFrame(() => {
    htmlEl.style.transition = 'height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease-out';
    htmlEl.style.height = '0';
    htmlEl.style.opacity = '0';
  });
  htmlEl.addEventListener('transitionend', function handler(e: TransitionEvent) {
    if (e.propertyName === 'height') {
      htmlEl.removeEventListener('transitionend', handler);
      done();
    }
  });
}

function onAfterLeave(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '';
  htmlEl.style.overflow = '';
}
</script>

<style>
.palace-canvas .room-card {
  border-radius: 10px;
  border: 1px solid;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.palace-canvas .room-card--collapsed {
  width: 160px;
  border-color: #e2e8f0;
  background: white;
}

.dark .palace-canvas .room-card--collapsed {
  border-color: #334155;
  background: color-mix(in srgb, var(--wing-color) 5%, #0f172a);
}

.palace-canvas .room-card--expanded {
  width: 420px;
  border-color: var(--wing-color);
  border-width: 2px;
  background: white;
  box-shadow: 0 0 24px var(--wing-color-15), 0 4px 12px rgba(0,0,0,0.06);
}

.dark .palace-canvas .room-card--expanded {
  background: color-mix(in srgb, var(--wing-color) 6%, #0f172a);
  box-shadow: 0 0 30px var(--wing-color-15), 0 4px 16px rgba(0,0,0,0.25);
}

.palace-canvas .room-card:hover:not(.room-card--expanded) {
  border-color: var(--wing-color);
  box-shadow: 0 0 16px var(--wing-color-15);
  transform: translateY(-2px);
}

.palace-canvas .room-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 12px 10px;
  cursor: pointer;
  position: relative;
}

.palace-canvas .door-arch {
  width: 28px;
  height: 22px;
  border: 2px solid;
  border-bottom: none;
  border-radius: 14px 14px 0 0;
  position: relative;
  margin-bottom: 4px;
}

.palace-canvas .door-knob {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  position: absolute;
  right: 4px;
  top: 10px;
}

.palace-canvas .room-name {
  font-size: 12px;
  font-weight: 500;
  color: #1e293b;
  text-align: center;
  line-height: 1.3;
  max-width: 136px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .palace-canvas .room-name {
  color: #e2e8f0;
}

.palace-canvas .room-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 10px;
  border-radius: 10px;
}

.palace-canvas .expand-chevron {
  width: 14px;
  height: 14px;
  position: absolute;
  bottom: 4px;
  right: 6px;
  color: #64748b;
  transition: transform 0.3s ease, opacity 0.2s;
  opacity: 0;
}

.palace-canvas .room-card:hover .expand-chevron,
.palace-canvas .room-card--expanded .expand-chevron {
  opacity: 1;
}

.palace-canvas .drawer-list {
  padding: 0 8px 8px;
}

.palace-canvas .drawer-list-divider {
  height: 1px;
  margin: 0 4px 8px;
}

.palace-canvas .drawer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
  animation: palaceDrawerSlideIn 0.3s ease-out both;
}

.palace-canvas .drawer-item:hover {
  background: #f1f5f9;
}

.dark .palace-canvas .drawer-item:hover {
  background: rgba(148, 163, 184, 0.08);
}

.palace-canvas .drawer-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.palace-canvas .drawer-title {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .palace-canvas .drawer-title {
  color: #cbd5e1;
}

.palace-canvas .drawer-preview {
  font-size: 11px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 1px;
}

@keyframes palaceDrawerSlideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
