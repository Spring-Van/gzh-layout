<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- 顶部工具栏 -->
    <div
      class="shrink-0 border-b border-border-subtle bg-surface flex items-center px-3 py-2.5 gap-3"
    >
      <!-- 左侧: 内容Tab / 模式标题 -->
      <div class="flex items-center min-w-0 flex-1 overflow-hidden">
        <div
          v-if="viewMode === 'json' && !isEditing"
          class="flex overflow-x-auto scrollbar-hide"
          ref="tabsContainerRef"
        >
          <button
            v-for="tab in currentTabKeys"
            :key="tab"
            :ref="(el) => setTabRef(tab, el as HTMLElement)"
            class="px-3 py-1.5 text-[11px] whitespace-nowrap transition-colors border-b-2"
            :class="
              activeTab === tab
                ? 'border-cyan-400 text-cyan-400 font-medium'
                : 'border-transparent text-text-muted hover:text-text-primary'
            "
            @click="handleTabClick(tab)"
          >
            {{ tab }}
          </button>
        </div>
        <div v-else-if="isEditing" class="flex items-center gap-1.5">
          <span class="text-[11px] font-medium text-yellow-400">JSON 编辑</span>
        </div>
        <div v-else class="flex items-center gap-1.5">
          <span class="text-[11px] font-medium text-text-primary">提示词编辑</span>
        </div>
      </div>

      <!-- 右侧: 视图模式切换 + 操作按钮 -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- 视图模式切换 -->
        <div
          class="flex items-center rounded-lg bg-surface p-[2px] border border-border-subtle"
          :class="{ 'opacity-40 pointer-events-none': isEditing }"
          title="编辑中不可切换模式"
        >
          <button
            class="px-2 py-0.5 rounded text-[10px] transition-[color,background-color,border-color,box-shadow] flex items-center gap-1"
            :class="
              viewMode === 'json'
                ? 'bg-elevated text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            "
            :disabled="isEditing"
            @click="switchMode('json')"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            JSON
          </button>
          <button
            class="px-2 py-0.5 rounded text-[10px] transition-[color,background-color,border-color,box-shadow] flex items-center gap-1"
            :class="
              viewMode === 'prompt'
                ? 'bg-elevated text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            "
            :disabled="isEditing"
            @click="switchMode('prompt')"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            提示词
          </button>
        </div>

        <!-- JSON操作按钮 -->
        <template v-if="viewMode === 'json' && !isEditing">
          <button
            class="p-1.5 rounded-lg hover:bg-elevated text-text-muted hover:text-text-primary transition-colors"
            title="编辑 JSON"
            @click="startEdit"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        </template>

        <!-- 编辑中: 取消 + 保存 -->
        <template v-if="isEditing">
          <button
            class="px-2 py-1 text-[10px] border border-red-500/30 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
            @click="cancelEdit"
          >
            取消
          </button>
          <button
            class="px-2.5 py-1 text-[10px] bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium transition-colors"
            @click="saveEdit"
          >
            保存
          </button>
        </template>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 min-h-0 p-3 overflow-hidden flex flex-col">
      <!-- 提示词模式 -->
      <template v-if="viewMode === 'prompt'">
        <div
          class="flex-1 min-h-0 rounded-xl bg-surface border border-border-subtle shadow-sm shadow-black/10 p-4"
        >
          <textarea
            v-model="promptText"
            class="w-full h-full bg-transparent text-xs text-text-primary resize-none focus:outline-none placeholder:text-text-muted leading-relaxed"
            placeholder="在此输入自然语言提示词，用于生成或修改页面内容..."
          ></textarea>
        </div>

        <!-- 参考图设置区域（提示词模式专属） -->
        <div class="shrink-0 mt-2">
          <button
            class="flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary transition-colors mb-1.5"
            @click="showRefConfig = !showRefConfig"
          >
            <svg
              class="w-3 h-3 transition-transform"
              :class="showRefConfig ? 'rotate-90' : ''"
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
            参考图设置
            <span class="text-text-muted">({{ selectedRefCount }}张)</span>
          </button>

          <Transition name="collapse">
            <div
              v-if="showRefConfig"
              class="rounded-lg bg-surface border border-border-subtle p-2.5 space-y-2"
            >
              <!-- 参考图勾选项 -->
              <div class="flex flex-wrap gap-x-3 gap-y-1.5">
                <label
                  v-for="opt in refOptions"
                  :key="opt.key"
                  class="flex items-center gap-1.5 text-[11px] select-none"
                  :class="
                    opt.available
                      ? 'text-text-primary cursor-pointer'
                      : 'text-text-muted cursor-not-allowed'
                  "
                >
                  <input
                    v-model="refConfig[opt.key]"
                    type="checkbox"
                    :disabled="!opt.available"
                    class="w-3 h-3 rounded border-border-subtle bg-input-bg text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0"
                  />
                  <span>{{ opt.label }}</span>
                  <span v-if="opt.count > 0" class="text-text-muted"
                    >({{ opt.count }})</span
                  >
                </label>
              </div>

              <!-- 自定义上传参考图（缩略图 + 上传按钮同行） -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5">
                  <label class="text-[10px] text-text-muted">存储方式</label>
                  <div
                    class="flex items-center rounded-lg bg-surface p-[2px] border border-border-subtle"
                  >
                    <button
                      class="px-2 py-0.5 rounded text-[10px] transition-[color,background-color,border-color,box-shadow]"
                      :class="
                        customStorageMode === 'cloud'
                          ? 'bg-elevated text-text-primary shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                      "
                      @click="customStorageMode = 'cloud'"
                    >
                      云端
                    </button>
                    <button
                      class="px-2 py-0.5 rounded text-[10px] transition-[color,background-color,border-color,box-shadow]"
                      :class="
                        customStorageMode === 'local'
                          ? 'bg-elevated text-text-primary shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                      "
                      @click="customStorageMode = 'local'"
                    >
                      本地
                    </button>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <div
                  v-for="(url, idx) in customRefImages"
                  :key="idx"
                  class="relative group w-14 h-14 rounded-lg overflow-hidden border border-border-subtle shrink-0"
                >
                  <img
                    :src="url"
                    class="w-full h-full object-cover"
                    alt="自定义参考图"
                  />
                  <!-- hover 遮罩：查看 + 删除 -->
                  <div
                    class="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      class="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                      title="查看大图"
                      @click="openCustomPreview(idx)"
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </button>
                    <button
                      class="w-6 h-6 rounded-full bg-red-500/60 hover:bg-red-500/80 flex items-center justify-center text-white transition-colors"
                      title="删除"
                      @click="removeCustomImage(idx)"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <!-- 上传按钮：上传中显示 loading -->
                <button
                  class="w-14 h-14 border border-dashed border-border-subtle rounded-lg text-text-muted hover:text-text-primary hover:border-border-default transition-colors flex items-center justify-center shrink-0"
                  :class="{ 'opacity-50 pointer-events-none': isUploading }"
                  :title="
                    customStorageMode === 'local'
                      ? '上传参考图（本地 base64）'
                      : '上传参考图（云端临时，3天后自动删除）'
                  "
                  @click="triggerCustomUpload"
                >
                  <svg
                    v-if="!isUploading"
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <svg
                    v-else
                    class="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </template>

      <!-- JSON 编辑模式 -->
      <template v-else-if="isEditing">
        <div
          class="flex-1 min-h-0 rounded-xl bg-surface border border-border-subtle shadow-sm shadow-black/10 overflow-hidden"
        >
          <JsonEditor
            :model-value="editJsonText"
            @update:model-value="editJsonText = $event"
            @valid="onEditorValid"
          />
        </div>
      </template>

      <!-- JSON 解析展示模式 -->
      <div v-else class="h-full overflow-y-auto space-y-2">
        <div
          v-if="
            currentTabData === null ||
            currentTabData === undefined ||
            currentTabData === ''
          "
          class="text-center text-text-muted text-sm py-12"
        >
          该分类下暂无数据
        </div>

        <ContentSection
          v-else-if="isArrayData"
          :title="activeTab"
          :content="currentTabData as unknown"
          :parent-key="activeTab"
          :hide-title="true"
        />

        <template v-else-if="isObjectData">
          <ContentSection
            v-for="(value, key) in currentTabData"
            :key="String(key)"
            :title="String(key)"
            :content="value as unknown"
            :parent-key="String(key)"
          />
        </template>

        <ContentSection
          v-else
          :title="activeTab"
          :content="currentTabData as unknown"
          :parent-key="activeTab"
        />
      </div>

      <div
        v-if="!page && !isEditing && viewMode !== 'prompt'"
        class="text-center text-text-muted text-sm py-12"
      >
        暂无页面数据
      </div>
    </div>

    <!-- 底部单页操作区域 -->
    <div v-if="!isEditing" class="shrink-0 p-3 border-t border-border-subtle">
      <div
        class="rounded-xl bg-surface border border-border-subtle p-3 shadow-sm shadow-black/10"
      >
        <div class="mb-2">
          <span class="text-[11px] font-medium text-text-secondary">单页操作</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              class="px-3 py-1.5 text-[11px] border border-border-subtle rounded-lg hover:bg-elevated flex items-center gap-1 text-text-secondary transition-colors"
              @click="$emit('duplicate')"
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                /></svg
              >复制此页
            </button>
            <button
              class="px-3 py-1.5 text-[11px] border border-border-subtle rounded-lg hover:bg-red-500/10 text-red-400 flex items-center gap-1 transition-colors"
              @click="$emit('delete')"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                /></svg
              >删除此页
            </button>
          </div>
          <div class="flex items-center gap-1.5">
            <!-- AI 改写按钮 -->
            <button
              v-if="llmModels && llmModels.length > 0"
              class="px-3 py-1.5 text-[11px] border border-purple-500/30 rounded-lg hover:bg-purple-500/10 text-purple-400 flex items-center gap-1.5 transition-colors"
              @click="showAiRewriteModal = true"
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
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              AI 改写
            </button>
            <!-- JSON模式：显示生成此页 -->
            <button
              v-if="viewMode === 'json'"
              class="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:opacity-90 text-[11px] font-medium flex items-center gap-1.5 transition-opacity whitespace-nowrap shadow-lg shadow-cyan-500/20"
              @click="$emit('generate')"
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                /></svg
              >生成此页
            </button>
            <!-- 提示词模式：显示单独生成 -->
            <button
              v-if="viewMode === 'prompt'"
              class="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:opacity-90 text-[11px] font-medium flex items-center gap-1.5 transition-opacity whitespace-nowrap shadow-lg shadow-amber-500/20"
              @click="handleSingleGenerate"
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                /></svg
              >单独生成
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件上传输入 -->
    <input
      ref="customFileInputRef"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="handleCustomUpload"
    />

    <!-- 图片预览弹窗 -->
    <ImagePreviewModal
      v-model="showPreview"
      :images="previewImages"
      :image-index="previewIndex"
      alt="自定义参考图"
    />

    <AiRewriteModal
      v-model="showAiRewriteModal"
      :view-mode="viewMode"
      :page="page"
      :prompt-text="promptText"
      :llm-models="llmModels || []"
      @apply-prompt="applyRewrittenPrompt"
      @apply-page="$emit('update-page', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, nextTick, watch } from "vue";
