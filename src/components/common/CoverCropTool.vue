<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center"
    @click.self="handleCancel"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
    >
      <!-- Header -->
      <div
        class="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0"
      >
        <h3 class="text-lg font-bold text-slate-800">编辑封面</h3>
        <button
          @click="handleCancel"
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
        >
          <svg
            class="w-5 h-5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="!imageSrc" class="flex items-center justify-center h-96">
          <p class="text-sm text-slate-400">正在生成预览图...</p>
        </div>

        <div v-else class="flex gap-6">
          <!-- 左侧：原图 + 可拖拽裁剪框 -->
          <div class="flex-1 flex flex-col">
            <div
              ref="imageContainerRef"
              class="relative bg-slate-100 rounded-xl overflow-hidden select-none touch-none"
              :style="{ height: containerHeight + 'px' }"
              @pointerdown.prevent="onPointerDown"
            >
              <img
                ref="sourceImageRef"
                :src="imageSrc"
                class="w-full h-full object-contain pointer-events-none"
                draggable="false"
                @load="onImageLoad"
              />

              <!-- 遮罩层：裁剪框外部区域（拖拽时由 DOM 直接更新样式） -->
              <template v-if="activeRatio === '235'">
                <!-- 上下遮罩 -->
                <div
                  data-overlay="top"
                  class="absolute left-0 right-0 bg-black/50 pointer-events-none"
                  :style="{ top: 0, height: cropOverlayTop + 'px' }"
                />
                <div
                  data-overlay="bottom"
                  class="absolute left-0 right-0 bg-black/50 pointer-events-none"
                  :style="{ top: cropOverlayBottom + 'px', bottom: 0 }"
                />
              </template>
              <template v-else>
                <!-- 上下左右遮罩（1:1 正方形） -->
                <div
                  data-overlay="top"
                  class="absolute bg-black/50 pointer-events-none"
                  :style="{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: cropOverlayTop + 'px',
                  }"
                />
                <div
                  data-overlay="bottom"
                  class="absolute bg-black/50 pointer-events-none"
                  :style="{
                    bottom: 0,
                    left: 0,
                    right: 0,
                    top: cropOverlayBottom + 'px',
                  }"
                />
                <div
                  data-overlay="left"
                  class="absolute bg-black/50 pointer-events-none"
                  :style="{
                    top: cropOverlayTop + 'px',
                    left: 0,
                    width: cropOverlayLeft + 'px',
                    height: cropOverlayHeight + 'px',
                  }"
                />
                <div
                  data-overlay="right"
                  class="absolute bg-black/50 pointer-events-none"
                  :style="{
                    top: cropOverlayTop + 'px',
                    right: 0,
                    width: cropOverlayRight + 'px',
                    height: cropOverlayHeight + 'px',
                  }"
                />
              </template>

              <!-- 裁剪框（拖拽时由 DOM 直接更新样式） -->
              <div
                data-overlay="frame"
                class="absolute border-2 border-white/80 pointer-events-none"
                :style="{
                  top: cropOverlayTop + 'px',
                  left: activeRatio === '11' ? cropOverlayLeft + 'px' : 0,
                  width: activeRatio === '11' ? cropOverlayHeight + 'px' : '100%',
                  height: cropOverlayHeight + 'px',
                }"
              >
                <!-- 四边拖拽手柄 -->
                <div
                  class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-white rounded-sm cursor-ns-resize pointer-events-auto"
                  @pointerdown.stop="onHandlePointerDown('n', $event)"
                />
                <div
                  class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-white rounded-sm cursor-ns-resize pointer-events-auto"
                  @pointerdown.stop="onHandlePointerDown('s', $event)"
                />
                <template v-if="activeRatio === '11'">
                  <div
                    data-handle="w"
                    class="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white rounded-sm cursor-ew-resize pointer-events-auto"
                    @pointerdown.stop="onHandlePointerDown('w', $event)"
                  />
                  <div
                    data-handle="e"
                    class="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-white rounded-sm cursor-ew-resize pointer-events-auto"
                    @pointerdown.stop="onHandlePointerDown('e', $event)"
                  />
                </template>
              </div>
            </div>

            <p class="text-xs text-slate-400 mt-2 text-center">
              {{ activeRatio === '235' ? '拖拽裁剪框上下边缘调整位置' : '拖拽裁剪框边缘调整位置和大小' }}
            </p>
          </div>

          <!-- 右侧：双比例预览（更紧凑、可滚动） -->
          <div class="w-52 flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            <!-- 2.35:1 预览卡片 -->
            <div
              class="cursor-pointer group"
              @click="switchRatio('235')"
            >
              <div class="flex items-center gap-1 mb-1">
                <span class="text-xs font-medium text-slate-600"
                  >2.35:1（消息列表）</span
                >
                <svg
                  class="w-3.5 h-3.5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <!-- 骨架屏卡片 -->
              <div
                class="w-full rounded-lg overflow-hidden border-2 transition-all bg-white"
                :class="activeRatio === '235'
                  ? 'border-emerald-500 shadow-sm'
                  : 'border-slate-200 group-hover:border-slate-300'"
                style="min-height: 120px;"
              >
                <!-- 顶部：一行骨架屏（两个短条并排） -->
                <div class="px-2 py-1.5 flex items-center gap-2">
                  <div class="h-1.5 bg-slate-200 rounded w-16" />
                  <div class="h-1.5 bg-slate-200 rounded w-10" />
                </div>

                <!-- 底部：2.35:1 图片预览，宽度占满，高度由比例决定（增大卡片高度仅通过 padding） -->
                <div class="px-1 pb-3 pt-1">
                  <div
                    class="w-full aspect-[2.35/1] rounded overflow-hidden"
                    :style="previewStyle235"
                  />
                </div>
              </div>
            </div>

            <!-- 1:1 预览卡片 -->
            <div
              class="cursor-pointer group"
              @click="switchRatio('11')"
            >
              <div class="flex items-center gap-1 mb-1">
                <span class="text-xs font-medium text-slate-600"
                  >1:1（转发卡片和公众号主页）</span
                >
              </div>
              <!-- 骨架屏卡片 -->
              <div
                class="w-full aspect-[2.35/1] rounded-lg overflow-hidden border-2 transition-all"
                :class="activeRatio === '11'
                  ? 'border-emerald-500 shadow-sm'
                  : 'border-slate-200 group-hover:border-slate-300'"
              >
                <div class="w-full h-full bg-white flex">
                  <!-- 左侧：1:1 预览图 -->
                  <div class="h-full p-1">
                    <div
                      class="h-full aspect-square rounded overflow-hidden"
                      :style="previewStyle11"
                    />
                  </div>
                  <!-- 右侧：骨架屏展示 -->
                  <div class="flex-1 p-2 flex flex-col justify-center gap-1">
                    <div class="h-1.5 bg-slate-200 rounded w-3/4" />
                    <div class="h-1.5 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-slate-200 flex justify-center gap-3 flex-shrink-0"
      >
        <button
          @click="handleReset"
          class="px-6 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          上一步
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
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";

