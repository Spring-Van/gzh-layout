<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
    @click.self="handleClose"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
    >
      <!-- 头部 -->
      <div
        class="px-6 py-4 border-b border-slate-100 flex items-center justify-between"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center"
          >
            <svg
              class="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <h3 class="text-base font-bold text-slate-800">前往批量排版</h3>
        </div>
        <button
          class="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          @click="handleClose"
        >
          <svg
            class="w-5 h-5 text-slate-400"
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

      <!-- 内容 -->
      <div class="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
        <!-- 提示 -->
        <div
          class="bg-emerald-50 border border-emerald-100 rounded-lg px-3.5 py-2.5 flex items-start gap-2"
        >
          <svg
            class="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5"
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
          <p class="text-xs text-emerald-700 leading-relaxed">
            将下载 {{ imageCount }} 张图片到本地，并按下方规则拆分进入批量排版。图片链接无法直接排版，必须先落地为本地文件。
          </p>
        </div>

        <!-- 每篇张数 + 打乱顺序 -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            每篇文章图片数量
          </label>
          <div class="flex items-center gap-3">
            <input
              v-model.number="localConfig.splitCount"
              type="number"
              min="1"
              max="50"
              class="w-24 text-center text-sm border-slate-200 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-slate-50 px-3 py-2 border outline-none"
            />
            <span class="text-sm text-slate-500">张 / 每篇</span>
            <label class="flex items-center gap-2 cursor-pointer ml-auto">
              <input
                v-model="localConfig.shuffleBeforeSplit"
                type="checkbox"
                class="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span class="text-sm text-slate-700">打乱顺序</span>
            </label>
          </div>
          <p v-if="groupCount > 0" class="mt-2 text-xs text-slate-400">
            将拆分为 <span class="text-emerald-600 font-medium">{{ groupCount }}</span> 篇文章
            <span v-if="remainder > 0" class="text-amber-500">
              （最后一篇仅 {{ remainder }} 张）
            </span>
          </p>
        </div>

        <!-- 下载策略 -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            下载策略
          </label>
          <div class="space-y-2">
            <label
              class="flex items-start gap-2.5 p-3 border rounded-lg cursor-pointer transition-colors"
              :class="
                localConfig.downloadStrategy === 'all'
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-200 hover:border-slate-300'
              "
            >
              <input
                v-model="localConfig.downloadStrategy"
                type="radio"
                value="all"
                class="mt-0.5 w-4 h-4 text-emerald-500 border-slate-300 focus:ring-emerald-500"
              />
              <div class="flex-1">
                <span class="text-sm font-medium text-slate-700 block">
                  全部下载到一个目录
                </span>
                <span class="text-xs text-slate-400">
                  所有图片下到保存目录，按张数在内存拆分排版
                </span>
              </div>
            </label>
            <label
              class="flex items-start gap-2.5 p-3 border rounded-lg cursor-pointer transition-colors"
              :class="
                localConfig.downloadStrategy === 'split'
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-200 hover:border-slate-300'
              "
            >
              <input
                v-model="localConfig.downloadStrategy"
                type="radio"
                value="split"
                class="mt-0.5 w-4 h-4 text-emerald-500 border-slate-300 focus:ring-emerald-500"
              />
              <div class="flex-1">
                <span class="text-sm font-medium text-slate-700 block">
                  按文章拆分下载到子目录
                </span>
                <span class="text-xs text-slate-400">
                  每篇文章图片下到独立子文件夹，封面随文章各自存储
                </span>
              </div>
            </label>
          </div>
        </div>

        <!-- 保存目录 -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            保存目录
          </label>
          <div class="flex gap-2">
            <input
              v-model="localConfig.savePath"
              class="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="选择保存目录..."
              readonly
            />
            <button
              class="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              @click="selectFolder"
            >
              <svg
                class="w-5 h-5 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span class="text-xs text-slate-600">浏览</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部 -->
      <div
        class="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3"
      >
        <button
          class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          @click="handleClose"
        >
          取消
        </button>
        <button
          class="px-5 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          :disabled="!canConfirm"
          @click="handleConfirm"
        >
          <span>下载并进入排版</span>
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

/** 前往排版配置 */
export interface ExtractTypesetConfig {
  /** 每篇文章图片数量 */
  splitCount: number;
  /** 拆分前是否打乱顺序 */
  shuffleBeforeSplit: boolean;
  /** 下载策略：all=全部下载到一个目录；split=按文章拆分到子目录 */
  downloadStrategy: "all" | "split";
  /** 保存目录 */
  savePath: string;
}

const props = withDefaults(
  defineProps<{
    visible: boolean;
    imageCount: number;
    initialSavePath?: string;
  }>(),
  {
    initialSavePath: "",
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", config: ExtractTypesetConfig): void;
}>();

const localConfig = ref<ExtractTypesetConfig>({
  splitCount: 9,
  shuffleBeforeSplit: false,
  downloadStrategy: "all",
  savePath: "",
});

// 弹窗打开时同步外部传入的 savePath
watch(
  () => props.visible,
  (v) => {
    if (v) {
      localConfig.value.savePath = props.initialSavePath;
    }
  },
  { immediate: true },
);

const groupCount = computed(() => {
  if (props.imageCount === 0 || localConfig.value.splitCount <= 0) return 0;
  return Math.ceil(props.imageCount / localConfig.value.splitCount);
});

const remainder = computed(() => {
  if (localConfig.value.splitCount <= 0) return 0;
  return props.imageCount % localConfig.value.splitCount;
});

const canConfirm = computed(() => {
  return (
    localConfig.value.savePath.trim().length > 0 &&
    localConfig.value.splitCount > 0 &&
    props.imageCount > 0
  );
});

async function selectFolder() {
  try {
    const result = await window.electronAPI.selectFolder();
    if (result) {
      localConfig.value.savePath = result;
    }
  } catch {
    // 选择失败忽略
  }
}

function handleClose() {
  emit("close");
}

function handleConfirm() {
  if (!canConfirm.value) return;
  emit("confirm", { ...localConfig.value });
}
</script>
