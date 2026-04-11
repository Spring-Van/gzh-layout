<template>
  <div
    class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-end transition-opacity"
    :class="[visible ? 'opacity-100' : 'opacity-0 pointer-events-none']"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white h-full overflow-hidden flex flex-col shadow-2xl"
      :class="[
        visible ? 'translate-x-0' : 'translate-x-full',
        'transition-transform duration-300 ease-out',
        'w-full lg:w-[700px]',
      ]"
    >
      <div
        class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0"
      >
        <div>
          <h3 class="font-bold text-slate-800">选择封面图片</h3>
          <p class="text-xs text-slate-500 mt-1">
            为封面模板的 {{ requiredCount }} 个位置选择图片
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="selectionMode = 'position'"
            :class="[
              'px-3 py-1.5 text-xs rounded-lg transition border',
              selectionMode === 'position'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary',
            ]"
          >
            按位置选择
          </button>
          <button
            @click="selectionMode = 'direct'"
            :class="[
              'px-3 py-1.5 text-xs rounded-lg transition border',
              selectionMode === 'direct'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-slate-600 border-slate-200 hover:border-primary',
            ]"
          >
            直接点选
          </button>
        </div>
        <button
          class="text-slate-400 hover:text-slate-600"
          @click="$emit('close')"
        >
          <svg
            class="w-5 h-5"
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
        <!-- 模式 1：按位置选择 -->
        <div v-if="selectionMode === 'position'" class="space-y-4">
          <div
            v-for="(placeholder, idx) in placeholders"
            :key="idx"
            class="border border-slate-200 rounded-xl p-4 bg-slate-50"
          >
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-slate-700">
                位置 {{ idx + 1 }}
              </label>
              <span class="text-[10px] text-slate-400">
                {{ placeholder.label }}
              </span>
            </div>

            <div class="flex items-center gap-3">
              <div
                class="w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-200 bg-white flex items-center justify-center flex-shrink-0"
              >
                <img
                  v-if="selectedImages[idx]"
                  :src="getImageUrl(selectedImages[idx].path)"
                  :alt="selectedImages[idx].name"
                  class="w-full h-full object-cover"
                  @error="
                    (e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }
                  "
                />
                <svg
                  v-else
                  class="w-8 h-8 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
              </div>

              <div class="flex-1">
                <p class="text-xs text-slate-600 mb-2">
                  当前：{{ selectedImages[idx]?.name || "未选择图片" }}
                </p>
                <button
                  @click="openImagePicker(idx)"
                  class="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-primary transition flex items-center gap-1.5"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    ></path>
                  </svg>
                  {{ selectedImages[idx] ? "更换图片" : "选择图片" }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 模式 2：直接点选 -->
        <div v-else class="space-y-4">
          <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p class="text-xs text-blue-700">
              💡 提示：按顺序点击图片选择，第 1 张标记为①，第 2
              张标记为②，以此类推。已选 {{ directSelectionOrder.length }} /
              {{ requiredCount }} 张
            </p>
          </div>

          <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <div
              v-for="img in availableImages"
              :key="img.id"
              class="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition relative"
              :class="[
                directSelectionOrder.includes(img.id)
                  ? 'border-primary bg-blue-50'
                  : 'border-transparent hover:border-primary/30',
              ]"
              @click="() => handleDirectSelect(img)"
            >
              <img
                :src="getImageUrl(img.path)"
                :alt="img.name"
                class="w-full h-full object-cover"
                @error="
                  (e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }
                "
              />

              <!-- 已选择标记 -->
              <div
                v-if="directSelectionOrder.includes(img.id)"
                class="absolute top-2 left-2 w-7 h-7 bg-primary text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg"
              >
                {{ directSelectionOrder.indexOf(img.id) + 1 }}
              </div>

              <!-- 未选择但已选满的遮罩 -->
              <div
                v-else-if="directSelectionOrder.length >= requiredCount"
                class="absolute inset-0 bg-slate-900/40 flex items-center justify-center"
              >
                <span
                  class="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded"
                >
                  已选满
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p class="text-xs text-blue-700">
            💡
            提示：每个位置可以独立选择图片，点击"更换图片"从所有可用图片中选择
          </p>
        </div>
      </div>

      <div
        class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center flex-shrink-0"
      >
        <p class="text-xs text-slate-500">
          已选择 {{ selectedImages.filter((img) => img !== null).length }} /
          {{ requiredCount }} 张图片
        </p>
        <div class="flex gap-3">
          <button
            class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="selectedImages.some((img) => img === null)"
            @click="handleSave"
          >
            确认选择
          </button>
        </div>
      </div>
    </div>

    <!-- 图片选择弹窗 -->
    <div
      v-if="showImagePicker"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      @click.self="closeImagePicker"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[70vh] flex flex-col overflow-hidden"
      >
        <div
          class="px-6 py-4 border-b border-slate-100 flex justify-between items-center"
        >
          <h4 class="font-bold text-slate-800">选择图片</h4>
          <button
            @click="closeImagePicker"
            class="text-slate-400 hover:text-slate-600"
          >
            <svg
              class="w-5 h-5"
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

        <div class="flex-1 overflow-y-auto p-4">
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <div
              v-for="img in availableImages"
              :key="img.id"
              class="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition hover:border-primary"
              :class="[
                currentPickingIndex !== null &&
                selectedImages[currentPickingIndex]?.id === img.id
                  ? 'border-primary bg-blue-50'
                  : 'border-transparent',
              ]"
              @click="() => handleImagePickerSelect(img)"
            >
              <img
                :src="getImageUrl(img.path)"
                :alt="img.name"
                class="w-full h-full object-cover"
                @error="
                  (e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }
                "
              />
            </div>
            <div
              v-if="availableImages.length === 0"
              class="col-span-full py-12 text-center text-slate-500 text-sm"
            >
              暂无可用图片
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end"
        >
          <button
            class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition"
            @click="closeImagePicker"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { ImageFile } from "../../types";

