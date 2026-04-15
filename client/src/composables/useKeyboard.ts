import { onMounted, onUnmounted } from 'vue';
import { useUiStore } from '@/stores/ui';
import { useMemoryStore } from '@/stores/memory';
import { useSearchStore } from '@/stores/search';
import { usePalaceStore } from '@/stores/palace';

export function useKeyboard() {
  const ui = useUiStore();
  const memory = useMemoryStore();
  const search = useSearchStore();
  const palace = usePalaceStore();

  function flattenTree(): Array<{ type: 'wing' | 'room'; wing: string; room?: string }> {
    const items: Array<{ type: 'wing' | 'room'; wing: string; room?: string }> = [];
    for (const node of palace.taxonomyTree) {
      items.push({ type: 'wing', wing: node.name });
      if (node.children) {
        for (const child of node.children) {
          items.push({ type: 'room', wing: node.name, room: child.name });
        }
      }
    }
    return items;
  }

  function currentIndex(items: ReturnType<typeof flattenTree>): number {
    return items.findIndex(item => {
      if (palace.selectedRoom) {
        return item.type === 'room' && item.wing === palace.selectedWing && item.room === palace.selectedRoom;
      }
      if (palace.selectedWing) {
        return item.type === 'wing' && item.wing === palace.selectedWing;
      }
      return false;
    });
  }

  function navigateTree(direction: 1 | -1) {
    const items = flattenTree();
    if (items.length === 0) return;

    const idx = currentIndex(items);
    let next: number;

    if (idx === -1) {
      next = direction === 1 ? 0 : items.length - 1;
    } else {
      next = idx + direction;
      if (next < 0) next = items.length - 1;
      if (next >= items.length) next = 0;
    }

    const target = items[next];
    if (target.type === 'wing') {
      palace.selectWing(target.wing);
    } else {
      palace.selectRoom(target.wing, target.room!);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (e.key === 'Escape') {
      if (search.isOpen) {
        search.close();
        return;
      }
      if (memory.editing) {
        memory.editing = false;
        return;
      }
      if (ui.detailPanelOpen) {
        ui.closeDetailPanel();
        memory.clearActive();
        return;
      }
    }

    if (isInput) return;

    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      navigateTree(1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      navigateTree(-1);
    } else if (e.key === 'ArrowRight' || e.key === 'l') {
      if (ui.sidebarOpen && palace.selectedWing && !palace.selectedRoom) {
        e.preventDefault();
        const node = palace.taxonomyTree.find(n => n.name === palace.selectedWing);
        if (node?.children?.length) {
          palace.selectRoom(node.name, node.children[0].name);
        }
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'h') {
      if (palace.selectedRoom) {
        e.preventDefault();
        palace.selectWing(palace.selectedWing!);
      }
    } else if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      ui.toggleSidebar();
    }
  }

  onMounted(() => document.addEventListener('keydown', handleKeydown));
  onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
}
