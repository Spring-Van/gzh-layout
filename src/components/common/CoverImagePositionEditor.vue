<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center"
      @click.self="handleCancel"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div
          class="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0"
        >
          <div>
            <h3 class="text-lg font-bold text-slate-800">调整图片位置</h3>
            <p class="text-xs text-slate-400 mt-0.5">
              为封面模板的 {{ slotCount }} 个位置分别调整图片裁剪区域
            </p>
          </div>
          <button
            @click="handleCancel"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
          >
            <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="slotCount === 0" class="flex-1 flex items-center justify-center py-20">
          <p class="text-sm text-slate-400">没有可调整的图片</p>
        </div>

        <template v-else>
          <div class="px-6 pt-4 border-b border-slate-100 flex-shrink-0">
            <div class="flex gap-1 overflow-x-auto">
              <button
                v-for="(_, idx) in slotCount"
                :key="idx"
                @click="switchSlot(idx)"
                class="px-4 py-2 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap border-b-2"
                :class="[
                  activeSlot === idx
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50',
                ]"
              >
                图片 {{ idx + 1 }}
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-hidden flex">
            <div class="flex-1 flex flex-col items-center justify-center p-6 gap-4 overflow-y-auto">
              <div
                ref="containerRef"
                class="relative bg-slate-100 rounded-xl overflow-hidden select-none touch-none cursor-grab"
                :style="{ width: VP_W + 'px', height: containerHeight + 'px' }"
                @pointerdown.prevent="onPointerDown"
                @wheel.prevent="onWheel"
              >
                <img
                  ref="sourceImageRef"
                  :src="currentImageUrl"
                  class="w-full h-full object-contain pointer-events-none"
                  draggable="false"
                  @load="onImageLoad"
                />

                <div
                  class="absolute bg-black/45 pointer-events-none"
                  :style="{
                    top: 0, left: 0, right: 0,
                    height: framePxTop + 'px',
                  }"
                />
                <div
                  class="absolute bg-black/45 pointer-events-none"
                  :style="{
                    left: 0, right: 0, bottom: 0,
                    top: (framePxTop + framePxH) + 'px',
                  }"
                />
                <div
                  class="absolute bg-black/45 pointer-events-none"
                  :style="{
                    top: framePxTop + 'px',
                    left: 0,
                    width: framePxLeft + 'px',
                    height: framePxH + 'px',
                  }"
                />
                <div
                  class="absolute bg-black/45 pointer-events-none"
                  :style="{
                    top: framePxTop + 'px',
                    left: (framePxLeft + framePxW) + 'px',
                    right: 0,
                    height: framePxH + 'px',
                  }"
                />

                <div
                  class="absolute border-2 border-white/80 pointer-events-none"
                  :style="{
                    top: framePxTop + 'px',
                    left: framePxLeft + 'px',
                    width: framePxW + 'px',
                    height: framePxH + 'px',
                  }"
                >
                  <div class="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                  <div class="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                  <div class="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                  <div class="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
                </div>
              </div>

              <div class="w-full max-w-[360px] flex items-center gap-3">
                <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.01"
                  v-model.number="zoom"
                  class="flex-1 accent-primary h-1.5"
                  @input="clampFrame"
                />
                <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>

              <p class="text-xs text-slate-400">
                拖拽移动 · 滚轮缩放 · 当前 {{ (zoom * 100).toFixed(0) }}%
              </p>
            </div>

            <div class="w-64 border-l border-slate-200 flex flex-col items-center justify-center p-6 gap-4 bg-slate-50 flex-shrink-0">
              <span class="text-xs font-medium text-slate-500">实时预览</span>

              <div
                class="w-full rounded-lg overflow-hidden border-2 border-slate-300 shadow-sm bg-white"
                :style="{ aspectRatio: currentSlotRatio }"
              >
                <div
                  v-if="currentImageUrl && imgW > 0"
                  class="w-full h-full overflow-hidden relative"
                >
                  <img
                    :src="currentImageUrl"
                    class="absolute max-w-none"
                    :style="previewImageTransform"
                    draggable="false"
                  />
                </div>
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center bg-slate-100"
                >
                  <span class="text-xs text-slate-400">无图片</span>
                </div>
              </div>

              <p class="text-[10px] text-slate-400 text-center leading-relaxed">
                上方为裁剪框内的<br />封面模板槽位预览效果
              </p>

              <button
                @click="handleSlotReset"
                class="px-4 py-1.5 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition"
              >
                重置当前
              </button>
            </div>
          </div>
        </template>

        <div class="px-6 py-4 border-t border-slate-200 flex justify-center gap-3 flex-shrink-0">
          <button
            @click="handleResetAll"
            class="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            全部重置
          </button>
          <button
            @click="handleConfirm"
            class="px-6 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  visible: boolean;
  images: Array<{ id: string; path: string; name: string }>;
  getImageUrl: (path: string) => string;
  currentCropRects?: Record<number, CropRect>;
  slotRatios?: number[];
}

