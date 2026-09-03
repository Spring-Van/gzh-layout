<template>
  <section class="flex min-h-0 flex-1 flex-col bg-app-bg">
    <header class="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-6 py-3"><div><div class="flex items-center gap-2 text-xs text-text-muted"><button @click="emit('back')">原文</button><ChevronRight :size="13" /><span>资产提取结果</span></div><p class="mt-1 text-sm font-semibold text-text-primary">{{ chapterName }}</p></div><p class="text-xs text-text-muted">基于 {{ sourceWordCount }} 字原文 · {{ candidates.length }} 项候选资产</p></header>
    <div class="flex min-h-0 flex-1">
      <aside class="custom-scrollbar w-60 shrink-0 overflow-y-auto border-r border-border-subtle bg-surface p-3"><div class="mb-3 flex items-center justify-between px-1"><span class="text-xs font-medium text-text-secondary">本次识别</span><span class="text-[11px] text-text-muted">{{ candidates.length }}/{{ candidates.length }}</span></div><template v-for="group in groups" :key="group.type"><p v-if="group.items.length" class="mb-1 mt-3 px-2 text-[11px] font-medium text-text-muted">{{ group.label }} {{ group.items.length }}</p><button v-for="candidate in group.items" :key="candidate.id" class="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-text-secondary hover:bg-elevated" :class="selectedId === candidate.id ? 'bg-cyan-500/12 text-text-primary' : ''" @click="selectCandidate(candidate.id)"><component :is="group.icon" :size="15" class="shrink-0 text-text-muted" /><span class="min-w-0 flex-1 truncate">{{ candidate.name }}</span><span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="decisionColor(candidate.decision)" /></button></template></aside>
      <div v-if="activeCandidate" class="custom-scrollbar min-w-0 flex-1 overflow-y-auto"><div class="mx-auto max-w-3xl px-8 py-7">
        <div class="flex items-start justify-between gap-5"><div><p class="text-xs text-cyan-400">{{ typeLabel(activeCandidate.type) }} · {{ activeCandidate.importance === 'major' ? '主要资产' : '次要资产' }}</p><h2 class="mt-1 text-xl font-semibold text-text-primary">{{ activeCandidate.name }}</h2><p v-if="suggestedAsset" class="mt-1 text-xs text-violet-400">匹配到已有资产：{{ suggestedAsset.name }}</p></div><div class="flex items-center gap-2"><span class="text-xs text-text-muted">本章资产</span><button class="mode-button" :class="!editing ? 'mode-button-active' : ''" @click="editing = false">预览</button><button class="mode-button" :class="editing ? 'mode-button-active' : ''" @click="editing = true">编辑</button></div></div>
        <div class="mt-5 rounded-md border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-text-secondary">这些内容只属于当前章节。确认后会保存到章节资产，不会自动进入项目公共资产库。</div>
        <div class="mt-5 overflow-hidden rounded-lg border border-border-subtle bg-surface"><div class="flex items-center justify-between border-b border-border-subtle px-4 py-3"><p class="text-sm font-medium text-text-primary">资产信息</p><span class="text-[11px] text-text-muted">{{ editing ? 'Markdown 编辑' : '预览' }}</span></div><textarea v-if="editing" class="content-editor custom-scrollbar" :value="activeContent" @input="patchContent(($event.target as HTMLTextAreaElement).value)" placeholder="输入该资产的完整 Markdown 信息..." /><article v-else class="markdown-preview custom-scrollbar" v-html="previewHtml" /></div>
        <div class="mt-5 overflow-hidden rounded-lg border border-border-subtle bg-surface"><div class="flex items-center justify-between border-b border-border-subtle px-4 py-3"><div class="flex items-center gap-2"><p class="text-sm font-medium text-text-primary">视觉状态</p><span class="text-[11px] text-text-muted">{{ states.length }} 个</span></div><button class="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300" @click="openStateModal(null)"><Plus :size="12" />添加状态</button></div>
          <div v-if="states.length" class="divide-y divide-border-subtle">
            <div v-for="(state, index) in states" :key="state.id" class="px-4 py-3">
              <div class="flex items-start gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2"><span class="truncate text-sm font-semibold text-text-primary">{{ state.name }}</span><span v-if="state.matchSource === 'model' && state.suggestedVariantId" class="shrink-0 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-400">模型匹配</span></div>
                  <p class="mt-1.5 line-clamp-2 text-xs leading-5 text-text-secondary">{{ state.description || '暂无视觉描述' }}</p>
                  <p v-if="state.tags?.length" class="mt-1 text-[10px] text-text-muted">{{ state.tags.join(' · ') }}</p>
                  <p class="mt-1.5 text-[11px] text-text-muted">归属：{{ attributionLabel(state) }}</p>
                </div>
                <div class="flex shrink-0 items-center gap-1">
                  <button class="rounded p-1 text-text-muted transition-colors hover:bg-elevated hover:text-cyan-400" title="编辑状态" @click="openStateModal(index)"><Pencil :size="13" /></button>
                  <button class="rounded p-1 text-text-muted transition-colors hover:bg-elevated hover:text-red-400" title="删除状态" @click="removeState(index)"><X :size="13" /></button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="px-4 py-6 text-center text-xs text-text-muted">本资产没有视觉状态，确认时只保存资产信息。</div>
        </div>
      </div></div>
      <div v-else class="flex flex-1 items-center justify-center text-sm text-text-muted">本次没有识别到可审核的资产</div>
    </div>
    <footer class="flex shrink-0 items-center justify-between border-t border-border-subtle bg-surface px-6 py-3"><p class="text-xs text-text-muted">确认后保存为本章资产，之后可在资产页选择同步到公共资产库</p><div class="flex gap-3"><button class="px-3 py-2 text-xs text-text-secondary" @click="emit('back')">稍后处理</button><button class="primary-button h-9 px-4 text-xs" @click="emit('confirm')">确认本章资产</button></div></footer>

    <!-- 视觉状态编辑弹窗：保存后同步回写上方资产信息 Markdown -->
    <Teleport to="body">
      <div v-if="stateModalVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="closeStateModal">
        <div class="w-full max-w-lg rounded-xl border border-border-subtle bg-surface shadow-2xl shadow-black/40">
          <div class="flex items-center justify-between border-b border-border-subtle px-5 py-3"><p class="text-sm font-medium text-text-primary">{{ stateModalIndex === null ? '添加视觉状态' : '编辑视觉状态' }}</p><button class="text-text-muted transition-colors hover:text-text-primary" @click="closeStateModal"><X :size="15" /></button></div>
          <div class="custom-scrollbar max-h-[65vh] space-y-4 overflow-y-auto px-5 py-4">
            <label class="block"><span class="mb-1 block text-xs text-text-secondary">状态名称</span><input v-model="stateModalForm.name" class="modal-field" placeholder="如：少年期·布衣" /></label>
            <label class="block"><span class="mb-1 block text-xs text-text-secondary">视觉描述</span><textarea v-model="stateModalForm.description" rows="3" class="modal-field resize-y" placeholder="该状态下的稳定外观描述..." /></label>
            <label class="block"><span class="mb-1 block text-xs text-text-secondary">状态标签（顿号或逗号分隔）</span><input v-model="stateModalForm.tagsText" class="modal-field" placeholder="少年、布衣、清瘦" /></label>
            <label class="block"><span class="mb-1 block text-xs text-text-secondary">绘画提示词</span><textarea v-model="stateModalForm.imagePrompt" rows="3" class="modal-field resize-y" placeholder="用于生图的提示词..." /></label>
            <label v-if="suggestedAsset" class="block"><span class="mb-1 block text-xs text-text-secondary">归属（匹配到已有资产的视觉状态）</span>
              <select v-model="stateModalForm.variantId" class="modal-field"><option value="">新建状态</option><option v-for="variant in suggestedAsset.variants" :key="variant.id" :value="variant.id">{{ variant.name }}</option></select>
            </label>
          </div>
          <div class="flex justify-end gap-2 border-t border-border-subtle px-5 py-3">
            <button class="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary" @click="closeStateModal">取消</button>
            <button class="primary-button px-4 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40" :disabled="!stateModalForm.name.trim()" @click="saveStateModal">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ChevronRight, MapPin, Package, Pencil, Plus, UserRound, X } from 'lucide-vue-next'
