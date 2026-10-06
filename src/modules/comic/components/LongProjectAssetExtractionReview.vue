<template>
  <section class="flex min-h-0 flex-1 flex-col bg-app-bg">
    <div class="flex min-h-0 flex-1">
      <!-- 左：本次识别候选列表（按类型分组）；每条都能 hover 删除 -->
      <aside class="custom-scrollbar w-60 shrink-0 overflow-y-auto border-r border-border-subtle bg-surface p-3">
        <div class="mb-3 flex items-center justify-between px-1">
          <span class="text-xs font-medium text-text-secondary">本次识别</span>
          <span class="text-[11px] text-text-muted">{{ candidates.length }} 项</span>
        </div>
        <template v-for="group in groups" :key="group.type">
          <p v-if="group.items.length" class="mb-1 mt-3 px-2 text-[11px] font-medium text-text-muted">{{ group.label }} {{ group.items.length }}</p>
          <div
            v-for="candidate in group.items"
            :key="candidate.id"
            class="owned-row mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-text-secondary hover:bg-elevated"
            :class="selectedId === candidate.id ? 'bg-cyan-500/12 text-text-primary' : ''"
          >
            <button class="flex min-w-0 flex-1 items-center gap-2 text-left" @click="selectCandidate(candidate.id)">
              <component :is="group.icon" :size="15" class="shrink-0 text-text-muted" />
              <span class="min-w-0 flex-1 truncate">{{ candidate.name }}</span>
            </button>
            <!--
              删除：含义随该候选是否命中已有资产而不同 ——
              命中已有资产 = 删掉库里那条资产（含全部状态与图片，写库）；
              纯新识别 = 只把这条候选从本次结果里划掉（确认时不会建档，写库由容器负责）。
            -->
            <button
              class="owned-remove flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
              :title="deleteTitleOf(candidate.id)"
              @click.stop="requestRemove(candidate.id)"
            >
              <Trash2 :size="12" />
            </button>
          </div>
        </template>

        <!-- 手动新建资产：提取漏掉的对象在这里补录（建资产 + 默认视觉状态，归属本章） -->
        <button
          class="mt-3 flex w-full items-center gap-1.5 rounded-md border border-dashed border-border-strong px-2 py-1.5 text-[11px] text-text-muted transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
          title="手动建立一条资产并归属本章；适合补录提取时漏掉的人物、场景或道具"
          @click="requestCreateAsset"
        >
          <Plus :size="12" class="shrink-0" />
          新建资产
        </button>
      </aside>

      <template v-if="activeCandidate">
        <!-- 中 3/4：资产信息（Markdown 预览 / 编辑，视觉状态改动自动同步右侧） -->
        <div class="flex min-w-0 flex-[3] flex-col overflow-hidden">
          <div class="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-surface px-4">
            <div class="flex min-w-0 items-center gap-2">
              <span class="min-w-0 truncate text-[11px] text-text-muted">{{ editing ? 'Markdown 编辑 · 视觉状态改动自动同步右侧标签' : '资产信息' }}</span>
            </div>
            <div class="flex shrink-0 items-center gap-0.5">
              <button class="mode-button" :class="!editing ? 'mode-button-active' : ''" @click="exitEdit">预览</button>
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

    <!-- 删除确认：区分「删库里的资产」与「划掉本次候选」两种含义 -->
    <ConfirmDialog
      v-model="removeConfirmVisible"
      :title="removePlan?.kind === 'asset' ? '删除资产' : '从本次识别中移除'"
      :content="removePlan?.content ?? ''"
      :confirm-text="removePlan?.kind === 'asset' ? '确认删除' : '确认移除'"
      @confirm="confirmRemove"
    />
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
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { MapPin, Package, Plus, Trash2, UserRound } from 'lucide-vue-next'
import ConfirmDialog from '@comic/components/ConfirmDialog.vue'
import { getCandidateStates, matchVariantForState, parseCandidateContent } from '@comic/services/assetExtractionService'
import { selectDroppedVariants } from '@comic/services/assetExtractionConfirm'
import { renderMarkdown } from '@comic/utils/markdown'
import type { LongProjectAsset, LongProjectAssetExtractionCandidate, LongProjectExtractedState } from '@comic/types'

