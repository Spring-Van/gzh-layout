<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden"
    >
      <div
        class="p-4 border-b border-slate-100 flex items-center justify-between"
      >
        <div>
          <h2 class="text-lg font-bold text-slate-800">发现重复图片</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            请选择要保留的图片，未选择的将被删除
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

      <div class="p-4 overflow-y-auto max-h-[65vh]">
        <div class="space-y-3">
          <div
            v-for="(pair, index) in duplicates"
            :key="index"
            class="border border-slate-200 rounded-lg p-3 bg-slate-50/50"
          >
            <div class="flex items-center gap-2 mb-3">
              <span
                class="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded"
              >
                重复组 #{{ index + 1 }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div
                class="relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all"
                :class="
                  selectedToKeep[pair.original.id]
                    ? 'border-primary'
                    : 'border-slate-200 hover:border-slate-300'
                "
                @click="toggleSelection(pair.original.id)"
              >
                <img
                  :src="getImageUrl(pair.original.path)"
                  class="w-full aspect-[4/3] object-cover"
                  loading="lazy"
                  @error="
                    (e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }
                  "
                />
                <div
                  class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2"
                >
                  <p class="text-white text-xs truncate">
                    {{ pair.original.name }}
                  </p>
                </div>
                <div
                  v-if="selectedToKeep[pair.original.id]"
                  class="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                >
                  <svg
                    class="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>
              </div>

              <div
                class="relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all"
                :class="
                  selectedToKeep[pair.duplicate.id]
                    ? 'border-primary'
                    : 'border-slate-200 hover:border-slate-300'
                "
                @click="toggleSelection(pair.duplicate.id)"
              >
                <img
                  :src="getImageUrl(pair.duplicate.path)"
                  class="w-full aspect-[4/3] object-cover"
                  loading="lazy"
                  @error="
                    (e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }
                  "
                />
                <div
                  class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2"
                >
                  <p class="text-white text-xs truncate">
                    {{ pair.duplicate.name }}
                  </p>
                </div>
                <div
                  v-if="selectedToKeep[pair.duplicate.id]"
                  class="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                >
                  <svg
                    class="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>

            <p class="text-xs text-slate-400 text-center mt-3">
              点击选择要保留的图片（每组至少保留一张）
            </p>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-slate-100 flex justify-end gap-3">
        <button
          @click="$emit('close')"
          class="px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          取消
        </button>
        <button
          @click="confirmSelection"
          :disabled="!canConfirm"
          class="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          确认删除重复
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { ImageFile } from "../../types";

interface Props {
  visible: boolean;
  duplicates: Array<{ original: ImageFile; duplicate: ImageFile }>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", imagesToRemove: string[]): void;
}>();

const selectedToKeep = ref<Record<string, boolean>>({});

const canConfirm = computed(() => {
  for (const pair of props.duplicates) {
    const hasSelection =
      selectedToKeep.value[pair.original.id] ||
      selectedToKeep.value[pair.duplicate.id];
    if (!hasSelection) return false;
  }
  return true;
});

function getImageUrl(filePath: string): string {
  return `file://${filePath.replace(/\\/g, "/")}`;
}

function toggleSelection(imageId: string) {
  if (selectedToKeep.value[imageId]) {
    delete selectedToKeep.value[imageId];
  } else {
    selectedToKeep.value[imageId] = true;
  }
}

function confirmSelection() {
  const imagesToRemove: string[] = [];

  for (const pair of props.duplicates) {
    if (!selectedToKeep.value[pair.original.id]) {
      imagesToRemove.push(pair.original.id);
    }
    if (!selectedToKeep.value[pair.duplicate.id]) {
      imagesToRemove.push(pair.duplicate.id);
    }
  }

  emit("confirm", imagesToRemove);
}
</script>