import type { ComicPage } from "./types";
import type { ModelConfig } from "@comic/types";
import ContentSection from "./ContentSection.vue";
import JsonEditor from "./JsonEditor.vue";
import AiRewriteModal from "./AiRewriteModal.vue";
import ImagePreviewModal from "@comic/components/ImagePreviewModal.vue";
import {
  processImage,
  uploadImage,
  type ImageStorageMode,
} from "@comic/services/uploadService";
import { useToast } from "@comic/composables/useToast";

const toast = useToast();

/** 单独生成的参考图配置 */
export interface RefImageConfig {
  useStyleRef: boolean;
  useCharacterRef: boolean;
  useSceneRef: boolean;
  usePropRef: boolean;
  useGeneratedImage: boolean;
  customImages: string[];
}

interface Props {
  page: ComicPage | null;
  activeTab: string;
  /** 视图模式：json / prompt，由父组件按页控制 */
  viewMode?: "json" | "prompt";
  generatedImage?: string | null;
  /** 共用参考图 URL 列表（风格/字体等，来自绘图配置 sharedBlocks） */
  styleRefImages?: string[];
  /** 页面参考图（独立存储，不污染页面JSON） */
  pageRefImages?: { character: string[]; scene: string[]; prop: string[] };
  /** LLM 模型列表 */
  llmModels?: ModelConfig[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "change-tab", tab: string): void;
  (e: "change-view-mode", mode: "json" | "prompt"): void;
  (e: "generate"): void;
  (e: "delete"): void;
  (e: "duplicate"): void;
  (e: "preview-line"): void;
  (e: "single-generate", promptText: string, refConfig: RefImageConfig): void;
  (e: "update-page", data: Record<string, unknown>): void;
}>();