const props = defineProps<{
  candidates: LongProjectAssetExtractionCandidate[]
  assets: LongProjectAsset[]
}>()
const emit = defineEmits<{
  (event: 'update', candidate: LongProjectAssetExtractionCandidate): void
  /** 手动新建资产：弹窗与写库由容器负责（它才有章节 id 与章节引用表）。 */
  (event: 'create-asset'): void
  /** 删除整条已有资产（含全部视觉状态）：确认与写库由容器负责（需要项目级引用与分镜修复）。 */
  (event: 'delete-asset', payload: { asset: LongProjectAsset }): void
  /** 纯新识别：只把这条候选从本次结果里划掉（写库由容器负责，需要改 run.candidates）。 */
  (event: 'remove-candidate', payload: { candidateId: string }): void
}>()

const selectedId = ref<string | null>(props.candidates[0]?.id ?? null)
const editing = ref(false)
watch(() => props.candidates, (items) => { if (!items.some((item) => item.id === selectedId.value)) selectedId.value = items[0]?.id ?? null }, { deep: true })
watch(selectedId, () => { editing.value = false })

/**
 * 编辑草稿：Markdown 编辑框每次按键都会走到 `emit('update')` → 容器落库，
 * 而长篇项目单次写库要序列化整份项目（含内联图片，实测 ≈2.5s）——
 * 逐字写库会让输入直接卡死（旧实现就是如此，10 个字就是 25s 的写库队列）。
 *
 * 现在改为：按键只更新本地草稿（界面即时反映、右列标签即时同步），
 * 停止输入 500ms 后才把草稿提交落库；切换候选 / 切回预览 / 删除 / 新建 / 卸载前强制冲刷，
 * 保证任何离开编辑上下文的动作都不会丢掉最后一次输入。
 */
const draft = ref<LongProjectAssetExtractionCandidate | null>(null)
/** 最近一次已提交落库的草稿内容：多次 flush 时避免把同一份草稿重复写库。 */
let emittedContent: string | null = null
const FLUSH_DELAY = 500
let flushTimer: ReturnType<typeof setTimeout> | null = null

const activeCandidate = computed(() => {
  const fromProps = props.candidates.find((item) => item.id === selectedId.value) ?? null
  const local = draft.value
  // 草稿内容与已落库内容不一致期间以草稿为准（写库要等秒级，不能让编辑框回退成旧文本）；
  // 写库追上后内容一致，自然回到 props 的权威版本。
  if (local && local.id === selectedId.value && fromProps?.content !== local.content) return local
  return fromProps
})
const groups = computed(() => [{ type: 'character' as const, label: '人物', icon: UserRound, items: props.candidates.filter((item) => item.type === 'character') }, { type: 'scene' as const, label: '场景', icon: MapPin, items: props.candidates.filter((item) => item.type === 'scene') }, { type: 'prop' as const, label: '道具', icon: Package, items: props.candidates.filter((item) => item.type === 'prop') }])
/** 该候选命中的**已有**资产（有则可直接删库里的资产，无则只是从本次结果里划掉）。 */
function assetOfCandidate(candidateId: string): LongProjectAsset | null {
  const candidate = props.candidates.find((item) => item.id === candidateId)
  if (!candidate?.suggestedAssetId) return null
  return props.assets.find((item) => item.id === candidate.suggestedAssetId) ?? null
}

/**
 * 删除按钮的两种含义（同一枚图标，标题与后续动作不同）：
 * - 命中已有资产 → 删除库里那条资产（连同全部视觉状态与图片）；
 * - 纯新识别 → 只把这条候选从本次识别结果里划掉，确认时不会为它建档。
 */
function deleteTitleOf(candidateId: string): string {
  return assetOfCandidate(candidateId)
    ? '删除资产（连同全部视觉状态与图片）；被分镜引用时会先提示影响面'
    : '从本次识别中移除（确认时不会为它建立资产）'
}

const removeConfirmVisible = ref(false)
const removePlan = ref<{ kind: 'asset' | 'candidate'; asset?: LongProjectAsset; candidateId: string; content: string } | null>(null)

