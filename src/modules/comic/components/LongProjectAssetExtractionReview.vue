<template>
  <section class="flex min-h-0 flex-1 flex-col bg-app-bg">
    <div class="flex min-h-0 flex-1">
      <!-- 左：候选资产列表（按类型分组，名称后跟归属标记「并入 / 新建」） -->
      <aside class="custom-scrollbar w-60 shrink-0 overflow-y-auto border-r border-border-subtle bg-surface p-3">
        <div class="mb-3 flex items-center justify-between px-1">
          <span class="text-xs font-medium text-text-secondary">本次识别</span>
          <span class="text-[11px] text-text-muted">{{ candidates.length }} 项</span>
        </div>
        <template v-for="group in groups" :key="group.type">
          <p v-if="group.items.length" class="mb-1 mt-3 px-2 text-[11px] font-medium text-text-muted">{{ group.label }} {{ group.items.length }}</p>
          <button
            v-for="candidate in group.items"
            :key="candidate.id"
            class="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-text-secondary hover:bg-elevated"
            :class="selectedId === candidate.id ? 'bg-cyan-500/12 text-text-primary' : ''"
            :title="decisionTitle(candidate)"
            @click="selectCandidate(candidate.id)"
          >
            <component :is="group.icon" :size="15" class="shrink-0 text-text-muted" />
            <span class="min-w-0 flex-1 truncate">{{ candidate.name }}</span>
            <span class="shrink-0 rounded border px-1 py-px text-[10px] leading-4" :class="decisionChipClass(candidate)">{{ decisionChipLabel(candidate) }}</span>
          </button>
        </template>
      </aside>

      <template v-if="activeCandidate">
        <!-- 中 3/4：资产信息（Markdown 预览 / 编辑，视觉状态改动自动同步右侧） -->
        <div class="flex min-w-0 flex-[3] flex-col overflow-hidden">
          <div class="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-surface px-4">
            <div class="flex min-w-0 items-center gap-2">
              <span class="min-w-0 truncate text-[11px] text-text-muted">{{ editing ? 'Markdown 编辑 · 视觉状态改动自动同步右侧标签' : '资产信息' }}</span>
              <span class="shrink-0 rounded border px-1.5 py-px text-[11px]" :class="activeDecisionChipClass">{{ activeDecisionText }}</span>
            </div>
            <div class="flex shrink-0 items-center gap-0.5">
              <button class="mode-button" :class="!editing ? 'mode-button-active' : ''" @click="editing = false">预览</button>
              <button class="mode-button" :class="editing ? 'mode-button-active' : ''" @click="editing = true">编辑</button>
            </div>
          </div>
          <textarea
            v-if="editing"
            class="content-editor custom-scrollbar min-h-0 flex-1"
            :value="activeContent"
            placeholder="输入该资产的完整 Markdown 信息...&#10;视觉状态以「视觉状态」小节列出，每行：状态名｜描述（可含标签）"
            @input="patchContent(($event.target as HTMLTextAreaElement).value)"
          />
          <article v-else class="markdown-preview custom-scrollbar min-h-0 flex-1" v-html="previewHtml" />
        </div>

        <!-- 右 1/4：视觉状态标签（只读展示，增删改走中列 Markdown；tag 颜色=资产类型色） -->
        <div class="flex min-w-[170px] flex-1 flex-col overflow-hidden border-l border-border-subtle bg-surface">
          <div class="flex h-9 shrink-0 items-center justify-between border-b border-border-subtle px-4">
            <span class="text-xs font-medium text-text-secondary">视觉状态</span>
            <span class="text-[11px] text-text-muted">{{ states.length }} 个<template v-if="matchedStateCount"> · {{ matchedStateCount }} 归属</template></span>
          </div>
          <div class="custom-scrollbar flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-y-auto p-3">
            <span
              v-for="state in states"
              :key="state.id"
              class="state-tag"
              :class="[stateTagClass, state.suggestedVariantId ? 'state-tag-matched' : '']"
              :title="stateTitle(state)"
            >
              <span v-if="state.suggestedVariantId" class="state-tag-dot" />
              {{ state.name }}
            </span>
            <p v-if="!states.length" class="w-full px-1 py-4 text-center text-[11px] leading-5 text-text-muted">无视觉状态<br>确认时只保存资产信息</p>
          </div>
        </div>
      </template>

      <div v-else class="flex flex-1 items-center justify-center text-sm text-text-muted">本次没有识别到可审核的资产</div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 资产提取结果审核页（信息 tab 主体）：
 * 左列候选列表 + 中列（3/4）资产信息 Markdown 预览/编辑 + 右列（1/4）视觉状态标签。
 * 视觉状态的增删改一律通过中列 Markdown 完成——patchContent 解析后自动同步结构化
 * 字段并做归属匹配（matchVariantForState），右侧标签为只读展示（紫点=归属到已有状态）。
 * 左列候选显示「并入 XX / 新建资产」归属标签，右侧 header 显示归属数量，让确认时的合并/覆盖不再是盲选。
 * 确认动作由页面顶栏「确认本章资产」承载（可选择合并或覆盖）。
 */