const hasGeneratedImage = computed(() => !!props.generatedImage);

type ViewMode = "json" | "prompt";
/** 视图模式由父组件按页控制，内部通过 computed 双向绑定 */
const viewMode = computed({
  get: () => props.viewMode || "json",
  set: (val: ViewMode) => emit("change-view-mode", val),
});
const isEditing = ref(false);
const editJsonText = ref("");
const editError = ref("");
const promptText = ref("");
const showRefConfig = ref(true);
const isUploading = ref(false);
const customRefImages = ref<string[]>([]);
/** 自定义参考图存储方式：cloud=云端临时（3天），local=本地 base64 */
const customStorageMode = ref<ImageStorageMode>("local");
const customFileInputRef = ref<HTMLInputElement | null>(null);
const showPreview = ref(false);
const previewImages = ref<string[]>([]);
const previewIndex = ref(0);

/** AI 改写相关状态 */
const showAiRewriteModal = ref(false);

/** 页面内存储提示词的特殊字段名 */
const PROMPT_TEXT_KEY = "_promptText";

/** 从页面数据恢复提示词 */
const restorePromptText = () => {
  if (props.page && typeof props.page[PROMPT_TEXT_KEY] === "string") {
    promptText.value = props.page[PROMPT_TEXT_KEY] as string;
  } else {
    promptText.value = "";
  }
};

