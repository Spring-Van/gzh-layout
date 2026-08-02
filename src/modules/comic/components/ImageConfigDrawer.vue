<template>
  <Teleport to="body">
    <!-- 遮罩层 -->
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        @click="close"
      />
    </Transition>

    <!-- 抽屉 -->
    <Transition name="slide-right">
      <div
        v-if="modelValue"
        class="fixed right-0 top-0 bottom-0 z-[101] w-[min(920px,96vw)] flex flex-col overflow-hidden p-4"
      >
        <div
          class="flex-1 flex flex-col overflow-hidden rounded-xl bg-surface dark:bg-slate-800 border border-border-subtle shadow-2xl shadow-black/40"
        >
          <!-- 头部 -->
          <div
            class="shrink-0 px-6 py-4 border-b border-border-subtle flex items-center justify-between relative"
          >
            <div class="flex items-center gap-2">
              <svg
                class="w-5 h-5 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              <h2 class="text-base font-semibold text-text-primary">绘图配置</h2>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-cyan-400 hover:bg-cyan-500/10 border border-border-subtle hover:border-cyan-500/30 transition-colors flex items-center gap-1.5"
                @click="showProjectSelector = true"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                同步配置
              </button>
              <button
                class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
                @click="close"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Tab 切换 -->
          <div
            class="shrink-0 px-6 pt-4 pb-0 flex items-center gap-1 border-b border-border-subtle"
          >
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="px-4 py-2.5 text-sm font-medium transition-colors relative -mb-px"
              :class="
                activeTab === tab.key
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-text-secondary hover:text-text-primary'
              "
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- 内容区 -->
          <div class="flex-1 overflow-auto p-5 space-y-4 relative">
            <!-- 绘画模型 Tab -->
            <template v-if="activeTab === 'model'">
              <div>
                <label class="block text-xs text-text-secondary mb-2"
                  >图片生成模型</label
                >
                <div class="relative">
                  <select
                    v-model="config.imageModelId"
                    class="w-full appearance-none bg-input-bg border border-border-subtle rounded-lg pl-3 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer"
                  >
                    <option value="" class="bg-surface">请选择模型</option>
                    <option
                      v-for="model in imageModels"
                      :key="model.id"
                      :value="model.id"
                      class="bg-surface"
                    >
                      {{ model.name }}
                    </option>
                  </select>
                  <svg
                    class="w-4 h-4 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <label class="block text-xs text-text-secondary mb-2">图片比例</label>
                <div class="relative">
                  <select
                    v-model="config.aspectRatio"
                    class="w-full appearance-none bg-input-bg border border-border-subtle rounded-lg pl-3 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer"
                  >
                    <option value="" class="bg-surface">默认</option>
                    <option
                      v-for="ar in availableAspectRatios"
                      :key="ar"
                      :value="ar"
                      class="bg-surface"
                    >
                      {{ ar }}
                    </option>
                  </select>
                  <svg
                    class="w-4 h-4 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <label class="block text-xs text-text-secondary mb-2">分辨率</label>
                <div class="relative">
                  <select
                    v-model="config.resolution"
                    class="w-full appearance-none bg-input-bg border border-border-subtle rounded-lg pl-3 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer"
                  >
                    <option value="" class="bg-surface">默认</option>
                    <option
                      v-for="res in availableResolutions"
                      :key="res"
                      :value="res"
                      class="bg-surface"
                    >
                      {{ res }}
                    </option>
                  </select>
                  <svg
                    class="w-4 h-4 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              <div v-if="availableQualities.length > 0">
                <label class="block text-xs text-text-secondary mb-2">图片质量</label>
                <div class="relative">
                  <select
                    v-model="config.quality"
                    class="w-full appearance-none bg-input-bg border border-border-subtle rounded-lg pl-3 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer"
                  >
                    <option value="" class="bg-surface">默认</option>
                    <option
                      v-for="q in availableQualities"
                      :key="q"
                      :value="q"
                      class="bg-surface"
                    >
                      {{ q }}
                    </option>
                  </select>
                  <svg
                    class="w-4 h-4 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </template>

            <!-- 共用属性 Tab：左右分栏 -->
            <template v-if="activeTab === 'blocks'">
              <div class="flex items-center justify-between shrink-0">
                <p class="text-[11px] text-text-secondary">
                  共用 {{ sharedImageCount }} 张参考图 · 上限
                  {{ MAX_REF_IMAGES }}
                  <span class="mx-1.5 text-text-muted">|</span>
                  左：页面字段前 · 右：页面字段后
                </p>
              </div>

              <!-- 左右分栏 -->
              <div
                class="blocks-split-layout"
                style="
                  display: flex;
                  flex-direction: row;
                  align-items: flex-start;
                  gap: 16px;
                  width: 100%;
                "
              >
                <!-- 左：插入最前 -->
                <div
                  class="blocks-split-col"
                  style="
                    flex: 1 1 0;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    padding: 12px;
                    border-radius: 12px;
                    border: 1px solid rgba(34, 211, 238, 0.15);
                    background: rgba(34, 211, 238, 0.03);
                  "
                >
                  <div
                    class="flex items-center gap-2 text-[11px] text-text-secondary"
                  >
                    <span
                      class="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      >插入最前</span
                    >
                    <span class="text-text-muted">排在页面字段之前</span>
                    <span class="text-text-muted"
                      >{{ frontBlocks.length }} 项</span
                    >
                    <button
                      class="ml-auto px-2 py-0.5 rounded-lg text-[11px] text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 transition-colors"
                      @click="addBlock('front')"
                    >
                      + 添加属性
                    </button>
                  </div>
                  <div
                    v-if="frontBlocks.length === 0"
                    class="text-[11px] text-text-muted py-8 text-center border border-dashed border-border-subtle rounded-lg"
                  >
                    暂无属性
                  </div>
                  <div
                    v-for="block in frontBlocks"
                    :key="block.id"
                    class="rounded-xl border border-border-subtle bg-surface p-3 space-y-2.5"
                  >
                    <BlockCard
                      :block="block"
                      :image-numbers="imageNumberMap.get(block.id) || []"
                      :style-templates="styleTemplates"
                      :is-uploading="uploadingBlockId === block.id"
                      @update="(patch) => updateBlock(block.id, patch)"
                      @remove="removeBlock(block.id)"
                      @move-up="moveBlock(block.id, 'up')"
                      @move-down="moveBlock(block.id, 'down')"
                      @upload="triggerUpload(block.id)"
                      @remove-image="(i) => removeBlockImage(block.id, i)"
                      @preview-image="(i) => previewBlockImage(block.id, i)"
                      @refresh-desc="refreshBlockDesc(block.id)"
                      @style-template-change="
                        (tid) => handleStyleTemplateChange(block.id, tid)
                      "
                    />
                  </div>
                </div>

                <!-- 右：插入最后 -->
                <div
                  class="blocks-split-col"
                  style="
                    flex: 1 1 0;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    padding: 12px;
                    border-radius: 12px;
                    border: 1px solid rgba(251, 191, 36, 0.15);
                    background: rgba(251, 191, 36, 0.03);
                  "
                >
                  <div
                    class="flex items-center gap-2 text-[11px] text-text-secondary"
                  >
                    <span
                      class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      >插入最后</span
                    >
                    <span class="text-text-muted">排在页面字段之后</span>
                    <span class="text-text-muted"
                      >{{ backBlocks.length }} 项</span
                    >
                    <button
                      class="ml-auto px-2 py-0.5 rounded-lg text-[11px] text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
                      @click="addBlock('back')"
                    >
                      + 添加属性
                    </button>
                  </div>
                  <div
                    v-if="backBlocks.length === 0"
                    class="text-[11px] text-text-muted py-8 text-center border border-dashed border-border-subtle rounded-lg"
                  >
                    暂无属性
                  </div>
                  <div
                    v-for="block in backBlocks"
                    :key="block.id"
                    class="rounded-xl border border-border-subtle bg-surface p-3 space-y-2.5"
                  >
                    <BlockCard
                      :block="block"
                      :image-numbers="imageNumberMap.get(block.id) || []"
                      :style-templates="styleTemplates"
                      :is-uploading="uploadingBlockId === block.id"
                      @update="(patch) => updateBlock(block.id, patch)"
                      @remove="removeBlock(block.id)"
                      @move-up="moveBlock(block.id, 'up')"
                      @move-down="moveBlock(block.id, 'down')"
                      @upload="triggerUpload(block.id)"
                      @remove-image="(i) => removeBlockImage(block.id, i)"
                      @preview-image="(i) => previewBlockImage(block.id, i)"
                      @refresh-desc="refreshBlockDesc(block.id)"
                      @style-template-change="
                        (tid) => handleStyleTemplateChange(block.id, tid)
                      "
                    />
                  </div>
                </div>
              </div>

              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="handleFileUpload"
              />
            </template>

            <div class="h-px bg-elevated" />

            <div class="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
              <div class="flex items-start gap-2">
                <svg
                  class="w-4 h-4 text-cyan-400 mt-0.5 shrink-0"
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
                <p class="text-xs text-text-secondary leading-relaxed">
                  绘图配置会自动保存到当前项目。共用属性按「插入最前 /
                  最后」拼入提示词；参考图序号按属性顺序与上传顺序计算。
                </p>
              </div>
            </div>
          </div>

          <!-- 底部操作 -->
          <div
            class="shrink-0 px-6 py-4 border-t border-border-subtle flex items-center justify-end gap-3 relative"
          >
            <button
              class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
              @click="close"
            >
              取消
            </button>
            <button
              class="px-5 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
              @click="save"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 项目选择弹窗 -->
    <Transition name="fade">
      <div
        v-if="showProjectSelector"
        class="fixed inset-0 z-[102] flex items-center justify-center"
      >
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="showProjectSelector = false"
        />
        <div
          class="relative w-[400px] max-h-[60vh] flex flex-col rounded-xl bg-surface dark:bg-slate-800 border border-border-subtle shadow-2xl shadow-black/40"
        >
          <div
            class="shrink-0 px-5 py-4 border-b border-border-subtle flex items-center justify-between"
          >
            <h3 class="text-sm font-semibold text-text-primary">选择要同步的项目</h3>
            <button
              class="w-6 h-6 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
              @click="showProjectSelector = false"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-auto p-3 space-y-1">
            <div
              v-if="projects.length === 0"
              class="text-center text-text-secondary text-xs py-8"
            >
              暂无可用的项目配置
            </div>
            <button
              v-for="project in projects"
              :key="project.id"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-elevated border border-transparent hover:border-border-subtle transition-colors"
              @click="applyProjectConfig(project)"
            >
              <div
                class="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0"
              >
                <svg
                  class="w-4 h-4 text-cyan-400"
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
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-text-primary truncate">
                  {{ project.name }}
                </div>
                <div class="text-[11px] text-text-secondary truncate">
                  {{
                    project.imageGenConfig?.imageModelId
                      ? "已配置模型"
                      : "部分配置"
                  }}
                </div>
              </div>
              <svg
                class="w-4 h-4 text-text-muted shrink-0"
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
    </Transition>

    <ImagePreviewModal
      v-model="showImagePreview"
      :images="previewImages"
      :image-index="previewImageIndex"
      alt="共用参考图"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, defineComponent, h } from "vue";
