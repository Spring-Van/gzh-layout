<template>
  <section class="custom-scrollbar flex-1 overflow-y-auto p-6">
    <div class="mx-auto max-w-6xl">
      <div v-if="groups.some(group => group.items.length)" class="space-y-8">
        <section v-for="group in groups" :key="group.type" v-show="group.items.length">
          <div class="mb-3 flex items-center gap-2"><component :is="group.icon" :size="16" :class="group.tone" /><h3 class="text-sm font-medium text-text-primary">{{ group.label }}</h3><span class="text-xs text-text-muted">{{ group.items.length }}</span></div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div v-for="item in group.items" :key="`${item.entry.id}-${item.variant?.id || 'default'}`" class="asset-card">
              <div v-if="item.imageUrl" class="asset-card-image"><img :src="item.imageUrl" :alt="`${item.asset.name} ${item.variant?.name || ''}`" loading="lazy" decoding="async" /><div class="asset-card-overlay" /></div>
              <div v-else class="asset-card-info"><div class="asset-card-icon"><component :is="group.icon" :size="24" :class="group.tone" /></div><p class="mt-4 text-sm font-semibold text-text-primary">{{ item.asset.name }}</p><p class="mt-1 text-xs" :class="group.tone">{{ item.variant?.name || '默认状态' }}</p><p class="mt-4 line-clamp-4 text-left text-xs leading-5 text-text-muted">{{ item.variant?.description || item.asset.description || '暂无视觉描述' }}</p><p v-if="item.variant?.tags?.length" class="mt-auto pt-3 text-left text-[10px]" :class="group.tone">{{ item.variant.tags.join(' · ') }}</p></div>
              <div class="asset-card-label" :class="item.imageUrl ? 'asset-card-label-image' : 'asset-card-label-plain'"><div class="min-w-0"><span class="block truncate font-semibold">{{ item.asset.name }}</span><span class="mt-0.5 block truncate text-[11px] opacity-70">{{ item.variant?.name || '默认状态' }}</span></div></div>
            </div>
          </div>
        </section>
      </div>
      <div v-else class="flex min-h-64 flex-col items-center justify-center text-center"><Boxes :size="28" class="text-text-muted" /><h3 class="mt-4 text-sm font-medium text-text-primary">本章还没有确认资产</h3><p class="mt-2 text-sm text-text-secondary">回到原文执行"提取资产"，审核确认后会出现在这里。</p></div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'; import { Boxes, MapPin, Package, UserRound } from 'lucide-vue-next'; import type { LongProjectAsset, LongProjectAssetType, LongProjectAssetVariant, LongProjectChapterAsset } from '@comic/types';
type StateCard = { entry: LongProjectChapterAsset; asset: LongProjectAsset; variant?: LongProjectAssetVariant; imageUrl?: string };
const props = defineProps<{ entries: LongProjectChapterAsset[]; assets: LongProjectAsset[] }>();
const meta = { character: { label: '人物', icon: UserRound, tone: 'text-cyan-400' }, scene: { label: '场景', icon: MapPin, tone: 'text-emerald-400' }, prop: { label: '道具', icon: Package, tone: 'text-amber-400' } };
/** 将章节资产引用解析为「资产 × 视觉状态」卡片；无状态的资产也生成一张默认卡 */
const resolved = computed<StateCard[]>(() => { const cards: StateCard[] = []; for (const entry of props.entries) { const asset = props.assets.find(item => item.id === entry.assetId); if (!asset) continue; if (asset.variants.length) asset.variants.forEach(variant => cards.push({ entry, asset, variant, imageUrl: variant.referenceImageIds.find(isImageSource) })); else cards.push({ entry, asset }); } return cards });
const groups = computed(() => (Object.keys(meta) as LongProjectAssetType[]).map(type => ({ type, ...meta[type], items: resolved.value.filter(item => item.asset.type === type) })));
function isImageSource(value: string) { return /^(https?:|data:|blob:|file:|\/)/i.test(value) }
</script>
<style scoped>
.asset-card { position:relative; display:flex; appearance:none; aspect-ratio:3 / 4; width:100%; min-width:0; flex-direction:column; overflow:hidden; border:1px solid #e5e7eb; border-radius:1rem; background:#ffffff; box-shadow:0 8px 20px rgba(15,23,42,.08),0 1px 2px rgba(15,23,42,.05); padding:0; text-align:left; transition:border-color .2s ease,transform .2s ease,box-shadow .2s ease; }
.asset-card:hover { border-color:var(--border-strong); transform:translateY(-3px); box-shadow:0 14px 28px rgba(15,23,42,.14),0 2px 5px rgba(15,23,42,.08); }
.asset-card-image { position:absolute; inset:0; overflow:hidden; background:var(--bg-elevated); }.asset-card-image img { height:100%; width:100%; object-fit:cover; transition:transform .35s ease; }.asset-card:hover .asset-card-image img { transform:scale(1.045); }.asset-card-overlay { position:absolute; inset:0; background:rgba(15,23,42,.18); }
.asset-card-info { display:flex; min-height:0; flex:1; flex-direction:column; align-items:flex-start; padding:1.15rem 1.15rem 5rem; background:#ffffff; }.asset-card-icon { display:flex; height:3.25rem; width:3.25rem; align-items:center; justify-content:center; border:1px solid #e5e7eb; border-radius:.9rem; background:#f8fafc; box-shadow:0 3px 8px rgba(15,23,42,.08); }
.asset-card-label { position:absolute; z-index:2; right:0; bottom:0; left:0; display:flex; align-items:flex-end; gap:.75rem; width:100%; box-sizing:border-box; padding:.9rem 1rem 1rem; background:transparent; font-size:.75rem; }.asset-card-label-image { color:#fff; text-shadow:0 1px 3px rgba(0,0,0,.9); }.asset-card-label-plain { color:var(--text-primary); }
:global(.dark) .asset-card { border-color:#334155; background:#1e293b; box-shadow:0 12px 28px rgba(2,6,23,.3),inset 0 1px 0 rgba(255,255,255,.04); }:global(.dark) .asset-card-info { background:#1e293b; }:global(.dark) .asset-card-icon { border-color:#334155; background:#0f172a; box-shadow:inset 0 1px 0 rgba(255,255,255,.05); }:global(.dark) .asset-card-overlay { background:rgba(2,6,23,.3); }:global(.dark) .asset-card-label { background:transparent; }
</style>
