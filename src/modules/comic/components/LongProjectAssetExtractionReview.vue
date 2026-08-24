<template>
  <section class="flex min-h-0 flex-1 flex-col bg-app-bg">
    <header class="flex shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-surface px-6 py-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 text-xs text-text-muted"><button class="hover:text-text-primary" @click="emit('back')">原文</button><ChevronRight :size="13" /><span>资产提取结果</span></div>
        <p class="mt-1 truncate text-sm font-semibold text-text-primary">{{ chapterName }}</p>
      </div>
      <p class="shrink-0 text-xs text-text-muted">基于 {{ sourceWordCount }} 字原文 · {{ candidates.length }} 项候选资产</p>
    </header>

    <div class="flex min-h-0 flex-1">
      <aside class="custom-scrollbar w-60 shrink-0 overflow-y-auto border-r border-border-subtle bg-surface p-3">
        <div class="mb-3 flex items-center justify-between px-1"><span class="text-xs font-medium text-text-secondary">本次识别</span><span class="text-[11px] text-text-muted">{{ handledCount }}/{{ candidates.length }}</span></div>
        <template v-for="group in groups" :key="group.type">
          <p v-if="group.items.length" class="mb-1 mt-3 px-2 text-[11px] font-medium text-text-muted">{{ group.label }} {{ group.items.length }}</p>
          <button v-for="candidate in group.items" :key="candidate.id" class="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors" :class="selectedId === candidate.id ? 'bg-cyan-500/12 text-text-primary' : 'text-text-secondary hover:bg-elevated'" @click="selectedId = candidate.id">
            <component :is="group.icon" :size="15" class="shrink-0" :class="selectedId === candidate.id ? 'text-cyan-400' : 'text-text-muted'" />
            <span class="min-w-0 flex-1 truncate text-xs">{{ candidate.name }}</span>
            <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="decisionColor(candidate.decision)" />
          </button>
        </template>
      </aside>

      <div v-if="activeCandidate" class="custom-scrollbar min-w-0 flex-1 overflow-y-auto">
        <div class="mx-auto max-w-3xl px-8 py-7">
          <div class="flex items-start justify-between gap-5">
            <div>
              <p class="text-xs text-cyan-400">{{ typeLabel(activeCandidate.type) }} · {{ activeCandidate.importance === 'major' ? '主要资产' : '次要资产' }}</p>
              <h2 class="mt-1 text-xl font-semibold text-text-primary">{{ activeCandidate.name }}</h2>
            </div>
            <button class="text-xs text-text-muted hover:text-red-300" @click="setDecision('ignore')">忽略本项</button>
          </div>

          <div class="mt-6 flex items-center gap-2 border-b border-border-subtle pb-5">
            <button v-for="action in decisions" :key="action.key" class="rounded-md border px-3 py-2 text-xs transition-colors" :class="activeCandidate.decision === action.key ? action.activeClass : 'border-border-subtle text-text-secondary hover:bg-elevated'" @click="setDecision(action.key)">{{ action.label }}</button>
          </div>

          <div v-if="activeCandidate.decision === 'merge'" class="mt-5 rounded-md border border-cyan-500/25 bg-cyan-500/5 px-4 py-3">
            <label class="block text-xs text-text-secondary">合并到项目资产库
              <select class="review-input mt-2" :value="activeCandidate.suggestedAssetId || ''" @change="patch({ suggestedAssetId: ($event.target as HTMLSelectElement).value || undefined })">
                <option value="" disabled>选择已有资产</option>
                <option v-for="asset in sameTypeAssets" :key="asset.id" :value="asset.id">{{ asset.name }}</option>
              </select>
            </label>
          </div>
          <div v-if="activeCandidate.decision === 'pending'" class="mt-5 rounded-md border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">该项会保留在本次结果中，暂不会写入项目资产库。</div>

          <div v-if="activeCandidate.decision !== 'ignore'" class="mt-6 space-y-5">
            <label class="block text-xs text-text-secondary">资产名称
              <input class="review-input mt-2" :value="activeCandidate.name" @input="patch({ name: ($event.target as HTMLInputElement).value })" />
            </label>
            <label class="block text-xs text-text-secondary">别名
              <input class="review-input mt-2" :value="activeCandidate.aliases.join('、')" placeholder="多个别名用顿号或逗号分隔" @input="patch({ aliases: splitAliases(($event.target as HTMLInputElement).value) })" />
            </label>
            <label class="block text-xs text-text-secondary">资产描述
              <textarea class="review-input mt-2 min-h-24 resize-y leading-6" :value="activeCandidate.description" @input="patch({ description: ($event.target as HTMLTextAreaElement).value })" />
            </label>

            <div class="border-t border-border-subtle pt-5">
              <div class="flex items-center justify-between"><p class="text-sm font-medium text-text-primary">视觉版本</p><button v-if="!activeCandidate.visualVersion" class="text-xs text-cyan-400 hover:text-cyan-300" @click="addVisualVersion">添加版本</button></div>
              <template v-if="activeCandidate.visualVersion">
                <label class="mt-4 block text-xs text-text-secondary">版本名称
                  <input class="review-input mt-2" :value="activeCandidate.visualVersion.name" placeholder="例如：黑色校服" @input="patchVisual('name', ($event.target as HTMLInputElement).value)" />
                </label>
                <label class="mt-4 block text-xs text-text-secondary">视觉描述
                  <textarea class="review-input mt-2 min-h-20 resize-y leading-6" :value="activeCandidate.visualVersion.description" @input="patchVisual('description', ($event.target as HTMLTextAreaElement).value)" />
                </label>
                <label class="mt-4 block text-xs text-text-secondary">资产绘画提示词
                  <textarea class="review-input mt-2 min-h-24 resize-y leading-6" :value="activeCandidate.visualVersion.imagePrompt" placeholder="原文信息不足时可暂时留空" @input="patchVisual('imagePrompt', ($event.target as HTMLTextAreaElement).value)" />
                </label>
              </template>
              <p v-else class="mt-3 text-xs text-text-muted">本章未提供足够的视觉变化信息。</p>
            </div>

            <div v-if="activeCandidate.evidence.length" class="border-t border-border-subtle pt-5"><p class="text-sm font-medium text-text-primary">原文依据</p><p v-for="evidence in activeCandidate.evidence" :key="evidence" class="mt-2 border-l-2 border-border-default pl-3 text-xs leading-5 text-text-secondary">{{ evidence }}</p></div>
          </div>
        </div>
      </div>
      <div v-else class="flex flex-1 items-center justify-center text-sm text-text-muted">本次没有识别到可审核的资产</div>
    </div>

    <footer class="flex shrink-0 items-center justify-between border-t border-border-subtle bg-surface px-6 py-3">
      <p class="text-xs text-text-muted">{{ unresolvedCount ? `还有 ${unresolvedCount} 项待确认，不会写入资产库` : '确认后会更新项目级资产库' }}</p>
      <div class="flex gap-3"><button class="px-3 py-2 text-xs text-text-secondary hover:text-text-primary" @click="emit('back')">稍后处理</button><button class="primary-button h-9 px-4 text-xs" :disabled="hasInvalidMerge" @click="emit('confirm')">确认写入资产库</button></div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronRight, MapPin, Package, UserRound } from 'lucide-vue-next'
