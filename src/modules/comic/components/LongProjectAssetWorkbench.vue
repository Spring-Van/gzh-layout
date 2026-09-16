<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- 主体：左列表 + 右详情 -->
    <div class="flex min-h-0 flex-1">
      <aside class="custom-scrollbar w-56 shrink-0 overflow-y-auto border-r border-border-subtle p-2">
        <div class="flex items-center justify-between px-2 pb-1.5 pt-1">
          <p class="text-[11px] text-text-muted">资产 · {{ visibleAssets.length }}/{{ workAssets.length }}</p>
          <label class="flex cursor-pointer items-center gap-1 text-[11px] text-text-secondary" title="只看还没有生成图的资产">
            <input v-model="filterMissing" type="checkbox" class="h-3 w-3 accent-cyan-400" />
            缺图
          </label>
        </div>
        <template v-for="(group, groupIndex) in visibleGroups" :key="group.type">
          <p
            v-if="group.items.length"
            class="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-medium text-text-muted"
            :class="groupIndex === 0 ? 'mt-0.5' : 'mt-3'"
          >
            <component :is="group.icon" :size="12" class="shrink-0" />
            {{ group.label }}
            <span>{{ group.items.length }}</span>
          </p>
          <button
            v-for="item in group.items"
            :key="item.asset.id"
            class="mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors"
            :class="selectedAssetId === item.asset.id ? 'bg-cyan-500/10 text-cyan-400' : 'text-text-secondary hover:bg-app-bg'"
            @click="selectedAssetId = item.asset.id"
          >
            <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="item.missing ? 'bg-amber-400' : 'bg-emerald-400'" :title="item.missing ? '缺参考图' : '参考图齐全'" />
            <span class="min-w-0 flex-1 truncate">{{ item.asset.name }}</span>
            <span class="shrink-0 text-[11px] text-text-muted">{{ item.asset.variants.length }}</span>
          </button>
        </template>
        <p v-if="!visibleAssets.length" class="px-2 py-4 text-xs text-text-muted">{{ filterMissing ? '全部资产都已有参考图' : '本章暂无资产' }}</p>
      </aside>

      <div v-if="selectedItem" class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <!-- 资产头：类型图标 + 名称 + 状态数 -->
        <div class="flex shrink-0 items-center gap-2 border-b border-border-subtle px-4 py-2.5">
          <component :is="typeIcon(selectedItem.asset.type)" :size="16" class="shrink-0 text-text-muted" />
          <h3 class="min-w-0 truncate text-sm font-medium text-text-primary">{{ selectedItem.asset.name }}</h3>
          <span class="shrink-0 text-xs text-text-muted">{{ selectedItem.asset.variants.length }} 个视觉状态</span>
        </div>

        <!-- 视觉状态 tab：多状态时 tab 切换（不上下滚动）；状态点 = 是否已有生成图 -->
        <div v-if="selectedItem.asset.variants.length > 1" class="custom-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border-subtle px-4 py-2">
          <button
            v-for="variant in selectedItem.asset.variants"
            :key="variant.id"
            class="flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs transition-colors"
            :class="selectedVariant?.id === variant.id ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-muted hover:bg-app-bg hover:text-text-secondary'"
            @click="selectedVariantId = variant.id"
          >
            <LoaderCircle v-if="promptBusyIds.has(variant.id) || genBusyIds.has(variant.id)" :size="12" class="shrink-0 animate-spin text-cyan-400" />
            <span
              v-else
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              :class="(variant.generatedImageIds ?? []).length ? 'bg-emerald-400' : 'bg-amber-400'"
              :title="(variant.generatedImageIds ?? []).length ? '已有生成图' : '缺生成图'"
            />
            <span class="max-w-40 truncate">{{ variant.name }}</span>
          </button>
        </div>

        <!-- 当前视觉状态卡片（单卡片展示，随 tab 切换） -->
        <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <AssetVariantCard
            v-if="selectedVariant"
            :variant="selectedVariant"
            :prompt-busy="promptBusyIds.has(selectedVariant.id)"
            :gen-busy="genBusyIds.has(selectedVariant.id)"
            @update:prompt="(value) => updatePrompt(selectedItem!.asset, selectedVariant!, value)"
            @rewrite-prompt="(v) => openRewriteModal(selectedItem!.asset, v)"
            @generate="(v) => generateImage(selectedItem!.asset, v)"
            @remove-gen-image="(payload) => removeGeneratedImage(selectedItem!.asset, payload)"
            @remove-image="(payload) => removeImage(selectedItem!.asset, payload)"
            @add-image="(payload) => addImage(selectedItem!.asset, payload)"
            @pick-images="(v) => openAssetPicker(selectedItem!.asset, v)"
            @preview="(payload) => openPreview(payload)"
          />
        </div>
      </div>
      <div v-else class="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
        <Boxes :size="26" class="mb-3 text-text-muted" />
        <p class="text-sm text-text-secondary">选择左侧资产查看视觉状态</p>
      </div>
    </div>

    <!-- 批量提示词弹窗（配置 + 提示词区 + 进度条都在同一弹窗内） -->
    <AssetPromptGenerateModal
      ref="promptModalRef"
      v-model="promptModalVisible"
      :llm-models="llmModels"
      :templates="assetPromptTemplates"
      :default-model-id="assetGenConfig?.promptModelId"
      :default-template-id="assetGenConfig?.promptTemplateId"
      :target-count="promptTargetCount"
      :missing-count="promptTargetCount"
      :total-count="totalVariantCount"
      allow-scope
      allow-send-mode
      :busy="promptBatchBusy"
      :build-prompt="buildPromptPreview"
      :build-items="buildPromptItems"
      @confirm="runBatchPrompts"
      @retry="retryFailedPrompts"
      @save="savePromptResults"
    />

    <!-- 单条提示词确认弹窗 -->
    <AssetPromptGenerateModal
      v-model="rewriteModalVisible"
      :llm-models="llmModels"
      :templates="assetPromptTemplates"
      :default-model-id="assetGenConfig?.promptModelId"
      :default-template-id="assetGenConfig?.promptTemplateId"
      :target-count="1"
      :busy="rewriteBusy"
      :build-prompt="buildRewritePreview"
      @confirm="runRewritePrompt"
    />

    <!-- 生图配置抽屉 -->
    <AssetImageGenDrawer
      v-model="configDrawerVisible"
      :image-models="imageModels"
      :llm-models="llmModels"
      :templates="assetPromptTemplates"
      :config="assetGenConfig"
      @save="saveGenConfig"
    />

    <!-- 大图预览 -->
    <AssetImagePreviewModal
      v-model="previewVisible"
      :images="previewImages"
      :image-index="previewIndex"
      :alt="previewAlt"
      @remove="removePreviewImage"
    />

    <!-- 资产图选择弹窗：从资产库勾选图片追加为参考图 -->
    <AssetImagePickerModal
      v-model="pickerVisible"
      :assets="pickerAssets"
      append
      include-generated
      @confirm="appendAssetImages"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇章节资产生图工作台：批量/单条提示词生成 + 批量/单张参考图生图 + 本地上传 + 资产库选图。
 * 数据（assets / assetGenConfig）由父组件传入并回写持久化；本组件只编排交互。
 * 右侧视觉状态多状态时以 tab 切换展示，单卡片不再上下滚动。
 */