import type {
  ModelConfig,
  PromptTemplate,
  ImageGenConfig,
  SharedPromptBlock,
  PromptInsertPosition,
} from "@comic/types";
import { processImage, type ImageStorageMode } from "@comic/services/uploadService";
import { useToast } from "@comic/composables/useToast";
import ImagePreviewModal from "@comic/components/ImagePreviewModal.vue";
import { comicDb } from "@/api/comic";
import {
  migrateLegacyImageGenConfig,
  createEmptyBlock,
  getBlocksByPosition,
  getSharedRefImages,
  computeBlockImageNumbers,
  refreshBlockDescriptionWithNumbers,
  reindexBlockSortOrders,
  normalizeImageGenConfig,
} from "@comic/utils/sharedBlocks";

const toast = useToast();
const MAX_REF_IMAGES = 14;

const props = defineProps<{
  modelValue: boolean;
  imageModels: ModelConfig[];
  initialConfig?: ImageGenConfig;
  projectId?: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", config: ImageGenConfig): void;
}>();

const config = ref<ImageGenConfig>(migrateLegacyImageGenConfig(null));

const activeTab = ref<"model" | "blocks">("model");
const tabs = [
  { key: "model" as const, label: "绘画模型" },
  { key: "blocks" as const, label: "共用属性" },
];

