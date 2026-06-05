<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center"
      @click.self="handleCancel"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[85vh] flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="px-5 py-3 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 class="text-sm font-bold text-slate-800">调整图片显示位置</h3>
            <p class="text-[11px] text-slate-400 mt-0.5">拖拽移动 · 滚轮缩放</p>
          </div>
          <button
            @click="handleCancel"
            class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
          >
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-5 flex flex-col items-center gap-4 overflow-y-auto">
          <!-- 预览容器（模拟模板中的图片槽位） -->
          <div
            ref="viewportRef"
            class="relative overflow-hidden rounded-lg border-2 border-slate-200 bg-slate-100 cursor-grab select-none"
            :style="viewportStyle"
            @mousedown.prevent="onMouseDown"
            @wheel.prevent="onWheel"
          >
            <img
              ref="imageRef"
              :src="imageUrl"
              class="absolute top-0 left-0 origin-center pointer-events-none"
              :style="imageTransformStyle"
              draggable="false"
              @load="onImageLoad"
            />
            <!-- 网格辅助线 -->
            <div class="absolute inset-0 pointer-events-none">
              <div class="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
              <div class="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
              <div class="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
              <div class="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
            </div>
          </div>

          <!-- 缩放滑块 -->
          <div class="w-full flex items-center gap-3">
            <span class="text-[11px] text-slate-400 w-8">缩小</span>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.01"
              v-model.number="zoom"
              class="flex-1 accent-primary"
              @input="clampOffset"
            />
            <span class="text-[11px] text-slate-400 w-8 text-right">放大</span>
          </div>

          <p class="text-[11px] text-slate-400 text-center">
            当前缩放: {{ (zoom * 100).toFixed(0) }}% · 滚轮可快速缩放
          </p>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3 border-t border-slate-200 flex justify-center gap-3 flex-shrink-0">
          <button
            @click="handleReset"
            class="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            重置
          </button>
          <button
            @click="handleConfirm"
            class="px-5 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
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
  x: number; // 0-1 left
  y: number; // 0-1 top
  w: number; // 0-1 width
  h: number; // 0-1 height
}

interface Props {
  visible: boolean;
  imageUrl: string;
  slotAspect?: number; // 模板中图片槽位的宽高比，默认 1
  initialRect?: CropRect; // 初始裁剪区域
}

const props = withDefaults(defineProps<Props>(), {
  slotAspect: 1,
  initialRect: () => ({ x: 0, y: 0, w: 1, h: 1 }),
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', rect: CropRect): void;
}>();

const viewportRef = ref<HTMLDivElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);

const zoom = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);

// 视口尺寸（固定宽度，高度按槽位比例）
const VP_W = 300;
const VP_H = computed(() => Math.round(VP_W / props.slotAspect));

const viewportStyle = computed(() => ({
  width: `${VP_W}px`,
  height: `${VP_H.value}px`,
}));

// 图片自然尺寸
const imgW = ref(0);
const imgH = ref(0);

// "fill" 模式下图片缩放到填满视口的尺寸
const fillScale = computed(() => {
  if (!imgW.value || !imgH.value) return 1;
  // cover: 图片短边匹配视口对应边
  const sx = VP_W / imgW.value;
  const sy = VP_H.value / imgH.value;
  return Math.max(sx, sy);
});

const imageTransformStyle = computed(() => {
  if (!imgW.value || !imgH.value) return { display: 'none' };
  const baseW = imgW.value * fillScale.value;
  const baseH = imgH.value * fillScale.value;
  const centerX = VP_W / 2 + offsetX.value;
  const centerY = VP_H.value / 2 + offsetY.value;
  return {
    display: 'block',
    width: `${baseW}px`,
    height: `${baseH}px`,
    left: `${centerX - baseW / 2}px`,
    top: `${centerY - baseH / 2}px`,
    transform: `scale(${zoom.value})`,
  };
});

function onImageLoad() {
  const img = imageRef.value;
  if (!img) return;
  imgW.value = img.naturalWidth;
  imgH.value = img.naturalHeight;
  nextTick(() => {
    initFromRect();
  });
}

