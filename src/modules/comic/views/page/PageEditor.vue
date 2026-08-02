<template>
  <div
    class="h-screen flex flex-col overflow-hidden relative bg-app-bg"
  >
    <!-- 背景装饰 -->
    <div
      class="absolute top-10 right-1/4 w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none"
    />
    <div
      class="absolute bottom-10 left-1/3 w-80 h-80 bg-blue-600/8 rounded-full blur-[100px] pointer-events-none"
    />

    <!-- 主内容区 -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <!-- 固定顶部 header -->
      <div
        class="shrink-0 h-14 px-6 border-b border-border-subtle flex items-center gap-4"
      >
        <!-- 返回上一步 -->
        <button
          class="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
          @click="goBack"
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          上一步
        </button>

        <div class="w-px h-4 bg-border-subtle" />

        <!-- 项目 -->
        <button
          class="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
          @click="goToProject"
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
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          项目
        </button>

        <div class="w-px h-4 bg-border-subtle" />

        <!-- 项目名称 -->
        <h1 class="text-sm font-semibold text-text-primary leading-7">
          {{ projectName }}
        </h1>

        <div class="flex-1" />

        <!-- 绘图配置按钮 + 批量生成 -->
        <div class="flex items-center gap-3">
          <button
            class="px-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-text-secondary text-xs font-medium flex items-center gap-1.5 hover:bg-elevated hover:text-text-primary transition-colors"
            @click="showConfigDrawer = true"
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
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            绘图配置
          </button>

          

          <!-- 批量生成 -->
          <button
            class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
            @click="handleBatchGenerate"
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
              />
            </svg>
            批量生成
          </button>

          <!-- 同步至公众号 -->
          <button
            class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium flex items-center gap-1.5 hover:from-sky-500/30 hover:to-indigo-500/30 hover:text-sky-200 transition-colors shadow-lg shadow-sky-500/10"
            @click="goToSync"
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            同步至公众号
          </button>

          <!-- 导出发布 -->
          <button
            class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 hover:from-emerald-500/30 hover:to-cyan-500/30 hover:text-emerald-200 transition-colors shadow-lg shadow-emerald-500/10"
            @click="goToExport"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            导出发布
          </button>
        </div>
      </div>

      <!-- 三栏卡片布局 -->
      <div class="flex-1 flex overflow-hidden gap-3 p-3">
        <!-- 左侧：页面列表 -->
        <div
          class="w-[20%] min-w-[220px] max-w-[280px] rounded-xl bg-surface border border-border-subtle shadow-lg shadow-black/20 overflow-hidden"
        >
          <PageListSidebar
            :pages="comicData?.pages || []"
            :current-index="currentPageIndex"
            :total-pages="totalPages"
            :generated-count="generatedCount"
            :generating-page-indices="generatingPageIndices"
            :generated-images="generatedImages"
            :recoverable-task-ids="recoverableTaskIds"
            @select="selectPage"
            @add="addNewPage"
            @reorder="handleReorderPages"
            @insert="handleInsertPage"
            @duplicate="handleDuplicatePageByIndex"
            @delete="handleDeletePageByIndex"
          />
        </div>

        <!-- 中间：页面预览区 -->
        <div
          class="flex-1 rounded-xl bg-surface border border-border-subtle shadow-lg shadow-black/20 overflow-hidden"
          style="max-width: 24%; min-width: 260px"
        >
          <PagePreview
            :page="currentPage"
            :page-index="currentPageIndex"
            :generated-image="currentGeneratedImage"
            :is-generating="generatingPageIndices.has(currentPageIndex)"
            :image-models="imageModels"
            :selected-model-id="currentPageModelId"
            :global-model-name="globalModelName"
            :project-id="projectId"
            :page-ref-images="pageRefImages[currentPageIndex]"
            :ref-image-offset="sharedRefImages.length"
            :all-generated-images="generatedImages"
            :has-recoverable-task="recoverableTaskIds.has(currentPageIndex)"
            :recovering="recoveringIndex === currentPageIndex"
            @generate="handleGeneratePage"
            @recover="handleRecoverTask"
            @preview-line="handlePreviewLine"
            @delete="handleDeletePage"
            @duplicate="handleDuplicatePage"
            @update:selected-model-id="handlePageModelChange"
            @update:page-ref-images="handleUpdatePageRefImages"
          />
        </div>

        <!-- 右侧：JSON 内容展示 -->
        <div
          class="flex-1 rounded-xl bg-surface border border-border-subtle shadow-lg shadow-black/20 overflow-hidden"
          style="min-width: 440px"
        >
          <PageContentPanel
            :page="currentPage"
            :active-tab="activeTab"
            :view-mode="pageViewModes[currentPageIndex] || 'json'"
            :generated-image="currentGeneratedImage"
            :style-ref-images="sharedRefImages"
            :page-ref-images="pageRefImages[currentPageIndex]"
            :llm-models="llmModels"
            @change-tab="activeTab = $event"
            @change-view-mode="pageViewModes[currentPageIndex] = $event"
            @generate="handleGeneratePage"
            @delete="handleDeletePage"
            @duplicate="handleDuplicatePage"
            @preview-line="handlePreviewLine"
            @single-generate="handleSingleGenerate"
            @update-page="handleUpdatePage"
          />
        </div>
      </div>
    </main>

    <!-- 绘图配置抽屉 -->
    <ImageConfigDrawer
      v-model="showConfigDrawer"
      :image-models="imageModels"
      :initial-config="imageConfig"
      :project-id="projectId"
      @save="handleSaveConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { comicDb } from "@/api/comic";
import type { GenerationTask } from "@comic/types";
import type { ComicPageData, ComicPage } from "./types";
import type { ModelConfig, ImageGenConfig } from "@comic/types";
import { imageGenerationService } from "@comic/services/imageGenerationService";
import { useToast } from "@comic/composables/useToast";
import { useConcurrentQueue } from "@comic/composables/useConcurrentQueue";
import { processPageData } from "@comic/composables/usePageDataProcessor";
import {
  migrateLegacyImageGenConfig,
  getSharedRefImages,
  buildSharedPromptFields,
} from "@comic/utils/sharedBlocks";
import PageListSidebar from "./PageListSidebar.vue";
import PagePreview from "./PagePreview.vue";
import PageContentPanel from "./PageContentPanel.vue";
import type { RefImageConfig } from "./PageContentPanel.vue";
import ImageConfigDrawer from "@comic/components/ImageConfigDrawer.vue";