import { computed, ref, watch } from 'vue'
import { MapPin, Package, UserRound } from 'lucide-vue-next'
import { getCandidateStates, matchVariantForState, parseCandidateContent } from '@comic/services/assetExtractionService'
import { renderMarkdown } from '@comic/utils/markdown'
import type { LongProjectAsset, LongProjectAssetExtractionCandidate, LongProjectExtractedState } from '@comic/types'

const props = defineProps<{ candidates: LongProjectAssetExtractionCandidate[]; assets: LongProjectAsset[] }>()
const emit = defineEmits<{ (event: 'update', candidate: LongProjectAssetExtractionCandidate): void }>()

const selectedId = ref<string | null>(props.candidates[0]?.id ?? null)
const editing = ref(false)
watch(() => props.candidates, (items) => { if (!items.some((item) => item.id === selectedId.value)) selectedId.value = items[0]?.id ?? null }, { deep: true })
watch(selectedId, () => { editing.value = false })

const activeCandidate = computed(() => props.candidates.find((item) => item.id === selectedId.value) ?? null)
const groups = computed(() => [{ type: 'character' as const, label: '人物', icon: UserRound, items: props.candidates.filter((item) => item.type === 'character') }, { type: 'scene' as const, label: '场景', icon: MapPin, items: props.candidates.filter((item) => item.type === 'scene') }, { type: 'prop' as const, label: '道具', icon: Package, items: props.candidates.filter((item) => item.type === 'prop') }])
/** 当前资产类型色调（人物青 / 场景绿 / 道具琥珀），驱动右侧 tag 与预览视觉状态高亮。 */
const typeTone = computed<'character' | 'scene' | 'prop'>(() => activeCandidate.value?.type ?? 'character')
/** 视觉状态 tag 配色：与图片 tab 资产卡一致（人物青 / 场景绿 / 道具琥珀）。 */
const stateTagClass = computed(() => `state-tag-${typeTone.value}`)
/** 候选的归属建议目标资产（左列标签与中列归属说明共用）。 */
function suggestedAssetOf(candidate: LongProjectAssetExtractionCandidate | null | undefined): LongProjectAsset | null {
  if (!candidate?.suggestedAssetId) return null
  return props.assets.find((item) => item.id === candidate.suggestedAssetId) ?? null
}
const suggestedAsset = computed(() => suggestedAssetOf(activeCandidate.value))
/** 左列候选名称后的归属标记（只两个字，详情放 title 与中列）。 */
function decisionChipLabel(candidate: LongProjectAssetExtractionCandidate): string {
  return candidate.suggestedAssetId ? '并入' : '新建'
}
function decisionChipClass(candidate: LongProjectAssetExtractionCandidate | null | undefined): string {
  return candidate?.suggestedAssetId
    ? 'border-violet-500/40 text-violet-600 dark:text-violet-300'
    : 'border-border-subtle text-text-muted'
}
/** 左列候选的悬停说明：写清并入哪个资产，避免合并 / 覆盖变成盲选。 */
function decisionTitle(candidate: LongProjectAssetExtractionCandidate): string {
  const target = suggestedAssetOf(candidate)
  return target ? `${candidate.name}｜并入已有资产「${target.name}」` : `${candidate.name}｜新建资产`
}
/** 中列头部的归属说明：完整文案，补足左列短标记的信息。 */
const activeDecisionText = computed(() => {
  const target = suggestedAssetOf(activeCandidate.value)
  return target ? `并入已有资产「${target.name}」` : '新建资产'
})
const activeDecisionChipClass = computed(() => decisionChipClass(activeCandidate.value))
const states = computed<LongProjectExtractedState[]>(() => activeCandidate.value ? getCandidateStates(activeCandidate.value) : [])
/** 归属到已有资产的视觉状态数量（右列 header 提示）。 */
const matchedStateCount = computed(() => states.value.filter((state) => Boolean(state.suggestedVariantId)).length)
const activeContent = computed(() => activeCandidate.value?.content || '')
/** 预览 HTML：给「视觉状态：xxx」标题/列表项注入当前类型色高亮类。 */
const previewHtml = computed(() => {
  const html = renderMarkdown(activeContent.value, '暂无资产信息')
  const cls = `preview-state-${typeTone.value}`
  return html
    .replace(/<h3>((?:视觉状态|视觉版本)[：:])/g, `<h3 class="${cls}">$1`)
    .replace(/<li>((?:视觉状态|视觉版本)[：:])/g, `<li class="${cls}">$1`)
})