// 从初始裁剪区域还原 offset/zoom
function initFromRect() {
  const rect = props.initialRect;
  if (!imgW.value || !imgH.value) return;
  if (rect.w >= 1 && rect.h >= 1 && rect.x === 0 && rect.y === 0) {
    // 全图，使用默认 fill
    zoom.value = 1;
    offsetX.value = 0;
    offsetY.value = 0;
    return;
  }
  // 裁剪区域 -> zoom + offset
  const z = Math.min(1 / rect.w, 1 / rect.h);
  zoom.value = z;
  // 裁剪中心（在图片坐标中）
  const cropCenterImgX = (rect.x + rect.w / 2) * imgW.value;
  const cropCenterImgY = (rect.y + rect.h / 2) * imgH.value;
  // 图片中心
  const imgCenterX = imgW.value / 2;
  const imgCenterY = imgH.value / 2;
  // offset = (图片中心 - 裁剪中心) * fillScale * zoom
  offsetX.value = (imgCenterX - cropCenterImgX) * fillScale.value * z;
  offsetY.value = (imgCenterY - cropCenterImgY) * fillScale.value * z;
  clampOffset();
}

// 鼠标拖拽
let dragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetY = 0;

function onMouseDown(e: MouseEvent) {
  dragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragStartOffsetX = offsetX.value;
  dragStartOffsetY = offsetY.value;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e: MouseEvent) {
  if (!dragging) return;
  offsetX.value = dragStartOffsetX + (e.clientX - dragStartX);
  offsetY.value = dragStartOffsetY + (e.clientY - dragStartY);
  clampOffset();
}

function onMouseUp() {
  dragging = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

// 滚轮缩放
function onWheel(e: WheelEvent) {
  const factor = e.deltaY > 0 ? 0.92 : 1.08;
  zoom.value = Math.max(0.1, Math.min(5, zoom.value * factor));
  clampOffset();
}

// 限制偏移量，不让图片离开视口太远
function clampOffset() {
  if (!imgW.value || !imgH.value) return;
  const baseW = imgW.value * fillScale.value * zoom.value;
  const baseH = imgH.value * fillScale.value * zoom.value;
  const maxOffsetX = Math.max(0, (baseW - VP_W) / 2);
  const maxOffsetY = Math.max(0, (baseH - VP_H.value) / 2);
  offsetX.value = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX.value));
  offsetY.value = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY.value));
}

// 计算当前视图对应的裁剪区域 {x, y, w, h} 归一化
function computeCropRect(): CropRect {
  if (!imgW.value || !imgH.value) return { x: 0, y: 0, w: 1, h: 1 };
  const baseW = imgW.value * fillScale.value;
  const baseH = imgH.value * fillScale.value;
  const centerImgX = VP_W / 2 + offsetX.value;
  const centerImgY = VP_H.value / 2 + offsetY.value;

  // 视口在缩放后图片坐标中的位置
  const viewLeftInScaled = centerImgX - VP_W / 2;
  const viewTopInScaled = centerImgY - VP_H.value / 2;

  // 还原到原始图片坐标
  const viewLeftInBase = viewLeftInScaled / zoom.value;
  const viewTopInBase = viewTopInScaled / zoom.value;
  const viewWInBase = VP_W / zoom.value;
  const viewHInBase = VP_H.value / zoom.value;

  // 转为归一化
  return {
    x: Math.max(0, Math.min(1, viewLeftInBase / baseW)),
    y: Math.max(0, Math.min(1, viewTopInBase / baseH)),
    w: Math.max(0.01, Math.min(1, viewWInBase / baseW)),
    h: Math.max(0.01, Math.min(1, viewHInBase / baseH)),
  };
}

function handleReset() {
  zoom.value = 1;
  offsetX.value = 0;
  offsetY.value = 0;
}

function handleConfirm() {
  emit('confirm', computeCropRect());
  emit('close');
}

function handleCancel() {
  emit('close');
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      nextTick(() => {
        if (imgW.value && imgH.value) {
          initFromRect();
        }
      });
    }
  }
);

watch(
  () => props.imageUrl,
  () => {
    imgW.value = 0;
    imgH.value = 0;
    zoom.value = 1;
    offsetX.value = 0;
    offsetY.value = 0;
  }
);
</script>
