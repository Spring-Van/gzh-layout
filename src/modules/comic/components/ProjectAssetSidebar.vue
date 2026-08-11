<template>
  <aside class="w-56 shrink-0 rounded-lg bg-surface border border-border-subtle shadow-lg shadow-black/20 flex flex-col overflow-hidden">
    <div class="px-3 py-2.5 border-b border-border-subtle flex items-center gap-2">
      <span class="text-xs font-medium text-text-primary">人物列表</span>
      <span class="text-[10px] text-text-secondary">{{ assets.length }} 人</span>
    </div>
    <div class="flex-1 overflow-auto p-2 space-y-1">
      <button
        v-for="asset in assets"
        :key="asset.id"
        class="group w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors duration-200"
        :class="selectedAssetId === asset.id
          ? 'bg-cyan-500/10 border border-cyan-500/20'
          : 'bg-surface border border-border-subtle hover:bg-elevated hover:border-border-default'"
        @click="$emit('select', asset)"
      >
        <span class="w-9 h-12 rounded-lg bg-surface border border-border-subtle flex items-center justify-center shrink-0 overflow-hidden">
          <img
            v-if="asset.referenceImages?.[0]"
            :src="asset.referenceImages[0]"
            :alt="`${asset.name || '未命名'}参考图`"
            class="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <UserRound v-else class="w-3.5 h-3.5 text-text-muted" />
        </span>
        <span class="flex-1 min-w-0">
          <span class="block text-xs text-text-primary truncate">{{ asset.name || '未命名' }}</span>
          <span class="block text-[10px] text-text-secondary">{{ asset.outfits?.length || 0 }} 套服装</span>
        </span>
        <span
          class="shrink-0 w-6 h-6 rounded inline-flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-[color,background-color,opacity]"
          title="删除该资产"
          @click.stop="$emit('delete', asset)"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </span>
      </button>

      <div v-if="assets.length === 0" class="text-center text-text-muted text-xs py-8">
        暂无人物，请先在故事分析中生成
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Trash2, UserRound } from 'lucide-vue-next';
import type { ProjectAsset } from '@comic/types';

defineProps<{ assets: ProjectAsset[]; selectedAssetId?: string }>();
defineEmits<{ select: [asset: ProjectAsset]; delete: [asset: ProjectAsset] }>();
</script>