const toast = useToast();
const router = useRouter();
const route = useRoute();
const projectId = route.params.projectId as string;

/** 正在生成的任务信息，用于页面恢复时重新检查 */
interface PendingTask {
  pageIndex: number;
  prompt: string;
  refImages: string[];
  startTime: number;
  taskId?: string;
}
const pendingTasks = ref<Map<number, PendingTask>>(new Map());

const props = defineProps<{
  initialData?: ComicPageData;
}>();
const comicData = ref<ComicPageData | null>(props.initialData || null);
const currentPageIndex = ref(0);
const activeTab = ref("");
const generatedImages = ref<Record<number, string>>({});
const isBatchGenerating = ref(false);
const generatingPageIndices = ref(new Set<number>());
/** 单页模型覆盖：key=页面索引, value=模型ID */
const pageModelOverrides = ref<Record<number, string>>({});
/** 页面参考图，key=页面索引，独立存储不污染页面JSON */
const pageRefImages = ref<
  Record<number, { character: string[]; scene: string[]; prop: string[] }>
>({});
/** 每页独立视图模式，key=页面索引，value='json'|'prompt'，默认 json */
const pageViewModes = ref<Record<number, "json" | "prompt">>({});
/** 是否正在加载初始数据，防止 watcher 在加载期间触发自动保存 */
const isLoadingData = ref(true);

const projectName = ref("");
const models = ref<ModelConfig[]>([]);

const showConfigDrawer = ref(false);
const imageConfig = ref<ImageGenConfig>(migrateLegacyImageGenConfig(null));

/** 当前共用参考图（风格/字体等）扁平列表 */
const sharedRefImages = computed(() =>
  getSharedRefImages(imageConfig.value.sharedBlocks),
);

const MAX_REF_IMAGES = 14;
const STORAGE_KEY = `page-editor-data-${projectId}`;

/** 正在执行「重新查询」任务的页面索引，用于按钮 loading 状态 */
const recoveringIndex = ref<number | null>(null);

/** 可恢复任务的页面索引集合（pendingTasks 中有 taskId 且当前未在生成中） */
const recoverableTaskIds = computed<Set<number>>(() => {
  const result = new Set<number>();
  for (const [index, task] of pendingTasks.value.entries()) {
    if (task.taskId && !generatingPageIndices.value.has(index)) {
      result.add(index);
    }
  }
  return result;
});

// ==================== 数据持久化 ====================

/** 将页面数据保存到 IndexedDB（防抖调用，用于 watcher 自动触发） */
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const doSave = async () => {
  if (!projectId || !comicData.value) return;
  try {
    const plainData = JSON.parse(JSON.stringify(comicData.value));
    const plainImages = JSON.parse(JSON.stringify(generatedImages.value));
    const plainOverrides = JSON.parse(JSON.stringify(pageModelOverrides.value));
    const plainRefImages = JSON.parse(JSON.stringify(pageRefImages.value));
    // 页面数据保存时同步带上绘图配置，避免仅内存态丢失
    const plainImageConfig = JSON.parse(JSON.stringify(imageConfig.value));
    const project = await comicDb.getProject(projectId);
    if (project) {
      await comicDb.saveProject({
        ...project,
        pageData: plainData,
        generatedImages: plainImages,
        pageModelOverrides: plainOverrides,
        pageRefImages: plainRefImages,
        imageGenConfig: plainImageConfig,
        updatedAt: Date.now(),
      });
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plainData));
  } catch (e) {
    console.error("保存页面数据失败:", e);
  }
};

/** 防抖保存（watcher 使用） */
const savePageData = () => {
  if (isLoadingData.value) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 300);
};

/** 立即保存（关键操作后使用，确保数据不丢失） */
const flushSavePageData = async () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  await doSave();
};

/** 加载页面数据：优先从 DB 读取，回退到 sessionStorage */
const loadPageData = async () => {
  isLoadingData.value = true;
  try {
    if (projectId) {
      const project = await comicDb.getProject(projectId);
      if (project?.pageData) {
        comicData.value = {
          pages: project.pageData.pages || [],
        } as ComicPageData;
      }
      if (project?.generatedImages) {
        generatedImages.value = project.generatedImages as Record<number, string>;
      }
      if (project?.pageModelOverrides) {
        pageModelOverrides.value = project.pageModelOverrides as Record<number, string>;
      }
      if (project?.pageRefImages) {
        pageRefImages.value = project.pageRefImages;
      }
      if (comicData.value) return;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      comicData.value = {
        pages: parsed.pages || [],
      } as ComicPageData;
      // 新 JSON 解析进入，清除旧的生图任务和已生成图片
      await clearProjectTasks();
      generatedImages.value = {};
    }
  } catch (e) {
    console.error("加载页面数据失败:", e);
  } finally {
    isLoadingData.value = false;
  }
};

const pages = computed(() => comicData.value?.pages || []);
const currentPage = computed(() => pages.value[currentPageIndex.value] || null);

// 监听 comicData 深度变化，自动持久化到数据库
watch(
  () => comicData.value,
  () => {
    savePageData();
  },
  { deep: true },
);

// 监听 generatedImages 变化，自动持久化到数据库
// 浅监听：所有修改点均为整体替换引用，无需 deep 递归遍历
watch(
  () => generatedImages.value,
  () => {
    savePageData();
  },
);

watch(
  currentPage,
  (page) => {
    if (!page) return;
    const keys = Object.keys(page).filter(
      (k) => page[k] !== undefined && page[k] !== null && page[k] !== "",
    );
    if (keys.length > 0 && !keys.includes(activeTab.value)) {
      activeTab.value = keys[0];
    }
  },
  { immediate: true },
);

