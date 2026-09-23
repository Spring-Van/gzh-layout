<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="confirm-card flex max-h-[85vh] w-[760px] max-w-[92vw] flex-col rounded-xl border border-border-subtle bg-surface p-5 shadow-2xl shadow-black/40">
          <div class="flex shrink-0 items-center justify-between">
            <h3 class="text-base font-semibold text-text-primary">引用其他章节已生成的图</h3>
            <button class="rounded-md p-1 text-text-muted transition-colors hover:text-text-primary" @click="close"><X :size="16" /></button>
          </div>
          <p class="mt-1 shrink-0 text-xs text-text-muted">
            选一个章节里已经做好的视觉状态关联到本章：只关联、不复制，图片仍由原章节维护（删除也只能在原章节删）。
          </p>

          <!-- 章节选择 -->
          <div class="mt-3 flex shrink-0 flex-wrap gap-1.5 border-b border-border-subtle pb-3">
            <button
              v-for="chapter in chapterOptions"
              :key="chapter.id"
              class="flex h-7 max-w-full items-center gap-1.5 rounded-lg px-2.5 text-xs transition-colors"
              :class="chapter.id === activeChapterId ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-muted hover:bg-app-bg hover:text-text-secondary'"
              @click="activeChapterId = chapter.id"
            >
              <span class="max-w-48 truncate">{{ chapter.name }}</span>
              <span class="shrink-0 text-[10px] text-text-muted">{{ chapterRowCount(chapter.id) }}</span>
            </button>
            <p v-if="!chapterOptions.length" class="py-1 text-xs text-text-muted">其他章节还没有已生成好的资产图</p>
          </div>

          <!-- 可引用的视觉状态（只列有图的；单选） -->
          <div class="custom-scrollbar mt-3 min-h-[220px] shrink overflow-y-auto">
            <div
              v-for="row in rows"
              :key="row.key"
              class="mb-1.5 flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors"
              :class="row.key === selectedKey ? 'border-cyan-500 bg-cyan-500/10' : 'border-border-subtle hover:border-border-strong hover:bg-elevated'"
              @click="selectedKey = row.key"
            >
              <span class="flex shrink-0 items-center gap-1">
                <img
                  v-for="image in row.images.slice(0, 3)"
                  :key="image"
                  :src="image"
                  class="h-12 w-12 rounded border border-border-subtle object-cover"
                  loading="lazy"
                  alt="已生成的图"
                />
                <span v-if="row.images.length > 3" class="text-[11px] text-text-muted">+{{ row.images.length - 3 }}</span>
              </span>
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="truncate text-sm text-text-primary">{{ row.asset.name }} · {{ row.variant.name }}</span>
                <span class="truncate text-[11px] text-text-muted">{{ typeLabel(row.asset.type) }} · {{ row.images.length }} 张可用图</span>
              </span>
              <span v-if="row.key === selectedKey" class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white"><Check :size="12" /></span>
            </div>
            <p v-if="!rows.length" class="flex h-[200px] items-center justify-center text-xs text-text-muted">
              {{ activeChapterId ? '该章节暂无可引用的视觉状态（还没有生成图 / 上传图）' : '先选择一个章节' }}
            </p>
          </div>

          <div class="mt-3 flex shrink-0 items-center justify-between border-t border-border-subtle pt-3">
            <p class="text-[11px] text-text-muted">
              {{ selectedRow ? `将引用「${selectedRow.asset.name} · ${selectedRow.variant.name}」到本章` : '请选择一个视觉状态' }}
            </p>
            <div class="flex gap-2">
              <button class="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary" @click="close">取消</button>
              <button
                class="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!selectedRow"
                @click="confirm"
              >确认引用</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 「引用其他章节已生成的图」弹窗：选章节 → 选该章节里**已有成品图**的视觉状态 → 确认。
 * 确认后由容器写一条 `chapterAssets`（`appearance: 'reused'`、`origin: 'manual'`）——
 * 引用的还是同一条状态记录，所以图片天然共享、不复制；删除也仍只在原章节。
 */
import { computed, ref, watch } from 'vue'
import { Check, X } from 'lucide-vue-next'
import type { LongProjectAsset, LongProjectChapterAsset } from '@comic/types'
import { effectiveVariantRefImages } from '@comic/services/panelPromptService'

const props = defineProps<{
  modelValue: boolean
  /** 可选章节（页面传入；弹窗自己排除当前章节）。 */
  chapters: Array<{ id: string; name: string }>
  /** 当前章节 id（排除掉，不能引用自己）。 */
  currentChapterId: string
  /** 项目全部资产（按章节引用逐个解析出状态）。 */
  assets: LongProjectAsset[]
  /** 项目全部章节引用。 */
  chapterAssets: LongProjectChapterAsset[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  /** 确认引用：容器据此写章节引用条目。 */
  (e: 'confirm', payload: { chapterId: string; assetId: string; variantId: string }): void
}>()

const chapterOptions = computed(() => props.chapters.filter((chapter) => chapter.id !== props.currentChapterId))
const activeChapterId = ref('')
const selectedKey = ref('')

/** 某章节可引用的行（有图的视觉状态）。 */
function rowsOf(chapterId: string) {
  if (!chapterId) return []
  return props.chapterAssets
    .filter((entry) => entry.chapterId === chapterId)
    .flatMap((entry) => {
      const asset = props.assets.find((item) => item.id === entry.assetId)
      if (!asset) return []
      const variants = entry.variantId
        ? asset.variants.filter((variant) => variant.id === entry.variantId)
        : asset.variants
      return variants
        .map((variant) => ({ key: `${asset.id}:${variant.id}`, asset, variant, images: effectiveVariantRefImages(variant) }))
        .filter((row) => row.images.length > 0)
    })
}

const rows = computed(() => rowsOf(activeChapterId.value))
const selectedRow = computed(() => rows.value.find((row) => row.key === selectedKey.value) ?? null)

function chapterRowCount(chapterId: string): number {
  return rowsOf(chapterId).length
}

function typeLabel(type: string): string {
  return ({ character: '人物', scene: '场景', prop: '道具' })[type] ?? type
}

// 打开时重置：默认选中第一个有内容的章节
watch(() => props.modelValue, (visible) => {
  if (!visible) return
  selectedKey.value = ''
  const first = chapterOptions.value.find((chapter) => chapterRowCount(chapter.id) > 0) ?? chapterOptions.value[0]
  activeChapterId.value = first?.id ?? ''
})

// 切章节时清掉选中项，避免跨章节残留选择
watch(activeChapterId, () => { selectedKey.value = '' })

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  const row = selectedRow.value
  if (!row) return
  emit('confirm', { chapterId: activeChapterId.value, assetId: row.asset.id, variantId: row.variant.id })
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
