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
        <button
          v-if="orphanCount"
          class="mx-1 mb-1.5 flex w-[calc(100%-0.5rem)] items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
          title="项目范围内没有任何章节引用（也没有分镜绑定）的视觉状态与章节资产，多为反复提取累积下来的死数据；点击查看并清理"
          @click="emit('clear-orphans')"
        >
          <Eraser :size="12" class="shrink-0" />
          <span class="min-w-0 flex-1 truncate">清理孤儿数据</span>
          <span class="shrink-0 font-medium">{{ orphanCount }}</span>
        </button>
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
          <!-- key 绑视觉状态 id：切 tab 时重建卡片，避免上一个状态的提示词草稿/编辑弹窗状态渗到下一个状态 -->
          <AssetVariantCard
            v-if="selectedVariant"
            :key="selectedVariant.id"
            :variant="selectedVariant"
            :usage="usage?.variants.get(selectedVariant.id)"
            :shared-image-count="sharedRefImageCount"
            :prompt-busy="promptBusyIds.has(selectedVariant.id)"
            :gen-busy="genBusyIds.has(selectedVariant.id)"
            :can-delete-images="selectedCanDeleteImages"
            :linked-chapter-name="selectedLinkedChapterName"
            :detach-visible="selectedDetachVisible"
            @update:prompt="(value) => updatePrompt(selectedItem!.asset, selectedVariant!, value)"
            @update:slots="(slots, activeId) => updateGenSlots(selectedItem!.asset, selectedVariant!, slots, activeId)"
            @rewrite-prompt="(v) => openRewriteModal(selectedItem!.asset, v)"
            @view-prompt="(v) => openPromptModal(selectedItem!.asset, v)"
            @generate="(v) => generateImage(selectedItem!.asset, v)"
            @add-asset-image="(payload) => addAssetImage(selectedItem!.asset, payload)"
            @remove-asset-image="(payload) => requestDeleteAssetImage(selectedItem!.asset, payload)"
            @link-chapter="(v) => emit('link-chapter', { asset: selectedItem!.asset, variant: v })"
            @detach-chapter="(v) => emit('detach-chapter', { asset: selectedItem!.asset, variant: v })"
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

    <!-- 批量提示词弹窗（配置 + 提示词区 + 进度条都在同一弹窗内；始终全部重新生成） -->
    <AssetPromptGenerateModal
      ref="promptModalRef"
      v-model="promptModalVisible"
      :llm-models="llmModels"
      :templates="assetPromptTemplates"
      :default-model-id="assetGenConfig?.promptModelId"
      :default-template-id="assetGenConfig?.promptTemplateId"
      :target-count="totalVariantCount"
      allow-send-mode
      :busy="promptBatchBusy"
      :build-prompt="buildPromptPreview"
      :build-items="buildPromptItems"
      @confirm="runBatchPrompts"
      @retry="retryFailedPrompts"
      @save="savePromptResults"
      @import-request="promptImportVisible = true"
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

    <!-- 外部 AI 代跑结果导入（一次性发送）：与内置模型同一解析器、同一核对/填充流程 -->
    <ManualResultImportDialog
      :visible="promptImportVisible"
      title="导入外部 AI 生成的绘画提示词"
      placeholder="粘贴外部 AI 按清单生成的结果，格式为逐条「## 资产名｜状态名」标题 + 提示词正文…"
      z-index-class="z-[140]"
      :parse="parsePromptImportPreview"
      @confirm="confirmPromptImport"
      @close="promptImportVisible = false"
    />

    <!-- 生图配置抽屉：绘画模型 + 共用属性都存在 assetGenConfig 里，与分镜绘图配置不互通 -->
    <AssetImageGenDrawer
      v-model="configDrawerVisible"
      :image-models="imageModels"
      :config="assetGenConfig"
      @save="saveGenConfig"
    />

    <!-- 最终生图提示词查看弹窗：与 generateImage 发送内容完全同源。
         挂到 #app：#app-shell 与 ComicLayout 都是 overflow:hidden，Teleport 到 body 的 fixed 弹层
         会被裁在视口外，点击后看不见。不用 Transition：目标组件没有 fade 过渡样式时，
         进入态会停在 opacity:0。 -->
    <Teleport to="#app">
      <div
        v-if="finalPromptModalVisible"
        class="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-6"
        @click.self="finalPromptModalVisible = false"
      >
          <div class="flex max-h-[82vh] w-[min(760px,92vw)] flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-2xl">
            <div class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3.5">
              <h2 class="text-sm font-semibold text-text-primary">最终生图提示词 · {{ finalPromptModalTarget?.asset.name }} · {{ finalPromptModalTarget?.variant.name }}</h2>
              <button
                class="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
                @click="finalPromptModalVisible = false"
              ><X :size="15" /></button>
            </div>
            <pre class="custom-scrollbar min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-text-primary">{{ finalPromptModalText }}</pre>
            <div class="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle px-5 py-3">
              <p class="text-[10px] text-text-muted">共 {{ finalPromptModalText.length.toLocaleString() }} 字符 · 与「生成图片」发送内容一致</p>
              <div class="flex items-center gap-2">
                <button
                  class="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-border-default hover:text-text-primary"
                  @click="copyPromptModalText"
                >
                  <Check v-if="finalPromptModalCopied" :size="12" class="text-emerald-400" />
                  <Copy v-else :size="12" />
                  {{ finalPromptModalCopied ? '已复制' : '复制' }}
                </button>
                <button
                  class="rounded-lg bg-cyan-500 px-4 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                  @click="finalPromptModalVisible = false"
                >关闭</button>
              </div>
            </div>
          </div>
      </div>
    </Teleport>

    <!-- 大图预览：纯查看（removable=false）—— 删除入口只在卡片图块上，且仅原章节可用 -->
    <AssetImagePreviewModal
      v-model="previewVisible"
      :images="previewImages"
      :image-index="previewIndex"
      :alt="previewAlt"
      :removable="false"
    />

    <!-- 资产图选择弹窗：从资产库勾选图片追加为参考图 -->
    <!-- 从资产库追加参考图：图源只有各状态的 AI 生成图（上传的参考图不进列表） -->
    <AssetImagePickerModal
      v-model="pickerVisible"
      :assets="pickerAssets"
      append
      @confirm="appendAssetImages"
    />

    <!-- 删除成品图确认（z-[210] 压过大图预览 z-[200]，预览内删除时可见）。
         被其他章节引用时，正文会列出受影响的章节并说明会同步消失。 -->
    <ConfirmDialog
      v-model="deleteConfirmVisible"
      :title="deleteConfirmTitle"
      :content="deleteConfirmContent"
      confirm-text="确认删除"
      z-index-class="z-[210]"
      @confirm="confirmDeleteImage"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇章节资产生图工作台：批量/单条提示词生成 + 批量/单张参考图生图 + 本地上传 + 资产库选图。
 * 数据（assets / assetGenConfig，含资产生图自己的共用属性）由父组件传入并回写持久化；本组件只编排交互。
 * 资产生图的共用属性存在 assetGenConfig.sharedBlocks，与分镜绘图配置的 imageGenConfig.sharedBlocks 不是同一份。
 * 右侧视觉状态多状态时以 tab 切换展示，单卡片不再上下滚动。
 */