const totalPages = computed(() => pages.value.length);
const generatedCount = computed(
  () => Object.values(generatedImages.value).filter(Boolean).length,
);
const currentGeneratedImage = computed(
  () => generatedImages.value[currentPageIndex.value] || null,
);

const imageModels = computed(() =>
  models.value.filter((m) => m.category === "image"),
);

const llmModels = computed(() =>
  models.value.filter((m) => m.category === "llm"),
);

/** 获取当前选中的图片模型配置 */
const selectedImageModel = computed(() =>
  imageModels.value.find((m) => m.id === imageConfig.value.imageModelId),
);

/** 当前页选中的模型ID（单页覆盖优先） */
const currentPageModelId = computed(
  () => pageModelOverrides.value[currentPageIndex.value] || "",
);

/** 全局模型名称（用于单页选择器占位提示） */
const globalModelName = computed(() => selectedImageModel.value?.name || "");

/** 获取当前页实际使用的模型：单页覆盖 > 全局配置 */
const getEffectiveModel = (): ModelConfig | null => {
  const overrideId = pageModelOverrides.value[currentPageIndex.value];
  if (overrideId) {
    return imageModels.value.find((m) => m.id === overrideId) || null;
  }
  return selectedImageModel.value || null;
};

const selectPage = (index: number) => {
  currentPageIndex.value = index;
};

const addNewPage = () => {
  if (!comicData.value) return;
  const newPage: ComicPage = {};
  comicData.value.pages.push(newPage);
  currentPageIndex.value = comicData.value.pages.length - 1;
  flushSavePageData();
};

/**
 * 迁移以页索引为 key 的 Record 数据（删除/插入/移动后保持索引一致）
 * @param record - 原 record（key 为数字索引）
 * @param ops - 操作：delete=删除某索引；insert=在某索引插入空位；move=[from,to] 移动
 */
const remapIndexRecord = <T,>(
  record: Record<number, T>,
  ops:
    | { type: "delete"; index: number }
    | { type: "insert"; index: number }
    | { type: "move"; from: number; to: number },
): Record<number, T> => {
  const result: Record<number, T> = {};
  if (ops.type === "delete") {
    for (const [k, v] of Object.entries(record)) {
      const num = Number(k);
      if (num === ops.index) continue;
      result[num > ops.index ? num - 1 : num] = v;
    }
  } else if (ops.type === "insert") {
    for (const [k, v] of Object.entries(record)) {
      const num = Number(k);
      result[num >= ops.index ? num + 1 : num] = v;
    }
  } else {
    const { from, to } = ops;
    for (const [k, v] of Object.entries(record)) {
      const num = Number(k);
      if (num === from) {
        result[to] = v;
      } else if (from < to) {
        if (num > from && num <= to) result[num - 1] = v;
        else result[num] = v;
      } else {
        if (num >= to && num < from) result[num + 1] = v;
        else result[num] = v;
      }
    }
  }
  return result;
};

/** 计算单个页索引在 delete/insert/move 操作后的新索引，未受影响返回原值 */
const remapSingleIndex = (
  num: number,
  ops:
    | { type: "delete"; index: number }
    | { type: "insert"; index: number }
    | { type: "move"; from: number; to: number },
): number | null => {
  if (ops.type === "delete") {
    if (num === ops.index) return null;
    return num > ops.index ? num - 1 : num;
  }
  if (ops.type === "insert") {
    return num >= ops.index ? num + 1 : num;
  }
  const { from, to } = ops;
  if (num === from) return to;
  if (from < to) {
    return num > from && num <= to ? num - 1 : num;
  }
  return num >= to && num < from ? num + 1 : num;
};

/** 同步迁移 pendingTasks（Map<number, PendingTask>）的页索引 */
const remapPendingTasks = (
  ops:
    | { type: "delete"; index: number }
    | { type: "insert"; index: number }
    | { type: "move"; from: number; to: number },
) => {
  const oldMap = pendingTasks.value;
  const newMap = new Map<number, PendingTask>();
  for (const [idx, task] of oldMap.entries()) {
    const newIdx = remapSingleIndex(idx, ops);
    if (newIdx !== null) {
      newMap.set(newIdx, { ...task, pageIndex: newIdx });
    }
  }
  pendingTasks.value = newMap;
  savePendingTasks();
};

/** 同步迁移 generatingPageIndices（Set<number>）的页索引 */
const remapGeneratingIndices = (
  ops:
    | { type: "delete"; index: number }
    | { type: "insert"; index: number }
    | { type: "move"; from: number; to: number },
) => {
  const oldSet = generatingPageIndices.value;
  const newSet = new Set<number>();
  for (const idx of oldSet) {
    const newIdx = remapSingleIndex(idx, ops);
    if (newIdx !== null) newSet.add(newIdx);
  }
  generatingPageIndices.value = newSet;
};

/** 拖拽排序：把 from 索引的页面移动到 to 索引 */
const handleReorderPages = (from: number, to: number) => {
  if (!comicData.value) return;
  if (from === to) return;
  const pagesArr = comicData.value.pages;
  const [moved] = pagesArr.splice(from, 1);
  pagesArr.splice(to, 0, moved);

  // 同步迁移以页索引为 key 的数据
  generatedImages.value = remapIndexRecord(generatedImages.value, {
    type: "move",
    from,
    to,
  });
  pageModelOverrides.value = remapIndexRecord(pageModelOverrides.value, {
    type: "move",
    from,
    to,
  });
  pageRefImages.value = remapIndexRecord(pageRefImages.value, {
    type: "move",
    from,
    to,
  });
  remapPendingTasks({ type: "move", from, to });
  remapGeneratingIndices({ type: "move", from, to });

  // 当前选中页跟随移动
  if (currentPageIndex.value === from) {
    currentPageIndex.value = to;
  } else {
    const cur = currentPageIndex.value;
    if (from < cur && to >= cur) currentPageIndex.value = cur - 1;
    else if (from > cur && to <= cur) currentPageIndex.value = cur + 1;
  }
  flushSavePageData();
};