/** 将提示词保存到页面数据 */
const savePromptText = () => {
  if (!props.page) return;
  const current = props.page[PROMPT_TEXT_KEY];
  if (promptText.value) {
    if (current !== promptText.value) {
      emit("update-page", {
        ...props.page,
        [PROMPT_TEXT_KEY]: promptText.value,
      });
    }
  } else if (current !== undefined) {
    const updated = { ...props.page };
    delete updated[PROMPT_TEXT_KEY];
    emit("update-page", updated);
  }
};

// 页面切换时恢复提示词，并关闭编辑状态
watch(
  () => props.page,
  () => {
    restorePromptText();
    // 切换页面时关闭 JSON 编辑状态
    if (isEditing.value) {
      isEditing.value = false;
      editJsonText.value = "";
      editError.value = "";
    }
  },
  { immediate: true },
);

// 提示词变化时防抖保存到页面数据
let promptSaveTimer: ReturnType<typeof setTimeout> | null = null;
watch(promptText, () => {
  if (promptSaveTimer) clearTimeout(promptSaveTimer);
  promptSaveTimer = setTimeout(savePromptText, 500);
});

const refConfig = reactive<RefImageConfig>({
  useStyleRef: false,
  useCharacterRef: false,
  useSceneRef: false,
  usePropRef: false,
  useGeneratedImage: false,
  customImages: [],
});

/** 从页面数据提取各类型参考图数量 */
const pageRefCounts = computed(() => {
  const refs = props.pageRefImages;
  return {
    character: refs?.character?.length || 0,
    scene: refs?.scene?.length || 0,
    prop: refs?.prop?.length || 0,
    style: (props.styleRefImages || []).length,
  };
});

/** 参考图勾选项配置 */
const refOptions = computed(() => [
  {
    key: "useStyleRef" as const,
    label: "风格参考",
    count: pageRefCounts.value.style,
    available: pageRefCounts.value.style > 0,
  },
  {
    key: "useCharacterRef" as const,
    label: "人物参考",
    count: pageRefCounts.value.character,
    available: pageRefCounts.value.character > 0,
  },
  {
    key: "useSceneRef" as const,
    label: "场景参考",
    count: pageRefCounts.value.scene,
    available: pageRefCounts.value.scene > 0,
  },
  {
    key: "usePropRef" as const,
    label: "物品参考",
    count: pageRefCounts.value.prop,
    available: pageRefCounts.value.prop > 0,
  },
  {
    key: "useGeneratedImage" as const,
    label: "结果图",
    count: hasGeneratedImage.value ? 1 : 0,
    available: hasGeneratedImage.value,
  },
]);

/** 已选中的参考图总数 */
const selectedRefCount = computed(() => {
  let count = 0;
  if (refConfig.useStyleRef) count += pageRefCounts.value.style;
  if (refConfig.useCharacterRef) count += pageRefCounts.value.character;
  if (refConfig.useSceneRef) count += pageRefCounts.value.scene;
  if (refConfig.usePropRef) count += pageRefCounts.value.prop;
  if (refConfig.useGeneratedImage && hasGeneratedImage.value) count += 1;
  count += customRefImages.value.length;
  return count;
});

