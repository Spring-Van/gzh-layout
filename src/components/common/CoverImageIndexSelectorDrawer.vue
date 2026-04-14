<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex justify-end">
    <div class="absolute inset-0 bg-black/40" @click="handleClose"></div>
    <div
      class="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-slide-in"
    >
      <div
        class="p-4 border-b border-slate-100 flex items-center justify-between"
      >
        <h3 class="font-bold text-slate-800">选择封面图片序号</h3>
        <button
          @click="handleClose"
          class="p-1 rounded-lg hover:bg-slate-100 transition"
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

      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <p class="text-xs text-slate-600">
            按顺序点击选择图片序号，封面将按你选择的顺序填充图片。例如依次点击
            9、5、6、4，则封面第一张使用第 9 张图，第二张使用第 5
            张图，以此类推。
          </p>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-medium text-slate-700">
              需要 {{ requiredImageCount }} 张图片
            </label>
            <div class="text-xs text-slate-500">
              共 {{ totalImageCount }} 张图片
            </div>
            <button
              @click="resetToDefault"
              class="text-xs text-primary hover:text-primary/80 transition"
            >
              恢复默认
            </button>
          </div>

          <div class="grid grid-cols-6 gap-2">
            <button
              v-for="index in totalImageCount"
              :key="index"
              @click="toggleIndex(index)"
              :disabled="
                !selectedIndices.includes(index) &&
                selectedIndices.length >= requiredImageCount
              "
              :class="[
                'h-10 rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center leading-none',
                selectedIndices.includes(index)
                  ? 'bg-primary text-white shadow-md'
                  : !selectedIndices.includes(index) &&
                      selectedIndices.length >= requiredImageCount
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ]"
            >
              <span>{{ index }}</span>
              <span
                v-if="selectedIndices.includes(index)"
                class="text-[9px] opacity-80"
              >
                第{{ selectedIndices.indexOf(index) + 1 }}张
              </span>
            </button>
          </div>
          <p
            class="text-[10px] mt-2"
            :class="
              selectedIndices.length === requiredImageCount
                ? 'text-green-600 font-medium'
                : 'text-slate-400'
            "
          >
            提示：已选择 {{ selectedIndices.length }} /
            {{ requiredImageCount }} 张图片
            <span
              v-if="selectedIndices.length >= requiredImageCount"
              class="text-green-600"
            >
              （已满）
            </span>
          </p>
        </div>

        <div class="p-3 bg-blue-50 rounded-xl border border-blue-200">
          <p class="text-xs text-blue-700">
            已选择:
            <span class="font-bold" v-if="selectedIndices.length > 0">
              {{ selectedIndices.join(", ") }}
            </span>
            <span v-else>无</span>
          </p>
        </div>
      </div>

      <div class="p-4 border-t border-slate-100">
        <button
          @click="handleConfirm"
          :disabled="selectedIndices.length !== requiredImageCount"
          :class="[
            'w-full py-3 rounded-xl font-medium transition-all',
            selectedIndices.length === requiredImageCount
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed',
          ]"
        >
          确认选择
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

interface Props {
  visible: boolean;
  initialIndices: number[];
  requiredImageCount: number;
  totalImageCount: number;
}

interface Emits {
  (e: "close"): void;
  (e: "confirm", indices: number[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const selectedIndices = ref<number[]>([...props.initialIndices]);

watch(
  () => props.initialIndices,
  (newIndices) => {
    selectedIndices.value = [...newIndices];
  },
  { immediate: true },
);

watch(
  () => props.requiredImageCount,
  () => {
    if (selectedIndices.value.length === 0) {
      resetToDefault();
    }
  },
);

function toggleIndex(index: number) {
  const idx = selectedIndices.value.indexOf(index);
  if (idx > -1) {
    // 取消选中
    selectedIndices.value.splice(idx, 1);
  } else {
    // 选中：检查是否已达到最大数量
    if (selectedIndices.value.length >= props.requiredImageCount) {
      return; // 已达到最大数量，不能再选择
    }
    selectedIndices.value.push(index);
  }
}

function resetToDefault() {
  selectedIndices.value = Array.from(
    { length: props.requiredImageCount },
    (_, i) => i + 1,
  );
}

function handleClose() {
  emit("close");
}

function handleConfirm() {
  emit("confirm", [...selectedIndices.value]);
  emit("close");
}
</script>

<style scoped>
@keyframes slide-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
</style>