import { v4 as uuidv4 } from 'uuid'
import { getCandidateStates, matchVariantForState, parseCandidateContent, serializeCandidateContent } from '@comic/services/assetExtractionService'
import { renderMarkdown } from '@comic/utils/markdown'
import type { AssetExtractionCandidateDecision, LongProjectAsset, LongProjectAssetExtractionCandidate, LongProjectAssetType, LongProjectExtractedState } from '@comic/types'
const props = defineProps<{ chapterName: string; sourceWordCount: number; candidates: LongProjectAssetExtractionCandidate[]; assets: LongProjectAsset[] }>()
const emit = defineEmits<{ (event: 'update', candidate: LongProjectAssetExtractionCandidate): void; (event: 'back'): void; (event: 'confirm'): void }>()
const selectedId = ref<string | null>(props.candidates[0]?.id ?? null); const editing = ref(false)
watch(() => props.candidates, (items) => { if (!items.some((item) => item.id === selectedId.value)) selectedId.value = items[0]?.id ?? null }, { deep: true })
watch(selectedId, () => { editing.value = false })
const activeCandidate = computed(() => props.candidates.find((item) => item.id === selectedId.value) ?? null)
const groups = computed(() => [{ type: 'character' as const, label: '人物', icon: UserRound, items: props.candidates.filter((item) => item.type === 'character') }, { type: 'scene' as const, label: '场景', icon: MapPin, items: props.candidates.filter((item) => item.type === 'scene') }, { type: 'prop' as const, label: '道具', icon: Package, items: props.candidates.filter((item) => item.type === 'prop') }])
const suggestedAsset = computed(() => activeCandidate.value?.suggestedAssetId ? props.assets.find((item) => item.id === activeCandidate.value?.suggestedAssetId) ?? null : null)
const states = computed<LongProjectExtractedState[]>(() => activeCandidate.value ? getCandidateStates(activeCandidate.value) : [])
const activeContent = computed(() => activeCandidate.value?.content || '')
const previewHtml = computed(() => renderMarkdown(activeContent.value, '暂无资产信息'))
function typeLabel(type: LongProjectAssetType) { return ({ character: '人物', scene: '场景', prop: '道具' })[type] }
function decisionColor(decision: AssetExtractionCandidateDecision) { return ({ create: 'bg-cyan-400', merge: 'bg-violet-400', pending: 'bg-amber-400', ignore: 'bg-slate-500' })[decision] }
/** 标签文本按顿号/逗号等分隔符拆分 */
function splitTags(value: string): string[] { return value.split(/[、，,;；\s]+/).map((item) => item.trim()).filter(Boolean) }
/**
 * 编辑资产信息 Markdown 后，同步下方结构化字段与视觉状态列表。
 * 同名状态保留原归属；未归属的状态尝试与匹配到的已有资产自动归属。
 */
