<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- 视图切换 + 完成度 + 工作台批量操作 -->
    <div class="flex shrink-0 items-center gap-3 border-b border-border-subtle px-5 py-2">
      <div class="inline-flex h-7 rounded-md border border-border-subtle bg-app-bg p-0.5">
        <button
          class="rounded px-3 text-xs transition-colors"
          :class="view === 'browse' ? 'bg-elevated text-cyan-400 shadow-sm' : 'text-text-muted hover:text-text-primary'"
          @click="view = 'browse'"
        >浏览</button>
        <button
          class="rounded px-3 text-xs transition-colors"
          :class="view === 'workbench' ? 'bg-elevated text-cyan-400 shadow-sm' : 'text-text-muted hover:text-text-primary'"
          @click="view = 'workbench'"
        >生图工作台</button>
      </div>
      <span class="rounded border border-border-subtle bg-app-bg px-1.5 py-0.5 text-[11px] text-text-secondary">提示词 {{ promptProgress }}</span>
      <span class="rounded border border-border-subtle bg-app-bg px-1.5 py-0.5 text-[11px] text-text-secondary">生成图 {{ imageProgress }}</span>
      <span v-if="view === 'workbench' && allComplete" class="text-[11px] text-emerald-400">本章资产已就绪，可继续分镜创作</span>

      <!-- 工作台模式：批量操作按钮（来自工作台 expose 的状态与方法） -->
      <div v-if="view === 'workbench'" class="ml-auto flex shrink-0 items-center gap-2">
        <button
          class="secondary-button h-7 shrink-0 px-3 text-xs"
          :disabled="wb?.promptBatchBusy || !wb?.hasPromptTargets"
          :title="wb?.hasPromptTargets ? '为视觉状态批量生成绘画提示词，可选仅补缺失或全部重新生成' : '本章暂无视觉状态，请先完成资产提取'"
          @click="wb?.openPromptModal()"
        >
          <LoaderCircle v-if="wb?.promptBatchBusy" :size="13" class="shrink-0 animate-spin" />
          <Sparkles v-else :size="13" class="shrink-0" />
          批量生成提示词
        </button>
        <button class="secondary-button h-7 shrink-0 px-3 text-xs" :disabled="wb?.batchBusy || !wb?.hasGenTargets" @click="wb?.runBatchGen()">
          <LoaderCircle v-if="wb?.batchBusy" :size="13" class="shrink-0 animate-spin" />
          <ImagePlus v-else :size="13" class="shrink-0" />
          批量生图{{ wb?.batchBusy ? ` ${wb.batchDone}/${wb.batchTotal}` : '' }}
        </button>
        <button class="secondary-button h-7 shrink-0 px-3 text-xs" @click="wb?.openConfigDrawer()">
          <Settings2 :size="13" class="shrink-0" />
          生图配置
        </button>
      </div>
    </div>

    <!-- 浏览模式：现有展示组件原样复用 -->
    <div v-if="view === 'browse'" class="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
      <LongProjectChapterAssets :entries="entries" :assets="assets" />
    </div>

    <!-- 生图工作台模式 -->
    <LongProjectAssetWorkbench
      v-else
      ref="workbenchRef"
      :assets="workbenchAssets"
      :chapter-id="chapterId"
      :llm-models="llmModels"
      :image-models="imageModels"
      :templates="templates"
      :asset-gen-config="assetGenConfig"
      :painting-style="paintingStyle"
      :shared-blocks="sharedBlocks"
      @update:asset="handleUpdateAsset"
      @update:gen-config="handleUpdateGenConfig"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 章节资产 Tab 容器：「浏览（默认）⇄ 生图工作台」双视图切换。
 * 浏览模式复用现有 LongProjectChapterAssets；工作台负责提示词/参考图生产。
 */
import { computed, ref } from 'vue'
import { ImagePlus, LoaderCircle, Settings2, Sparkles } from 'lucide-vue-next'
import LongProjectChapterAssets from './LongProjectChapterAssets.vue'
import LongProjectAssetWorkbench from './LongProjectAssetWorkbench.vue'
import type { AssetGenConfig, LongProjectAsset, LongProjectChapterAsset, LongProjectAssetVariant, ModelConfig, PromptTemplate, SharedPromptBlock } from '@comic/types'

interface Props {
  entries: LongProjectChapterAsset[]
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
}>()

const view = ref<'browse' | 'workbench'>('browse')
/** 工作台实例引用：顶部工具行按钮调用其暴露的批量操作。 */
const workbenchRef = ref<InstanceType<typeof LongProjectAssetWorkbench> | null>(null)
const wb = computed(() => (view.value === 'workbench' ? workbenchRef.value : null))

/** 工作台资产：按章节引用过滤出本章相关的 variants（与分镜生成同一口径）。 */
const workbenchAssets = computed(() => {
  if (!props.entries.length) return props.assets
  return props.assets.flatMap((asset) => {
    const entries = props.entries.filter((entry) => entry.assetId === asset.id)
    if (!entries.length) return []
    const variantIds = new Set(entries.map((entry) => entry.variantId).filter((id): id is string => Boolean(id)))
    return [{ ...asset, variants: variantIds.size ? asset.variants.filter((variant) => variantIds.has(variant.id)) : asset.variants }]
  })
})

const totalVariants = computed(() => workbenchAssets.value.reduce((count, asset) => count + asset.variants.length, 0))
const promptProgress = computed(() => {
  const done = workbenchAssets.value.reduce((count, asset) => count + asset.variants.filter((v) => v.imagePrompt?.trim()).length, 0)
  return `${done}/${totalVariants.value}`
})
const imageProgress = computed(() => {
  const done = workbenchAssets.value.reduce((count, asset) => count + asset.variants.filter((v) => (v.generatedImageIds ?? []).length).length, 0)
  return `${done}/${totalVariants.value}`
})
const allComplete = computed(() => totalVariants.value > 0
  && workbenchAssets.value.every((asset) => asset.variants.every((v) => v.imagePrompt?.trim() && (v.generatedImageIds ?? []).length)))

function handleUpdateAsset(payload: { assetId: string; variantId: string; patch: Partial<LongProjectAssetVariant> }) {
  emit('update:asset', payload)
}

function handleUpdateGenConfig(config: AssetGenConfig) {
  emit('update:gen-config', config)
}
</script>