const styleTemplates = ref<PromptTemplate[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploadingBlockId = ref<string | null>(null);
const pendingUploadBlockId = ref<string | null>(null);

const showImagePreview = ref(false);
const previewImages = ref<string[]>([]);
const previewImageIndex = ref(0);

const showProjectSelector = ref(false);
const projects = ref<
  { id: string; name: string; imageGenConfig?: ImageGenConfig }[]
>([]);

/** 模型相关 */
const selectedImageModel = computed(() =>
  props.imageModels.find((m) => m.id === config.value.imageModelId),
);

const availableAspectRatios = computed(() => {
  const ar = selectedImageModel.value?.aspectRatios;
  if (!ar) return [];
  return ar
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
});

const availableResolutions = computed(() => {
  const res = selectedImageModel.value?.resolutions;
  if (!res) return [];
  return res
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
});

const availableQualities = computed(() => {
  const q = selectedImageModel.value?.qualities;
  if (!q) return [];
  return q
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
});

const blocks = computed({
  get: () => config.value.sharedBlocks || [],
  set: (val: SharedPromptBlock[]) => {
    config.value.sharedBlocks = val;
  },
});

const frontBlocks = computed(() => getBlocksByPosition(blocks.value, "front"));
const backBlocks = computed(() => getBlocksByPosition(blocks.value, "back"));

const imageNumberMap = computed(() => computeBlockImageNumbers(blocks.value));

const sharedImageCount = computed(
  () => getSharedRefImages(blocks.value).length,
);

/** 加载风格模板 */
const loadStyleTemplates = async () => {
  const all = await comicDb.getAllPromptTemplates();
  styleTemplates.value = all.filter((t) => t.type === "style");
};

/**
 * 打开抽屉时从 initialConfig 同步
 */
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    const migrated = migrateLegacyImageGenConfig(props.initialConfig);
    config.value = normalizeImageGenConfig(migrated);

    // 校验模型是否仍存在
    if (config.value.imageModelId) {
      const model = props.imageModels.find(
        (m) => m.id === config.value.imageModelId,
      );
      if (!model) {
        config.value.imageModelId = "";
        config.value.aspectRatio = "";
        config.value.resolution = "";
        config.value.quality = "";
      }
    }

    // 恢复风格模板选中态（按内容匹配）
    for (const block of config.value.sharedBlocks || []) {
      if (block.contentSource !== "style_template") continue;
      if (block.styleTemplateId) {
        const still = styleTemplates.value.find(
          (t) => t.id === block.styleTemplateId,
        );
        if (still) continue;
      }
      if (block.description) {
        const matched = styleTemplates.value.find(
          (t) => t.content === block.description,
        );
        if (matched) {
          block.styleTemplateId = matched.id;
        }
      }
    }
  },
);

