<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="confirm-card flex max-h-[85vh] w-[560px] max-w-[90vw] flex-col rounded-xl border border-border-subtle bg-surface p-5 shadow-2xl shadow-black/40">
          <!-- 标题 -->
          <div class="flex shrink-0 items-center justify-between">
            <h3 class="text-base font-semibold text-text-primary">合并 {{ panels.length }} 个分镜</h3>
            <button class="rounded-md p-1 text-text-muted transition-colors hover:text-text-primary" @click="close"><X :size="16" /></button>
          </div>
          <p class="mt-1 shrink-0 text-xs text-text-muted">按分镜顺序合并为 1 个分镜，合并后顺序号自动重排。可在下方选择保留哪个分镜的成图。</p>

          <!-- 原分镜列表 + 成图归属选择 -->
          <div class="custom-scrollbar mt-3 min-h-0 shrink-0 overflow-y-auto">
            <p class="mb-1.5 text-xs font-medium text-text-secondary">保留成图（单选）</p>
            <label
              v-for="panel in panels"
              :key="panel.id"
              class="mb-1.5 flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors"
              :class="selectedSourceId === panel.id ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-border-subtle hover:border-border-strong'"
            >
              <input v-model="selectedSourceId" type="radio" :value="panel.id" class="mt-1 h-3.5 w-3.5 accent-cyan-500" />
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                  <span class="text-xs font-medium text-cyan-400">分镜 {{ panel.order }}</span>
                  <span v-if="panel.shot" class="text-[10px] text-text-muted">{{ panel.shot }}</span>
                  <span
                    class="rounded px-1 py-0.5 text-[10px]"
                    :class="artworkInfo(panel.id).hasImage ? 'bg-emerald-500/10 text-emerald-400' : 'bg-app-bg text-text-muted'"
                  >{{ artworkInfo(panel.id).label }}</span>
                </span>
                <span class="mt-1 line-clamp-2 block text-xs leading-5 text-text-primary">{{ panel.content }}</span>
              </span>
            </label>
          </div>

          <!-- 合并结果预览 -->
          <div class="mt-3 min-h-0 shrink-0 rounded-lg border border-border-subtle bg-app-bg p-3">
            <p class="mb-1.5 text-xs font-medium text-text-secondary">合并结果预览</p>
            <p class="max-h-36 overflow-y-auto text-sm leading-6 text-text-primary custom-scrollbar">{{ mergedPreview }}</p>
            <p v-if="mergedDialogue" class="mt-2 text-xs leading-5 text-text-primary">对白：{{ mergedDialogue }}</p>
            <p v-if="mergedNarration" class="mt-1 text-xs leading-5 text-text-muted">旁白：{{ mergedNarration }}</p>
            <div v-if="mergedBindings.length" class="mt-2 flex flex-wrap gap-1.5">
              <AssetBindingTag
                v-for="binding in mergedBindings"
                :key="`${binding.assetName}-${binding.visualVersionName}`"
                :binding="binding"
                :assets="assets"
                :interactive="false"
              />
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="mt-4 flex shrink-0 justify-end gap-2">
            <button class="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary" @click="close">取消</button>
            <button class="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90" @click="confirm">确认合并</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 分镜合并确认弹窗：展示原分镜列表（含成图归属单选）与合并结果预览。
 * 合并规则：画面/对白/旁白按序拼接；镜头与绘画提示词取第一个非空；
 * 资产绑定按 assetId+visualVersionId 去重取并集。
 */
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import type { LongProjectAsset, LongProjectPanelArtwork, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel } from '@comic/types'
import AssetBindingTag from '@comic/components/AssetBindingTag.vue'

const props = defineProps<{
  modelValue: boolean
  /** 待合并的连续分镜（按 order 升序） */
  panels: LongProjectStoryboardPanel[]
  /** 分镜 ID → 生图工件映射，用于成图归属选择展示 */
  artworkMap: Map<string, LongProjectPanelArtwork>
  /** 项目资产库：用于给合并结果里的绑定 tag 按类型着色。 */
  assets?: LongProjectAsset[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  /** 确认合并；payload 为保留成图的分镜 ID */
  (e: 'confirm', sourcePanelId: string): void
}>()

const selectedSourceId = ref('')

watch(() => props.modelValue, (visible) => {
  if (visible) {
    // 默认选中第一个有成图的分镜，否则第一个
    const withImage = props.panels.find((panel) => props.artworkMap.get(panel.id)?.selectedImageId)
    selectedSourceId.value = (withImage ?? props.panels[0])?.id ?? ''
  }
})

/** 成图归属行的辅助信息。 */
function artworkInfo(panelId: string): { hasImage: boolean; label: string } {
  const artwork = props.artworkMap.get(panelId)
  if (artwork?.selectedImageId) return { hasImage: true, label: '有成图' }
  if (artwork?.generatedImageIds?.length) return { hasImage: false, label: `${artwork.generatedImageIds.length} 张候选` }
  return { hasImage: false, label: '无成图' }
}

/** 拼接文本：过滤空段后用换行连接（保留模型原有换行结构）。 */
const mergedPreview = computed(() => props.panels.map((panel) => panel.content).filter(Boolean).join('\n'))
const mergedDialogue = computed(() => props.panels.map((panel) => panel.dialogue).filter(Boolean).join('\n'))
const mergedNarration = computed(() => props.panels.map((panel) => panel.narration).filter(Boolean).join('\n'))

/** 资产绑定并集：按 assetId+visualVersionId 去重，保持出现顺序。 */
const mergedBindings = computed<LongProjectStoryboardAssetBinding[]>(() => {
  const seen = new Set<string>()
  const result: LongProjectStoryboardAssetBinding[] = []
  for (const panel of props.panels) {
    for (const binding of panel.assetBindings) {
      const key = `${binding.assetId ?? binding.assetName}::${binding.visualVersionId ?? binding.visualVersionName ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push(binding)
    }
  }
  return result
})

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  if (!selectedSourceId.value) return
  emit('confirm', selectedSourceId.value)
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