import { computed, nextTick, reactive, ref, toRaw, watch } from 'vue'
import { Boxes, Check, Copy, Eraser, LoaderCircle, MapPin, Package, UserRound, X } from 'lucide-vue-next'
import AssetVariantCard from './AssetVariantCard.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import AssetPromptGenerateModal, { type AssetPromptRetryPayload, type AssetPromptRunItem, type AssetPromptRunResult } from './AssetPromptGenerateModal.vue'
import ManualResultImportDialog from './common/ManualResultImportDialog.vue'
import AssetImageGenDrawer from './AssetImageGenDrawer.vue'
import AssetImagePreviewModal from './AssetImagePreviewModal.vue'
import AssetImagePickerModal from './AssetImagePickerModal.vue'
import { useToast } from '@comic/composables/useToast'
import { imageGenerationService } from '@comic/services/imageGenerationService'
import { buildSharedBlockSection, effectiveVariantRefImages } from '@comic/services/panelPromptService'
import { getSharedRefImages } from '@comic/utils/sharedBlocks'
import { resolveActiveGenSlot, slotAttachShared } from '@comic/utils/genPromptSlots'
import { buildAssetPromptPrompt, buildSingleAssetPrompt, buildStyleContext, buildTargetList, generateAssetPrompts, rewriteAssetPrompt, type AssetPromptTarget } from '@comic/services/assetPromptService'
import { AssetPromptParseError, describeParseFailure, parseAssetPromptResponse, type AssetPromptParseDiagnostics } from '@comic/services/assetPromptParser'
import type { AssetUsageIndex } from '@comic/services/assetUsageService'
import type { AssetGenConfig, GenPromptSlot, LongProjectAsset, LongProjectAssetVariant, LongProjectChapterAsset, ModelConfig, PromptTemplate } from '@comic/types'

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
  /** 接力定位目标（从分镜页跳转时携带，选中具体资产/视觉状态）。 */
  focusTarget?: { assetId: string; variantId?: string } | null
  /** 项目范围孤儿数据条数（没有任何章节引用的视觉状态 + 章节资产），> 0 时左列表顶部显示清理入口。 */
  orphanCount?: number
  /** 资产引用索引（章节引用 + 分镜绑定 + 图片级在用情况），用于显示「被谁引用」。 */
  usage?: AssetUsageIndex
  /** 本章 id：判断「本章是不是该资产的原章节」（决定能否删图，以及本章是否手工引用了某状态）。 */
  chapterId?: string
  /** 项目全部章节引用（判断本章是不是引用方 → 「引用自 X」角标与「移出本章」）。 */
  chapterAssets?: LongProjectChapterAsset[]
  /** 章节 id → 名称（角标与删除影响提示里用可读名）。 */
  chapterNames?: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:asset', payload: { assetId: string; variantId: string; patch: Partial<LongProjectAssetVariant> }): void
  (e: 'update:gen-config', config: AssetGenConfig): void
  (e: 'prompt-completed'): void
  /** 清理孤儿数据：由容器执行（需要项目级资产与章节引用，工作台只有本章视图）。 */
  (e: 'clear-orphans'): void
  /** 引用其他章节已生成的图：弹窗与写库由容器负责（它才有全项目章节与引用表）。 */
  (e: 'link-chapter', payload: { asset: LongProjectAsset; variant: LongProjectAssetVariant }): void
  /** 移出本章：只删本章引用条目，不动原章节的图。 */
  (e: 'detach-chapter', payload: { asset: LongProjectAsset; variant: LongProjectAssetVariant }): void
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
  // 「缺参考图」= 这条资产没有任何可用的成品图（生成图 + 自上传图），与分镜取图同一口径
  missing: asset.variants.some((variant) => !effectiveVariantRefImages(variant).length),
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