/**
 * 更新某个 block 的部分字段
 * @param id - block id
 * @param patch - 局部更新
 */
const updateBlock = (id: string, patch: Partial<SharedPromptBlock>) => {
  const list = [...(config.value.sharedBlocks || [])];
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return;

  const prev = list[idx];
  let next: SharedPromptBlock = { ...prev, ...patch };

  // 切换插入位置时重新编号
  if (patch.insertPosition && patch.insertPosition !== prev.insertPosition) {
    const targetPos = patch.insertPosition;
    const maxOrder = list
      .filter((b) =>
        targetPos === "front"
          ? b.insertPosition === "front"
          : b.insertPosition !== "front",
      )
      .reduce((m, b) => Math.max(m, b.sortOrder), -1);
    next = { ...next, sortOrder: maxOrder + 1 };
  }

  list[idx] = next;
  config.value.sharedBlocks = reindexBlockSortOrders(list);
};

/**
 * 删除属性块
 * @param id - block id
 */
const removeBlock = (id: string) => {
  const list = (config.value.sharedBlocks || []).filter((b) => b.id !== id);
  config.value.sharedBlocks = reindexBlockSortOrders(list);
  void autoSaveConfig();
};

/**
 * 同组内上下移动
 * @param id - block id
 * @param dir - up | down
 */
const moveBlock = (id: string, dir: "up" | "down") => {
  const list = [...(config.value.sharedBlocks || [])];
  const block = list.find((b) => b.id === id);
  if (!block) return;

  const group = list
    .filter((b) => b.insertPosition === block.insertPosition)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const gIdx = group.findIndex((b) => b.id === id);
  const swapIdx = dir === "up" ? gIdx - 1 : gIdx + 1;
  if (swapIdx < 0 || swapIdx >= group.length) return;

  const a = group[gIdx];
  const b = group[swapIdx];
  const tmp = a.sortOrder;
  a.sortOrder = b.sortOrder;
  b.sortOrder = tmp;

  config.value.sharedBlocks = reindexBlockSortOrders(list);
};