function patchContent(value: string) {
  const candidate = activeCandidate.value
  if (!candidate) return
  const parsed = parseCandidateContent(value)
  const suggested = candidate.suggestedAssetId ? props.assets.find((item) => item.id === candidate.suggestedAssetId) : undefined
  const prevStates = new Map(getCandidateStates(candidate).map((state) => [state.name.trim(), state]))
  const states = parsed.states.map((state) => {
    const prev = prevStates.get(state.name.trim())
    if (prev?.suggestedVariantId) return { ...state, suggestedVariantId: prev.suggestedVariantId, matchSource: prev.matchSource }
    const matchedVariantId = suggested ? matchVariantForState(state, suggested) : undefined
    return matchedVariantId ? { ...state, suggestedVariantId: matchedVariantId, matchSource: 'model' as const } : state
  })
  emit('update', {
    ...candidate,
    content: value,
    aliases: parsed.aliases.length ? parsed.aliases : candidate.aliases,
    importance: parsed.importance ?? candidate.importance,
    description: parsed.description || candidate.description,
    evidence: parsed.evidence.length ? parsed.evidence : candidate.evidence,
    attributes: Object.keys(parsed.attributes).length ? parsed.attributes : candidate.attributes,
    states: value.trim() ? states : getCandidateStates(candidate),
  })
}
/** 应用新的视觉状态列表并同步回写上方资产信息 Markdown */
function applyStates(next: LongProjectExtractedState[]) {
  const candidate = activeCandidate.value
  if (!candidate) return
  emit('update', { ...candidate, states: next, content: serializeCandidateContent({ ...candidate, states: next }) })
}
/** 状态归属展示文案 */
function attributionLabel(state: LongProjectExtractedState): string {
  if (!suggestedAsset.value) return '新建状态（确认时创建）'
  const variantName = state.suggestedVariantId ? suggestedAsset.value.variants.find((variant) => variant.id === state.suggestedVariantId)?.name : undefined
  return variantName ? `归属到已有状态「${variantName}」` : '新建状态'
}
/** 删除视觉状态并同步资产信息 Markdown */
function removeState(index: number) { applyStates(states.value.filter((_, i) => i !== index)) }
function selectCandidate(id: string) { selectedId.value = id }