/**
 * 该资产的**原章节**：最早出现它的章节（`sourceChapterIds[0]`）。
 * `scope: 'project'` 的公共资产没有单一归属，视为哪一章都能维护（可删）。
 */
function ownerChapterIdOf(asset: LongProjectAsset): string | undefined {
  if (asset.scope === 'project') return undefined
  return asset.sourceChapterIds[0]
}

/** 本章是不是这条资产的**原章节** —— 只有原章节能删图（引用方章节只读 + 可移出）。 */
const selectedCanDeleteImages = computed(() => {
  const asset = selectedItem.value?.asset
  if (!asset || !props.chapterId) return true
  const owner = ownerChapterIdOf(asset)
  return !owner || owner === props.chapterId
})

/** 本章是引用方时，显示「引用自 X」角标（图只在原章节增删）。 */
const selectedLinkedChapterName = computed(() => {
  const asset = selectedItem.value?.asset
  if (!asset || !props.chapterId || selectedCanDeleteImages.value) return ''
  const owner = ownerChapterIdOf(asset)
  if (!owner) return ''
  return props.chapterNames?.[owner] ?? owner
})

/** 本章引用了这条状态、且本章不是原章节 → 显示「移出本章」。 */
const selectedDetachVisible = computed(() => {
  const asset = selectedItem.value?.asset
  const variant = selectedVariant.value
  if (!asset || !variant || !props.chapterId || selectedCanDeleteImages.value) return false
  return (props.chapterAssets ?? []).some((entry) => entry.chapterId === props.chapterId
    && entry.assetId === asset.id
    && (!entry.variantId || entry.variantId === variant.id))
})

