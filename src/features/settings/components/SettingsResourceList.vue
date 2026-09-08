<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface">
    <div class="shrink-0 space-y-2 border-b border-border-subtle p-2.5">
      <div class="relative">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
        <input
          :value="search"
          type="text"
          placeholder="搜索条目…"
          class="w-full rounded-md border border-border-subtle bg-input-bg py-1.5 pl-8 pr-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50"
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <select
        v-if="filterOptions && filterOptions.length"
        :value="filterValue ?? 'all'"
        class="w-full rounded-md border border-border-subtle bg-input-bg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-cyan-500/50"
        @change="$emit('update:filterValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in filterOptions" :key="option.value" :value="option.value">
          {{ option.label }}（{{ option.count }}）
        </option>
      </select>
    </div>

    <div class="flex-1 overflow-y-auto p-2">
      <template v-if="group">
        <div
          v-for="item in visibleItems"
          :key="item.id"
          class="row flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 transition-colors"
          :class="isActive(item) ? 'bg-accent text-white' : 'text-text-primary hover:bg-elevated'"
          :draggable="group.sortable"
          @click="$emit('select', item)"
          @dragstart="startDrag($event, item)"
          @dragover.prevent
          @drop="dropOn($event, item)"
        >
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-medium"
            :class="isActive(item) ? 'bg-white/20 text-white' : 'bg-cyan-500/10 text-accent'"
          >{{ avatarChar(item.name) }}</span>
          <span class="min-w-0 flex-1 truncate text-xs">{{ item.name }}</span>
          <span
            v-if="statusOf(item)"
            class="h-1.5 w-1.5 shrink-0 rounded-full"
            :class="statusOf(item) === 'ok' ? 'bg-emerald-400' : 'bg-red-400'"
          />
          <button
            v-if="group.duplicable"
            type="button"
            title="复制"
            class="row-action"
            :class="isActive(item) ? 'text-white/70 hover:text-white' : ''"
            @click.stop="$emit('duplicate', item)"
          >
            <Copy class="h-3 w-3" />
          </button>
          <button
            type="button"
            title="删除"
            class="row-action"
            :class="isActive(item) ? 'text-white/70 hover:text-white' : ''"
            @click.stop="$emit('remove', item)"
          >
            <Trash2 class="h-3 w-3" />
          </button>
        </div>
        <div v-if="!visibleItems.length" class="py-8 text-center text-xs text-text-muted">
          无匹配条目
        </div>
      </template>
      <div v-else class="py-8 text-center text-xs text-text-muted">
        暂无条目
      </div>
    </div>

    <div class="shrink-0 border-t border-border-subtle p-2.5">
      <button
        type="button"
        class="w-full rounded-md border border-dashed border-border-subtle py-1.5 text-xs text-text-secondary transition-colors hover:border-cyan-500/40 hover:text-accent"
        @click="$emit('add')"
      >
        ＋ {{ addLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Copy, Search, Trash2 } from 'lucide-vue-next';

export interface ResourceItem {
  id: string;
  tab: string;
  name: string;
}

export interface ResourceGroup {
  tab: string;
  label: string;
  sortable: boolean;
  duplicable: boolean;
  items: ResourceItem[];
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

const props = defineProps<{
  group: ResourceGroup | null;
  activeItemId: string | null;
  creating: boolean;
  search: string;
  statusMap?: Record<string, 'ok' | 'error'>;
  filterOptions?: FilterOption[];
  filterValue?: string;
}>();

const emit = defineEmits<{
  select: [item: ResourceItem];
  add: [];
  remove: [item: ResourceItem];
  duplicate: [item: ResourceItem];
  reorder: [payload: { sourceId: string; targetId: string }];
  'update:search': [value: string];
  'update:filterValue': [value: string];
}>();

const draggedId = ref<string | null>(null);

const addLabel = computed(() => (
  ({ llm: '添加模型', image: '添加模型', video: '添加模型', template: '添加模板', wechat: '添加账号' } as Record<string, string>)[props.group?.tab ?? ''] ?? '添加'
));

const visibleItems = computed(() => {
  const keyword = props.search.trim().toLowerCase();
  const items = props.group?.items ?? [];
  if (!keyword) return items;
  return items.filter(item => item.name.toLowerCase().includes(keyword));
});

function isActive(item: ResourceItem) {
  return item.id === props.activeItemId && !props.creating;
}

function statusOf(item: ResourceItem): 'ok' | 'error' | null {
  if (item.tab !== 'llm') return null;
  return props.statusMap?.[item.id] ?? null;
}

function avatarChar(name: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function startDrag(event: DragEvent, item: ResourceItem) {
  draggedId.value = item.id;
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', item.id);
}

function dropOn(event: DragEvent, item: ResourceItem) {
  event.preventDefault();
  const sourceId = draggedId.value;
  draggedId.value = null;
  if (!sourceId || sourceId === item.id || !props.group?.sortable) return;
  emit('reorder', { sourceId, targetId: item.id });
}
</script>

<style scoped>
.row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 120ms ease, color 120ms ease;
}
.row:hover .row-action,
.row-action:focus-visible {
  opacity: 1;
}
.row-action:hover {
  color: var(--text-primary);
}
.row-action:last-child:hover {
  color: rgb(248 113 113);
}
</style>