interface CropData {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  imageSrc?: string;
  initialCrop235?: string;
  initialCrop11?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", data: { pic_crop_235_1: string; pic_crop_1_1: string }): void;
}>();

// ============ 常量 ============
const CONTAINER_HEIGHT = 420;
const containerHeight = ref(CONTAINER_HEIGHT);

// 2.35:1 默认全图，1:1 默认居中正方形
const DEFAULT_CROP_235: CropData = { left: 0, top: 0, width: 1, height: 1 };
const DEFAULT_CROP_11: CropData = {
  left: 0.287234,
  top: 0,
  width: 0.425532,
  height: 1,
};

// ============ Refs ============
const imageContainerRef = ref<HTMLDivElement | null>(null);
const sourceImageRef = ref<HTMLImageElement | null>(null);

const crop235 = ref<CropData>({ ...DEFAULT_CROP_235 });
const crop11 = ref<CropData>({ ...DEFAULT_CROP_11 });

// 当前激活的裁剪比例
const activeRatio = ref<"235" | "11">("235");

// 图片实际在容器中的显示尺寸和位置（object-contain 后的实际渲染区域）
const imageDisplayRect = ref({ x: 0, y: 0, width: 0, height: 0 });

// 拖拽状态
const isDragging = ref(false);
const dragMode = ref<"move" | "resize-n" | "resize-s" | "resize-w" | "resize-e">("move");
const dragStartY = ref(0);
const dragStartX = ref(0);
const dragStartTop = ref(0);
const dragStartLeft = ref(0);
const dragStartHeight = ref(0);
const dragStartWidth = ref(0);

// ============ 计算属性 ============

/**
 * 当前激活的裁剪数据
 */
const activeCrop = computed<CropData>(() => {
  return activeRatio.value === "235" ? crop235.value : crop11.value;
});