/** 在指定索引处插入一个空页面（向上/向下插入共用） */
const handleInsertPage = (index: number) => {
  if (!comicData.value) return;
  const insertAt = Math.max(0, Math.min(index, comicData.value.pages.length));
  const newPage: ComicPage = {};
  comicData.value.pages.splice(insertAt, 0, newPage);

  // 后续页索引后移
  generatedImages.value = remapIndexRecord(generatedImages.value, {
    type: "insert",
    index: insertAt,
  });
  pageModelOverrides.value = remapIndexRecord(pageModelOverrides.value, {
    type: "insert",
    index: insertAt,
  });
  pageRefImages.value = remapIndexRecord(pageRefImages.value, {
    type: "insert",
    index: insertAt,
  });
  remapPendingTasks({ type: "insert", index: insertAt });
  remapGeneratingIndices({ type: "insert", index: insertAt });

  currentPageIndex.value = insertAt;
  flushSavePageData();
};

/** 复制指定索引的页面（右键菜单触发） */
const handleDuplicatePageByIndex = (index: number) => {
  if (!comicData.value) return;
  const source = comicData.value.pages[index];
  if (!source) return;
  const cloned = JSON.parse(JSON.stringify(source));
  const insertAt = index + 1;
  comicData.value.pages.splice(insertAt, 0, cloned);

  // 后续页索引后移
  generatedImages.value = remapIndexRecord(generatedImages.value, {
    type: "insert",
    index: insertAt,
  });
  pageModelOverrides.value = remapIndexRecord(pageModelOverrides.value, {
    type: "insert",
    index: insertAt,
  });
  pageRefImages.value = remapIndexRecord(pageRefImages.value, {
    type: "insert",
    index: insertAt,
  });
  remapPendingTasks({ type: "insert", index: insertAt });
  remapGeneratingIndices({ type: "insert", index: insertAt });

  currentPageIndex.value = insertAt;
  flushSavePageData();
};

/** 删除指定索引的页面（右键菜单触发） */
const handleDeletePageByIndex = (index: number) => {
  if (!comicData.value || comicData.value.pages.length <= 1) return;
  comicData.value.pages.splice(index, 1);

  generatedImages.value = remapIndexRecord(generatedImages.value, {
    type: "delete",
    index,
  });
  pageModelOverrides.value = remapIndexRecord(pageModelOverrides.value, {
    type: "delete",
    index,
  });
  pageRefImages.value = remapIndexRecord(pageRefImages.value, {
    type: "delete",
    index,
  });
  remapPendingTasks({ type: "delete", index });
  remapGeneratingIndices({ type: "delete", index });

  if (currentPageIndex.value >= comicData.value.pages.length) {
    currentPageIndex.value = comicData.value.pages.length - 1;
  } else if (currentPageIndex.value > index) {
    currentPageIndex.value = currentPageIndex.value - 1;
  }
  flushSavePageData();
};

// ==================== 参考图收集与校验 ====================

const getPageRefImages = (pageIndex: number) => {
  const refs = pageRefImages.value[pageIndex];
  return {
    characterImages: refs?.character || [],
    sceneImages: refs?.scene || [],
    propImages: refs?.prop || [],
  };
};

const collectAllRefImages = (pageIndex: number): string[] => {
  const sharedImages = getSharedRefImages(imageConfig.value.sharedBlocks);
  const { characterImages, sceneImages, propImages } =
    getPageRefImages(pageIndex);
  return [
    ...sharedImages,
    ...characterImages,
    ...sceneImages,
    ...propImages,
  ].slice(0, MAX_REF_IMAGES);
};

/** 根据参考图配置收集参考图（单独生成时使用） */
const collectRefImagesByConfig = (
  pageIndex: number,
  config: RefImageConfig,
): string[] => {
  const images: string[] = [];
  const { characterImages, sceneImages, propImages } =
    getPageRefImages(pageIndex);

  // useStyleRef：兼容命名，实际为全部共用参考图
  if (config.useStyleRef) {
    images.push(...getSharedRefImages(imageConfig.value.sharedBlocks));
  }
  if (config.useCharacterRef) {
    images.push(...characterImages);
  }
  if (config.useSceneRef) {
    images.push(...sceneImages);
  }
  if (config.usePropRef) {
    images.push(...propImages);
  }
  if (config.useGeneratedImage && currentGeneratedImage.value) {
    images.push(currentGeneratedImage.value);
  }
  if (config.customImages.length > 0) {
    images.push(...config.customImages);
  }

  return images.slice(0, MAX_REF_IMAGES);
};

const validateRefImageCount = (pageIndex: number): boolean => {
  const sharedImages = getSharedRefImages(imageConfig.value.sharedBlocks);
  const { characterImages, sceneImages, propImages } =
    getPageRefImages(pageIndex);
  const total =
    sharedImages.length +
    characterImages.length +
    sceneImages.length +
    propImages.length;
  return total <= MAX_REF_IMAGES;
};

// ==================== 提示词拼接 ====================

/**
 * 构建页面提示词
 * 结构：front 共用属性 + 页面所有字段 + back 共用属性（皆为顶层字段，平铺拼接）
 * 仅拼接有内容的字段，无内容的不加入
 * @param page - 页面数据
 * @returns JSON 格式的提示词字符串
 */
const buildPagePrompt = (page: ComicPage): string => {
  const promptObj: Record<string, unknown> = {};
  const { front, back } = buildSharedPromptFields(
    imageConfig.value.sharedBlocks,
  );

  // 插入最前的共用属性
  for (const [key, value] of Object.entries(front)) {
    promptObj[key] = value;
  }

  // 展开当前页 JSON 字段到顶层（含人物特征中的参考图信息）
  const pageRecord = page as Record<string, unknown>;
  for (const [key, value] of Object.entries(pageRecord)) {
    if (key.startsWith("_")) continue;
    if (value !== undefined && value !== null && value !== "") {
      promptObj[key] = value;
    }
  }

  // 插入最后的共用属性
  for (const [key, value] of Object.entries(back)) {
    promptObj[key] = value;
  }

  return JSON.stringify(promptObj);
};

