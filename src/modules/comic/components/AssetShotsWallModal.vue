<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        @click="close"
      >
        <div
          class="flex max-h-[88vh] w-[min(1120px,94vw)] flex-col overflow-hidden rounded-lg border border-border-subtle bg-elevated shadow-2xl"
          @click.stop
        >
          <!-- 头部：资产名 + 张数 + 关闭 -->
          <header class="flex shrink-0 items-center gap-2 border-b border-border-subtle px-4 py-3">
            <p class="truncate text-sm font-medium text-text-primary">{{ assetName }}</p>
            <span class="shrink-0 text-xs text-text-muted">{{ shots.length }} 张</span>
            <button class="ml-auto shrink-0 text-text-secondary transition-colors hover:text-text-primary" title="关闭" @click="close">
              <X :size="16" />
            </button>
          </header>

          <!-- 横向流：一行放满就换行，高度统一、宽度按原比例（不裁切） -->
          <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div class="flex flex-wrap content-start gap-3">
              <figure
                v-for="shot in shots"
                :key="shot.key"
                class="shot relative h-[21.5rem] shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-surface"
              >
                <img
                  :src="toFastDisplayImageUrl(shot.url)"
                  class="block h-full w-auto max-w-none cursor-zoom-in"
                  loading="lazy"
                  decoding="async"
                  :alt="shot.alt"
                  :title="`${shot.assetName} · ${shot.variantName}`"
                  @click="openPreview(shot)"
                />
                <!-- hover 才显形：底部渐变 + 名称 + 下载 -->
                <div class="shot-scrim" />
                <p class="shot-name">
                  {{ shot.assetName }}<span v-if="shot.variantName" class="shot-variant">{{ shot.variantName }}</span>
                </p>
                <button
                  class="shot-download"
                  :disabled="downloadingKey === shot.key"
                  :title="`下载这张图（${shot.filename}）`"
                  @click.stop="download(shot)"
                >
                  <LoaderCircle v-if="downloadingKey === shot.key" :size="13" class="animate-spin" />
                  <Download v-else :size="13" />
                </button>
              </figure>
            </div>
            <p v-if="!shots.length" class="py-16 text-center text-xs text-text-muted">该资产暂无生成图</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 大图预览：z-[200] 高于本弹窗，点图后叠在上面，左右可在本资产全部图之间翻 -->
  <AssetImagePreviewModal
    v-model="previewVisible"
    :images="previewImages"
    :image-index="previewIndex"
    :alt="previewAlt"
    :removable="false"
  />
</template>

<script setup lang="ts">
/**
 * 单个资产的「全部生成图」弹窗：点折叠牌堆打开，内部横向铺开本资产的全部图。
 *
 * 为什么不做「原地展开」：原地展开会让该资产独占一整行，把其它资产挤下去，
 * 又要额外的「收起」动作；弹窗打开即看、关闭即走，版面也独立于页面内容区。
 *
 * 🔴 **版面必须用 `flex flex-wrap` 横向流，不能用 CSS `columns` 瀑布流**：
 * `columns` 的填充方向是**竖向**的（先把一列排满再排下一列，并对列高做平衡），
 * 图少时会被均衡成「一列里有图、另几列空着」，视觉上就是「一行只放 2 张就换行」——
 * 用户实报过。横向流 + 固定高度（`h-[21.5rem]` = 344px）+ `img` 用
 * `h-full w-auto` 才是「一行放满再换行、且保持原比例不裁切」。
 *
 * 🔴 **高度与版面宽度是一对，改一个必须重算另一个**：内容区 = 面板 1120 − 左右 px-4（32）= 1088px，
 * gap 12px。当前 344px 高：3:4 竖图宽 258 → 一行 4 张（4×258+36 = 1068 ✓）；
 * 1:1 方图宽 344 → 一行 3 张（3×344+24 = 1056 ✓）。
 * 实测口径：`一行张数 = floor((1088 + 12) / (宽 + 12))`。
 * 若只把高度加到 380 而不放宽面板，方图 3 张要 1164px 放不下 → 退回「一行 2 张」，
 * 正是用户抱怨过的现象。
 *
 * 下载走主进程 `downloadService.downloadSingle`（认 `app-image://comic/` 直接读盘）；
 * 点图看大图，范围内就是本资产的全部图。
 */
