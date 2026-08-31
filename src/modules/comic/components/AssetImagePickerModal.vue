<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="confirm-card flex max-h-[85vh] w-[680px] max-w-[92vw] flex-col rounded-xl border border-border-subtle bg-surface p-5 shadow-2xl shadow-black/40">
          <!-- 标题 -->
          <div class="flex shrink-0 items-center justify-between">
            <h3 class="text-base font-semibold text-text-primary">更换资产图片</h3>
            <button class="rounded-md p-1 text-text-muted transition-colors hover:text-text-primary" @click="close"><X :size="16" /></button>
          </div>
          <p class="mt-1 shrink-0 text-xs text-text-muted">从资产库勾选参考图或上传新图，确认后替换该视觉状态的参考图列表（对所有引用此资产的分镜生效）。</p>

          <!-- 资产来源 tab（指定 assetId 时仅展示该资产，隐藏分类） -->
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
            <!-- 上传入口 -->
            <button
              class="ml-auto mb-1 flex items-center gap-1 rounded-lg border border-border-subtle px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
              :title="'上传新参考图（本地 base64）'"
              @click="fileInputEl?.click()"
            ><LoaderCircle v-if="uploading" :size="12" class="animate-spin" /><Upload v-else :size="12" />上传图片</button>
          </div>

          <!-- 参考图网格：过滤模式按视觉状态分组；全库模式按资产分组 -->
          <div class="custom-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto">
            <div v-for="group in imageGroups" :key="group.id" class="mb-3">
              <p class="mb-1.5 text-xs text-text-secondary">{{ group.name }}<span class="ml-1.5 text-[10px] text-text-muted">{{ group.subLabel }}</span></p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="image in group.images"
                  :key="image"
                  class="group relative h-20 w-20 overflow-hidden rounded-lg border transition-colors"
                  :class="selected.includes(image) ? 'border-cyan-500 ring-1 ring-cyan-500/40' : 'border-border-subtle hover:border-border-strong'"
                  :title="group.name"
                  @click="toggleSelect(image)"
                >
                  <img :src="image" class="h-full w-full object-cover" :alt="`${group.name}参考图`" />
                  <span v-if="selected.includes(image)" class="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-white"><Check :size="10" /></span>
                </button>
                <p v-if="!group.images.length" class="py-2 text-[11px] text-text-muted">暂无参考图</p>
              </div>
            </div>
            <p v-if="!imageGroups.length" class="py-8 text-center text-xs text-text-muted">{{ assetId ? '该资产暂无视觉状态' : '该分类下暂无资产' }}</p>
          </div>

          <!-- 底部：已选与确认 -->
          <div class="mt-3 flex shrink-0 items-center justify-between">
            <p class="text-[11px] text-text-muted">已选 {{ selected.length }} 张（确认后替换现有参考图）</p>
            <div class="flex gap-2">
              <button class="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary" @click="close">取消</button>
              <button
                class="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!selected.length"
                @click="confirm"
              >确认更换</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
  <!-- 隐藏的上传输入 -->
  <input ref="fileInputEl" type="file" accept="image/*" multiple class="hidden" @change="handleUpload" />
</template>

<script setup lang="ts">
/**
 * 资产图片选择弹窗：从项目资产库（公共/章节分类）勾选各资产视觉状态的参考图，
 * 或上传新图（本地 base64），多选后确认替换目标视觉状态的参考图列表。
 */
import { computed, ref, watch } from 'vue'
import { Check, LoaderCircle, Upload, X } from 'lucide-vue-next'
import type { LongProjectAsset } from '@comic/types'
import { processImage } from '@comic/services/uploadService'
import { useToast } from '@comic/composables/useToast'

const toast = useToast()

const props = defineProps<{
  modelValue: boolean
  /** 项目全部资产（含各视觉状态参考图）。 */
  assets: LongProjectAsset[]
  /** 指定资产 id 时进入单资产模式：只展示该资产的各视觉状态参考图。 */
  assetId?: string
  /** 当前已用的参考图（打开时预勾选）。 */
  currentImages?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  /** 确认更换：payload 为新的参考图 URL 列表（替换式）。 */
  (e: 'confirm', images: string[]): void
}>()

const tabs = [
  { key: 'project' as const, label: '公共资产' },
  { key: 'chapter' as const, label: '章节资产' },
]
const activeTab = ref<'project' | 'chapter'>('project')
const selected = ref<string[]>([])
const uploading = ref(false)
const fileInputEl = ref<HTMLInputElement | null>(null)

watch(() => props.modelValue, (visible) => {
  if (visible) selected.value = [...(props.currentImages ?? [])]
})

/** 单资产模式的目标资产。 */
const targetAsset = computed(() => props.assets.find((asset) => asset.id === props.assetId))

/** 图片分组：单资产模式按视觉状态分组；全库模式按资产分组（各视觉状态参考图合集）。 */
const imageGroups = computed<Array<{ id: string; name: string; subLabel: string; images: string[] }>>(() => {
  if (props.assetId) {
    const asset = targetAsset.value
    if (!asset) return []
    return asset.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      subLabel: typeLabel(asset.type),
      images: [...(variant.referenceImageIds ?? [])],
    }))
  }
  return groupedAssets(activeTab.value).map((asset) => ({
    id: asset.id,
    name: asset.name,
    subLabel: typeLabel(asset.type),
    images: [...new Set(asset.variants.flatMap((variant) => variant.referenceImageIds ?? []))],
  }))
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

/** 上传新参考图（本地 base64），成功后直接进入已选。 */
async function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  uploading.value = true
  const urls: string[] = []
  for (const file of Array.from(files)) {
    const result = await processImage(file, 'local')
    if (result.success && result.url) urls.push(result.url)
  }
  uploading.value = false
  input.value = ''
  if (urls.length) {
    for (const url of urls) if (!selected.value.includes(url)) selected.value.push(url)
    toast.success(`已添加 ${urls.length} 张新图`)
  } else {
    toast.error('图片上传失败，请重试')
  }
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