const props = withDefaults(defineProps<Props>(), {
  currentCropRects: () => ({}),
  slotRatios: () => [],
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', cropRects: Record<number, CropRect>): void;
}>();

const VP_W = 360;
const VP_H_MAX = 500;

const containerRef = ref<HTMLDivElement | null>(null);
const sourceImageRef = ref<HTMLImageElement | null>(null);

const activeSlot = ref(0);
const slotCount = computed(() => props.images.length);
const currentSlotRatio = computed(() => props.slotRatios?.[activeSlot.value] ?? 1);

const containerHeight = computed(() => {
  if (!imgW.value || !imgH.value) return 300;
  return Math.min(Math.round(VP_W / (imgW.value / imgH.value)), VP_H_MAX);
});

const currentImageUrl = computed(() => {
  const img = props.images[activeSlot.value];
  return img ? props.getImageUrl(img.path) : '';
});

const imgW = ref(0);
const imgH = ref(0);
const zoom = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);

const imageDisplayRect = ref({ x: 0, y: 0, width: 0, height: 0 });

const localCropRects = ref<Record<number, CropRect>>({});

const maxFramePx = computed(() => {
  const dr = imageDisplayRect.value;
  if (!dr.width || !dr.height) return 0;
  return Math.min(dr.height, dr.width / currentSlotRatio.value);
});

const framePxH = computed(() => {
  if (maxFramePx.value <= 0) return 0;
  return maxFramePx.value / zoom.value;
});

const framePxW = computed(() => framePxH.value * currentSlotRatio.value);

const framePxTop = computed(() => {
  const dr = imageDisplayRect.value;
  return dr.y + dr.height / 2 + offsetY.value - framePxH.value / 2;
});

const framePxLeft = computed(() => {
  const dr = imageDisplayRect.value;
  return dr.x + dr.width / 2 + offsetX.value - framePxW.value / 2;
});

const previewImageTransform = computed(() => {
  const rect = computeCropRect();
  if (!imgW.value || !imgH.value) {
    return {
      width: '100%',
      height: '100%',
      left: '0%',
      top: '0%',
      objectFit: 'cover',
      objectPosition: 'center',
    } as const;
  }
  const isFullCrop = rect.w >= 0.99 && rect.h >= 0.99;
  if (isFullCrop) {
    return {
      width: '100%',
      height: '100%',
      left: '0%',
      top: '0%',
      objectFit: 'cover',
      objectPosition: 'center',
    } as const;
  }
  const widthPct = 100 / rect.w;
  const heightPct = 100 / rect.h;
  const left = -100 * rect.x / rect.w;
  const top = -100 * rect.y / rect.h;
  return {
    width: `${widthPct.toFixed(4)}%`,
    height: `${heightPct.toFixed(4)}%`,
    left: `${left.toFixed(4)}%`,
    top: `${top.toFixed(4)}%`,
    objectFit: 'fill',
    objectPosition: 'unset',
  } as const;
});

function calcImageDisplayRect() {
  const container = containerRef.value;
  const img = sourceImageRef.value;
  if (!container || !img || !img.naturalWidth || !img.naturalHeight) return;

  const cW = container.clientWidth;
  const cH = container.clientHeight;
  const iW = img.naturalWidth;
  const iH = img.naturalHeight;
  const containerRatio = cW / cH;
  const imageRatio = iW / iH;

  let dW: number, dH: number, dX: number, dY: number;
  if (imageRatio > containerRatio) {
    dW = cW;
    dH = cW / imageRatio;
    dX = 0;
    dY = (cH - dH) / 2;
  } else {
    dH = cH;
    dW = cH * imageRatio;
    dX = (cW - dW) / 2;
    dY = 0;
  }

  imageDisplayRect.value = { x: dX, y: dY, width: dW, height: dH };
}

function onImageLoad() {
  const img = sourceImageRef.value;
  if (!img) return;
  imgW.value = img.naturalWidth;
  imgH.value = img.naturalHeight;
  nextTick(() => {
    calcImageDisplayRect();
    loadSlotState();
  });
}

