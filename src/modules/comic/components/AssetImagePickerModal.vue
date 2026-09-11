<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="confirm-card flex max-h-[85vh] w-[960px] max-w-[92vw] flex-col rounded-xl border border-border-subtle bg-surface p-5 shadow-2xl shadow-black/40">
          <!-- 标题 -->
          <div class="flex shrink-0 items-center justify-between">
            <h3 class="text-base font-semibold text-text-primary">{{ append ? '从资产库选择参考图' : '更换资产图片' }}</h3>
            <button class="rounded-md p-1 text-text-muted transition-colors hover:text-text-primary" @click="close"><X :size="16" /></button>
          </div>
          <p class="mt-1 shrink-0 text-xs text-text-muted">{{ append ? '从资产库勾选图片（含 AI 生成图），确认后追加为当前视觉状态的参考图。' : '从资产库勾选参考图，确认后替换该视觉状态的参考图列表（对所有引用此资产的分镜生效）。' }}</p>

          <!-- 资产来源 tab（指定 assetId 时仅展示该资产，隐藏分类）；章节资产在前且默认 -->
          <div class="mt-3 flex shrink-0 items-center gap-4 border-b border-border-subtle">
            <template v-if="assetId">
              <span class="border-b-2 border-cyan-400 px-0.5 py-1.5 text-xs font-medium text-cyan-400">
                {{ targetAsset?.name ?? '资产' }}<span class="ml-1 text-[10px]">({{ targetAsset?.variants.length ?? 0 }} 个视觉状态)</span>
              </span>
            </template>
            <template v-else>
              <button
                v-for="tab in tabs"
                :key="tab.key"
                class="border-b-2 px-0.5 py-1.5 text-xs transition-colors"
                :class="activeTab === tab.key ? 'border-cyan-400 font-medium text-cyan-400' : 'border-transparent text-text-muted hover:text-text-primary'"
                @click="activeTab = tab.key"
              >{{ tab.label }}<span class="ml-1 text-[10px]">({{ groupedAssets(tab.key).length }})</span></button>
            </template>
          </div>

          <!-- 资产按钮 tab：切换查看单个资产的图片（不再全部平铺展示） -->
          <div v-if="!assetId && scopedAssets.length" class="custom-scrollbar flex shrink-0 flex-wrap gap-1.5 pt-3">
            <button
              v-for="asset in scopedAssets"
              :key="asset.id"
              class="flex h-7 max-w-full items-center gap-1.5 rounded-lg px-2.5 text-xs transition-colors"
              :class="activeAsset?.id === asset.id ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-muted hover:bg-app-bg hover:text-text-secondary'"
              :title="asset.name"
              @click="activeAssetId = asset.id"
            >
              <span class="max-w-40 truncate">{{ asset.name }}</span>
              <span class="shrink-0 text-[10px] text-text-muted">{{ assetImageCount(asset) }}</span>
            </button>
          </div>

          <!-- 图片区：按图片原始比例瀑布流展示；空态保持最小高度，图片多时增高，达到上限后内部滚动 -->
          <div class="custom-scrollbar mt-3 min-h-[320px] shrink overflow-y-auto">
            <div v-for="group in imageGroups" :key="group.id" class="mb-3">
              <p class="mb-2 text-xs text-text-secondary">{{ group.name }}<span class="ml-1.5 text-[10px] text-text-muted">{{ group.subLabel }} · {{ group.images.length }} 张</span></p>
              <div v-if="group.images.length" class="columns-3 gap-2.5">
                <button
                  v-for="image in group.images"
                  :key="image"
                  class="group relative mb-2.5 block w-full break-inside-avoid overflow-hidden rounded-lg border transition-colors"
                  :class="selected.includes(image) ? 'border-cyan-500 ring-1 ring-cyan-500/40' : 'border-border-subtle hover:border-border-strong'"
                  :title="generatedSet.has(image) ? `${group.name} · AI 生成图` : group.name"
                  @click="toggleSelect(image)"
                >
                  <img :src="image" class="block w-full" loading="lazy" :alt="`${group.name}参考图`" />
                  <span v-if="generatedSet.has(image)" class="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1 py-0.5 text-[9px] text-cyan-300">生成</span>
                  <span v-if="selected.includes(image)" class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-white shadow"><Check :size="12" /></span>
                </button>
              </div>
              <p v-else class="py-2 text-[11px] text-text-muted">暂无参考图</p>
            </div>
            <p v-if="!imageGroups.length" class="flex h-[280px] items-center justify-center text-xs text-text-muted">{{ assetId ? '该资产暂无视觉状态' : '该分类下暂无资产' }}</p>
          </div>

          <!-- 底部：已选与确认 -->
          <div class="mt-3 flex shrink-0 items-center justify-between border-t border-border-subtle pt-3">
            <p class="text-[11px] text-text-muted">已选 {{ selected.length }} 张（{{ append ? '确认后追加到当前参考图' : '确认后替换现有参考图' }}）</p>
            <div class="flex gap-2">
              <button class="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary" @click="close">取消</button>
              <button
                class="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!selected.length"
                @click="confirm"
              >{{ append ? '确认添加' : '确认更换' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 资产图片选择弹窗：从项目资产库（章节/公共分类，章节在前且默认）勾选各资产视觉状态的参考图，多选后确认。
 * 全库模式下通过资产按钮 tab 切换查看单个资产的图片（不平铺全部资产）；
 * 图片按原始比例瀑布流展示，图片区随内容增高、达到弹窗上限后内部滚动；
 * 已选图片跨资产/scope 累积，确认时一次性提交。
 * - 默认「替换」模式：确认后替换目标视觉状态的参考图列表；
 * - 「追加」模式（append）：确认后追加到现有参考图（去重），并可包含 AI 生成图。
 */
import { computed, ref, watch } from 'vue'
import { Check, X } from 'lucide-vue-next'
import type { LongProjectAsset } from '@comic/types'

const props = defineProps<{
  modelValue: boolean
  /** 项目全部资产（含各视觉状态参考图）。 */
  assets: LongProjectAsset[]
  /** 指定资产 id 时进入单资产模式：只展示该资产的各视觉状态参考图。 */
  assetId?: string
  /** 当前已用的参考图（打开时预勾选；追加模式下不预勾选）。 */
  currentImages?: string[]
  /** 追加模式：确认后追加到现有参考图（不替换）。 */
  append?: boolean
  /** 是否包含各视觉状态的 AI 生成图（追加场景常用）。 */
  includeGenerated?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  /** 确认：payload 为选中的图片 URL 列表（替换或追加由调用方决定）。 */
  (e: 'confirm', images: string[]): void
}>()

const tabs = [
  { key: 'chapter' as const, label: '章节资产' },
  { key: 'project' as const, label: '公共资产' },
]
const activeTab = ref<'chapter' | 'project'>('chapter')
/** 当前查看的资产 id（未指定时回退 scope 内第一个资产）。 */
const activeAssetId = ref<string | null>(null)
const selected = ref<string[]>([])

watch(() => props.modelValue, (visible) => {
  if (visible) {
    selected.value = props.append ? [] : [...(props.currentImages ?? [])]
    activeTab.value = 'chapter'
    activeAssetId.value = null
  }
})

/** 单资产模式的目标资产。 */
const targetAsset = computed(() => props.assets.find((asset) => asset.id === props.assetId))

/** 当前 scope 下的资产列表（章节/公共）。 */
const scopedAssets = computed(() => groupedAssets(activeTab.value))

const activeAsset = computed(() => scopedAssets.value.find((asset) => asset.id === activeAssetId.value) ?? scopedAssets.value[0] ?? null)

// 切换 scope 时重置资产选中
watch(activeTab, () => { activeAssetId.value = null })

/** AI 生成图集合（角标标识用）。 */
const generatedSet = computed(() => new Set(
  props.assets.flatMap((asset) => asset.variants.flatMap((variant) => variant.generatedImageIds ?? [])),
))

/** 某视觉状态可展示的图片：参考图（默认）+ 生成图（includeGenerated 时），去重。 */
function variantImages(variant: LongProjectAsset['variants'][number]): string[] {
  const images = [...variant.referenceImageIds, ...(props.includeGenerated ? variant.generatedImageIds ?? [] : [])]
  return [...new Set(images)]
}

/** 资产可选图片总数（资产按钮 tab 角标）。 */
function assetImageCount(asset: LongProjectAsset): number {
  return new Set(asset.variants.flatMap((variant) => variantImages(variant))).size
}

/** 图片分组：单资产模式按视觉状态分组；全库模式仅展示当前选中资产的图片合集。 */
const imageGroups = computed<Array<{ id: string; name: string; subLabel: string; images: string[] }>>(() => {
  if (props.assetId) {
    const asset = targetAsset.value
    if (!asset) return []
    return asset.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      subLabel: typeLabel(asset.type),
      images: variantImages(variant),
    }))
  }
  const asset = activeAsset.value
  if (!asset) return []
  return [{
    id: asset.id,
    name: asset.name,
    subLabel: typeLabel(asset.type),
    images: [...new Set(asset.variants.flatMap((variant) => variantImages(variant)))],
  }]
})

/** 按范围分组资产：chapter = 章节提取未同步的资产；project = 公共库。 */
function groupedAssets(scope: 'project' | 'chapter'): LongProjectAsset[] {
  return props.assets.filter((asset) => (scope === 'chapter' ? asset.scope === 'chapter' : asset.scope !== 'chapter'))
}

function typeLabel(type: string): string {
  return ({ character: '人物', scene: '场景', prop: '道具' })[type] ?? type
}

/** 勾选/取消一张图。 */
function toggleSelect(image: string) {
  const index = selected.value.indexOf(image)
  if (index >= 0) selected.value.splice(index, 1)
  else selected.value.push(image)
}

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  if (!selected.value.length) return
  emit('confirm', [...selected.value])
  emit('update:modelValue', false)
}
</script>

<style scoped>
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.18s ease;
}
.confirm-enter-active .confirm-card,
.confirm-leave-active .confirm-card {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}
.confirm-enter-from .confirm-card,
.confirm-leave-to .confirm-card {
  opacity: 0;
  transform: scale(0.96);
}
</style>