// ==================== 生图核心逻辑 ====================

const getRequiredModel = (): ModelConfig | null => {
  const model = getEffectiveModel();
  if (!model) {
    toast.error("请先在绘图配置中选择图片生成模型，或在预览区选择单页模型");
    return null;
  }
  if (!model.apiKey) {
    toast.error("请先在系统设置中配置该模型的 API Key");
    return null;
  }
  return model;
};

// ==================== 任务持久化（IndexedDB → JSON IPC） ====================

/** 保存待处理任务到数据库 */
const savePendingTasks = async () => {
  if (!projectId) return;
  const now = Date.now();
  // 先清除该项目的旧任务
  await comicDb.deleteGenerationTasksByProjectId(projectId);
  // 写入当前任务（逐条保存）
  for (const [pageIndex, task] of pendingTasks.value.entries()) {
    const taskRecord: GenerationTask = {
      id: `${projectId}-${pageIndex}`,
      projectId,
      pageIndex,
      prompt: task.prompt,
      refImages: task.refImages,
      taskId: task.taskId,
      status: task.taskId ? "running" : "pending",
      createdAt: task.startTime,
      updatedAt: now,
    };
    await comicDb.saveGenerationTask(taskRecord);
  }
};

/** 从数据库加载待处理任务 */
const loadPendingTasks = async () => {
  if (!projectId) return;
  const tasks = await comicDb.getGenerationTasksByProjectId(projectId);
  const map = new Map<number, PendingTask>();
  for (const t of tasks) {
    if (t.status === "done") continue; // 已完成的不加载
    map.set(t.pageIndex, {
      pageIndex: t.pageIndex,
      prompt: t.prompt,
      refImages: t.refImages,
      startTime: t.createdAt,
      taskId: t.taskId,
    });
  }
  pendingTasks.value = map;
};

/** 清除项目的所有生图任务 */
const clearProjectTasks = async () => {
  if (!projectId) return;
  await comicDb.deleteGenerationTasksByProjectId(projectId);
  pendingTasks.value = new Map();
};

/** 页面恢复可见时，查询未完成任务的状态（只查询结果，不重新生成） */
const retryPendingTasks = async () => {
  console.log("[页面恢复] retryPendingTasks 开始执行");

  // 检查是否有生成中的页面（显示loading但没有图片）
  const generatingIndices = Array.from(generatingPageIndices.value);
  const pendingIndices = Array.from(pendingTasks.value.keys());
  const allIndices = [...new Set([...generatingIndices, ...pendingIndices])];

  console.log("[页面恢复] generatingIndices:", generatingIndices);
  console.log("[页面恢复] pendingIndices:", pendingIndices);
  console.log("[页面恢复] allIndices:", allIndices);
  console.log(
    "[页面恢复] generatedImages:",
    Object.keys(generatedImages.value),
  );

  // 需要查询的页面：只处理 pendingTasks 中已有 taskId 的任务
  const indicesToCheck = allIndices.filter((index) => {
    const task = pendingTasks.value.get(index);
    return task?.taskId && !generatedImages.value[index];
  });

  // 清除不需要查询的页面的生成状态
  const indicesToClean = allIndices.filter(
    (index) => !pendingTasks.value.has(index) && !!generatedImages.value[index],
  );
  for (const pageIndex of indicesToClean) {
    generatingPageIndices.value.delete(pageIndex);
  }
  if (indicesToClean.length > 0) {
    generatingPageIndices.value = new Set(generatingPageIndices.value);
    console.log(
      "[页面恢复] 清除已有图片且不在待处理中的页面状态:",
      indicesToClean,
    );
  }

  console.log("[页面恢复] indicesToCheck:", indicesToCheck);

  if (indicesToCheck.length === 0) {
    console.log("[页面恢复] 没有需要查询的页面，返回");
    return;
  }

  const model = getRequiredModel();
  console.log("[页面恢复] model:", model ? model.name : "null");

  if (!model) {
    console.log("[页面恢复] 没有配置模型，清除生成状态");
    // 没有模型，清除所有生成状态
    for (const pageIndex of indicesToCheck) {
      generatingPageIndices.value.delete(pageIndex);
      pendingTasks.value.delete(pageIndex);
    }
    generatingPageIndices.value = new Set(generatingPageIndices.value);
    savePendingTasks();
    return;
  }

  console.log(
    `[页面恢复] 发现 ${indicesToCheck.length} 个生成中的页面，开始轮询查询...`,
  );
  toast.info(`页面恢复，查询 ${indicesToCheck.length} 个生成任务...`);

  for (const pageIndex of indicesToCheck) {
    const task = pendingTasks.value.get(pageIndex);
    const taskId = task?.taskId;
    if (!taskId) continue;

    // 有 taskId，轮询查询结果（逻辑和按钮生图后一致）
    console.log(`[页面恢复] 轮询查询任务 ${taskId} (页面 ${pageIndex + 1})...`);
    try {
      const result = await imageGenerationService.waitForTaskCompletion(
        model,
        taskId,
        (progress, status) => {
          console.log(
            `[页面恢复] 任务 ${taskId} 进度: ${progress}%, 状态: ${status}`,
          );
        },
      );

      console.log(`[页面恢复] 任务 ${taskId} 查询结果:`, result);

      if (result.success && result.imageUrl) {
        // 查询到结果，保存图片
        console.log(
          `[页面恢复] 任务 ${taskId} 已完成，保存结果: ${result.imageUrl}`,
        );
        generatedImages.value = {
          ...generatedImages.value,
          [pageIndex]: result.imageUrl,
        };
        await flushSavePageData();
        toast.success(`页面 ${pageIndex + 1} 生成完成`);
        // 成功则清理待恢复任务
        pendingTasks.value.delete(pageIndex);
      } else {
        // 没有查询到结果，保留 taskId 以便手动重试
        console.log(`[页面恢复] 任务 ${taskId} 未完成，变为待恢复`);
      }
    } catch (error) {
      // 查询失败（如网络错误），保留 taskId 以便手动重试
      console.log(`[页面恢复] 查询任务 ${taskId} 失败:`, error);
    }

    // 查询结束，清除生成状态，变为可恢复
    generatingPageIndices.value.delete(pageIndex);
    generatingPageIndices.value = new Set(generatingPageIndices.value);
  }

  savePendingTasks();
};