/**
 * 当前裁剪框在容器中的像素高度
 */
const cropOverlayHeight = computed(() => {
  if (imageDisplayRect.value.height === 0) return 0;
  const crop = activeCrop.value;
  return crop.height * imageDisplayRect.value.height;
});

/**
 * 当前裁剪框在容器中的像素宽度（1:1 模式下）
 */
const cropOverlayWidth = computed(() => {
  if (imageDisplayRect.value.width === 0) return 0;
  const crop = activeCrop.value;
  return crop.width * imageDisplayRect.value.width;
});

/**
 * 当前裁剪框顶部像素位置
 */
const cropOverlayTop = computed(() => {
  if (imageDisplayRect.value.height === 0) return 0;
  const crop = activeCrop.value;
  return imageDisplayRect.value.y + crop.top * imageDisplayRect.value.height;
});

/**
 * 当前裁剪框底部像素位置
 */
const cropOverlayBottom = computed(() => {
  return cropOverlayTop.value + cropOverlayHeight.value;
});

/**
 * 当前裁剪框左侧像素位置（1:1 模式）
 */
const cropOverlayLeft = computed(() => {
  if (imageDisplayRect.value.width === 0) return 0;
  const crop = activeCrop.value;
  return imageDisplayRect.value.x + crop.left * imageDisplayRect.value.width;
});

/**
 * 当前裁剪框右侧像素位置（1:1 模式）
 */
const cropOverlayRight = computed(() => {
  if (imageDisplayRect.value.width === 0) return 0;
  const crop = activeCrop.value;
  return (
    imageDisplayRect.value.x +
    imageDisplayRect.value.width -
    (crop.left + crop.width) * imageDisplayRect.value.width
  );
});

/** 2.35:1 预览样式 */
const previewStyle235 = computed(() => {
  return cropToBackgroundStyle(props.imageSrc || "", formatCrop(crop235.value));
});

/** 1:1 预览样式 */
const previewStyle11 = computed(() => {
  return cropToBackgroundStyle(props.imageSrc || "", formatCrop(crop11.value));
});

// ============ 方法 ============

function formatCrop(c: CropData): string {
  const x1 = toFixed6(c.left);
  const y1 = toFixed6(c.top);
  const x2 = toFixed6(c.left + c.width);
  const y2 = toFixed6(c.top + c.height);
  return `${x1}_${y1}_${x2}_${y2}`;
}

function parseCrop(str: string): CropData {
  const parts = str.split("_").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return { left: 0, top: 0, width: 1, height: 1 };
  }
  return {
    left: parts[0],
    top: parts[1],
    width: parts[2] - parts[0],
    height: parts[3] - parts[1],
  };
}

function toFixed6(n: number): string {
  return Math.max(0, Math.min(1, n)).toFixed(6);
}

/**
 * 计算图片在容器中使用 object-contain 后的实际显示区域
 */
function calcImageDisplayRect() {
  const container = imageContainerRef.value;
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
  nextTick(() => {
    calcImageDisplayRect();
  });
}

/**
 * 切换当前激活的裁剪比例
 */
function switchRatio(ratio: "235" | "11") {
  activeRatio.value = ratio;
}

/**
 * 将裁剪框的像素位置转换为归一化坐标
 */