function selectCandidate(id: string) { selectedId.value = id }

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

/** 视觉状态标签悬停文案：名称 + 描述 + 归属（匹配到已有状态时）。 */
function stateTitle(state: LongProjectExtractedState): string {
  const parts = [state.name]
  if (state.description) parts.push(state.description)
  if (state.suggestedVariantId && suggestedAsset.value) {
    const variantName = suggestedAsset.value.variants.find((variant) => variant.id === state.suggestedVariantId)?.name
    if (variantName) parts.push(`归属到已有状态「${variantName}」`)
  }
  return parts.join('\n')
}
</script>

<style scoped>
.content-editor{display:block;width:100%;border:0;background:var(--bg-app);padding:1rem 1.25rem;color:var(--text-primary);font-size:.8125rem;line-height:1.8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;outline:none;resize:none}
.markdown-preview{padding:1rem 1.25rem;color:var(--text-primary);font-size:.8125rem;line-height:1.8}
.markdown-preview :deep(h1),.markdown-preview :deep(h2),.markdown-preview :deep(h3){margin:1rem 0 .45rem;font-weight:600}
.markdown-preview :deep(h3){color:#67e8f9}
/* 视觉状态标题/列表项按资产类型高亮（人物青 / 场景绿 / 道具琥珀） */
.markdown-preview :deep(.preview-state-character){color:#22d3ee}
.markdown-preview :deep(.preview-state-scene){color:#34d399}
.markdown-preview :deep(.preview-state-prop){color:#fbbf24}
.markdown-preview :deep(p){margin:.35rem 0}
.markdown-preview :deep(ul){margin:.4rem 0;padding-left:1.25rem;list-style:disc}
.markdown-preview :deep(li){margin:.2rem 0}
.mode-button{border-radius:.3rem;padding:.25rem .5rem;font-size:.7rem;color:var(--text-muted)}
.mode-button:hover,.mode-button-active{color:#22d3ee;background:rgba(34,211,238,.1)}
.state-tag{display:inline-flex;align-items:center;gap:.3rem;border:1px solid var(--border-subtle);border-radius:999px;background:var(--bg-app);padding:.3rem .65rem;font-size:.72rem;color:var(--text-secondary)}
/* 归属到已有视觉状态：虚点标记，悬停可见「归属到已有状态 X」 */
.state-tag-matched{border-style:dashed}
.state-tag-dot{width:.3rem;height:.3rem;flex-shrink:0;border-radius:999px;background:#a78bfa}
.state-tag-character{border-color:rgba(34,211,238,.45);color:#22d3ee}
.state-tag-scene{border-color:rgba(52,211,153,.45);color:#34d399}
.state-tag-prop{border-color:rgba(251,191,36,.45);color:#fbbf24}
</style>