/** 监听页面可见性变化 */
const handleVisibilityChange = () => {
  if (document.visibilityState === "visible") {
    console.log("[页面恢复] 页面变为可见，检查待处理任务...");
    retryPendingTasks();
  }
};

const generateImage = async (
  prompt: string,
  refImages: string[],
  pageIndex: number,
): Promise<boolean> => {
  const model = getRequiredModel();
  if (!model) return false;

  console.log(
    `[生图] 使用模型: ${model.model}, apiSource: ${model.apiSource}, baseUrl: ${model.baseUrl}`,
  );

  generatingPageIndices.value.add(pageIndex);
  generatingPageIndices.value = new Set(generatingPageIndices.value);

  const taskInfo: PendingTask = {
    pageIndex,
    prompt,
    refImages,
    startTime: Date.now(),
  };
  pendingTasks.value.set(pageIndex, taskInfo);
  savePendingTasks();

  const result = await imageGenerationService.generateWithModel(
    model,
    prompt,
    refImages,
    imageConfig.value.aspectRatio,
    imageConfig.value.resolution,
    imageConfig.value.quality || "",
    (progress, status) => {
      console.log(
        `页面 ${pageIndex + 1} 生成进度: ${progress}%, 状态: ${status}`,
      );
    },
    // taskId 创建时立即保存，防止息屏后丢失
    (taskId) => {
      console.log(`[生图] 任务已创建: ${taskId}`);
      const existingTask = pendingTasks.value.get(pageIndex);
      if (existingTask) {
        existingTask.taskId = taskId;
        savePendingTasks();
      }
    },
  );

  generatingPageIndices.value.delete(pageIndex);
  generatingPageIndices.value = new Set(generatingPageIndices.value);

  if (result.success && result.imageUrl) {
    // 任务完成，更新数据库状态并删除待处理任务
    if (projectId) {
      const updatedTask: GenerationTask = {
        id: `${projectId}-${pageIndex}`,
        projectId,
        pageIndex,
        prompt,
        refImages,
        taskId: pendingTasks.value.get(pageIndex)?.taskId,
        status: "done",
        resultImageUrl: result.imageUrl,
        createdAt: taskInfo.startTime,
        updatedAt: Date.now(),
      };
      await comicDb.saveGenerationTask(updatedTask);
    }
    pendingTasks.value.delete(pageIndex);
    savePendingTasks();
    generatedImages.value = {
      ...generatedImages.value,
      [pageIndex]: result.imageUrl,
    };
    await flushSavePageData();
    return true;
  }

  const pendingTask = pendingTasks.value.get(pageIndex);
  if (pendingTask?.taskId) {
    // 失败但已有 taskId，保留待处理任务以便页面恢复或手动重新查询
    // 不删除 pendingTasks，只结束 loading，状态会变为“可恢复”
    console.log(
      `[生图] 页面 ${pageIndex + 1} 生成失败但保留任务 ${pendingTask.taskId}: ${result.error}`,
    );
    toast.warning(result.error || "生成超时，已保留任务可重新查询");
    return false;
  }

  // 创建任务阶段就失败，清理记录
  pendingTasks.value.delete(pageIndex);
  savePendingTasks();
  toast.error(result.error || "生成失败");
  return false;
};

// ==================== 页面操作事件 ====================

const handleGeneratePage = async () => {
  if (!currentPage.value) return;
  if (!validateRefImageCount(currentPageIndex.value)) {
    toast.warning(`参考图总数不能超过${MAX_REF_IMAGES}张`);
    return;
  }

  const prompt = buildPagePrompt(currentPage.value);
  const refImages = collectAllRefImages(currentPageIndex.value);

  const success = await generateImage(
    prompt,
    refImages,
    currentPageIndex.value,
  );
  if (success) toast.success("页面生成成功");
};

/**
 * 重新查询可恢复任务（兜底操作）
 * 用于页面恢复时网络异常等情况下，用户手动触发再次查询未完成的 taskId
 */
const handleRecoverTask = async (pageIndex?: number) => {
  const targetIndex = pageIndex ?? currentPageIndex.value;
  const task = pendingTasks.value.get(targetIndex);
  const taskId = task?.taskId;
  if (!taskId) {
    toast.warning("该页面没有可恢复的任务");
    return;
  }

  const model = getRequiredModel();
  if (!model) return;

  recoveringIndex.value = targetIndex;
  toast.info(`正在重新查询页面 ${targetIndex + 1} 的任务...`);

  try {
    const result = await imageGenerationService.waitForTaskCompletion(
      model,
      taskId,
      (progress, status) => {
        console.log(
          `[重新查询] 任务 ${taskId} 进度: ${progress}%, 状态: ${status}`,
        );
      },
    );

    if (result.success && result.imageUrl) {
      generatedImages.value = {
        ...generatedImages.value,
        [targetIndex]: result.imageUrl,
      };
      await flushSavePageData();
      pendingTasks.value.delete(targetIndex);
      savePendingTasks();
      toast.success(`页面 ${targetIndex + 1} 生成完成`);
    } else {
      toast.error(result.error || "任务未完成，请稍后再试");
    }
  } catch (error) {
    console.error("[重新查询] 失败:", error);
    toast.error(error instanceof Error ? error.message : "查询失败");
  } finally {
    recoveringIndex.value = null;
  }
};

const handleSingleGenerate = async (
  promptText: string,
  refImageConfig: RefImageConfig,
) => {
  if (!currentPage.value) return;
  if (!promptText?.trim()) {
    toast.warning("请先输入提示词");
    return;
  }

  const refImages = collectRefImagesByConfig(
    currentPageIndex.value,
    refImageConfig,
  );
  const success = await generateImage(
    promptText.trim(),
    refImages,
    currentPageIndex.value,
  );
  if (success) toast.success("页面生成成功");
};