function syncCropFromOverlay(
  pixelTop: number,
  pixelHeight: number,
  pixelLeft?: number,
  pixelWidth?: number,
) {
  const rect = imageDisplayRect.value;
  if (rect.height === 0) return;

  let top = pixelTop;
  let height = pixelHeight;
  let left = pixelLeft ?? rect.x;
  let width = pixelWidth ?? rect.width;

  const minTop = rect.y;
  const maxBottom = rect.y + rect.height;
  const minLeft = rect.x;
  const maxRight = rect.x + rect.width;

  // 限制在图片显示区域内
  if (top < minTop) top = minTop;
  if (top + height > maxBottom) {
    top = maxBottom - height;
  }
  if (height > rect.height) {
    height = rect.height;
    top = minTop;
  }

  if (left < minLeft) left = minLeft;
  if (left + width > maxRight) {
    left = maxRight - width;
  }
  if (width > rect.width) {
    width = rect.width;
    left = minLeft;
  }

  // 转换为归一化坐标
  const normalizedTop = (top - rect.y) / rect.height;
  const normalizedHeight = height / rect.height;
  const normalizedLeft = (left - rect.x) / rect.width;
  const normalizedWidth = width / rect.width;

  if (activeRatio.value === "235") {
    crop235.value = {
      left: 0,
      top: Math.max(0, normalizedTop),
      width: 1,
      height: Math.min(1, normalizedHeight),
    };

    // 同步更新 1:1 区域（从 2.35:1 区域中心截取正方形）
    const squareHeight = Math.min(1, normalizedHeight);
    const squareWidth = squareHeight * (rect.height / rect.width);
    const centerY = crop235.value.top + crop235.value.height / 2;
    let squareTop = centerY - squareHeight / 2;
    let squareLeft = 0.5 - squareWidth / 2;

    if (squareTop < 0) squareTop = 0;
    if (squareTop + squareHeight > 1) squareTop = 1 - squareHeight;
    if (squareLeft < 0) squareLeft = 0;
    if (squareLeft + squareWidth > 1) {
      squareLeft = 1 - squareWidth;
    }

    crop11.value = {
      left: squareLeft,
      top: squareTop,
      width: squareWidth,
      height: squareHeight,
    };
  } else {
    crop11.value = {
      left: Math.max(0, normalizedLeft),
      top: Math.max(0, normalizedTop),
      width: Math.min(1, normalizedWidth),
      height: Math.min(1, normalizedHeight),
    };

    // 同步更新 2.35:1 区域（包裹 1:1 区域）
    const centerY = crop11.value.top + crop11.value.height / 2;
    const targetHeight = crop11.value.width * (rect.width / rect.height) * 2.35;
    let newTop = centerY - targetHeight / 2;
    if (newTop < 0) newTop = 0;
    if (newTop + targetHeight > 1) newTop = 1 - targetHeight;

    crop235.value = {
      left: 0,
      top: Math.max(0, newTop),
      width: 1,
      height: Math.min(1, targetHeight),
    };
  }
}

// ============ 拖拽事件（pointer + DOM 直接更新） ============

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function setOverlayDOM(params: {
  top: number;
  height: number;
  left?: number;
  width?: number;
  showSide?: boolean;
}) {
  const root = imageContainerRef.value;
  if (!root) return;
  const topEl = root.querySelector('[data-overlay="top"]') as HTMLElement | null;
  const bottomEl = root.querySelector('[data-overlay="bottom"]') as HTMLElement | null;
  const frameEl = root.querySelector('[data-overlay="frame"]') as HTMLElement | null;

  const top = params.top;
  const height = params.height;
  const bottom = top + height;

  if (topEl) {
    topEl.style.height = `${top}px`;
  }
  if (bottomEl) {
    bottomEl.style.top = `${bottom}px`;
  }
  if (frameEl) {
    frameEl.style.top = `${top}px`;
    frameEl.style.height = `${height}px`;
  }

  if (activeRatio.value === '11') {
    const left = params.left ?? 0;
    const width = params.width ?? 0;
    const leftEl = root.querySelector('[data-overlay="left"]') as HTMLElement | null;
    const rightEl = root.querySelector('[data-overlay="right"]') as HTMLElement | null;
    if (leftEl) {
      leftEl.style.top = `${top}px`;
      leftEl.style.height = `${height}px`;
      leftEl.style.width = `${left}px`;
    }
    if (rightEl) {
      rightEl.style.top = `${top}px`;
      rightEl.style.height = `${height}px`;
      rightEl.style.width = `${Math.max(0, root.clientWidth - (left + width))}px`;
    }
    if (frameEl) {
      frameEl.style.left = `${left}px`;
      frameEl.style.width = `${height}px`;
    }
  } else {
    if (frameEl) {
      frameEl.style.left = `0px`;
      frameEl.style.width = `100%`;
    }
  }
}