import { computed, nextTick, reactive, ref, toRaw, watch } from 'vue'
import { Boxes, LoaderCircle, MapPin, Package, UserRound } from 'lucide-vue-next'
import AssetVariantCard from './AssetVariantCard.vue'
import AssetPromptGenerateModal, { type AssetPromptRetryPayload, type AssetPromptRunItem, type AssetPromptRunResult } from './AssetPromptGenerateModal.vue'
import AssetImageGenDrawer from './AssetImageGenDrawer.vue'
import AssetImagePreviewModal from './AssetImagePreviewModal.vue'
import AssetImagePickerModal from './AssetImagePickerModal.vue'
import { useToast } from '@comic/composables/useToast'
import { imageGenerationService } from '@comic/services/imageGenerationService'
import { buildAssetPromptPrompt, buildSingleAssetPrompt, buildStyleContext, generateAssetPrompts, rewriteAssetPrompt, type AssetPromptTarget } from '@comic/services/assetPromptService'
import { AssetPromptParseError, type AssetPromptParseDiagnostics } from '@comic/services/assetPromptParser'
import type { AssetGenConfig, LongProjectAsset, LongProjectAssetVariant, ModelConfig, PromptTemplate, SharedPromptBlock } from '@comic/types'

interface Props {
  /** 本章涉及的资产（已按章节引用过滤出相关 variants） */
  assets: LongProjectAsset[]
  /** 项目全部资产（资产图选择弹窗数据源；缺省退回本章工作资产） */
  allAssets?: LongProjectAsset[]
  llmModels: ModelConfig[]
  imageModels: ModelConfig[]
  templates: PromptTemplate[]
  assetGenConfig?: AssetGenConfig
  paintingStyle?: string
  sharedBlocks?: SharedPromptBlock[]
  /** 接力定位目标（从分镜页跳转时携带，选中具体资产/视觉状态）。 */
  focusTarget?: { assetId: string; variantId?: string } | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:asset', payload: { assetId: string; variantId: string; patch: Partial<LongProjectAssetVariant> }): void
  (e: 'update:gen-config', config: AssetGenConfig): void
  (e: 'prompt-completed'): void
}>()

const toast = useToast()