interface Props {
  visible: boolean;
  images: ImageFile[];
  selectedImageIds: string[];
  requiredCount: number;
  getImageUrl: (path: string) => string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "update:selectedImageIds", ids: string[]): void;
}>();

// 选择模式：'position' = 按位置选择，'direct' = 直接点选
const selectionMode = ref<"position" | "direct">("direct");

const localSelectedIds = ref<string[]>([...props.selectedImageIds]);

// 直接点选模式的顺序记录
const directSelectionOrder = ref<string[]>([]);

const placeholders = computed(() => {
  return Array.from({ length: props.requiredCount }, (_, i) => ({
    index: i,
    label: `封面模板位置 ${i + 1}`,
  }));
});

const selectedImages = computed<(ImageFile | null)[]>(() => {
  return placeholders.value.map((_, idx) => {
    const id = localSelectedIds.value[idx];
    if (!id) return null;
    return props.images.find((img) => img.id === id) || null;
  });
});

const availableImages = computed(() => {
  return props.images;
});

const showImagePicker = ref(false);
const currentPickingIndex = ref<number | null>(null);

function openImagePicker(index: number) {
  currentPickingIndex.value = index;
  showImagePicker.value = true;
}

function closeImagePicker() {
  showImagePicker.value = false;
  currentPickingIndex.value = null;
}

// 直接点选模式的处理函数
function handleDirectSelect(img: ImageFile) {
  if (directSelectionOrder.value.includes(img.id)) {
    // 如果已经选择了这张图，取消选择
    directSelectionOrder.value = directSelectionOrder.value.filter(
      (id) => id !== img.id,
    );
  } else if (directSelectionOrder.value.length < props.requiredCount) {
    // 如果还没选满，添加选择
    directSelectionOrder.value.push(img.id);
  }
  // 如果已选满且点击的是未选中的图，不执行任何操作
}

function handleImagePickerSelect(img: ImageFile) {
  if (currentPickingIndex.value !== null) {
    const newIds = [...localSelectedIds.value];
    newIds[currentPickingIndex.value] = img.id;
    localSelectedIds.value = newIds;
    closeImagePicker();
  }
}

function handleSave() {
  // 根据模式构建最终的图片 ID 数组
  if (selectionMode.value === "direct") {
    localSelectedIds.value = [...directSelectionOrder.value];
  }
  emit("update:selectedImageIds", localSelectedIds.value);
  emit("close");
}

watch(
  () => props.selectedImageIds,
  (newIds) => {
    localSelectedIds.value = [...newIds];
  },
  { immediate: true },
);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      localSelectedIds.value = [...props.selectedImageIds];

      // 初始化直接点选顺序
      const validSelectedIds = props.selectedImageIds.filter((id) =>
        props.images.some((img) => img.id === id),
      );

      // 如果已选择的图片数量不足，自动按顺序补充前 N 张图片
      if (validSelectedIds.length < props.requiredCount) {
        // 从可用图片中按顺序选择，跳过已选择的
        const selectedSet = new Set(validSelectedIds);
        const additionalImages = props.images
          .filter((img) => !selectedSet.has(img.id))
          .slice(0, props.requiredCount - validSelectedIds.length)
          .map((img) => img.id);

        directSelectionOrder.value = [...validSelectedIds, ...additionalImages];
      } else {
        directSelectionOrder.value = validSelectedIds.slice(
          0,
          props.requiredCount,
        );
      }
    }
  },
);
</script>