function onPointerDown(e: PointerEvent) {
  const root = imageContainerRef.value;
  if (!root) return;

  // 起始点
  isDragging.value = true;
  dragMode.value = "move";
  root.setPointerCapture(e.pointerId);

  dragStartY.value = e.clientY;
  dragStartX.value = e.clientX;
  dragStartTop.value = cropOverlayTop.value;
  dragStartLeft.value = cropOverlayLeft.value;
  dragStartHeight.value = cropOverlayHeight.value;
  dragStartWidth.value = cropOverlayWidth.value;

  const onMove = (ev: PointerEvent) => {
    if (!isDragging.value) return;
    const deltaY = ev.clientY - dragStartY.value;
    const deltaX = ev.clientX - dragStartX.value;
    const rect = imageDisplayRect.value;

    if (dragMode.value === "move") {
      let newTop = dragStartTop.value + deltaY;
      let newLeft = dragStartLeft.value + deltaX;
      if (activeRatio.value === '235') {
        newTop = clamp(newTop, rect.y, rect.y + rect.height - dragStartHeight.value);
        setOverlayDOM({ top: newTop, height: dragStartHeight.value });
      } else {
        newTop = clamp(newTop, rect.y, rect.y + rect.height - dragStartHeight.value);
        newLeft = clamp(newLeft, rect.x, rect.x + rect.width - dragStartWidth.value);
        setOverlayDOM({ top: newTop, height: dragStartHeight.value, left: newLeft, width: dragStartWidth.value });
      }
    } else if (dragMode.value === 'resize-s') {
      let newHeight = dragStartHeight.value + deltaY;
      newHeight = clamp(newHeight, 20, rect.y + rect.height - dragStartTop.value);
      setOverlayDOM({ top: dragStartTop.value, height: newHeight });
    } else if (dragMode.value === 'resize-n') {
      let newTop = dragStartTop.value + deltaY;
      let newHeight = dragStartHeight.value - deltaY;
      if (newHeight < 20) {
        newHeight = 20;
        newTop = dragStartTop.value + dragStartHeight.value - 20;
      }
      newTop = clamp(newTop, rect.y, rect.y + rect.height - newHeight);
      setOverlayDOM({ top: newTop, height: newHeight });
    } else if (dragMode.value === 'resize-e') {
      let newWidth = dragStartWidth.value + deltaX;
      newWidth = clamp(newWidth, 20, rect.x + rect.width - dragStartLeft.value);
      setOverlayDOM({ top: dragStartTop.value, height: dragStartHeight.value, left: dragStartLeft.value, width: newWidth });
    } else if (dragMode.value === 'resize-w') {
      let newLeft = dragStartLeft.value + deltaX;
      let newWidth = dragStartWidth.value - deltaX;
      if (newWidth < 20) {
        newWidth = 20;
        newLeft = dragStartLeft.value + dragStartWidth.value - 20;
      }
      newLeft = clamp(newLeft, rect.x, rect.x + rect.width - newWidth);
      setOverlayDOM({ top: dragStartTop.value, height: dragStartHeight.value, left: newLeft, width: newWidth });
    }
  };

  const onUp = (ev: PointerEvent) => {
    isDragging.value = false;
    dragMode.value = 'move';
    root.releasePointerCapture(ev.pointerId);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerup', onUp);

    // 将 DOM 当前位置回写到 Vue 数据（以触发右侧预览更新）
    const frameEl = root.querySelector('[data-overlay="frame"]') as HTMLElement | null;
    if (frameEl) {
      const topPx = parseFloat(frameEl.style.top || '0');
      const heightPx = parseFloat(frameEl.style.height || '0');
      const leftPx = parseFloat(frameEl.style.left || '0');
      // width 在 235 模式为 100%，此处传 rect.width 即可
      const widthPx = activeRatio.value === '11' ? parseFloat(frameEl.style.width || '0') : imageDisplayRect.value.width;
      syncCropFromOverlay(topPx, heightPx, leftPx, widthPx);
    }
  };

  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
}

