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
        'w-full lg:w-[700px]'
      ]"
    >
      <div
        class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0"
      >
        <h3 class="font-bold text-slate-800">管理图片素材</h3>
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
        <div class="grid grid-cols-4 gap-4">
          <div
            v-for="(img, index) in localImages"
            :key="img.id"
            class="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-grab active:cursor-grabbing border-2 border-transparent hover:border-primary/30 transition"
            draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragover.prevent="handleDragOver($event, index)"
            @drop="handleDrop($event, index)"
            @dragend="handleDragEnd"
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
            <div class="absolute top-2 left-2 w-6 h-6 bg-slate-900/70 text-white text-xs font-medium rounded-full flex items-center justify-center">
              {{ index + 1 }}
            </div>
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
              <p class="text-xs text-white truncate">{{ img.name }}</p>
            </div>
          </div>
        </div>
        <p
          v-if="localImages.length === 0"
          class="text-center text-slate-500 py-12"
        >
          暂无图片
        </p>
      </div>

      <div
        class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center flex-shrink-0"
      >
        <p class="text-xs text-slate-500">
          拖拽图片可调整排序
        </p>
        <div class="flex gap-3">
          <button
            class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition"
            @click="handleSave"
          >
            保存排序
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface ImageItem {
  id: string;
  path: string;
  name: string;
}

interface Props {
  visible: boolean;
  images: ImageItem[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:images', images: ImageItem[]): void;
}>();

const localImages = ref<ImageItem[]>([]);
const draggedIndex = ref<number>(-1);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      localImages.value = [...props.images];
    }
  }
);

watch(() => props.images, (val) => {
  if (props.visible) {
    localImages.value = [...val];
  }
}, { deep: true });

function getImageUrl(filePath: string): string {
  return `file://${filePath.replace(/\\/g, '/')}`;
}

function handleDragStart(e: DragEvent, index: number) {
  draggedIndex.value = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }
}

function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault();
  if (draggedIndex.value === -1 || draggedIndex.value === index) return;
}

function handleDrop(e: DragEvent, dropIndex: number) {
  e.preventDefault();
  if (draggedIndex.value === -1 || draggedIndex.value === dropIndex) return;

  const items = [...localImages.value];
  const [removed] = items.splice(draggedIndex.value, 1);
  items.splice(dropIndex, 0, removed);
  localImages.value = items;
  draggedIndex.value = -1;
}

function handleDragEnd() {
  draggedIndex.value = -1;
}

function handleSave() {
  emit('update:images', localImages.value);
  emit('close');
}
</script>