/**
 * 向指定分组添加新属性
 * @param position - front 插入最前 / back 插入最后
 */
const addBlock = (position: PromptInsertPosition) => {
  const list = [...(config.value.sharedBlocks || [])];
  const groupCount = list.filter((b) =>
    position === "front"
      ? b.insertPosition === "front"
      : b.insertPosition !== "front",
  ).length;
  list.push(
    createEmptyBlock({
      name: `自定义属性${list.length + 1}`,
      insertPosition: position,
      sortOrder: groupCount,
      contentSource: "manual",
    }),
  );
  config.value.sharedBlocks = reindexBlockSortOrders(list);
};

/**
 * 风格模板切换：填充 description
 * @param blockId - 属性 id
 * @param templateId - 模板 id
 */
const handleStyleTemplateChange = (blockId: string, templateId: string) => {
  const tmpl = styleTemplates.value.find((t) => t.id === templateId);
  updateBlock(blockId, {
    styleTemplateId: templateId,
    description: tmpl?.content || "",
  });
};

/**
 * 按当前图号刷新 description
 * @param blockId - 属性 id
 */
const refreshBlockDesc = (blockId: string) => {
  const block = (config.value.sharedBlocks || []).find((b) => b.id === blockId);
  if (!block) return;
  const nums = imageNumberMap.value.get(blockId) || [];
  const desc = refreshBlockDescriptionWithNumbers(block, nums);
  updateBlock(blockId, { description: desc });
  toast.success("已按当前图号刷新描述");
};

/** 触发上传 */
const triggerUpload = (blockId: string) => {
  if (uploadingBlockId.value) return;
  pendingUploadBlockId.value = blockId;
  fileInputRef.value?.click();
};

/**
 * 处理多图上传到指定 block
 * @param e - input change 事件
 */
const handleFileUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  const blockId = pendingUploadBlockId.value;
  pendingUploadBlockId.value = null;
  if (!files || files.length === 0 || !blockId) return;

  const block = (config.value.sharedBlocks || []).find((b) => b.id === blockId);
  if (!block) {
    input.value = "";
    return;
  }

  const currentShared = getSharedRefImages(config.value.sharedBlocks).length;
  const remaining = MAX_REF_IMAGES - currentShared;
  if (remaining <= 0) {
    toast.warning(`参考图总数不能超过${MAX_REF_IMAGES}张`);
    input.value = "";
    return;
  }

  const filesToUpload = Array.from(files).slice(0, remaining);
  if (filesToUpload.length < files.length) {
    toast.warning(`最多还能上传${remaining}张参考图，已自动截取`);
  }

  uploadingBlockId.value = blockId;
  const mode: ImageStorageMode = block.storageMode || "local";
  const images = [...(block.referenceImages || [])];

  const results = await Promise.all(
    filesToUpload.map(async (file) => {
      const result = await processImage(file, mode);
      return result.success && result.url
        ? { ok: true as const, url: result.url }
        : { ok: false as const, url: "" };
    }),
  );

  let successCount = 0;
  let failCount = 0;
  for (const r of results) {
    if (r.ok) {
      images.push(r.url);
      successCount++;
    } else {
      failCount++;
    }
  }

  updateBlock(blockId, { referenceImages: images, enableRefImages: true });
  // 自动刷新该 block 描述中的图号
  const updated = (config.value.sharedBlocks || []).find(
    (b) => b.id === blockId,
  );
  if (updated) {
    const nums =
      computeBlockImageNumbers(config.value.sharedBlocks).get(blockId) || [];
    const desc = refreshBlockDescriptionWithNumbers(updated, nums);
    updateBlock(blockId, { description: desc });
  }

  uploadingBlockId.value = null;
  input.value = "";

  if (successCount > 0) {
    toast.success(
      `成功${mode === "local" ? "本地存储" : "上传到云端"} ${successCount} 张参考图`,
    );
    await autoSaveConfig();
  }
  if (failCount > 0) {
    toast.error(`${failCount} 张图片上传失败，请重试`);
  }
};