// ========== 视图状态 ==========
const selectedAssetId = ref<string | null>(props.assets[0]?.id ?? null)
/** 当前选中的视觉状态 id（null = 回退第一个）。 */
const selectedVariantId = ref<string | null>(null)
const filterMissing = ref(false)
const promptModalVisible = ref(false)
const configDrawerVisible = ref(false)
const previewVisible = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)
const previewAlt = ref('')
/** 资产图选择弹窗：目标视觉状态（追加参考图）。 */
const pickerVisible = ref(false)
const pickerTarget = ref<{ asset: LongProjectAsset; variant: LongProjectAssetVariant } | null>(null)
/** 当前预览的图片来源：生成预览暂存区 / 正式参考图区。 */
const previewSource = ref<'generated' | 'reference'>('reference')
const promptBusyIds = reactive(new Set<string>())
const genBusyIds = reactive(new Set<string>())
const promptBatchBusy = ref(false)
const batchBusy = ref(false)
const batchDone = ref(0)
const batchTotal = ref(0)

// ========== 派生数据 ==========

/** 资产类型分组的标签与图标（数组顺序即左列表分组顺序，与审核页左列 / 图片页一致）。 */
const ASSET_TYPE_META: Array<{ type: LongProjectAsset['type']; label: string; icon: typeof Boxes }> = [
  { type: 'character', label: '人物', icon: UserRound },
  { type: 'scene', label: '场景', icon: MapPin },
  { type: 'prop', label: '道具', icon: Package },
]

/** 工作资产：带缺图标记（无生成图 = 缺）。 */
const workAssets = computed(() => props.assets.map((asset) => ({
  asset,
  missing: asset.variants.some((variant) => !(variant.generatedImageIds ?? []).length),
})))
const visibleAssets = computed(() => filterMissing.value ? workAssets.value.filter((item) => item.missing) : workAssets.value)
/** 左列表按类型分组（人物 → 场景 → 道具），顺序由 assets 入参决定（PanelGenAssetTab 已按提取顺序排好）。 */
const visibleGroups = computed(() => ASSET_TYPE_META.map((meta) => ({ ...meta, items: visibleAssets.value.filter((item) => item.asset.type === meta.type) })))
const selectedItem = computed(() => workAssets.value.find((item) => item.asset.id === selectedAssetId.value) ?? visibleAssets.value[0] ?? null)
/** 当前选中的视觉状态（id 失效或未选时回退第一个）。 */
const selectedVariant = computed(() => {
  const variants = selectedItem.value?.asset.variants ?? []
  return variants.find((variant) => variant.id === selectedVariantId.value) ?? variants[0] ?? null
})
// 切换资产（含筛选导致回退）时重置视觉状态选中
watch(() => selectedItem.value?.asset.id, () => { selectedVariantId.value = null })
// 接力定位：从分镜页跳转携带的资产/视觉状态，挂载或变化时选中（nextTick 等上面的选中重置跑完再落 variant）
watch(() => props.focusTarget, async (target) => {
  if (!target || !props.assets.some((asset) => asset.id === target.assetId)) return
  selectedAssetId.value = target.assetId
  await nextTick()
  selectedVariantId.value = target.variantId ?? null
}, { immediate: true })
const assetPromptTemplates = computed(() => props.templates.filter((t) => t.type === 'asset-prompt').sort((a, b) => a.sortOrder - b.sortOrder))
const styleContext = computed(() => buildStyleContext(props.sharedBlocks ?? [], props.paintingStyle ?? ''))
const currentImageModel = computed(() => props.imageModels.find((m) => m.id === props.assetGenConfig?.imageModelId))
/** 资产图选择弹窗数据源：项目全部资产。 */
const pickerAssets = computed(() => props.allAssets ?? props.assets)
/** 提示词生成目标（仅缺提示词的状态）：默认「仅补缺失」。 */
const promptTargets = computed<AssetPromptTarget[]>(() => props.assets
  .map((asset) => ({ asset, variants: asset.variants.filter((v) => !v.imagePrompt?.trim()) }))
  .filter((item) => item.variants.length))
/** 全部状态目标：用于「全部重新生成」（覆盖已有提示词）。 */
const allPromptTargets = computed<AssetPromptTarget[]>(() => props.assets
  .map((asset) => ({ asset, variants: asset.variants }))
  .filter((item) => item.variants.length))
const totalVariantCount = computed(() => allPromptTargets.value.reduce((count, item) => count + item.variants.length, 0))
const promptTargetCount = computed(() => promptTargets.value.reduce((count, item) => count + item.variants.length, 0))
/** 有可生成目标：本章存在任一视觉状态即可（含全部重写场景），不再因「都有提示词」而禁用。 */
const hasPromptTargets = computed(() => totalVariantCount.value > 0)
/** 生图目标：有提示词但还没有生成图的状态。 */
const genTargets = computed(() => props.assets.flatMap((asset) => asset.variants
  .filter((v) => v.imagePrompt?.trim() && !(v.generatedImageIds ?? []).length)
  .map((variant) => ({ asset, variant }))))
const hasGenTargets = computed(() => genTargets.value.length > 0)