/** 触发自定义参考图上传 */
const triggerCustomUpload = () => {
  if (isUploading.value) return;
  customFileInputRef.value?.click();
};

/** 处理自定义参考图上传（根据 customStorageMode 选择云端或本地存储） */
const handleCustomUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;

  isUploading.value = true;
  const mode = customStorageMode.value;
  const uploadTasks = Array.from(files).map(async (file) => {
    const result =
      mode === "local"
        ? await processImage(file, "local")
        : await uploadImage(file, { expiration: "P3D" });
    return result.success && result.url ? result.url : null;
  });

  const results = await Promise.all(uploadTasks);
  let successCount = 0;

  for (const url of results) {
    if (url) {
      customRefImages.value.push(url);
      successCount++;
    }
  }

  isUploading.value = false;
  input.value = "";

  if (successCount > 0) {
    toast.success(`成功上传 ${successCount} 张参考图`);
  } else {
    toast.error("参考图上传失败，请重试");
  }
};

/** 删除自定义参考图 */
const removeCustomImage = (idx: number) => {
  customRefImages.value.splice(idx, 1);
};

/** 打开自定义参考图预览 */
const openCustomPreview = (idx: number) => {
  previewImages.value = [...customRefImages.value];
  previewIndex.value = idx;
  showPreview.value = true;
};

/** 单独生成：组装参考图配置后发射事件 */
const handleSingleGenerate = () => {
  const config: RefImageConfig = {
    ...refConfig,
    customImages: [...customRefImages.value],
  };
  emit("single-generate", promptText.value, config);
};

function applyRewrittenPrompt(value: string) {
  promptText.value = value;
}

const activeTab = computed({
  get: () => props.activeTab,
  set: (val: string) => emit("change-tab", val),
});

// tab DOM引用，用于滚动到可视区域
const tabRefMap = new Map<string, HTMLElement>();
const tabsContainerRef = ref<HTMLElement | null>(null);

const setTabRef = (tab: string, el: HTMLElement | null) => {
  if (el) {
    tabRefMap.set(tab, el);
  } else {
    tabRefMap.delete(tab);
  }
};

const handleTabClick = (tab: string) => {
  activeTab.value = tab;
  nextTick(() => {
    const tabEl = tabRefMap.get(tab);
    if (tabEl) {
      tabEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  });
};

const hiddenTabKeys = new Set([
  "人物参考图",
  "场景参考图",
  "物品参考图",
  "_promptText",
]);

const currentTabKeys = computed((): string[] => {
  if (!props.page) return [];
  return Object.keys(props.page).filter((k) => {
    if (hiddenTabKeys.has(k)) return false;
    const val = props.page![k];
    return val !== undefined && val !== null && val !== "";
  });
});

const currentTabData = computed(() => {
  if (!props.page || isEditing.value) return null;
  return props.page[activeTab.value] ?? null;
});

const isArrayData = computed(() => Array.isArray(currentTabData.value));

const isObjectData = computed(
  () =>
    !isArrayData.value &&
    currentTabData.value !== null &&
    typeof currentTabData.value === "object",
);

function switchMode(mode: ViewMode) {
  if (isEditing.value) return;
  viewMode.value = mode;
}

function startEdit() {
  if (!props.page) return;
  // 编辑时排除内部字段，避免用户误改
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props.page)) {
    if (!k.startsWith("_")) filtered[k] = v;
  }
  editJsonText.value = JSON.stringify(filtered, null, 2);
  editError.value = "";
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
  editJsonText.value = "";
  editError.value = "";
}

function onEditorValid(_data: unknown) {
  editError.value = "";
}

function saveEdit() {
  try {
    const parsed = JSON.parse(editJsonText.value);
    if (typeof parsed !== "object" || parsed === null) {
      editError.value = "JSON 必须是对象";
      return;
    }
    editError.value = "";
    isEditing.value = false;
    // 保留原有的内部字段（如 _promptText）
    if (props.page) {
      for (const [k, v] of Object.entries(props.page)) {
        if (k.startsWith("_") && parsed[k] === undefined) {
          parsed[k] = v;
        }
      }
    }
    emit("update-page", parsed as Record<string, unknown>);
  } catch (_e) {
    editError.value = "JSON 格式有误，请检查";
  }
}
</script>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: opacity 0.2s ease, max-height 0.2s ease, margin-top 0.2s ease;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>