/**
 * 删除 block 内某张参考图
 * @param blockId - 属性 id
 * @param idx - 图片下标
 */
const removeBlockImage = async (blockId: string, idx: number) => {
  const block = (config.value.sharedBlocks || []).find((b) => b.id === blockId);
  if (!block) return;
  const images = [...(block.referenceImages || [])];
  images.splice(idx, 1);
  updateBlock(blockId, { referenceImages: images });
  const updated = (config.value.sharedBlocks || []).find(
    (b) => b.id === blockId,
  );
  if (updated && images.length > 0) {
    const nums =
      computeBlockImageNumbers(config.value.sharedBlocks).get(blockId) || [];
    updateBlock(blockId, {
      description: refreshBlockDescriptionWithNumbers(updated, nums),
    });
  }
  await autoSaveConfig();
};

/**
 * 预览 block 参考图
 * @param blockId - 属性 id
 * @param idx - 图片下标
 */
const previewBlockImage = (blockId: string, idx: number) => {
  const block = (config.value.sharedBlocks || []).find((b) => b.id === blockId);
  if (!block?.referenceImages?.length) return;
  previewImages.value = [...block.referenceImages];
  previewImageIndex.value = idx;
  showImagePreview.value = true;
};

/**
 * 自动保存到项目（参考图变更时），并同步父组件
 */