function onHandlePointerDown(direction: 'n' | 's' | 'w' | 'e', e: PointerEvent) {
  const root = imageContainerRef.value;
  if (!root) return;

  isDragging.value = true;
  dragMode.value =
    direction === 'n' ? 'resize-n'
    : direction === 's' ? 'resize-s'
    : direction === 'w' ? 'resize-w'
    : 'resize-e';

  root.setPointerCapture(e.pointerId);
  dragStartY.value = e.clientY;
  dragStartX.value = e.clientX;
  dragStartTop.value = cropOverlayTop.value;
  dragStartLeft.value = cropOverlayLeft.value;
  dragStartHeight.value = cropOverlayHeight.value;
  dragStartWidth.value = cropOverlayWidth.value;

  const onMove = (ev: PointerEvent) => {
    if (!isDragging.value) return;
    const deltaY = ev.clientY - dragStartY.value;
    const deltaX = ev.clientX - dragStartX.value;
    const rect = imageDisplayRect.value;

    if (dragMode.value === 'resize-s') {
      let newHeight = dragStartHeight.value + deltaY;
      newHeight = clamp(newHeight, 20, rect.y + rect.height - dragStartTop.value);
      setOverlayDOM({ top: dragStartTop.value, height: newHeight });
    } else if (dragMode.value === 'resize-n') {
      let newTop = dragStartTop.value + deltaY;
      let newHeight = dragStartHeight.value - deltaY;
      if (newHeight < 20) {
        newHeight = 20;
        newTop = dragStartTop.value + dragStartHeight.value - 20;
      }
      newTop = clamp(newTop, rect.y, rect.y + rect.height - newHeight);
      setOverlayDOM({ top: newTop, height: newHeight });
    } else if (dragMode.value === 'resize-e') {
      let newWidth = dragStartWidth.value + deltaX;
      newWidth = clamp(newWidth, 20, rect.x + rect.width - dragStartLeft.value);
      setOverlayDOM({ top: dragStartTop.value, height: dragStartHeight.value, left: dragStartLeft.value, width: newWidth });
    } else if (dragMode.value === 'resize-w') {
      let newLeft = dragStartLeft.value + deltaX;
      let newWidth = dragStartWidth.value - deltaX;
      if (newWidth < 20) {
        newWidth = 20;
        newLeft = dragStartLeft.value + dragStartWidth.value - 20;
      }
      newLeft = clamp(newLeft, rect.x, rect.x + rect.width - newWidth);
      setOverlayDOM({ top: dragStartTop.value, height: dragStartHeight.value, left: newLeft, width: newWidth });
    }
  };

  const onUp = (ev: PointerEvent) => {
    isDragging.value = false;
    dragMode.value = 'move';
    root.releasePointerCapture(ev.pointerId);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerup', onUp);

    // 将 DOM 当前位置回写到 Vue 数据（以触发右侧预览更新）
    const frameEl = root.querySelector('[data-overlay="frame"]') as HTMLElement | null;
    if (frameEl) {
      const topPx = parseFloat(frameEl.style.top || '0');
      const heightPx = parseFloat(frameEl.style.height || '0');
      const leftPx = parseFloat(frameEl.style.left || '0');
      const widthPx = activeRatio.value === '11' ? parseFloat(frameEl.style.width || '0') : imageDisplayRect.value.width;
      syncCropFromOverlay(topPx, heightPx, leftPx, widthPx);
    }
  };

  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
}

// ============ 操作 ============

function handleReset() {
  crop235.value = { ...DEFAULT_CROP_235 };
  crop11.value = { ...DEFAULT_CROP_11 };
  activeRatio.value = "235";
}

function handleConfirm() {
  emit("confirm", {
    pic_crop_235_1: formatCrop(crop235.value),
    pic_crop_1_1: formatCrop(crop11.value),
  });
  emit("close");
}

function handleCancel() {
  emit("close");
}

// ============ 生命周期 ============

watch(
  () => props.visible,
  (val) => {
    if (val) {
      crop235.value = props.initialCrop235
        ? parseCrop(props.initialCrop235)
        : { ...DEFAULT_CROP_235 };
      crop11.value = props.initialCrop11
        ? parseCrop(props.initialCrop11)
        : { ...DEFAULT_CROP_11 };
      activeRatio.value = "235";

      nextTick(() => {
        calcImageDisplayRect();
      });
    }
  },
);

// 窗口大小变化时重新计算
watch(
  () => props.imageSrc,
  () => {
    nextTick(() => {
      calcImageDisplayRect();
    });
  },
);

// ============ 工具函数：复用 cropToBackgroundStyle ============

function cropToBackgroundStyle(
  imageSrc: string,
  cropStr: string,
): Record<string, string> {
  if (!imageSrc) return {};

  const fallback: Record<string, string> = {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  if (!cropStr) return fallback;

  const parts = cropStr.split("_").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return fallback;

  const [x1, y1, x2, y2] = parts;
  const cropW = x2 - x1;
  const cropH = y2 - y1;

  if (cropW <= 0 || cropH <= 0) return fallback;

  const bgSizeW = (1 / cropW) * 100;
  const bgSizeH = (1 / cropH) * 100;

  const bgPosX = cropW >= 1 ? 0 : (x1 / (1 - cropW)) * 100;
  const bgPosY = cropH >= 1 ? 0 : (y1 / (1 - cropH)) * 100;

  return {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: `${bgSizeW}% ${bgSizeH}%`,
    backgroundPosition: `${bgPosX}% ${bgPosY}%`,
  };
}
</script>
