<template>
  <section class="flex min-h-0 flex-1 flex-col bg-app-bg">
    <div class="flex min-h-0 flex-1">
      <!-- 左：候选资产列表（按类型分组，不再渲染归属标记） -->
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
          </button>
        </template>
      </aside>

      <template v-if="activeCandidate">
        <!-- 中 3/4：资产信息（Markdown 预览 / 编辑，视觉状态改动自动同步右侧） -->
        <div class="flex min-w-0 flex-[3] flex-col overflow-hidden">
          <div class="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-surface px-4">
            <div class="flex min-w-0 items-center gap-2">
              <span class="min-w-0 truncate text-[11px] text-text-muted">{{ editing ? 'Markdown 编辑 · 视觉状态改动自动同步右侧标签' : '资产信息' }}</span>
            </div>
            <div class="flex shrink-0 items-center gap-0.5">
              <button class="mode-button" :class="!editing ? 'mode-button-active' : ''" @click="editing = false">预览</button>
              <button class="mode-button" :class="editing ? 'mode-button-active' : ''" @click="editing = true">编辑</button>
            </div>
          </div>
          <textarea
            v-if="editing"
            class="content-editor custom-scrollbar min-h-0 flex-1 overflow-y-auto"
            :value="activeContent"
            placeholder="输入该资产的完整 Markdown 信息...&#10;视觉状态以「视觉状态」小节列出，每行：状态名｜描述（可含标签）"
            @input="patchContent(($event.target as HTMLTextAreaElement).value)"
          />
          <!-- overflow-y-auto 必须显式写：custom-scrollbar 只改滚动条外观，不设置溢出行为，
               缺了它内容一多就整段被裁掉、滚不动（资产信息长时尤其明显） -->
          <article v-else class="markdown-preview custom-scrollbar min-h-0 flex-1 overflow-y-auto" v-html="previewHtml" />
        </div>

        <!-- 右 1/4：视觉状态标签（只读展示，增删改走中列 Markdown；tag 颜色=资产类型色） -->
        <div class="flex min-w-[170px] flex-1 flex-col overflow-hidden border-l border-border-subtle bg-surface">
          <div class="flex h-9 shrink-0 items-center justify-between border-b border-border-subtle px-4">
            <span class="text-xs font-medium text-text-secondary">视觉状态</span>
            <span class="text-[11px] text-text-muted">{{ states.length }} 个<template v-if="matchedStateCount"> · {{ matchedStateCount }} 沿用</template></span>
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
          <!-- 覆盖会删掉本次未出现的旧状态，且带图的也删——这条必须在审核阶段就可见，不能等到点确认 -->
          <div v-if="droppedStates.length" class="dropped-note shrink-0">
            <span class="dropped-note-dot" />
            <span class="min-w-0 flex-1 leading-4">
              <span class="block">另有 {{ droppedStates.length }} 个旧状态本次未出现</span>
              <span class="block">覆盖时删除<template v-if="droppedWithImages">，其中 {{ droppedWithImages }} 个已有参考图</template></span>
            </span>
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
 * 字段并做沿用匹配（matchVariantForState），右侧标签为只读展示（紫点=会复用已有状态，其参考图保留）。
 * 左列只列本次识别到的条目（不再渲染「沿用 / 新建」归属标记，确认只有唯一行为，归属无可操作性）；
 * 右列 header 显示沿用数量、底部提示「本次未出现的旧状态覆盖时会被删除」。
 * 确认动作由页面顶栏「确认本章资产」承载（唯一行为：本次结果为准，明细在确认弹窗里逐条列出）。
 */
import { computed, ref, watch } from 'vue'
import { MapPin, Package, UserRound } from 'lucide-vue-next'
import { getCandidateStates, matchVariantForState, parseCandidateContent } from '@comic/services/assetExtractionService'
import { selectDroppedVariants } from '@comic/services/assetExtractionConfirm'
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
/**
 * 候选命中的已有资产（视觉状态沿用判定、右列「将被删除」提示共用）。
 * 注意：不再往界面上渲染「沿用 / 新建」这类归属标记 —— 确认只有唯一行为（本次结果为准），
 * 试别归属对用户没有可操作性；真正需要看见的是右列底部「本次未出现的旧状态会被删除」。
 */
const suggestedAsset = computed(() =>
  activeCandidate.value?.suggestedAssetId
    ? props.assets.find((item) => item.id === activeCandidate.value?.suggestedAssetId) ?? null
    : null,
)
const states = computed<LongProjectExtractedState[]>(() => activeCandidate.value ? getCandidateStates(activeCandidate.value) : [])
/** 沿用了已有视觉状态的数量（右列 header 提示，紫点标签数一致）。 */
const matchedStateCount = computed(() => states.value.filter((state) => Boolean(state.suggestedVariantId)).length)
/**
 * 覆盖口径下会被删掉的旧状态（保留口径与 overrideAssetWithCandidate 一致，统一由服务层给出）。
 * 合并模式不删它们，所以文案写成条件句「覆盖时删除」，不假设用户当前选的是哪种模式。
 */
const droppedStates = computed(() => {
  const asset = suggestedAsset.value
  if (!activeCandidate.value || !asset) return []
  return selectDroppedVariants(asset, activeCandidate.value)
})
/** 被删旧状态中已有参考图 / 生成图的数量（提示里单独点出来，这些是真正会丢成果的）。 */
const droppedWithImages = computed(() => droppedStates.value.filter((variant) => Boolean(variant.referenceImageIds?.length || variant.generatedImageIds?.length)).length)
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
 * 同名状态沿用原 id；未沿用的状态尝试与匹配到的已有资产自动沿用。
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
/* 沿用已有视觉状态：虚线边 + 紫点，悬停可见「沿用已有状态 X，其参考图与分镜绑定会保留」 */
.state-tag-matched{border-style:dashed}
.state-tag-dot{width:.3rem;height:.3rem;flex-shrink:0;border-radius:999px;background:#a78bfa}
/* 覆盖将删除的旧状态提示：审核阶段就把破坏性后果摆出来，别等到点确认 */
.dropped-note{display:flex;gap:.4rem;margin:0 .75rem .75rem;border:1px solid rgba(226,75,74,.35);border-radius:.5rem;background:rgba(226,75,74,.07);padding:.45rem .55rem;font-size:.68rem;color:#a32d2d}
.dropped-note-dot{width:.3rem;height:.3rem;flex-shrink:0;margin-top:.35rem;border-radius:999px;background:#e24b4a}
html.dark .dropped-note{border-color:rgba(240,149,149,.32);background:rgba(226,75,74,.13);color:#f09595}
html.dark .dropped-note-dot{background:#f09595}
.state-tag-character{border-color:rgba(34,211,238,.45);color:#22d3ee}
.state-tag-scene{border-color:rgba(52,211,153,.45);color:#34d399}
.state-tag-prop{border-color:rgba(251,191,36,.45);color:#fbbf24}
</style>