/** 本章的可读名（删除影响提示里排除「自己」用）。 */
const currentChapterName = computed(() => (props.chapterId ? props.chapterNames?.[props.chapterId] ?? '' : ''))
// 接力定位：从分镜页跳转携带的资产/视觉状态，挂载或变化时选中（nextTick 等上面的选中重置跑完再落 variant）
watch(() => props.focusTarget, async (target) => {
  if (!target || !props.assets.some((asset) => asset.id === target.assetId)) return
  selectedAssetId.value = target.assetId
  await nextTick()
  selectedVariantId.value = target.variantId ?? null
}, { immediate: true })
const assetPromptTemplates = computed(() => props.templates.filter((t) => t.type === 'asset-prompt').sort((a, b) => a.sortOrder - b.sortOrder))
/** 资产生图自己的共用属性（与分镜绘图配置的 sharedBlocks 无关）。 */
const assetSharedBlocks = computed(() => props.assetGenConfig?.sharedBlocks ?? [])
const styleContext = computed(() => buildStyleContext(assetSharedBlocks.value, props.paintingStyle ?? ''))
const currentImageModel = computed(() => props.imageModels.find((m) => m.id === props.assetGenConfig?.imageModelId))
/** 资产图选择弹窗数据源：项目全部资产。 */
const pickerAssets = computed(() => props.allAssets ?? props.assets)
/** 提示词生成目标：全部视觉状态（批量始终全部重新生成，覆盖已有提示词）。 */
const allPromptTargets = computed<AssetPromptTarget[]>(() => props.assets
  .map((asset) => ({ asset, variants: asset.variants }))
  .filter((item) => item.variants.length))
const totalVariantCount = computed(() => allPromptTargets.value.reduce((count, item) => count + item.variants.length, 0))
/** 有可生成目标：本章存在任一视觉状态即可（含全部重写场景），不再因「都有提示词」而禁用。 */
const hasPromptTargets = computed(() => totalVariantCount.value > 0)
/** 生图目标：有提示词但还没有生成图的状态。 */
const genTargets = computed(() => props.assets.flatMap((asset) => asset.variants
  // 用「当前选中那条」的正文判断有没有可发的提示词，与 composeAssetPrompt 同源。
  .filter((v) => activeGenSlot(v).text?.trim() && !(v.generatedImageIds ?? []).length)
  .map((variant) => ({ asset, variant }))))
const hasGenTargets = computed(() => genTargets.value.length > 0)

// ========== 提示词 ==========
/** 构建批量提示词生成用的最终 prompt（供弹窗预览，按所选发送方式取形态；只按模板内容拼）。 */
function buildPromptPreview(template: PromptTemplate, sendMode?: 'once' | 'per-item'): string {
  // 逐条发送：预览首个目标的单条拼装提示词（结果直接取全文回填，不解析）
  if (sendMode === 'per-item') {
    const first = allPromptTargets.value.flatMap(({ asset, variants }) => variants.map((variant) => ({ asset, variant })))[0]
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
    targets: allPromptTargets.value.map(({ asset, variants }) => ({ asset: toRaw(asset), variants: variants.map(toRaw) })),
    styleContext: styleContext.value,
    targetImageModel: currentImageModel.value?.name,
  })
}