// ========== 视觉状态弹窗编辑（保存后同步回写资产信息） ==========
const stateModalVisible = ref(false)
const stateModalIndex = ref<number | null>(null)
const stateModalForm = reactive({ name: '', description: '', tagsText: '', imagePrompt: '', variantId: '' })
/** 打开状态编辑弹窗；index 为 null 表示新增 */
function openStateModal(index: number | null) {
  const state = index === null ? undefined : states.value[index]
  stateModalIndex.value = index
  stateModalForm.name = state?.name ?? ''
  stateModalForm.description = state?.description ?? ''
  stateModalForm.tagsText = state?.tags?.join('、') ?? ''
  stateModalForm.imagePrompt = state?.imagePrompt ?? ''
  stateModalForm.variantId = state?.suggestedVariantId ?? ''
  stateModalVisible.value = true
}
function closeStateModal() { stateModalVisible.value = false; stateModalIndex.value = null }
/** 保存弹窗：写入视觉状态列表并回写资产信息 Markdown */
function saveStateModal() {
  const name = stateModalForm.name.trim()
  if (!name) return
  const tags = splitTags(stateModalForm.tagsText)
  const base = stateModalIndex.value === null ? undefined : states.value[stateModalIndex.value]
  const state: LongProjectExtractedState = {
    id: base?.id ?? uuidv4(), name,
    description: stateModalForm.description.trim(),
    imagePrompt: stateModalForm.imagePrompt.trim(),
    tags: tags.length ? tags : undefined,
    suggestedVariantId: stateModalForm.variantId || undefined,
    matchSource: stateModalForm.variantId ? 'model' : 'new',
  }
  applyStates(stateModalIndex.value === null ? [...states.value, state] : states.value.map((item, i) => (i === stateModalIndex.value ? state : item)))
  closeStateModal()
}
</script>
<style scoped>
.content-editor{width:100%;border:1px solid var(--border-subtle);border-radius:.375rem;background:var(--bg-app);padding:.65rem .75rem;color:var(--text-primary);font-size:.8125rem;outline:none}.content-editor:focus{border-color:rgba(34,211,238,.55)}.content-editor{min-height:28rem;resize:vertical;line-height:1.8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.markdown-preview{min-height:28rem;max-height:44rem;overflow-y:auto;padding:1rem 1.25rem;color:var(--text-primary);font-size:.8125rem;line-height:1.8}.markdown-preview :deep(h1),.markdown-preview :deep(h2),.markdown-preview :deep(h3){margin:1rem 0 .45rem;font-weight:600}.markdown-preview :deep(h3){color:#67e8f9}.markdown-preview :deep(p){margin:.35rem 0}.markdown-preview :deep(ul){margin:.4rem 0;padding-left:1.25rem;list-style:disc}.markdown-preview :deep(li){margin:.2rem 0}.mode-button{border-radius:.3rem;padding:.25rem .5rem;font-size:.7rem;color:var(--text-muted)}.mode-button:hover,.mode-button-active{color:#22d3ee;background:rgba(34,211,238,.1)}.primary-button{display:inline-flex;align-items:center;justify-content:center;border-radius:.375rem;background:#06b6d4;color:#020617;font-weight:500;transition:opacity .15s ease}.modal-field{display:block;width:100%;box-sizing:border-box;border:1px solid var(--border-subtle);border-radius:.375rem;background:var(--bg-app);padding:.5rem .65rem;font-size:.75rem;color:var(--text-primary);outline:none;line-height:1.6}.modal-field:focus{border-color:rgba(34,211,238,.55)}
</style>
