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
          v-for="item in visibleAssets"
          :key="item.asset.id"
          class="mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors"
          :class="selectedAssetId === item.asset.id ? 'bg-cyan-500/10 text-cyan-400' : 'text-text-secondary hover:bg-app-bg'"
          @click="selectedAssetId = item.asset.id"
        >
          <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="item.missing ? 'bg-amber-400' : 'bg-emerald-400'" :title="item.missing ? '缺参考图' : '参考图齐全'" />
          <span class="min-w-0 flex-1 truncate">{{ item.asset.name }}</span>
          <span class="shrink-0 text-[11px] text-text-muted">{{ item.asset.variants.length }}</span>
        </button>
        <p v-if="!visibleAssets.length" class="px-2 py-4 text-xs text-text-muted">{{ filterMissing ? '全部资产都已有参考图' : '本章暂无资产' }}</p>
      </aside>

      <div class="custom-scrollbar min-w-0 flex-1 overflow-y-auto p-4">
        <template v-if="selectedItem">
          <div class="mb-3 flex items-center gap-2">
            <component :is="typeIcon(selectedItem.asset.type)" :size="16" class="text-text-muted" />
            <h3 class="min-w-0 truncate text-sm font-medium text-text-primary">{{ selectedItem.asset.name }}</h3>
            <span class="text-xs text-text-muted">{{ selectedItem.asset.variants.length }} 个视觉状态</span>
          </div>
          <div class="flex flex-col gap-3">
            <AssetVariantCard
              v-for="variant in selectedItem.asset.variants"
              :key="variant.id"
              :variant="variant"
              :is-first-for-chapter="isFirstForChapter(variant.id)"
              :prompt-busy="promptBusyIds.has(variant.id)"
              :gen-busy="genBusyIds.has(variant.id)"
              @update:prompt="(value) => updatePrompt(selectedItem!.asset, variant, value)"
              @rewrite-prompt="(v) => openRewriteModal(selectedItem!.asset, v)"
              @generate="(v) => generateImage(selectedItem!.asset, v)"
              @remove-gen-image="(payload) => removeGeneratedImage(selectedItem!.asset, payload)"
              @remove-image="(payload) => removeImage(selectedItem!.asset, payload)"
              @add-image="(payload) => addImage(selectedItem!.asset, payload)"
              @preview="(payload) => openPreview(payload)"
            />
          </div>
        </template>
        <div v-else class="flex h-full flex-col items-center justify-center text-center">
          <Boxes :size="26" class="mb-3 text-text-muted" />
          <p class="text-sm text-text-secondary">选择左侧资产查看视觉状态</p>
        </div>
      </div>
    </div>

    <!-- 批量提示词弹窗（可选生成范围与发送方式） -->
    <AssetPromptGenerateModal
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
      @confirm="runBatchPrompts"
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
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇章节资产生图工作台：批量/单条提示词生成 + 批量/单张参考图生图 + 本地上传。
 * 数据（assets / assetGenConfig）由父组件传入并回写持久化；本组件只编排交互。
 */
import { computed, reactive, ref, toRaw } from 'vue'
import { Boxes, MapPin, Package, UserRound } from 'lucide-vue-next'
import AssetVariantCard from './AssetVariantCard.vue'
import AssetPromptGenerateModal from './AssetPromptGenerateModal.vue'
import AssetImageGenDrawer from './AssetImageGenDrawer.vue'
import AssetImagePreviewModal from './AssetImagePreviewModal.vue'
import { useToast } from '@comic/composables/useToast'
import { imageGenerationService } from '@comic/services/imageGenerationService'
import { buildAssetPromptPrompt, buildSingleAssetPrompt, buildStyleContext, generateAssetPrompts, rewriteAssetPrompt, type AssetPromptTarget } from '@comic/services/assetPromptService'
import type { AssetGenConfig, LongProjectAsset, LongProjectAssetVariant, ModelConfig, PromptTemplate, SharedPromptBlock } from '@comic/types'

interface Props {
  /** 本章涉及的资产（已按章节引用过滤出相关 variants） */
  assets: LongProjectAsset[]
  chapterId: string
  llmModels: ModelConfig[]
  imageModels: ModelConfig[]
  templates: PromptTemplate[]
  assetGenConfig?: AssetGenConfig
  paintingStyle?: string
  sharedBlocks?: SharedPromptBlock[]
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
const filterMissing = ref(false)
const promptModalVisible = ref(false)
const configDrawerVisible = ref(false)
const previewVisible = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)
const previewAlt = ref('')
/** 当前预览的图片来源：生成预览暂存区 / 正式参考图区。 */
const previewSource = ref<'generated' | 'reference'>('reference')
const promptBusyIds = reactive(new Set<string>())
const genBusyIds = reactive(new Set<string>())
const promptBatchBusy = ref(false)
const batchBusy = ref(false)
const batchDone = ref(0)
const batchTotal = ref(0)