import type { AssetExtractionCandidateDecision, LongProjectAsset, LongProjectAssetExtractionCandidate, LongProjectAssetType } from '@comic/types'

const props = defineProps<{ chapterName: string; sourceWordCount: number; candidates: LongProjectAssetExtractionCandidate[]; assets: LongProjectAsset[] }>()
const emit = defineEmits<{ (event: 'update', candidate: LongProjectAssetExtractionCandidate): void; (event: 'back'): void; (event: 'confirm'): void }>()
const selectedId = ref<string | null>(props.candidates[0]?.id ?? null)
watch(() => props.candidates, (candidates) => { if (!candidates.some((candidate) => candidate.id === selectedId.value)) selectedId.value = candidates[0]?.id ?? null }, { deep: true })
const activeCandidate = computed(() => props.candidates.find((candidate) => candidate.id === selectedId.value) ?? null)
const groups = computed(() => [
  { type: 'character' as const, label: '人物', icon: UserRound, items: props.candidates.filter((candidate) => candidate.type === 'character') },
  { type: 'scene' as const, label: '场景', icon: MapPin, items: props.candidates.filter((candidate) => candidate.type === 'scene') },
  { type: 'prop' as const, label: '道具', icon: Package, items: props.candidates.filter((candidate) => candidate.type === 'prop') },
])
const sameTypeAssets = computed(() => activeCandidate.value ? props.assets.filter((asset) => asset.type === activeCandidate.value?.type) : [])
const handledCount = computed(() => props.candidates.filter((candidate) => candidate.decision !== 'pending').length)
const unresolvedCount = computed(() => props.candidates.filter((candidate) => candidate.decision === 'pending').length)
const hasInvalidMerge = computed(() => props.candidates.some((candidate) => candidate.decision === 'merge' && !candidate.suggestedAssetId))
const decisions: Array<{ key: AssetExtractionCandidateDecision; label: string; activeClass: string }> = [
  { key: 'create', label: '新建项目资产', activeClass: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' },
  { key: 'merge', label: '合并已有资产', activeClass: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' },
  { key: 'pending', label: '待确认', activeClass: 'border-amber-500/50 bg-amber-500/10 text-amber-200' },
]
function typeLabel(type: LongProjectAssetType) { return ({ character: '人物', scene: '场景', prop: '道具' })[type] }
function decisionColor(decision: AssetExtractionCandidateDecision) { return ({ create: 'bg-cyan-400', merge: 'bg-violet-400', pending: 'bg-amber-400', ignore: 'bg-slate-500' })[decision] }
function patch(change: Partial<LongProjectAssetExtractionCandidate>) { if (activeCandidate.value) emit('update', { ...activeCandidate.value, ...change }) }
function setDecision(decision: AssetExtractionCandidateDecision) { patch({ decision }) }
function splitAliases(value: string) { return value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean) }
function addVisualVersion() { patch({ visualVersion: { name: '', description: '', imagePrompt: '' } }) }
function patchVisual(key: 'name' | 'description' | 'imagePrompt', value: string) { if (activeCandidate.value?.visualVersion) patch({ visualVersion: { ...activeCandidate.value.visualVersion, [key]: value } }) }
</script>

<style scoped>
.review-input { width: 100%; border: 1px solid var(--border-subtle); border-radius: 0.375rem; background: var(--bg-app); padding: 0.55rem 0.7rem; color: var(--text-primary); font-size: 0.8125rem; outline: none; }
.review-input:focus { border-color: rgba(34, 211, 238, 0.55); }
.primary-button { display: inline-flex; align-items: center; justify-content: center; border-radius: 0.375rem; background: #06b6d4; color: #020617; font-weight: 500; }
.primary-button:disabled { cursor: not-allowed; opacity: 0.4; }
</style>