const handlePreviewLine = () => {
  console.log("预览线稿", currentPageIndex.value);
};

const handleDeletePage = () => {
  if (!comicData.value || pages.value.length <= 1) return;
  const idx = currentPageIndex.value;
  comicData.value.pages.splice(idx, 1);
  // 删除后需要将后续页的图片索引前移，保持索引与页面一致
  const newImages: Record<number, string> = {};
  for (const [key, val] of Object.entries(generatedImages.value)) {
    const numKey = Number(key);
    if (numKey === idx) continue;
    const newKey = numKey > idx ? numKey - 1 : numKey;
    if (val) newImages[newKey] = val;
  }
  generatedImages.value = newImages;
  // 删除后需要将后续页的模型覆盖前移
  const newOverrides: Record<number, string> = {};
  for (const [key, val] of Object.entries(pageModelOverrides.value)) {
    const numKey = Number(key);
    if (numKey === idx) continue;
    const newKey = numKey > idx ? numKey - 1 : numKey;
    if (val) newOverrides[newKey] = val;
  }
  pageModelOverrides.value = newOverrides;
  // 删除后需要将后续页的参考图前移
  const newRefImages: Record<
    number,
    { character: string[]; scene: string[]; prop: string[] }
  > = {};
  for (const [key, val] of Object.entries(pageRefImages.value)) {
    const numKey = Number(key);
    if (numKey === idx) continue;
    const newKey = numKey > idx ? numKey - 1 : numKey;
    newRefImages[newKey] = val;
  }
  pageRefImages.value = newRefImages;
  if (currentPageIndex.value >= pages.value.length) {
    currentPageIndex.value = pages.value.length - 1;
  }
  flushSavePageData();
};

const handleDuplicatePage = () => {
  if (!comicData.value || !currentPage.value) return;
  const idx = currentPageIndex.value;
  const cloned = JSON.parse(JSON.stringify(currentPage.value));
  comicData.value.pages.splice(idx + 1, 0, cloned);
  // 复制后需要将后续页的图片索引后移
  const newImages: Record<number, string> = {};
  for (const [key, val] of Object.entries(generatedImages.value)) {
    const numKey = Number(key);
    const newKey = numKey > idx ? numKey + 1 : numKey;
    if (val) newImages[newKey] = val;
  }
  generatedImages.value = newImages;
  // 复制后需要将后续页的模型覆盖后移
  const newOverrides: Record<number, string> = {};
  for (const [key, val] of Object.entries(pageModelOverrides.value)) {
    const numKey = Number(key);
    const newKey = numKey > idx ? numKey + 1 : numKey;
    if (val) newOverrides[newKey] = val;
  }
  pageModelOverrides.value = newOverrides;
  // 复制后需要将后续页的参考图后移
  const newRefImages: Record<
    number,
    { character: string[]; scene: string[]; prop: string[] }
  > = {};
  for (const [key, val] of Object.entries(pageRefImages.value)) {
    const numKey = Number(key);
    const newKey = numKey > idx ? numKey + 1 : numKey;
    newRefImages[newKey] = val;
  }
  pageRefImages.value = newRefImages;
  currentPageIndex.value++;
  flushSavePageData();
};

/** 单页模型切换 */
const handlePageModelChange = (modelId: string) => {
  if (modelId) {
    pageModelOverrides.value[currentPageIndex.value] = modelId;
  } else {
    delete pageModelOverrides.value[currentPageIndex.value];
  }
  // 触发响应式更新
  pageModelOverrides.value = { ...pageModelOverrides.value };
  savePageData();
};

/** 更新页面参考图 */
const handleUpdatePageRefImages = (value: {
  character: string[];
  scene: string[];
  prop: string[];
}) => {
  pageRefImages.value[currentPageIndex.value] = value;
  // 触发响应式更新
  pageRefImages.value = { ...pageRefImages.value };
  savePageData();
};

const handleUpdatePage = (data: Record<string, unknown>) => {
  if (!comicData.value) return;
  comicData.value.pages[currentPageIndex.value] = data as unknown as ComicPage;
  flushSavePageData();
};

const handleBatchGenerate = async () => {
  if (!comicData.value) return;

  const model = getRequiredModel();
  if (!model) return;

  const pendingPages = pages.value
    .map((page, index) => ({ page, index }))
    .filter(
      ({ index }) =>
        !generatedImages.value[index] &&
        !generatingPageIndices.value.has(index),
    );

  if (pendingPages.length === 0) {
    toast.warning("没有需要生成的页面");
    return;
  }

  for (const { index } of pendingPages) {
    if (!validateRefImageCount(index)) {
      toast.warning(
        `第${index + 1}页的参考图总数超过${MAX_REF_IMAGES}张，请调整`,
      );
      return;
    }
  }

  toast.info(`开始批量生成 ${pendingPages.length} 个页面...`);
  isBatchGenerating.value = true;

  try {
    const isOpenAI = model.apiSource === "openai";
    const taskFactories = pendingPages.map(({ page, index }) => {
      return async () => {
        const prompt = buildPagePrompt(page);
        const refImages = collectAllRefImages(index);
        return generateImage(prompt, refImages, index);
      };
    });

    if (isOpenAI) {
      // OpenAI 同步接口：并发队列，最多 15 个同时请求
      const { execute } = useConcurrentQueue(15);
      await execute(taskFactories, (done, total) => {
        console.log(`[批量生成] 进度: ${done}/${total}`);
      });
    } else {
      // 其他类型（轮询接口）：全部并行
      await Promise.all(taskFactories.map((fn) => fn()));
    }

    await flushSavePageData();
    toast.success("批量生成完成");
  } catch (error) {
    toast.error("批量生成失败");
    console.error("批量生成错误:", error);
  } finally {
    isBatchGenerating.value = false;
  }
};

