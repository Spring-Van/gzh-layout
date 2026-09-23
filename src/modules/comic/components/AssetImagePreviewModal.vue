<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center"
        @click="handleClose"
      >
        <!-- 关闭 -->
        <button class="absolute top-4 right-4 text-white/90 hover:text-white transition-colors z-10" @click.stop="handleClose">
          <X :size="26" />
        </button>

        <!-- 上一张 / 下一张 -->
        <button
          v-if="images.length > 1 && currentIndex > 0"
          class="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors z-10"
          @click.stop="currentIndex -= 1"
        >
          <ChevronLeft :size="36" />
        </button>
        <button
          v-if="images.length > 1 && currentIndex < images.length - 1"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors z-10"
          @click.stop="currentIndex += 1"
        >
          <ChevronRight :size="36" />
        </button>

        <div class="max-w-7xl max-h-screen p-8" @click.stop>
          <img
            :src="currentImage"
            :alt="alt"
            class="max-w-full max-h-[85vh] object-contain mx-auto transition-opacity duration-150"
            :class="imageReady ? 'opacity-100' : 'opacity-0'"
            @load="imageReady = true"
            @error="imageReady = true"
          />

          <!-- 加载过渡：远程大图切换时不至于白屏干等 -->
          <div v-if="!imageReady" class="absolute inset-0 flex items-center justify-center text-white/60">
            <LoaderCircle :size="30" class="animate-spin" />
          </div>

          <!-- 信息与操作 -->
          <div class="mt-4 flex items-center justify-between gap-4 text-white">
            <p class="text-sm font-medium truncate">
              {{ alt }}
              <span class="ml-2 text-xs text-white/70">{{ currentIndex + 1 }}/{{ images.length }}</span>
            </p>
            <div class="flex items-center gap-2">
              <button
                v-if="removable"
                class="rounded border border-white/30 px-3 py-1.5 text-xs hover:border-red-400 hover:text-red-300 transition-colors"
                @click.stop="$emit('remove', currentIndex)"
              >删除</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 资产参考图大图预览：左右切换、删除、设为首选（复用 ImagePreviewModal 交互模式，扩展操作）。
 */
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, LoaderCircle, X } from 'lucide-vue-next'

interface Props {
  modelValue: boolean
  images: string[]
  imageIndex?: number
  alt?: string
  /** 是否显示「删除」操作（纯查看场景如资产库关闭）。 */
  removable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  imageIndex: 0,
  alt: '图片',
  removable: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'remove', index: number): void
}>()

const currentIndex = ref(props.imageIndex)

watch(() => props.imageIndex, (value) => { currentIndex.value = value })
watch(() => props.modelValue, (visible) => {
  if (visible) currentIndex.value = props.imageIndex
})

const currentImage = computed(() => props.images[currentIndex.value] || '')

/** 当前大图是否已加载完成（未完成前显示占位过渡，避免白屏干等的卡顿感）。 */
const imageReady = ref(false)
watch(currentImage, () => { imageReady.value = false })

/** 预加载当前图前后各 2 张：多状态资产左右切换时不再现等网络（远程大图是主要卡因）。 */
watch([() => props.modelValue, currentIndex], ([visible]) => {
  if (!visible) return
  for (const offset of [-2, -1, 1, 2]) {
    const url = props.images[currentIndex.value + offset]
    if (url) { const probe = new Image(); probe.src = url }
  }
}, { immediate: true })

function handleClose() {
  emit('update:modelValue', false)
}
</script>