// ========== 提示词 ==========
/** 构建批量提示词生成用的最终 prompt（供弹窗预览，按所选范围/发送方式取目标；只按模板内容拼）。 */
function buildPromptPreview(template: PromptTemplate, scope?: 'missing' | 'all', sendMode?: 'once' | 'per-item'): string {
  const targets = scope === 'all' ? allPromptTargets.value : promptTargets.value
  // 逐条发送：预览首个目标的单条拼装提示词（结果直接取全文回填，不解析）
  if (sendMode === 'per-item') {
    const first = targets.flatMap(({ asset, variants }) => variants.map((variant) => ({ asset, variant })))[0]
    if (!first) return ''
    return buildSingleAssetPrompt({
      asset: toRaw(first.asset),
      variant: toRaw(first.variant),
      currentPrompt: first.variant.imagePrompt,
      styleContext: styleContext.value,
      targetImageModel: currentImageModel.value?.name,
      templateContent: template.content,
    })
  }
  // 一次性发送：返回格式约定写在模板内容里（见模板的【返回格式】段）
  return buildAssetPromptPrompt({
    templateContent: template.content,
    targets: targets.map(({ asset, variants }) => ({ asset: toRaw(asset), variants: variants.map(toRaw) })),
    styleContext: styleContext.value,
    targetImageModel: currentImageModel.value?.name,
  })
}

// ========== 批量提示词：规划 → 执行（弹窗内进度） → 保存回填 ==========

type BatchPromptOptions = { modelId: string; templateId: string; prompt?: string; scope?: 'missing' | 'all'; sendMode?: 'once' | 'per-item' }

/** 批量弹窗实例（用于把逐条执行进度回传到弹窗内的进度视图）。 */
const promptModalRef = ref<InstanceType<typeof AssetPromptGenerateModal> | null>(null)

/** 一次批量执行的上下文（模型 / 模板 / 目标快照），「重新生成」时复用，避免读到已被改动的默认配置。 */
type BatchRun = {
  model: ModelConfig
  template: PromptTemplate
  prompt?: string
  targets: AssetPromptTarget[]
}

/**
 * **按发送方式分别保存**上一次执行上下文。
 * 两种模式可以各跑一次；若只留一份，在 A 模式跑完、B 模式跑完后再切回 A 点「重新生成」，
 * 会错用 B 的目标与模型，把提示词发到错误的对象上。
 */
const batchRuns: Record<'once' | 'per-item', BatchRun | null> = { once: null, 'per-item': null }

const batchItemKey = (assetId: string, variantId: string) => `${assetId}:${variantId}`

/** 记录单条进度并回传弹窗（无弹窗实例时静默跳过）。 */
function reportItemProgress(variantId: string, status: 'running' | 'done' | 'failed', payload: { text?: string; error?: string; items?: AssetPromptRunResult[]; diagnostics?: AssetPromptParseDiagnostics } = {}) {
  promptModalRef.value?.applyProgress({ variantId, status, ...payload })
}

/**
 * 逐条模式的条目清单（含每条按模板拼装的初始文本）：供给弹窗展示与逐条修改。
 * 用户改过的文本会随 confirm 的 perItemPrompts 回传，执行时原样发送。
 */
function buildPromptItems(template: PromptTemplate, scope?: 'missing' | 'all'): Array<AssetPromptRunItem & { prompt: string }> {
  const targets = scope === 'all' ? allPromptTargets.value : promptTargets.value
  return targets.flatMap(({ asset, variants }) => variants.map((variant) => ({
    key: batchItemKey(asset.id, variant.id),
    assetId: asset.id,
    variantId: variant.id,
    assetName: asset.name,
    variantName: variant.name,
    prompt: buildSingleAssetPrompt({
      asset: toRaw(asset),
      variant: toRaw(variant),
      currentPrompt: variant.imagePrompt,
      styleContext: styleContext.value,
      targetImageModel: currentImageModel.value?.name,
      templateContent: template.content,
    }),
  })))
}

/** 执行前取模板与模型（两者缺一即中止）。 */
function resolveBatchContext(options: BatchPromptOptions) {
  const model = props.llmModels.find((m) => m.id === options.modelId)
  const template = assetPromptTemplates.value.find((t) => t.id === options.templateId)
  return model && template ? { model, template } : null
}

/**
 * 逐条发送：每个视觉状态单独一次请求，失败不中断。
 * 请求文本优先取用户在弹窗内修改后的 perItemPrompts，缺省回落到按模板拼装。
 * 进度实时回传弹窗（含每条的最终文本），用户可在弹窗内逐条查看并修改。
 *
 * ⚠️ **不在这里落库**：结果只回传给弹窗，等用户核对后点「填充到资产」才统一写回，
 * 否则会在用户还没审核时就直接覆盖资产里已有的绘画提示词。
 */