/** 点删除：先把编辑中的草稿落库，再弹确认（两种含义文案不同），确认后才真正执行。 */
function requestRemove(candidateId: string) {
  flushDraft()
  const candidate = props.candidates.find((item) => item.id === candidateId)
  if (!candidate) return
  const asset = assetOfCandidate(candidateId)
  if (asset) {
    removePlan.value = {
      kind: 'asset', asset, candidateId,
      content: `将删除已有资产「${asset.name}」（连同 ${asset.variants.length} 个视觉状态与全部图片）。此操作不可撤销，是否确认？`,
    }
  } else {
    removePlan.value = {
      kind: 'candidate', candidateId,
      content: `将从本次识别结果中移除「${candidate.name}」。该对象尚未入库，移除后确认时不会为它建立资产；重新提取可以恢复。是否确认？`,
    }
  }
  removeConfirmVisible.value = true
}

function confirmRemove() {
  const plan = removePlan.value
  if (!plan) return
  if (plan.kind === 'asset' && plan.asset) emit('delete-asset', { asset: plan.asset })
  else emit('remove-candidate', { candidateId: plan.candidateId })
  removePlan.value = null
}
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

function selectCandidate(id: string) {
  flushDraft()
  selectedId.value = id
}

/**
 * 立即把草稿提交落库（切换候选 / 退出编辑 / 删除 / 新建 / 卸载前调用）。
 * **不清空草稿**：写库是秒级的，清掉会让编辑框在这段时间回退成库里的旧文本。
 * 草稿在 props 追上后自动失效（activeCandidate 回落到 props）。
 */
function flushDraft() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
  const pending = draft.value
  if (!pending || pending.content === emittedContent) return
  emittedContent = pending.content
  emit('update', pending)
}

/**
 * 编辑资产信息 Markdown：只更新本地草稿 + 防抖提交（见 draft 注释）。
 * 同名状态沿用原 id；未沿用的状态尝试与匹配到的已有资产自动沿用。
 */
function patchContent(value: string) {
  const candidate = activeCandidate.value
  if (!candidate) return
  // 换了候选 → 上一份草稿的提交记录失效，否则内容恰好相同会被误判为「已提交」
  if (draft.value?.id !== candidate.id) emittedContent = null
  const parsed = parseCandidateContent(value)
  const suggested = candidate.suggestedAssetId ? props.assets.find((item) => item.id === candidate.suggestedAssetId) : undefined
  const prevStates = new Map(getCandidateStates(candidate).map((state) => [state.name.trim(), state]))
  const states = parsed.states.map((state) => {
    const prev = prevStates.get(state.name.trim())
    if (prev?.suggestedVariantId) return { ...state, suggestedVariantId: prev.suggestedVariantId, matchSource: prev.matchSource }
    const matchedVariantId = suggested ? matchVariantForState(state, suggested) : undefined
    return matchedVariantId ? { ...state, suggestedVariantId: matchedVariantId, matchSource: 'model' as const } : state
  })
  draft.value = {
    ...candidate,
    content: value,
    aliases: parsed.aliases.length ? parsed.aliases : candidate.aliases,
    importance: parsed.importance ?? candidate.importance,
    description: parsed.description || candidate.description,
    evidence: parsed.evidence.length ? parsed.evidence : candidate.evidence,
    attributes: Object.keys(parsed.attributes).length ? parsed.attributes : candidate.attributes,
    states: value.trim() ? states : getCandidateStates(candidate),
  }
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => { flushTimer = null; flushDraft() }, FLUSH_DELAY)
}

/** 切回只读预览：先把草稿落库，右列标签与预览据此刷新。 */
function exitEdit() {
  flushDraft()
  editing.value = false
}

/** 手动新建资产：先落库当前编辑，避免切走时丢掉最后一段输入。 */
function requestCreateAsset() {
  flushDraft()
  emit('create-asset')
}

// 任何离开编辑上下文的动作都要先把草稿落库，避免丢掉最后一次输入
onBeforeUnmount(flushDraft)

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
/* 「本章已有」行的删除图标：默认隐藏，鼠标移到该行才出现。
   不用 Tailwind 的 group-hover —— 本项目 tailwind.config.js 没有 safelist，
   `group` 类在构建时会被 purge 掉，group-hover: 就永远不生效（现象是悬停不显示按钮）。 */
.owned-remove{opacity:0}
.owned-row:hover .owned-remove,
.owned-remove:focus-visible{opacity:1}
</style>