// ========== 派生数据 ==========
/** 工作资产：带缺图标记（无生成图 = 缺）。 */
const workAssets = computed(() => props.assets.map((asset) => ({
  asset,
  missing: asset.variants.some((variant) => !(variant.generatedImageIds ?? []).length),
})))
const visibleAssets = computed(() => filterMissing.value ? workAssets.value.filter((item) => item.missing) : workAssets.value)
const selectedItem = computed(() => workAssets.value.find((item) => item.asset.id === selectedAssetId.value) ?? visibleAssets.value[0] ?? null)
const assetPromptTemplates = computed(() => props.templates.filter((t) => t.type === 'asset-prompt').sort((a, b) => a.sortOrder - b.sortOrder))
const styleContext = computed(() => buildStyleContext(props.sharedBlocks ?? [], props.paintingStyle ?? ''))
const currentImageModel = computed(() => props.imageModels.find((m) => m.id === props.assetGenConfig?.imageModelId))
/** 本章新状态 id 集合（variant.firstAppearanceChapterId === chapterId）。 */
const chapterNewVariantIds = computed(() => new Set(
  props.assets.flatMap((asset) => asset.variants.filter((v) => v.firstAppearanceChapterId === props.chapterId).map((v) => v.id)),
))
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
/** 构建批量提示词生成用的最终 prompt（供弹窗预览，按所选范围/发送方式取目标；输出协议取模板自定义）。 */
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
      templateContent: template.content,
      outputProtocol: template.outputProtocol,
    })
  }
  // 一次性发送：系统需按【资产名｜状态名】逐条解析回填，模板未自定义协议时用系统兜底协议
  return buildAssetPromptPrompt({
    templateContent: template.content,
    targets: targets.map(({ asset, variants }) => ({ asset: toRaw(asset), variants: variants.map(toRaw) })),
    styleContext: styleContext.value,
    targetImageModel: currentImageModel.value?.name,
    outputProtocol: template.outputProtocol,
    requireParseable: true,
  })
}

/**
 * 批量提示词生成（弹窗确认后执行）。
 * - 范围：仅补缺失 / 全部重新生成；
 * - 发送方式：一次性（全部状态一份清单一次请求）/ 逐条（每个状态单独请求，失败不中断）。
 */
async function runBatchPrompts(options: { modelId: string; templateId: string; prompt?: string; scope?: 'missing' | 'all'; sendMode?: 'once' | 'per-item' }) {
  const model = props.llmModels.find((m) => m.id === options.modelId)
  const template = assetPromptTemplates.value.find((t) => t.id === options.templateId)
  if (!model || !template) return
  const scopeTargets = options.scope === 'all' ? allPromptTargets.value : promptTargets.value
  if (!scopeTargets.length) {
    toast.error(options.scope === 'all' ? '本章暂无视觉状态' : '所有状态都已有提示词，可切换为「全部重新生成」')
    return
  }
  // 确认后立即关闭弹窗，生成进度由各状态卡片「生成中…」体现
  promptModalVisible.value = false
  promptBatchBusy.value = true
  scopeTargets.forEach(({ variants }) => variants.forEach((v) => promptBusyIds.add(v.id)))
  try {
    if (options.sendMode === 'per-item') {
      // 逐条发送：每个视觉状态单独一次请求，失败记录后继续下一条
      let done = 0
      let failed = 0
      for (const { asset, variants } of scopeTargets) {
        for (const variant of variants) {
          try {
            const prompt = buildSingleAssetPrompt({
              asset: toRaw(asset),
              variant: toRaw(variant),
              currentPrompt: variant.imagePrompt,
              styleContext: styleContext.value,
              templateContent: template.content,
              outputProtocol: template.outputProtocol,
            })
            const imagePrompt = await rewriteAssetPrompt({ model, asset: toRaw(asset), variant: toRaw(variant), prompt })
            emit('update:asset', { assetId: asset.id, variantId: variant.id, patch: { imagePrompt } })
            done += 1
          } catch (error) {
            failed += 1
            console.error(`[资产提示词] ${asset.name}·${variant.name} 逐条生成失败:`, error)
          } finally {
            promptBusyIds.delete(variant.id)
          }
        }
      }
      emit('prompt-completed')
      emit('update:gen-config', { ...(props.assetGenConfig ?? defaultGenConfig()), promptModelId: options.modelId, promptTemplateId: options.templateId })
      toast[failed ? 'warning' : 'success'](`逐条发送完成：成功 ${done}，失败 ${failed}`)
    } else {
      // 一次性发送：全部状态一份清单，一次请求返回全部
      const targets = scopeTargets.map(({ asset, variants }) => ({ asset: toRaw(asset), variants: variants.map(toRaw) }))
      const result = await generateAssetPrompts({
        model,
        template,
        targets,
        styleContext: styleContext.value,
        targetImageModel: currentImageModel.value?.name,
        prompt: options.prompt,
      })
      for (const item of result.items) {
        emit('update:asset', { assetId: item.assetId, variantId: item.variantId, patch: { imagePrompt: item.imagePrompt } })
      }
      emit('prompt-completed')
      emit('update:gen-config', { ...(props.assetGenConfig ?? defaultGenConfig()), promptModelId: options.modelId, promptTemplateId: options.templateId })
      toast.success(`已生成 ${result.items.length} 条提示词`)
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '提示词生成失败')
  } finally {
    promptBusyIds.clear()
    promptBatchBusy.value = false
    promptModalVisible.value = false
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

/** 构建单条生成/重写的最终 prompt（模板 + 该状态信息；输出协议取模板自定义，未自定义则不附加）。 */
function buildRewritePreview(template: PromptTemplate): string {
  const target = rewriteTarget.value
  if (!target) return ''
  return buildSingleAssetPrompt({
    asset: toRaw(target.asset),
    variant: toRaw(target.variant),
    currentPrompt: target.variant.imagePrompt,
    styleContext: styleContext.value,
    templateContent: template.content,
    outputProtocol: template.outputProtocol,
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

function isFirstForChapter(variantId: string): boolean {
  return chapterNewVariantIds.value.has(variantId)
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