import { computed, ref, watch } from 'vue'
import { Download, LoaderCircle, X } from 'lucide-vue-next'
import AssetImagePreviewModal from './AssetImagePreviewModal.vue'
import { toFastDisplayImageUrl } from '@/shared/image/imageUrl'
import { downloadSingle } from '@comic/services/downloadService'
import { useToast } from '@comic/composables/useToast'
import type { ChapterAssetShot } from '@comic/services/chapterAssetShots'

interface Props {
  modelValue: boolean
  assetName: string
  shots: ChapterAssetShot[]
}

const props = defineProps<Props>()

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const toast = useToast()

function close() {
  emit('update:modelValue', false)
}

// ========== 大图预览 ==========
const previewVisible = ref(false)
const previewIndex = ref(0)
const previewAlt = ref('')

const previewImages = computed(() => props.shots.map((shot) => shot.url))

function openPreview(shot: ChapterAssetShot) {
  previewIndex.value = Math.max(0, props.shots.findIndex((item) => item.key === shot.key))
  previewAlt.value = shot.alt
  previewVisible.value = true
}

// 关闭弹窗时把叠在上层的大图一起收掉，避免留下一个孤立的黑色预览层
watch(() => props.modelValue, (visible) => {
  if (!visible) previewVisible.value = false
})

// ========== 单张下载 ==========
/** 正在下载的那一张（key）；其它图按钮不受影响，可以连点。 */
const downloadingKey = ref('')

async function download(shot: ChapterAssetShot) {
  if (downloadingKey.value) return
  downloadingKey.value = shot.key
  try {
    const result = await downloadSingle(shot.url, shot.filename, false)
    if (result.success) toast.success(`已下载 ${result.filename ?? shot.filename}`)
    else toast.error(result.error || '下载失败')
  } finally {
    downloadingKey.value = ''
  }
}
</script>

<style scoped>
/* 淡入淡出（`.fade-*` 在本项目是按组件各自定义的，没有全局版本） */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/*
 * hover 才浮出渐变 + 名称 + 下载按钮，静止状态是纯图。
 * 三个元素各自绝对定位而不是一条 flex 横排：竖图列宽有限，
 * 横排时名称会被下载按钮挤成两三个字（与图片墙页面同一套处理）。
 */
.shot-scrim,
.shot-name,
.shot-download {
  position: absolute;
  opacity: 0;
  transition: opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.shot-scrim {
  inset-inline: 0;
  bottom: 0;
  height: 3rem;
  background: linear-gradient(to top, rgb(2 6 23 / 0.82), rgb(2 6 23 / 0));
  pointer-events: none;
}
.shot-name {
  right: 2.2rem;
  bottom: 0.4rem;
  left: 0.5rem;
  overflow: hidden;
  color: #ffffff;
  font-size: 11px;
  line-height: 1rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  pointer-events: none;
}
.shot-variant {
  margin-left: 0.25rem;
  color: rgb(255 255 255 / 0.55);
}
.shot-download {
  right: 0.4rem;
  bottom: 0.35rem;
  display: flex;
  height: 1.5rem;
  width: 1.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgb(2 6 23 / 0.65);
  color: #ffffff;
  pointer-events: none;
}
.shot:hover .shot-scrim,
.shot:hover .shot-name,
.shot:hover .shot-download { opacity: 1; }
.shot:hover .shot-download { pointer-events: auto; }
.shot-download:hover { background: #06b6d4; color: #02121a; }
.shot-download:disabled { cursor: default; opacity: 0.65; }
.shot-download:disabled:hover { background: rgb(2 6 23 / 0.65); color: #ffffff; }
</style>