async function runPerItemPrompts(
  context: { model: ModelConfig; template: PromptTemplate; targets: AssetPromptTarget[] },
  userPrompts: Map<string, string>,
  onlyVariantIds?: Set<string>,
) {
  let done = 0
  let failed = 0
  for (const { asset, variants } of context.targets) {
    for (const variant of variants) {
      if (onlyVariantIds && !onlyVariantIds.has(variant.id)) continue
      promptBusyIds.add(variant.id)
      reportItemProgress(variant.id, 'running')
      try {
        const prompt = userPrompts.get(variant.id) || buildSingleAssetPrompt({
          asset: toRaw(asset),
          variant: toRaw(variant),
          currentPrompt: variant.imagePrompt,
          styleContext: styleContext.value,
          targetImageModel: currentImageModel.value?.name,
          templateContent: context.template.content,
        })
        const imagePrompt = await rewriteAssetPrompt({ model: context.model, asset: toRaw(asset), variant: toRaw(variant), prompt })
        reportItemProgress(variant.id, 'done', { text: imagePrompt })
        done += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : '生成失败'
        reportItemProgress(variant.id, 'failed', { error: message })
        console.error(`[资产提示词] ${asset.name}·${variant.name} 逐条生成失败:`, error)
        failed += 1
      } finally {
        promptBusyIds.delete(variant.id)
      }
    }
  }
  return { done, failed }
}

/**
 * 生成提示词（弹窗内确认后执行，弹窗保持打开，进度显示在弹窗文本框下方）。
 * - 范围：仅补缺失 / 全部重新生成；
 * - 发送方式：一次性（全部状态一份清单一次请求）/ 逐条（每个状态单独请求，失败不中断，文本取弹窗内已修改的每条）；
 * - **两种方式都不自动落库**：结果只回传到弹窗，等用户核对后点「填充到资产」才回填（见 savePromptResults）。
 */
