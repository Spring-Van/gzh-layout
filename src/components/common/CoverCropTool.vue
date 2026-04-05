<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center"
    @click.self="handleCancel"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
    >
      <div
        class="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0"
      >
        <div>
          <h3 class="text-lg font-bold text-slate-800">封面裁剪</h3>
          <p class="text-xs text-slate-400 mt-1">
            {{ currentRatioLabel }}
          </p>
        </div>
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
            ></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <div class="flex gap-2 mb-4">
          <button
            v-for="ratio in ratioOptions"
            :key="ratio.value"
            class="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            :class="[
              currentRatio === ratio.value
                ? 'bg-primary text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ]"
            @click="switchRatio(ratio.value)"
          >
            {{ ratio.label }}
          </button>
        </div>

        <div
          v-if="!imageSrc"
          class="flex items-center justify-center h-64 bg-slate-50 rounded-xl"
        >
          <p class="text-sm text-slate-400">正在生成预览图...</p>
        </div>

        <div v-else class="relative bg-slate-100 rounded-xl overflow-hidden">
          <div class="w-full" style="height: 400px">
            <Cropper
              :src="imageSrc"
              :stencil-props="{
                aspectRatio: aspectRatio,
              }"
              class="w-full h-full"
              @change="onCropChange"
            />
          </div>
        </div>

        <div class="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-200">
          <p class="text-xs font-medium text-slate-600 mb-2">当前裁剪坐标</p>
          <p
            class="text-[10px] font-mono text-slate-500 break-all leading-relaxed"
          >
            {{ formatCrop(currentCrop) }}
          </p>
        </div>
      </div>

      <div
        class="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0"
      >
        <button
          @click="resetCurrentToDefault"
          class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
        >
          重置
        </button>
        <button
          @click="handleConfirm"
          class="px-5 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:opacity-90 transition"
        >
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";

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
  initialRatio?: "235" | "11";
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", data: { pic_crop_235_1: string; pic_crop_1_1: string }): void;
}>();

const currentRatio = ref<"235" | "11">("235");

const DEFAULT_CROP_235: CropData = { left: 0, top: 0, width: 1, height: 1 };
const DEFAULT_CROP_11: CropData = {
  left: 0.287234,
  top: 0,
  width: 0.425532,
  height: 1,
};

const crop235 = ref<CropData>({ ...DEFAULT_CROP_235 });
const crop11 = ref<CropData>({ ...DEFAULT_CROP_11 });

const ratioOptions = [
  { label: "2.35:1（大图）", value: "235" as const },
  { label: "1:1（方图）", value: "11" as const },
];

const aspectRatio = computed(() => {
  return currentRatio.value === "235" ? 2.35 / 1 : 1 / 1;
});

const currentRatioLabel = computed(() => {
  return currentRatio.value === "235"
    ? "裁剪 2.35:1 比例的封面大图"
    : "裁剪 1:1 比例的封面小图";
});

const currentCrop = computed<CropData>(() => {
  return currentRatio.value === "235" ? crop235.value : crop11.value;
});

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

function onCropChange(event: any) {
  if (event && event.coordinates && event.imageSize) {
    const coords = event.coordinates;
    const imageSize = event.imageSize;

    const normalizedCrop: CropData = {
      left: coords.left / imageSize.width,
      top: coords.top / imageSize.height,
      width: coords.width / imageSize.width,
      height: coords.height / imageSize.height,
    };

    if (currentRatio.value === "235") {
      crop235.value = normalizedCrop;
    } else {
      crop11.value = normalizedCrop;
    }
  }
}

function switchRatio(ratio: "235" | "11") {
  currentRatio.value = ratio;
}

function resetCurrentToDefault() {
  if (currentRatio.value === "235") {
    crop235.value = { ...DEFAULT_CROP_235 };
  } else {
    crop11.value = { ...DEFAULT_CROP_11 };
  }
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
      currentRatio.value = props.initialRatio || "235";
    }
  },
);
</script>