const goToProject = () => {
  router.push("/comic/projects");
};
const goBack = () => {
  router.push(projectId ? `/comic/project-assets/${projectId}` : "/");
};
const goToExport = () => {
  if (projectId) {
    router.push(`/comic/page-export/${projectId}`);
  }
};
const goToSync = () => {
  if (projectId) {
    router.push(`/comic/page-sync/${projectId}`);
  }
};

/**
 * 将绘图配置持久化到当前项目
 * @param config - 要保存的配置
 * @returns 是否写入成功
 */
const persistImageGenConfig = async (config: ImageGenConfig): Promise<boolean> => {
  if (!projectId) {
    toast.error("缺少项目 ID，无法保存绘图配置");
    return false;
  }
  const normalized = migrateLegacyImageGenConfig(config);
  const plainConfig = JSON.parse(JSON.stringify(normalized)) as ImageGenConfig;
  imageConfig.value = plainConfig;

  try {
    const project = await comicDb.getProject(projectId);
    if (!project) {
      toast.error("项目不存在，无法保存绘图配置");
      return false;
    }
    await comicDb.saveProject({
      ...project,
      imageGenConfig: plainConfig,
      updatedAt: Date.now(),
    });
    // 回读校验，确保真正落库
    const saved = await comicDb.getProject(projectId);
    if (!saved?.imageGenConfig) {
      toast.error("绘图配置写入失败，请重试");
      return false;
    }
    return true;
  } catch (e) {
    console.error("保存绘图配置失败:", e);
    toast.error("绘图配置保存失败（可能是本地图片过大）");
    return false;
  }
};

const loadProjectImageConfig = async () => {
  if (!projectId) return;
  try {
    const project = await comicDb.getProject(projectId);
    const migrated = migrateLegacyImageGenConfig(project?.imageGenConfig);
    // 深拷贝到内存，避免后续改动影响已读对象引用
    imageConfig.value = JSON.parse(JSON.stringify(migrated));
    // 旧数据迁移 / 首次默认配置：写回项目，保证刷新可读取
    const needWriteBack =
      !project?.imageGenConfig ||
      !project.imageGenConfig.sharedBlocks?.length ||
      JSON.stringify(project.imageGenConfig) !==
        JSON.stringify(imageConfig.value);
    if (needWriteBack && project) {
      await comicDb.saveProject({
        ...project,
        imageGenConfig: imageConfig.value,
        updatedAt: Date.now(),
      });
    }
  } catch (e) {
    console.error("加载绘图配置失败:", e);
    imageConfig.value = migrateLegacyImageGenConfig(null);
  }
};

const handleSaveConfig = async (config: ImageGenConfig) => {
  const ok = await persistImageGenConfig(config);
  if (!ok) return;
  toast.success("绘图配置已保存到项目");
  // 共用参考图数量变化后，刷新每页人物/服装参考图编号（"图N"）
  await reprocessPageRefNumbers();
};

/**
 * 重新按 "原始页面数据 + 当前资产 + 当前共用参考图" 处理页面，
 * 重新计算每页人物特征下的 "人物参考图" / "服装参考图" 编号
 */
const reprocessPageRefNumbers = async () => {
  // 加载该项目的全部人物资产
  const assets = await comicDb.getProjectAssetsByProjectId(projectId);
  const characters = assets.filter((a) => a.type === "character");
  const sharedImages = getSharedRefImages(imageConfig.value.sharedBlocks);
  const { pageData, pageRefImages: newPageRefImages } = processPageData(
    projectId,
    characters,
    sharedImages,
    // insertCharacterDescription / insertOutfitDescription 已迁移为按人物控制
    // （ProjectAsset 对应字段），由 processPageData 在匹配阶段按 matchedAsset 自身字段判断
  );
  if (!pageData) return;

  // 同步本地 comicData
  if (comicData.value) {
    comicData.value.pages = pageData.pages;
    comicData.value = { ...comicData.value };
  }

  // 同步 pageRefImages
  if (newPageRefImages && Object.keys(newPageRefImages).length > 0) {
    pageRefImages.value = newPageRefImages;
  }

  // 写回 DB（同时保留 imageGenConfig，避免局部更新后配置被覆盖丢失）
  const project = await comicDb.getProject(projectId);
  if (project) {
    await comicDb.saveProject({
      ...project,
      pageData: pageData as any,
      pageRefImages: pageRefImages.value,
      imageGenConfig: JSON.parse(JSON.stringify(imageConfig.value)),
      updatedAt: Date.now(),
    });
  }
};

const loadProject = async () => {
  if (!projectId) return;
  const project = await comicDb.getProject(projectId);
  if (project) {
    projectName.value = project.name;
  }
};

const loadModels = async () => {
  models.value = await comicDb.getAllModelConfigs();
};

onMounted(async () => {
  await loadProject();
  await loadModels();
  await loadProjectImageConfig();
  await loadPageData();

  // 加载待处理任务并检查是否有未完成的生成
  loadPendingTasks();
  if (pendingTasks.value.size > 0) {
    const totalPages = pages.value.length;
    // 验证待处理任务是否在当前页面范围内
    const invalidTasks: number[] = [];
    for (const [pageIndex] of pendingTasks.value.entries()) {
      if (pageIndex >= totalPages) {
        console.log(`[初始化] 任务页面 ${pageIndex} 超出范围，移除`);
        invalidTasks.push(pageIndex);
      }
    }
    // 移除无效任务
    for (const pageIndex of invalidTasks) {
      pendingTasks.value.delete(pageIndex);
    }
    if (invalidTasks.length > 0) {
      savePendingTasks();
    }

    if (pendingTasks.value.size > 0) {
      console.log(
        `[初始化] 发现 ${pendingTasks.value.size} 个未完成的生成任务`,
      );
      // 将未完成的任务页面标记为生成中
      for (const task of pendingTasks.value.values()) {
        generatingPageIndices.value.add(task.pageIndex);
      }
      generatingPageIndices.value = new Set(generatingPageIndices.value);

      // 刷新页面时，调用查询逻辑获取结果
      retryPendingTasks();
    }
  }

  // 监听页面可见性变化
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onUnmounted(() => {
  // 清理监听器
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});
</script>