async function runBatchPrompts(options: BatchPromptOptions & { perItemPrompts?: Array<{ variantId: string; prompt: string }> }) {
  const context = resolveBatchContext(options)
  if (!context) return
  const sendMode = options.sendMode === 'per-item' ? 'per-item' : 'once'
  const targets = options.scope === 'all' ? allPromptTargets.value : promptTargets.value
  if (!targets.length) {
    toast.error(options.scope === 'all' ? '本章暂无视觉状态' : '所有状态都已有提示词，可切换为「全部重新生成」')
    batchRuns[sendMode] = null
    return
  }
  batchRuns[sendMode] = { model: context.model, template: context.template, prompt: options.prompt, targets }
  promptBatchBusy.value = true
  try {
    if (sendMode === 'per-item') {
      const userPrompts = new Map((options.perItemPrompts ?? []).map((item) => [item.variantId, item.prompt]))
      const { done, failed } = await runPerItemPrompts({ ...context, targets }, userPrompts)
      // 结果只留在弹窗内，等用户核对后点「填充到资产」才写回（避免直接覆盖已有提示词）
      emit('prompt-completed')
      saveGenConfigSelection(options)
      toast[failed ? 'warning' : 'success'](`逐条发送完成：成功 ${done}，失败 ${failed}，请核对后点「填充到资产」`)
    } else {
      // 一次性发送：全部状态一份清单，一次请求返回全部；完成后展开为逐条可编辑结果
      reportItemProgress('batch-once', 'running')
      const sendTargets = targets.map(({ asset, variants }) => ({ asset: toRaw(asset), variants: variants.map(toRaw) }))
      try {
        const result = await generateAssetPrompts({
          model: context.model,
          template: context.template,
          targets: sendTargets,
          styleContext: styleContext.value,
          targetImageModel: currentImageModel.value?.name,
          prompt: options.prompt,
        })
        reportItemProgress('batch-once', 'done', {
          items: result.items.map((item) => ({
            assetId: item.assetId,
            variantId: item.variantId,
            assetName: item.assetName,
            variantName: item.variantName,
            imagePrompt: item.imagePrompt,
            // 非精确命中（模糊匹配 / 顺序兜底）在弹窗里标出来，提醒用户核对归属
            match: item.match,
          })),
        })
        // 结果只留在弹窗内，等用户核对后点「填充到资产」才写回
        emit('prompt-completed')
        saveGenConfigSelection(options)
        // 解析只命中部分状态时明确告警（弹窗进度区也会列出缺失项）
        const expected = targets.reduce((count, item) => count + item.variants.length, 0)
        if (result.items.length < expected) {
          toast.warning(`已生成 ${result.items.length} 条，有 ${expected - result.items.length} 个状态未返回（已在弹窗内标出，可重发或单条 AI 重写）`)
        } else {
          toast.success(`已生成 ${result.items.length} 条提示词，请核对后点「填充到资产」写回`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '提示词生成失败'
        // 解析类失败带上诊断（停在那一层 / 期望条数 / 模型原始返回），供弹窗展示与人工核对
        reportItemProgress('batch-once', 'failed', {
          error: message,
          diagnostics: error instanceof AssetPromptParseError ? error.diagnostics : undefined,
        })
        toast.error(message)
      }
    }
  } finally {
    promptBusyIds.clear()
    promptBatchBusy.value = false
  }
}

/**
 * 重新生成：把弹窗输入框的**当前内容**重新发给大模型。
 * **发送内容一律取弹窗输入框的当前值**（用户改了提示词就按改后的发），不回落到首次发送时的原文。
 * - 逐条发送：按 `payload.scope` 决定「仅重跑失败/未完成项」还是「整批重跑」；
 * - 一次性发送：单次请求无法只补几条，按原范围整批重发。
 * 模式以弹窗回传的 `payload.sendMode` 为准，避免两种模式各跑过一次后错用另一种的上下文。
 */
async function retryFailedPrompts(payload?: AssetPromptRetryPayload) {
  if (promptBatchBusy.value) return
  const mode = payload?.sendMode ?? 'once'
  const run = batchRuns[mode]
  if (!run) { toast.error('未找到上次的执行配置，请重新配置模型与模板后生成'); return }
  const modalItems = promptModalRef.value?.items ?? []
  const failedVariants = modalItems.filter((item) => item.status === 'failed' || item.status === 'pending')
  // 逐条：scope === 'failed' 时只重跑失败/未完成项；'all'（或没传）则整批重跑
  const targetIds = mode === 'per-item' && payload?.scope !== 'all' && failedVariants.length
    ? new Set(failedVariants.map((item) => item.variantId))
    : undefined
  promptBatchBusy.value = true
  try {
    if (mode === 'per-item') {
      // 用弹窗回传的当前文本（含用户修改）；缺失时回落到弹窗内该条文本
      const userPrompts = new Map(
        (payload?.perItemPrompts ?? modalItems.map((item) => ({ variantId: item.variantId, prompt: item.text })))
          .map((item) => [item.variantId, item.prompt]),
      )
      const { done, failed } = await runPerItemPrompts(run, userPrompts, targetIds)
      toast[failed ? 'warning' : 'success'](`重新生成完成：成功 ${done}，失败 ${failed}`)
    } else {
      // 一次性发送：按原范围整批重跑，发送内容取输入框当前文本
      reportItemProgress('batch-once', 'running')
      try {
        const result = await generateAssetPrompts({
          model: run.model,
          template: run.template,
          targets: run.targets.map(({ asset, variants }) => ({ asset: toRaw(asset), variants: variants.map(toRaw) })),
          styleContext: styleContext.value,
          targetImageModel: currentImageModel.value?.name,
          prompt: payload?.prompt ?? run.prompt,
        })
        reportItemProgress('batch-once', 'done', {
          items: result.items.map((item) => ({
            assetId: item.assetId,
            variantId: item.variantId,
            assetName: item.assetName,
            variantName: item.variantName,
            imagePrompt: item.imagePrompt,
            // 非精确命中（模糊匹配 / 顺序兜底）在弹窗里标出来，提醒用户核对归属
            match: item.match,
          })),
        })
        const expected = run.targets.reduce((count, item) => count + item.variants.length, 0)
        if (result.items.length < expected) {
          toast.warning(`已生成 ${result.items.length} 条，有 ${expected - result.items.length} 个状态未返回（已在弹窗内标出）`)
        } else {
          toast.success(`已生成 ${result.items.length} 条提示词，请核对后点「填充到资产」写回`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '提示词生成失败'
        // 解析类失败带上诊断（停在那一层 / 期望条数 / 模型原始返回），供弹窗展示与人工核对
        reportItemProgress('batch-once', 'failed', {
          error: message,
          diagnostics: error instanceof AssetPromptParseError ? error.diagnostics : undefined,
        })
        toast.error(message)
      }
    }
  } finally {
    promptBatchBusy.value = false
  }
}

/**
 * 填充到资产：把弹窗内（可能被用户修改过的）生成结果逐条回填到视觉状态。
 * **只回填模型产出（含用户在结果视图里的修改）**，绝不拿模板拼装文本顶替；
 * 回填后**不关闭弹窗**（弹窗侧会切到「已填充」态），用户可以继续核对、重新生成或手动关闭。
 */
function savePromptResults(results: AssetPromptRunResult[]) {
  let filled = 0
  for (const result of results) {
    if (!result.assetId || !result.variantId || result.variantId === 'batch-once') continue
    emit('update:asset', { assetId: result.assetId, variantId: result.variantId, patch: { imagePrompt: result.imagePrompt } })
    filled += 1
  }
  emit('prompt-completed')
  if (filled) toast.success(`已填充 ${filled} 条提示词到资产`)
}

/** 持久化本次使用的模型/模板为项目默认。 */
function saveGenConfigSelection(options: BatchPromptOptions) {
  emit('update:gen-config', { ...(props.assetGenConfig ?? defaultGenConfig()), promptModelId: options.modelId, promptTemplateId: options.templateId })
}

// ========== 单条提示词（确认弹窗） ==========
const rewriteModalVisible = ref(false)
const rewriteBusy = ref(false)
const rewriteTarget = ref<{ asset: LongProjectAsset; variant: LongProjectAssetVariant } | null>(null)

/** 打开单条生成/重写确认弹窗。 */
function openRewriteModal(asset: LongProjectAsset, variant: LongProjectAssetVariant) {
  rewriteTarget.value = { asset, variant }
  rewriteModalVisible.value = true
}

/** 构建单条生成/重写的最终 prompt（只按模板内容拼，运行时不追加任何协议段）。 */
function buildRewritePreview(template: PromptTemplate): string {
  const target = rewriteTarget.value
  if (!target) return ''
  return buildSingleAssetPrompt({
    asset: toRaw(target.asset),
    variant: toRaw(target.variant),
    currentPrompt: target.variant.imagePrompt,
    styleContext: styleContext.value,
    targetImageModel: currentImageModel.value?.name,
    templateContent: template.content,
  })
}

/** 弹窗确认后执行单条生成/重写。 */
async function runRewritePrompt(options: { modelId: string; templateId?: string; prompt?: string }) {
  const target = rewriteTarget.value
  const model = props.llmModels.find((m) => m.id === options.modelId)
  if (!target || !model) return
  // 确认后立即关闭弹窗，生成进度由对应状态卡片「生成中…」体现
  rewriteModalVisible.value = false
  rewriteBusy.value = true
  promptBusyIds.add(target.variant.id)
  try {
    const prompt = await rewriteAssetPrompt({
      model,
      asset: toRaw(target.asset),
      variant: toRaw(target.variant),
      currentPrompt: target.variant.imagePrompt,
      styleContext: styleContext.value,
      prompt: options.prompt,
    })
    emit('update:asset', { assetId: target.asset.id, variantId: target.variant.id, patch: { imagePrompt: prompt } })
    emit('update:gen-config', { ...(props.assetGenConfig ?? defaultGenConfig()), promptModelId: options.modelId, promptTemplateId: options.templateId })
    toast.success('提示词已生成')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '提示词生成失败')
  } finally {
    promptBusyIds.delete(target.variant.id)
    rewriteBusy.value = false
    rewriteModalVisible.value = false
  }
}

/** 手动编辑提示词回填。 */
function updatePrompt(asset: LongProjectAsset, variant: LongProjectAssetVariant, value: string) {
  emit('update:asset', { assetId: asset.id, variantId: variant.id, patch: { imagePrompt: value } })
}

// ========== 生图 ==========
/** 单张生成：用户上传的参考图作为参数发给模型，结果按比例进入生成预览区。 */
async function generateImage(asset: LongProjectAsset, variant: LongProjectAssetVariant) {
  const model = currentImageModel.value
  if (!model) { toast.error('请先在「生图配置」中选择生图模型'); configDrawerVisible.value = true; return }
  if (!variant.imagePrompt?.trim()) { toast.error('请先生成或填写绘画提示词'); return }
  genBusyIds.add(variant.id)
  try {
    const config = props.assetGenConfig ?? defaultGenConfig()
    const result = await imageGenerationService.generateWithModel(
      model,
      variant.imagePrompt,
      genRefImages(variant),
      config.aspectRatio,
      config.resolution,
      config.quality ?? '',
    )
    if (result.success && result.imageUrl) {
      emit('update:asset', { assetId: asset.id, variantId: variant.id, patch: { generatedImageIds: [...(variant.generatedImageIds ?? []), result.imageUrl] } })
    } else {
      toast.error(result.error || '生成失败')
    }
  } finally {
    genBusyIds.delete(variant.id)
  }
}

/** 批量生图：串行执行（保证风格稳定与 API 稳定性），结果进入各状态的生成预览区。 */
async function runBatchGen() {
  if (batchBusy.value || !hasGenTargets.value) return
  const model = currentImageModel.value
  if (!model) { toast.error('请先在「生图配置」中选择生图模型'); configDrawerVisible.value = true; return }
  batchBusy.value = true
  batchDone.value = 0
  batchTotal.value = genTargets.value.length
  const config = props.assetGenConfig ?? defaultGenConfig()
  let failed = 0
  for (const { asset, variant } of genTargets.value) {
    genBusyIds.add(variant.id)
    try {
      const result = await imageGenerationService.generateWithModel(
        model,
        variant.imagePrompt ?? '',
        genRefImages(variant),
        config.aspectRatio,
        config.resolution,
        config.quality ?? '',
      )
      if (result.success && result.imageUrl) {
        emit('update:asset', { assetId: asset.id, variantId: variant.id, patch: { generatedImageIds: [...(variant.generatedImageIds ?? []), result.imageUrl] } })
      } else {
        failed += 1
      }
    } finally {
      genBusyIds.delete(variant.id)
      batchDone.value += 1
    }
  }
  batchBusy.value = false
  toast[failed ? 'error' : 'success'](`批量生图完成：成功 ${batchTotal.value - failed}，失败 ${failed}，请在各状态预览区查看`)
}

/** 生图参数参考图：该状态用户上传的参考图 + 共用块启用的风格参考图。 */
function genRefImages(variant: LongProjectAssetVariant): string[] {
  return [...variant.referenceImageIds, ...(props.sharedBlocks ?? [])
    .filter((block) => block.enableRefImages)
    .flatMap((block) => block.referenceImages)]
}

/** 保存生图配置。 */
function saveGenConfig(config: AssetGenConfig) {
  emit('update:gen-config', config)
  toast.success('生图配置已保存')
}

function defaultGenConfig(): AssetGenConfig {
  return { imageModelId: '', aspectRatio: '3:4', resolution: '1K', quality: '', concurrency: 1 }
}

// ========== 参考图与生成预览管理 ==========
function removeGeneratedImage(asset: LongProjectAsset, payload: { variant: LongProjectAssetVariant; index: number }) {
  const next = (payload.variant.generatedImageIds ?? []).filter((_, index) => index !== payload.index)
  emit('update:asset', { assetId: asset.id, variantId: payload.variant.id, patch: { generatedImageIds: next } })
}

function removeImage(asset: LongProjectAsset, payload: { variant: LongProjectAssetVariant; index: number }) {
  const next = payload.variant.referenceImageIds.filter((_, index) => index !== payload.index)
  emit('update:asset', { assetId: asset.id, variantId: payload.variant.id, patch: { referenceImageIds: next } })
}

function addImage(asset: LongProjectAsset, payload: { variant: LongProjectAssetVariant; url: string }) {
  emit('update:asset', { assetId: asset.id, variantId: payload.variant.id, patch: { referenceImageIds: [...payload.variant.referenceImageIds, payload.url] } })
}

function openPreview(payload: { images: string[]; index: number; source: 'generated' | 'reference' }) {
  previewImages.value = [...payload.images]
  previewIndex.value = payload.index
  previewSource.value = payload.source
  previewAlt.value = previewImageAlt()
  previewVisible.value = true
}

/** 通过图片反查所属视觉状态及其所在区域（生成预览 / 参考图）。 */
function findImageOwner(image: string): { asset: LongProjectAsset; variant: LongProjectAssetVariant; source: 'generated' | 'reference' } | null {
  for (const item of workAssets.value) {
    for (const variant of item.asset.variants) {
      if ((variant.generatedImageIds ?? []).includes(image)) return { asset: item.asset, variant, source: 'generated' }
      if (variant.referenceImageIds.includes(image)) return { asset: item.asset, variant, source: 'reference' }
    }
  }
  return null
}

function previewImageAlt(): string {
  const image = previewImages.value[previewIndex.value]
  const found = image ? findImageOwner(image) : null
  if (!found) return '图片'
  return `${found.asset.name} · ${found.variant.name} · ${found.source === 'generated' ? '生成图' : '参考图'}`
}

function removePreviewImage(index: number) {
  const image = previewImages.value[index]
  const found = image ? findImageOwner(image) : null
  if (!found) return
  if (found.source === 'generated') {
    removeGeneratedImage(found.asset, { variant: found.variant, index: (found.variant.generatedImageIds ?? []).indexOf(image) })
  } else {
    removeImage(found.asset, { variant: found.variant, index: found.variant.referenceImageIds.indexOf(image) })
  }
  previewImages.value = previewImages.value.filter((_, i) => i !== index)
  if (previewIndex.value >= previewImages.value.length) previewIndex.value = Math.max(0, previewImages.value.length - 1)
}

// ========== 资产图选择（追加为参考图） ==========

/** 打开资产图选择弹窗：从项目资产库勾选图片追加为该视觉状态的参考图。 */
function openAssetPicker(asset: LongProjectAsset, variant: LongProjectAssetVariant) {
  pickerTarget.value = { asset, variant }
  pickerVisible.value = true
}

/** 弹窗确认：把选中的资产图去重后追加到当前视觉状态参考图。 */
function appendAssetImages(images: string[]) {
  const target = pickerTarget.value
  if (!target?.variant || !images.length) return
  const existing = target.variant.referenceImageIds
  const additions = images.filter((url) => !existing.includes(url))
  if (!additions.length) return
  emit('update:asset', { assetId: target.asset.id, variantId: target.variant.id, patch: { referenceImageIds: [...existing, ...additions] } })
}

function typeIcon(type: LongProjectAsset['type']) {
  return type === 'character' ? UserRound : type === 'scene' ? MapPin : Package
}

// 暴露给父容器（Tab 顶部工具行）使用的批量操作状态与入口
defineExpose({
  promptBatchBusy,
  batchBusy,
  batchDone,
  batchTotal,
  hasPromptTargets,
  hasGenTargets,
  openPromptModal: () => { promptModalVisible.value = true },
  openConfigDrawer: () => { configDrawerVisible.value = true },
  runBatchGen,
})
</script>