function computeCropRect(): CropRect {
  const dr = imageDisplayRect.value;
  if (!dr.width || !dr.height || !framePxW.value || !framePxH.value) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  const x = Math.max(0, (framePxLeft.value - dr.x) / dr.width);
  const y = Math.max(0, (framePxTop.value - dr.y) / dr.height);
  const w = Math.max(0.01, Math.min(1, framePxW.value / dr.width));
  const h = Math.max(0.01, Math.min(1, framePxH.value / dr.height));
  return { x: Math.min(x, 0.99), y: Math.min(y, 0.99), w, h };
}

function saveSlotState() {
  localCropRects.value = {
    ...localCropRects.value,
    [activeSlot.value]: computeCropRect(),
  };
}

function loadSlotState() {
  const rect = localCropRects.value[activeSlot.value];
  if (!rect || (rect.w >= 1 && rect.h >= 1 && rect.x === 0 && rect.y === 0)) {
    zoom.value = 1;
    offsetX.value = 0;
    offsetY.value = 0;
    return;
  }
  const dr = imageDisplayRect.value;
  if (!dr.width || !dr.height) return;

  const frameH_fromCrop = rect.h * dr.height;
  const mfp = maxFramePx.value;
  if (mfp <= 0) return;

  zoom.value = Math.max(1, Math.min(5, mfp / frameH_fromCrop));

  const cropCenterX = (rect.x + rect.w / 2) * dr.width + dr.x;
  const cropCenterY = (rect.y + rect.h / 2) * dr.height + dr.y;
  offsetX.value = cropCenterX - (dr.x + dr.width / 2);
  offsetY.value = cropCenterY - (dr.y + dr.height / 2);
  clampFrame();
}

function clampFrame() {
  const dr = imageDisplayRect.value;
  const fW = framePxW.value;
  const fH = framePxH.value;
  if (!dr.width || !dr.height || !fW || !fH) return;
  const maxOffX = Math.max(0, (dr.width - fW) / 2);
  const maxOffY = Math.max(0, (dr.height - fH) / 2);
  offsetX.value = Math.max(-maxOffX, Math.min(maxOffX, offsetX.value));
  offsetY.value = Math.max(-maxOffY, Math.min(maxOffY, offsetY.value));
}

function switchSlot(idx: number) {
  if (activeSlot.value === idx) return;
  saveSlotState();
  activeSlot.value = idx;
  imgW.value = 0;
  imgH.value = 0;
}

function onPointerDown(e: PointerEvent) {
  const root = containerRef.value;
  if (!root) return;

  root.setPointerCapture(e.pointerId);

  const startX = e.clientX;
  const startY = e.clientY;
  const startOffX = offsetX.value;
  const startOffY = offsetY.value;
  let rafId = 0;
  let lastClientX = startX;
  let lastClientY = startY;

  const applyMove = () => {
    offsetX.value = startOffX + (lastClientX - startX);
    offsetY.value = startOffY + (lastClientY - startY);
    clampFrame();
    rafId = 0;
  };

  const onMove = (ev: PointerEvent) => {
    lastClientX = ev.clientX;
    lastClientY = ev.clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(applyMove);
    }
  };

  const onUp = (ev: PointerEvent) => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    applyMove();
    root.releasePointerCapture(ev.pointerId);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerup', onUp);
  };

  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
}

let wheelRafId = 0;

function onWheel(e: WheelEvent) {
  const factor = e.deltaY > 0 ? 1.06 : 0.94;
  zoom.value = Math.max(1, Math.min(5, zoom.value * factor));
  if (!wheelRafId) {
    wheelRafId = requestAnimationFrame(() => {
      clampFrame();
      wheelRafId = 0;
    });
  }
}

function handleSlotReset() {
  zoom.value = 1;
  offsetX.value = 0;
  offsetY.value = 0;
}

function handleResetAll() {
  localCropRects.value = {};
  handleSlotReset();
}

function handleConfirm() {
  saveSlotState();
  emit('confirm', { ...localCropRects.value });
  emit('close');
}

function handleCancel() {
  emit('close');
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      activeSlot.value = 0;
      localCropRects.value = props.currentCropRects
        ? { ...props.currentCropRects }
        : {};
      imgW.value = 0;
      imgH.value = 0;
      zoom.value = 1;
      offsetX.value = 0;
      offsetY.value = 0;
      nextTick(() => {
        const img = sourceImageRef.value;
        if (img && img.complete && img.naturalWidth) {
          imgW.value = img.naturalWidth;
          imgH.value = img.naturalHeight;
          nextTick(() => {
            calcImageDisplayRect();
            loadSlotState();
          });
        }
      });
    }
  },
);
</script>