const autoSaveConfig = async () => {
  if (!props.projectId) return;
  const plainConfig = JSON.parse(
    JSON.stringify(normalizeImageGenConfig(config.value)),
  ) as ImageGenConfig;
  try {
    const project = await comicDb.getProject(props.projectId);
    if (!project) {
      toast.error("项目不存在，无法自动保存配置");
      return;
    }
    await comicDb.saveProject({
      ...project,
      imageGenConfig: plainConfig,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.error("自动保存绘图配置失败:", e);
    toast.error("自动保存失败（可能是本地图片过大）");
  }
};

/** 加载其它项目列表 */
const loadProjects = async () => {
  const allProjects = await comicDb.getAllProjects();
  projects.value = allProjects
    .filter((p) => p.id !== props.projectId && p.imageGenConfig)
    .map((p) => ({
      id: p.id,
      name: p.name,
      imageGenConfig: p.imageGenConfig,
    }));
};

/**
 * 应用其它项目配置
 * @param project - 源项目
 */
const applyProjectConfig = (project: {
  id: string;
  name: string;
  imageGenConfig?: ImageGenConfig;
}) => {
  if (!project.imageGenConfig) return;
  config.value = migrateLegacyImageGenConfig(project.imageGenConfig);
  showProjectSelector.value = false;
  toast.success(`已同步项目「${project.name}」的绘图配置`);
};

watch(showProjectSelector, (val) => {
  if (val) loadProjects();
});

const close = () => {
  emit("update:modelValue", false);
};

/**
 * 保存配置并关闭
 */
const save = () => {
  const list = config.value.sharedBlocks || [];
  const names = list.map((b) => b.name.trim()).filter(Boolean);
  if (names.length !== new Set(names).size) {
    toast.warning("属性名不能重复");
    return;
  }
  if (list.some((b) => !b.name.trim())) {
    toast.warning("属性名不能为空");
    return;
  }
  if (getSharedRefImages(list).length > MAX_REF_IMAGES) {
    toast.warning(`参考图总数不能超过${MAX_REF_IMAGES}张`);
    return;
  }

  const finalConfig = normalizeImageGenConfig(config.value);
  emit("save", finalConfig);
  close();
};

onMounted(() => {
  loadStyleTemplates();
});

// ==================== 内联子组件：属性卡片 ====================

const BlockCard = defineComponent({
  name: "SharedBlockCard",
  props: {
    block: { type: Object as () => SharedPromptBlock, required: true },
    imageNumbers: { type: Array as () => number[], default: () => [] },
    styleTemplates: {
      type: Array as () => PromptTemplate[],
      default: () => [],
    },
    isUploading: { type: Boolean, default: false },
  },
  emits: [
    "update",
    "remove",
    "move-up",
    "move-down",
    "upload",
    "remove-image",
    "preview-image",
    "refresh-desc",
    "style-template-change",
  ],
  setup(props, { emit }) {
    const isStyleTemplate = computed(
      () => props.block.contentSource === "style_template",
    );

    /** 自定义风格：无匹配模板或用户主动切自定义 */
    const isCustomStyle = ref(false);

    watch(
      () => [props.block.styleTemplateId, props.block.description] as const,
      () => {
        if (!isStyleTemplate.value) {
          isCustomStyle.value = true;
          return;
        }
        const tid = props.block.styleTemplateId;
        const tmpl = props.styleTemplates.find((t) => t.id === tid);
        if (tmpl && tmpl.content === props.block.description) {
          isCustomStyle.value = false;
        } else if (!tid) {
          const matched = props.styleTemplates.find(
            (t) => t.content === props.block.description,
          );
          isCustomStyle.value = !matched;
        } else {
          // 有 templateId 但内容已改
          isCustomStyle.value =
            !tmpl || tmpl.content !== props.block.description;
        }
      },
      { immediate: true },
    );

    return () =>
      h("div", { class: "space-y-2.5" }, [
        // 顶部：名称 + 操作
        h("div", { class: "flex items-center gap-2" }, [
          h("input", {
            class:
              "flex-1 min-w-0 bg-input-bg border border-border-subtle rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-cyan-500/30",
            value: props.block.name,
            placeholder: "属性名（Prompt 字段名）",
            onInput: (e: Event) =>
              emit("update", {
                name: (e.target as HTMLInputElement).value,
              }),
          }),
          h(
            "button",
            {
              class:
                "w-7 h-7 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated text-xs",
              title: "上移",
              onClick: () => emit("move-up"),
            },
            "↑",
          ),
          h(
            "button",
            {
              class:
                "w-7 h-7 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated text-xs",
              title: "下移",
              onClick: () => emit("move-down"),
            },
            "↓",
          ),
          h(
            "button",
            {
              class:
                "w-7 h-7 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 text-xs",
              title: "删除",
              onClick: () => emit("remove"),
            },
            "×",
          ),
        ]),

        // 仅绘画风格：模板下拉 / 自定义，切换按钮与「风格模板」同一行右侧
        isStyleTemplate.value
          ? h("div", { class: "space-y-1.5" }, [
              h("div", { class: "flex items-center justify-between" }, [
                h("label", { class: "text-[11px] text-text-secondary" }, "风格模板"),
                isCustomStyle.value
                  ? h(
                      "button",
                      {
                        class: "text-[10px] text-cyan-400 hover:text-cyan-300",
                        onClick: () => {
                          isCustomStyle.value = false;
                        },
                      },
                      "改用风格模板",
                    )
                  : h(
                      "button",
                      {
                        class: "text-[10px] text-text-secondary hover:text-cyan-400",
                        onClick: () => {
                          isCustomStyle.value = true;
                        },
                      },
                      "使用自定义风格",
                    ),
              ]),
              !isCustomStyle.value
                ? h(
                    "select",
                    {
                      class:
                        "w-full appearance-none bg-input-bg border border-border-subtle rounded-lg pl-3 pr-8 py-1.5 text-sm text-text-primary focus:outline-none focus:border-cyan-500/30 cursor-pointer",
                      value: props.block.styleTemplateId || "",
                      onChange: (e: Event) => {
                        const val = (e.target as HTMLSelectElement).value;
                        emit("style-template-change", val);
                      },
                    },
                    [
                      h(
                        "option",
                        { value: "", class: "bg-surface" },
                        "请选择风格模板",
                      ),
                      ...props.styleTemplates.map((tmpl) =>
                        h(
                          "option",
                          {
                            key: tmpl.id,
                            value: tmpl.id,
                            class: "bg-surface",
                          },
                          tmpl.name,
                        ),
                      ),
                    ],
                  )
                : null,
            ])
          : null,

        // 参考图开关
        h("div", { class: "flex items-center justify-between" }, [
          h("label", { class: "text-[11px] text-text-secondary" }, "需要参考图"),
          h(
            "button",
            {
              class: [
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                props.block.enableRefImages ? "bg-cyan-500" : "bg-elevated",
              ],
              onClick: () =>
                emit("update", {
                  enableRefImages: !props.block.enableRefImages,
                }),
            },
            [
              h("span", {
                class: [
                  "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                  props.block.enableRefImages
                    ? "translate-x-4"
                    : "translate-x-0.5",
                ],
              }),
            ],
          ),
        ]),

        // 参考图上传区（在描述上方）
        props.block.enableRefImages
          ? h("div", { class: "space-y-2" }, [
              h("div", { class: "flex items-center justify-between" }, [
                h("span", { class: "text-[11px] text-text-secondary" }, "参考图"),
                h(
                  "div",
                  {
                    class:
                      "flex items-center rounded-lg bg-surface p-[2px] border border-border-subtle",
                  },
                  [
                    h(
                      "button",
                      {
                        class: [
                          "px-2 py-0.5 rounded text-[10px] transition-colors",
                          (props.block.storageMode || "local") === "cloud"
                            ? "bg-elevated text-text-primary"
                            : "text-text-secondary hover:text-text-primary",
                        ],
                        onClick: () => emit("update", { storageMode: "cloud" }),
                      },
                      "云端",
                    ),
                    h(
                      "button",
                      {
                        class: [
                          "px-2 py-0.5 rounded text-[10px] transition-colors",
                          (props.block.storageMode || "local") === "local"
                            ? "bg-elevated text-text-primary"
                            : "text-text-secondary hover:text-text-primary",
                        ],
                        onClick: () => emit("update", { storageMode: "local" }),
                      },
                      "本地",
                    ),
                  ],
                ),
              ]),
              h("div", { class: "flex flex-wrap gap-2" }, [
                ...(props.block.referenceImages || []).map((url, idx) =>
                  h(
                    "div",
                    {
                      key: `${url}-${idx}`,
                      class:
                        "relative w-16 h-16 rounded-lg border border-border-subtle overflow-hidden group",
                    },
                    [
                      h("img", {
                        src: url,
                        class: "w-full h-full object-cover",
                      }),
                      props.imageNumbers[idx]
                        ? h(
                            "span",
                            {
                              class:
                                "absolute bottom-0 left-0 right-0 text-center text-[9px] bg-black/70 text-cyan-300 py-0.5",
                            },
                            `图${props.imageNumbers[idx]}`,
                          )
                        : null,
                      h(
                        "div",
                        {
                          class:
                            "absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-colors",
                        },
                        [
                          h(
                            "div",
                            {
                              class:
                                "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                            },
                            [
                              h(
                                "button",
                                {
                                  class:
                                    "w-5 h-5 rounded bg-elevated flex items-center justify-center hover:bg-elevated text-text-primary text-[10px]",
                                  title: "预览",
                                  onClick: () => emit("preview-image", idx),
                                },
                                "查",
                              ),
                              h(
                                "button",
                                {
                                  class:
                                    "w-5 h-5 rounded bg-elevated flex items-center justify-center hover:bg-red-500/50 text-text-primary text-[10px]",
                                  title: "删除",
                                  onClick: () => emit("remove-image", idx),
                                },
                                "×",
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                h(
                  "button",
                  {
                    class:
                      "w-16 h-16 rounded-lg border border-dashed border-border-default flex flex-col items-center justify-center gap-0.5 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-colors disabled:opacity-50",
                    disabled: props.isUploading,
                    onClick: () => emit("upload"),
                  },
                  [
                    h(
                      "span",
                      { class: "text-[10px] text-text-secondary" },
                      props.isUploading ? "上传中" : "+ 上传",
                    ),
                  ],
                ),
              ]),
            ])
          : null,

        // 描述（参考图下方）
        h("div", { class: "space-y-1" }, [
          h("div", { class: "flex items-center justify-between" }, [
            h("label", { class: "text-[11px] text-text-secondary" }, "描述"),
            props.block.enableRefImages && props.imageNumbers.length > 0
              ? h(
                  "button",
                  {
                    class: "text-[10px] text-cyan-400 hover:text-cyan-300",
                    onClick: () => emit("refresh-desc"),
                  },
                  "按图号刷新描述",
                )
              : null,
          ]),
          h("textarea", {
            class:
              "w-full bg-input-bg border border-border-subtle rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-cyan-500/30 resize-none",
            rows: 4,
            value: props.block.description,
            placeholder: "属性描述（写入 Prompt 的值）",
            onInput: (e: Event) =>
              emit("update", {
                description: (e.target as HTMLTextAreaElement).value,
              }),
          }),
        ]),
      ]);
  },
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