// ========== 批量提示词：规划 → 执行（弹窗内进度） → 保存回填 ==========

type BatchPromptOptions = { modelId: string; templateId: string; prompt?: string; sendMode?: 'once' | 'per-item' }

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
function buildPromptItems(template: PromptTemplate): Array<AssetPromptRunItem & { prompt: string }> {
  return allPromptTargets.value.flatMap(({ asset, variants }) => variants.map((variant) => ({
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
 * - 范围：始终全部视觉状态（覆盖已有提示词）；
 * - 发送方式：一次性（全部状态一份清单一次请求）/ 逐条（每个状态单独请求，失败不中断，文本取弹窗内已修改的每条）；
 * - **两种方式都不自动落库**：结果只回传到弹窗，等用户核对后点「填充到资产」才回填（见 savePromptResults）。
 */
async function runBatchPrompts(options: BatchPromptOptions & { perItemPrompts?: Array<{ variantId: string; prompt: string }> }) {
  const context = resolveBatchContext(options)
  if (!context) return
  const sendMode = options.sendMode === 'per-item' ? 'per-item' : 'once'
  const targets = allPromptTargets.value
  if (!targets.length) {
    toast.error('本章暂无视觉状态')
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

// ========== 外部 AI 代跑（仅一次性发送）：复制提示词 → 外部生成 → 导入解析回填 ==========

const promptImportVisible = ref(false)

/** 解析外部 AI 返回的逐条提示词：与内置批量共用同一目标清单与同一解析器。 */
function parseImportedAssetPrompts(content: string) {
  const { index, ordered } = buildTargetList(allPromptTargets.value)
  const { items, diagnostics } = parseAssetPromptResponse(content, { index, ordered })
  if (!items.length) throw new Error(describeParseFailure(diagnostics))
  return items
}

/** 导入解析预览（ManualResultImportDialog 的 parse 回调）。 */
function parsePromptImportPreview(content: string) {
  const items = parseImportedAssetPrompts(content)
  return {
    title: `解析到 ${items.length} 条提示词`,
    items: items.map((item) => `${item.assetName} · ${item.variantName}：${item.imagePrompt.slice(0, 40)}${item.imagePrompt.length > 40 ? '…' : ''}`),
  }
}

/**
 * 确认导入：解析结果按「一次性发送」回执写入弹窗（与内置模型返回同一口径），
 * 结果只留在弹窗内，等用户核对后点「填充到资产」才写回。
 * 同时补记执行上下文（模型/模板取项目默认配置），让导入后也能用「重新生成」走内置模型。
 */
function confirmPromptImport(content: string) {
  const items = parseImportedAssetPrompts(content)
  if (!batchRuns.once) {
    const model = props.llmModels.find((m) => m.id === props.assetGenConfig?.promptModelId) ?? props.llmModels[0]
    const template = assetPromptTemplates.value.find((t) => t.id === props.assetGenConfig?.promptTemplateId) ?? assetPromptTemplates.value[0]
    if (model && template) batchRuns.once = { model, template, targets: allPromptTargets.value }
  }
  reportItemProgress('batch-once', 'done', {
    items: items.map((item) => ({
      assetId: item.assetId,
      variantId: item.variantId,
      assetName: item.assetName,
      variantName: item.variantName,
      imagePrompt: item.imagePrompt,
      // 非精确命中（模糊匹配 / 顺序兜底）在弹窗里标出来，提醒用户核对归属
      match: item.match,
    })),
  })
  emit('prompt-completed')
  const expected = totalVariantCount.value
  if (items.length < expected) {
    toast.warning(`已导入 ${items.length} 条，有 ${expected - items.length} 个状态未返回（已在弹窗内标出，可修改后再次导入或单条 AI 重写）`)
  } else {
    toast.success(`已导入 ${items.length} 条提示词，请核对后点「填充到资产」写回`)
  }
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

/** 候选提示词条整体写回（正文 / 开关 / 当前选中）。 */
function updateGenSlots(asset: LongProjectAsset, variant: LongProjectAssetVariant, slots: GenPromptSlot[], activeId: string) {
  emit('update:asset', {
    assetId: asset.id,
    variantId: variant.id,
    patch: { genPrompts: slots, activeGenPromptId: activeId },
  })
}

/**
 * 当前选中的候选提示词条 —— **选哪条就发哪条**。
 * 没建过条时由 `resolveActiveGenSlot` 返回一条「按默认开看待」的槽（正文取 `imagePrompt`）。
 */
function activeGenSlot(variant: LongProjectAssetVariant): GenPromptSlot {
  return resolveActiveGenSlot(variant)
}

// ========== 生图 ==========
/**
 * 最终发送的生图提示词 = 共用属性（插入最前）+ 绘画提示词 + 共用属性（插入最后）。
 * 拼接逻辑与分镜生图相同，但共用属性取资产自己的 `assetGenConfig.sharedBlocks`，与分镜不互通；
 * 「查看提示词」弹窗与实际发送共用此函数。
 *
 * **只拼当前选中那条**：关掉它的「拼接共用属性」就前后置都不拼（对应的图也从 `genRefImages` 里剔除），
 * 否则提示词会指向一批根本没发出去的图。
 */
function composeAssetPrompt(variant: LongProjectAssetVariant): string {
  const slot = activeGenSlot(variant)
  if (!slotAttachShared(slot)) return (slot.text ?? '').trim()
  const front = buildSharedBlockSection(assetSharedBlocks.value, 'front')
  const back = buildSharedBlockSection(assetSharedBlocks.value, 'back')
  return [front, slot.text ?? '', back].map((part) => part.trim()).filter(Boolean).join('\n\n')
}

/** 单张生成：用户上传的参考图作为参数发给模型，结果按比例进入生成预览区。 */
async function generateImage(asset: LongProjectAsset, variant: LongProjectAssetVariant) {
  const model = currentImageModel.value
  if (!model) { toast.error('请先在「生图配置」中选择生图模型'); configDrawerVisible.value = true; return }
  if (!activeGenSlot(variant).text?.trim()) { toast.error('请先生成或填写绘画提示词'); return }
  genBusyIds.add(variant.id)
  try {
    const config = props.assetGenConfig ?? defaultGenConfig()
    const result = await imageGenerationService.generateWithModel(
      model,
      composeAssetPrompt(variant),
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
        composeAssetPrompt(variant),
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

/**
 * 资产生图实际发送的参考图，顺序决定图号（与提示词里的「图N」一致）：
 * 1. 共用属性「插入最前」且启用参考图的图（按属性顺序、块内上传顺序）；
 * 2. 这个视觉状态自己上传的参考图接在后面。
 * 「插入最后」的共用属性不参与取图。
 */
function genRefImages(variant: LongProjectAssetVariant): string[] {
  // 关掉「拼接共用属性」时共用属性图也不发，本状态上传图直接从「图1」起（与卡片角标同一口径）。
  const shared = slotAttachShared(activeGenSlot(variant)) ? getSharedRefImages(assetSharedBlocks.value) : []
  return [...shared, ...variant.referenceImageIds]
}

/** 共用属性参考图张数：本状态上传图的图号从这之后续编（图 sharedRefImageCount+1 起）。 */
const sharedRefImageCount = computed(() => getSharedRefImages(assetSharedBlocks.value).length)

/** 保存生图配置。 */
function saveGenConfig(config: AssetGenConfig) {
  emit('update:gen-config', config)
  toast.success('生图配置已保存')
}

// ========== 最终生图提示词查看弹窗 ==========
const finalPromptModalVisible = ref(false)
const finalPromptModalCopied = ref(false)
const finalPromptModalTarget = ref<{ asset: LongProjectAsset; variant: LongProjectAssetVariant } | null>(null)
const finalPromptModalText = computed(() => (finalPromptModalTarget.value ? composeAssetPrompt(finalPromptModalTarget.value.variant) : ''))

/** 查看某视觉状态拼接后的最终生图提示词（与 generateImage 发送内容同源）。 */
function openPromptModal(asset: LongProjectAsset, variant: LongProjectAssetVariant) {
  finalPromptModalTarget.value = { asset, variant }
  finalPromptModalCopied.value = false
  finalPromptModalVisible.value = true
}

async function copyPromptModalText() {
  const text = finalPromptModalText.value.trim()
  if (!text) { toast.warning('提示词为空，请先填写绘画提示词'); return }
  try {
    await navigator.clipboard.writeText(text)
    finalPromptModalCopied.value = true
    setTimeout(() => { finalPromptModalCopied.value = false }, 1600)
  } catch {
    toast.error('复制失败，请手动选择文本复制')
  }
}

function defaultGenConfig(): AssetGenConfig {
  return { imageModelId: '', aspectRatio: '', resolution: '', quality: '', sharedBlocks: [], concurrency: 1 }
}

// ========== 参考图与生成预览管理 ==========

/** 删除确认弹窗状态：成品图删除一律先确认（卡片右上角叉 / 大图预览内删除两个入口）。 */
const deleteConfirmVisible = ref(false)
const deleteTarget = ref<{ asset: LongProjectAsset; variant: LongProjectAssetVariant; image: string; source: 'generated' | 'uploaded' | 'reference' } | null>(null)
const deleteConfirmTitle = computed(() => (deleteTarget.value?.source === 'reference' ? '删除这张参考图' : '删除这张图'))

/**
 * 删除确认文案。**被别的章节引用时**列出来是哪些章节并说明会同步消失 ——
 * 图只有一份（引用方章节共用同一条状态记录），删掉后引用它的章节也会失去这张图，
 * 分镜里已选它的位置按「显示哪张就用哪张」的口径回落到该状态的第一张。
 */
const deleteConfirmContent = computed(() => {
  const target = deleteTarget.value
  if (!target) return ''
  const kind = target.source === 'generated' ? '生成图' : target.source === 'uploaded' ? '上传图' : '参考图'
  const base = `将删除「${target.asset.name} · ${target.variant.name}」的一张${kind}，删除后无法恢复。`
  if (target.source === 'reference') return `${base}是否确认？`
  const others = (props.usage?.variants.get(target.variant.id)?.chapterNames ?? [])
    .filter((name) => name !== currentChapterName.value)
  if (!others.length) return `${base}是否确认？`
  return `${base}该视觉状态被 ${others.join('、')} 引用，删除后这些章节也会同步失去这张图（分镜里已选它的位置会回落到该状态的第一张）。是否确认？`
})

/**
 * 当前资产区右上角叉：先确认再删除。
 * **图只能在原章节删** —— 引用方章节直接拦下并指路（图由原章节维护）。
 */
function requestDeleteAssetImage(asset: LongProjectAsset, payload: { variant: LongProjectAssetVariant; image: string }) {
  if (!selectedCanDeleteImages.value) {
    toast.warning(`这张图属于「${selectedLinkedChapterName.value || '原章节'}」的资产，请到原章节删除`)
    return
  }
  const source = assetImageSource(payload.variant, payload.image)
  if (!source) return
  deleteTarget.value = { asset, variant: payload.variant, image: payload.image, source }
  deleteConfirmVisible.value = true
}

/** 确认删除：真正执行落库。 */
function confirmDeleteImage() {
  const target = deleteTarget.value
  if (!target) return
  executeDelete(target)
  const previewIndexAt = previewImages.value.indexOf(target.image)
  if (previewIndexAt >= 0) shrinkPreviewAfterDelete(previewIndexAt)
  deleteTarget.value = null
}

/** 执行删除落库（update:asset 由父级走 read-modify-write 持久化）。 */
function executeDelete(target: { asset: LongProjectAsset; variant: LongProjectAssetVariant; image: string; source: 'generated' | 'uploaded' | 'reference' }) {
  if (target.source === 'reference') {
    removeImage(target.asset, { variant: target.variant, index: target.variant.referenceImageIds.indexOf(target.image) })
    return
  }
  removeAssetImage(target.asset, { variant: target.variant, image: target.image })
}

/** 预览数组同步收缩，避免显示已删除的图。 */
function shrinkPreviewAfterDelete(index: number) {
  previewImages.value = previewImages.value.filter((_, i) => i !== index)
  if (previewIndex.value >= previewImages.value.length) {
    previewIndex.value = Math.max(0, previewImages.value.length - 1)
  }
}

/** 当前资产区：上传成品图（进 `uploadedImageIds`，与生成图一样可被分镜取用）。 */
function addAssetImage(asset: LongProjectAsset, payload: { variant: LongProjectAssetVariant; url: string }) {
  const next = [...(payload.variant.uploadedImageIds ?? []), payload.url]
  emit('update:asset', { assetId: asset.id, variantId: payload.variant.id, patch: { uploadedImageIds: next } })
}

/** 这张成品图归哪个数组（生成图 / 自上传图）；都不是则 null。 */
function assetImageSource(variant: LongProjectAssetVariant, image: string): 'generated' | 'uploaded' | null {
  if ((variant.generatedImageIds ?? []).includes(image)) return 'generated'
  if ((variant.uploadedImageIds ?? []).includes(image)) return 'uploaded'
  return null
}

/** 按 URL 从对应数组里摘掉一张成品图。 */
function removeAssetImage(asset: LongProjectAsset, payload: { variant: LongProjectAssetVariant; image: string }) {
  const source = assetImageSource(payload.variant, payload.image)
  if (!source) return
  const patch: Partial<LongProjectAssetVariant> = source === 'generated'
    ? { generatedImageIds: (payload.variant.generatedImageIds ?? []).filter((url) => url !== payload.image) }
    : { uploadedImageIds: (payload.variant.uploadedImageIds ?? []).filter((url) => url !== payload.image) }
  emit('update:asset', { assetId: asset.id, variantId: payload.variant.id, patch })
}

function removeImage(asset: LongProjectAsset, payload: { variant: LongProjectAssetVariant; index: number }) {
  const next = payload.variant.referenceImageIds.filter((_, index) => index !== payload.index)
  emit('update:asset', { assetId: asset.id, variantId: payload.variant.id, patch: { referenceImageIds: next } })
}

function addImage(asset: LongProjectAsset, payload: { variant: LongProjectAssetVariant; url: string }) {
  emit('update:asset', { assetId: asset.id, variantId: payload.variant.id, patch: { referenceImageIds: [...payload.variant.referenceImageIds, payload.url] } })
}

function openPreview(payload: { images: string[]; index: number }) {
  previewImages.value = [...payload.images]
  previewIndex.value = payload.index
  previewAlt.value = previewImageAlt()
  previewVisible.value = true
}

/** 通过图片反查所属视觉状态及其所在区域（当前资产区 / 参考图区）。 */
function findImageOwner(image: string): { asset: LongProjectAsset; variant: LongProjectAssetVariant; source: 'generated' | 'uploaded' | 'reference' } | null {
  for (const item of workAssets.value) {
    for (const variant of item.asset.variants) {
      const source = assetImageSource(variant, image)
      if (source) return { asset: item.asset, variant, source }
      if (variant.referenceImageIds.includes(image)) return { asset: item.asset, variant, source: 'reference' }
    }
  }
  return null
}

function previewImageAlt(): string {
  const image = previewImages.value[previewIndex.value]
  const found = image ? findImageOwner(image) : null
  if (!found) return '图片'
  const label = found.source === 'generated' ? '生成图' : found.source === 'uploaded' ? '上传图' : '参考图'
  return `${found.asset.name} · ${found.variant.name} · ${label}`
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

<style>
/* 不加 scoped：弹窗 Teleport 到 body，scoped 选择器匹配不上。
   缺这段过渡时，Vue 会把进入态停在 opacity:0，弹窗在但看不见，看起来像按钮没反应。 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
