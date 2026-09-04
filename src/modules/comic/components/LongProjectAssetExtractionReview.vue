<template>
  <section class="flex min-h-0 flex-1 flex-col bg-app-bg">
    <div class="flex min-h-0 flex-1">
      <!-- 左：候选资产列表（按类型分组，决策状态点） -->
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
            @click="selectCandidate(candidate.id)"
          >
            <component :is="group.icon" :size="15" class="shrink-0 text-text-muted" />
            <span class="min-w-0 flex-1 truncate">{{ candidate.name }}</span>
            <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="typeDotClass(candidate.type)" />
          </button>
        </template>
      </aside>

      <template v-if="activeCandidate">
        <!-- 中 3/4：资产信息（Markdown 预览 / 编辑，视觉状态改动自动同步右侧） -->
        <div class="flex min-w-0 flex-[3] flex-col overflow-hidden">
          <div class="flex h-9 shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-4">
            <span class="text-[11px] text-text-muted">{{ editing ? 'Markdown 编辑 · 视觉状态改动自动同步右侧标签' : '资产信息' }}</span>
            <div class="flex items-center gap-0.5">
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
            <span class="text-[11px] text-text-muted">{{ states.length }} 个</span>
          </div>
          <div class="custom-scrollbar flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-y-auto p-3">
            <span
              v-for="state in states"
              :key="state.id"
              class="state-tag"
              :class="stateTagClass"
              :title="stateTitle(state)"
            >{{ state.name }}</span>
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
 * 确认动作由页面顶栏「确认本章资产」承载。
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
const suggestedAsset = computed(() => activeCandidate.value?.suggestedAssetId ? props.assets.find((item) => item.id === activeCandidate.value?.suggestedAssetId) ?? null : null)
const states = computed<LongProjectExtractedState[]>(() => activeCandidate.value ? getCandidateStates(activeCandidate.value) : [])
const activeContent = computed(() => activeCandidate.value?.content || '')
/** 预览 HTML：给「视觉状态：xxx」标题/列表项注入当前类型色高亮类。 */
const previewHtml = computed(() => {
  const html = renderMarkdown(activeContent.value, '暂无资产信息')
  const cls = `preview-state-${typeTone.value}`
  return html
    .replace(/<h3>((?:视觉状态|视觉版本)[：:])/g, `<h3 class="${cls}">$1`)
    .replace(/<li>((?:视觉状态|视觉版本)[：:])/g, `<li class="${cls}">$1`)
})

/** 左列表候选右侧标记点：按资产类型着色（人物青 / 场景绿 / 道具琥珀）。 */
function typeDotClass(type: LongProjectAssetExtractionCandidate['type']): string {
  return ({ character: 'bg-cyan-400', scene: 'bg-emerald-400', prop: 'bg-amber-400' })[type]
}
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
.state-tag-character{border-color:rgba(34,211,238,.45);color:#22d3ee}
.state-tag-scene{border-color:rgba(52,211,153,.45);color:#34d399}
.state-tag-prop{border-color:rgba(251,191,36,.45);color:#fbbf24}
</style>
