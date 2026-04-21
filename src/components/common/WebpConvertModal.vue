<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden"
    >
      <div
        class="p-4 border-b border-slate-100 flex items-center justify-between"
      >
        <div>
          <h2 class="text-lg font-bold text-slate-800">检测到 WebP 格式图片</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            微信素材管理接口不支持 WebP 格式，以下图片需转换为 PNG 后才能上传
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="p-2 hover:bg-slate-100 rounded-lg transition"
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

      <div class="p-4 overflow-y-auto max-h-[50vh]">
        <div class="mb-3 flex items-center gap-2">
          <span
            class="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded"
          >
            {{ webpImages.length }} 张 WebP 图片
          </span>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="image in webpImages"
            :key="image.path"
            class="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
          >
            <img
              :src="getImageUrl(image.path)"
              class="w-full aspect-square object-cover"
              loading="lazy"
              @error="
                (e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }
              "
            />
            <div
              class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5"
            >
              <p class="text-white text-[10px] truncate">
                {{ image.name }}
              </p>
            </div>
            <div
              class="absolute top-1 right-1 bg-amber-500 text-white text-[9px] px-1 py-0.5 rounded font-medium"
            >
              WebP
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-slate-100 bg-slate-50/50">
        <div class="flex items-center justify-between">
          <div class="text-xs text-slate-500">
            转换后格式：PNG | 转换后路径：
            <span class="text-slate-700 font-medium">{{ outputDirHint }}</span>
          </div>
          <div class="flex gap-3">
            <button
              @click="$emit('close')"
              class="px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              取消
            </button>
            <button
              @click="$emit('convert')"
              class="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition flex items-center gap-2"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                ></path>
              </svg>
              <span>一键转换为 PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ImageFile } from "../../types";

interface Props {
  visible: boolean;
  webpImages: ImageFile[];
  backupEnabled: boolean;
  sourceFolder: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "convert"): void;
}>();

const outputDirHint = computed(() => {
  const folderName = props.sourceFolder.split(/[/\\]/).pop() || "";
  if (props.backupEnabled) {
    return `${folderName}-备份/webp-converted`;
  }
  return `${folderName}/webp-converted`;
});

function getImageUrl(filePath: string): string {
  return `file://${filePath.replace(/\\/g, "/")}`;
}
</script>
