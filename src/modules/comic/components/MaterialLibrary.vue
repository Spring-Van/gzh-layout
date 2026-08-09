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

    <!-- 抽屉（从左往右滑入） -->
    <Transition name="slide-left">
      <div
        v-if="modelValue"
        class="fixed left-0 top-0 bottom-0 z-[101] w-[420px] flex flex-col overflow-hidden p-4"
      >
        <div
          class="relative flex-1 flex flex-col overflow-hidden rounded-xl bg-surface dark:bg-slate-800 border border-border-subtle shadow-2xl shadow-black/40"
        >
          <!-- 头部 -->
          <div
            class="shrink-0 px-6 py-4 border-b border-border-subtle flex items-center justify-between"
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h2 class="text-base font-semibold text-text-primary">素材库</h2>
              <span class="text-xs text-text-secondary">{{ materials.length }} 个</span>
            </div>
            <button
              class="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
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

          <!-- 上传区（存储方式 + 上传） -->
          <div class="shrink-0 px-6 py-3 border-b border-border-subtle space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-text-secondary">存储方式</span>
              <div
                class="flex items-center rounded-lg bg-surface p-[2px] border border-border-subtle"
              >
                <button
                  class="px-2 py-0.5 rounded text-[10px] transition-[color,background-color,border-color,box-shadow]"
                  :class="
                    materialStorageMode === 'cloud'
                      ? 'bg-elevated text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  "
                  @click="materialStorageMode = 'cloud'"
                >
                  云端
                </button>
                <button
                  class="px-2 py-0.5 rounded text-[10px] transition-[color,background-color,border-color,box-shadow]"
                  :class="
                    materialStorageMode === 'local'
                      ? 'bg-elevated text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  "
                  @click="materialStorageMode = 'local'"
                >
                  本地
                </button>
              </div>
            </div>
            <button
              class="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border-default text-xs text-text-secondary hover:text-text-primary hover:border-cyan-500/30 transition-colors"
              :class="{ 'opacity-50 pointer-events-none': uploading }"
              @click="triggerUpload"
            >
              <svg
                v-if="!uploading"
                class="w-3.5 h-3.5"
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
                class="w-3.5 h-3.5 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {{
                uploading
                  ? "上传中"
                  : materialStorageMode === "local"
                    ? "本地上传素材"
                    : "上传到云端"
              }}
            </button>
            <button
              class="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-colors"
              @click="openImportPanel"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4 4l-4-4m0 0L8 20m4-4V4"
                />
              </svg>
              从生图工作台导入
            </button>
          </div>

          <!-- 项目筛选器 -->
          <div v-if="showProjectFilter" class="shrink-0 px-6 py-2 border-b border-border-subtle">
            <select
              :value="selectedProjectId"
              class="w-full bg-elevated border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-cyan-500/30"
              @change="handleProjectChange"
            >
              <option value="all" class="bg-surface">全部项目</option>
              <option
                v-for="project in projects"
                :key="project.id"
                :value="project.id"
                class="bg-surface"
              >
                {{ project.name }}
              </option>
            </select>
          </div>

          <!-- 分类筛选器：全部 / 角色 / 服装 -->
          <div class="shrink-0 px-6 py-2 border-b border-border-subtle">
            <div class="flex items-center rounded-lg bg-surface p-[2px] border border-border-subtle">
              <button
                v-for="cat in categories"
                :key="cat.key"
                class="flex-1 px-3 py-1.5 rounded text-[11px] transition-[color,background-color,border-color,box-shadow]"
                :class="
                  activeCategory === cat.key
                    ? 'bg-elevated text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                "
                @click="activeCategory = cat.key"
              >
                {{ cat.label }}
              </button>
            </div>
          </div>

          <!-- 素材网格 -->
          <div class="flex-1 overflow-auto p-4">
            <div
              v-if="materials.length > 0"
              class="grid grid-cols-3 gap-2"
            >
              <div
                v-for="mat in materials"
                :key="mat.id"
                class="relative aspect-square rounded-lg border border-border-subtle overflow-hidden group cursor-pointer hover:border-cyan-500/40 transition-colors"
                @click="handleSelect(mat)"
              >
                <img
                  :src="mat.url"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <!-- hover遮罩 -->
                <div
                  class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity"
                >
                  <button
                    class="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-elevated hover:bg-cyan-500/50 flex items-center justify-center transition-opacity"
                    :title="selectLabel"
                    @click.stop="handleSelect(mat)"
                  >
                    <svg
                      class="w-3.5 h-3.5 text-text-primary"
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
                  </button>
                  <button
                    class="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-red-500/30 hover:bg-red-500/50 flex items-center justify-center transition-opacity"
                    title="删除"
                    @click.stop="handleDelete(mat)"
                  >
                    <svg
                      class="w-3.5 h-3.5 text-text-primary"
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
                <!-- 类型标签 -->
                <span
                  class="absolute bottom-0.5 right-0.5 text-[8px] px-1 rounded bg-black/60 text-text-secondary pointer-events-none"
                >
                  {{ typeLabelMap[mat.assetType] }}
                </span>
                <!-- 项目名称标签（跨项目时显示） -->
                <span
                  v-if="showProjectFilter && selectedProjectId === 'all'"
                  class="absolute bottom-0.5 left-0.5 text-[8px] px-1 rounded bg-black/60 text-text-secondary pointer-events-none max-w-[60%] truncate"
                >
                  {{ getProjectName(mat.projectId) }}
                </span>
              </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center py-16 text-text-muted">
              <svg
                class="w-10 h-10 mb-3 opacity-30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p class="text-xs">暂无素材，点击上传或同步资产图片</p>
            </div>
          </div>

          <!-- 底部提示 -->
          <div class="shrink-0 px-6 py-3 border-t border-border-subtle">
            <p class="text-[10px] text-text-secondary">
              点击素材可{{ selectLabel }}，也可在资产表单中同步图片到此
            </p>
          </div>

          <!-- 从生图工作台导入面板（覆盖层） -->
          <Transition name="slide-right">
            <div
              v-if="showImportPanel"
              class="absolute inset-0 z-10 flex flex-col bg-surface dark:bg-slate-800"
            >
              <!-- 头部 -->
              <div
                class="shrink-0 px-6 py-4 border-b border-border-subtle flex items-center gap-2"
              >
                <button
                  class="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
                  @click="showImportPanel = false"
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
                </button>
                <h2 class="text-base font-semibold text-text-primary">从生图工作台导入</h2>
              </div>

              <!-- 副标题 -->
              <div class="shrink-0 px-6 pt-3">
                <p class="text-[10px] text-text-secondary">
                  从生图历史挑选图片，选择类型后同步到当前项目
                </p>
              </div>

              <!-- 画夹分类筛选 -->
              <div class="shrink-0 px-6 py-2 flex items-center gap-1.5 flex-wrap">
                <button
                  class="px-3 py-1 rounded-full text-[11px] transition-colors border"
                  :class="
                    galleryCategoryFilter === 'all'
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      : 'text-text-secondary hover:text-text-primary border-border-subtle'
                  "
                  @click="galleryCategoryFilter = 'all'"
                >
                  全部
                </button>
                <button
                  v-for="cat in imageStudioStore.categories"
                  :key="cat.id"
                  class="px-3 py-1 rounded-full text-[11px] transition-colors border"
                  :class="
                    galleryCategoryFilter === cat.id
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      : 'text-text-secondary hover:text-text-primary border-border-subtle'
                  "
                  @click="galleryCategoryFilter = cat.id"
                >
                  {{ cat.name }}
                </button>
              </div>

              <!-- 生图历史网格 -->
              <div class="flex-1 overflow-auto p-4">
                <div
                  v-if="filteredGalleryImages.length > 0"
                  class="grid grid-cols-3 gap-2"
                >
                  <div
                    v-for="img in filteredGalleryImages"
                    :key="img.id"
                    class="relative aspect-square rounded-lg border overflow-hidden cursor-pointer transition-colors"
                    :class="
                      isImageSelected(img.id)
                        ? 'border-cyan-500'
                        : 'border-border-subtle hover:border-cyan-500/40'
                    "
                    @click="toggleImageSelect(img.id)"
                  >
                    <img
                      :src="img.url"
                      class="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <!-- 选中勾 -->
                    <div
                      v-if="isImageSelected(img.id)"
                      class="absolute top-1 right-1 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center"
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
                          stroke-width="3"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <!-- prompt 标签 -->
                    <span
                      v-if="img.prompt"
                      class="absolute bottom-0.5 left-0.5 right-0.5 text-[8px] px-1 truncate bg-black/60 text-text-secondary pointer-events-none"
                    >{{ img.prompt }}</span>
                  </div>
                </div>

                <div
                  v-else
                  class="flex flex-col items-center justify-center py-16 text-text-muted"
                >
                  <svg
                    class="w-10 h-10 mb-3 opacity-30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p class="text-xs">生图工作台暂无图片</p>
                </div>
              </div>

              <!-- 底部：类型选择 + 导入按钮 -->
              <div class="shrink-0 px-6 py-3 border-t border-border-subtle space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-text-secondary">导入为类型</span>
                  <div
                    class="flex items-center rounded-lg bg-surface p-[2px] border border-border-subtle"
                  >
                    <button
                      v-for="opt in assetTypeOptions"
                      :key="opt.key"
                      class="px-2 py-0.5 rounded text-[10px] transition-[color,background-color,border-color,box-shadow]"
                      :class="
                        importAssetType === opt.key
                          ? 'bg-elevated text-text-primary shadow-sm'
                          : 'text-text-secondary hover:text-text-primary'
                      "
                      @click="importAssetType = opt.key"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>
                <button
                  class="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-colors"
                  :class="
                    selectedImageIds.length === 0
                      ? 'bg-elevated text-text-muted cursor-not-allowed'
                      : 'bg-cyan-500 text-white hover:bg-cyan-600'
                  "
                  :disabled="selectedImageIds.length === 0"
                  @click="confirmImport"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4 4l-4-4m0 0L8 20m4-4V4"
                    />
                  </svg>
                  导入选中 ({{ selectedImageIds.length }})
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>

    <!-- 隐藏文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileUpload"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { v4 as uuidv4 } from "uuid";
import { comicDb } from "@/api/comic";
import {
  processImage,
  type ImageStorageMode,
} from "@comic/services/uploadService";
import { useToast } from "@comic/composables/useToast";
import { useImageStudioStore } from "@/stores/imageStudio";
import type { MaterialItem, AssetType, ComicProject } from "@comic/types";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    projectId: string;
    /** 选中素材时的按钮提示文字 */
    selectLabel?: string;
    /** 是否显示项目筛选器（支持跨项目选择） */
    showProjectFilter?: boolean;
  }>(),
  {
    showProjectFilter: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "select", url: string): void;
  (e: "materials-changed"): void;
}>();

const toast = useToast();

const uploading = ref(false);
const materials = ref<MaterialItem[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const projects = ref<ComicProject[]>([]);
const selectedProjectId = ref<string>("all");

/** 素材库存储方式：cloud=云端，local=本地 base64，默认 local */
const materialStorageMode = ref<ImageStorageMode>("local");

/** 当前分类筛选：all=全部, character=角色, outfit=服装 */
const activeCategory = ref<"all" | "character" | "outfit">("all");
const categories: { key: "all" | "character" | "outfit"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "character", label: "角色" },
  { key: "outfit", label: "服装" },
];

const selectLabel = computed(() => props.selectLabel ?? "添加到参考图");

const typeLabelMap: Record<AssetType, string> = {
  character: "人物",
  scene: "场景",
  prop: "物品",
  outfit: "服装",
};

const getProjectName = (projectId: string) => {
  const project = projects.value.find((p) => p.id === projectId);
  return project?.name || "未知项目";
};

const loadProjects = async () => {
  if (!props.showProjectFilter) return;
  const list = await comicDb.getAllProjects();
  projects.value = list.sort((a, b) => b.createdAt - a.createdAt);
};

const loadMaterials = async () => {
  let list: MaterialItem[] = [];
  if (props.showProjectFilter && selectedProjectId.value === "all") {
    const all = await comicDb.getAllMaterials();
    list = all.sort((a, b) => b.createdAt - a.createdAt);
  } else {
    const targetProjectId =
      props.showProjectFilter && selectedProjectId.value !== "all"
        ? selectedProjectId.value
        : props.projectId;
    const all = await comicDb.getMaterialsByProjectId(targetProjectId);
    list = all.sort((a, b) => b.createdAt - a.createdAt);
  }
  // 应用分类筛选
  if (activeCategory.value !== "all") {
    list = list.filter((m) => m.assetType === activeCategory.value);
  }
  materials.value = list;
};

const syncMaterial = async (
  url: string,
  name: string,
  assetType: AssetType,
  sourceAssetId?: string,
  sourceOutfitId?: string,
): Promise<boolean> => {
  const exists = materials.value.find((m) => m.url === url);
  if (exists) return false;

  const item: MaterialItem = {
    id: uuidv4(),
    projectId: props.projectId,
    url,
    name,
    assetType,
    sourceAssetId,
    sourceOutfitId,
    createdAt: Date.now(),
  };
  await comicDb.saveMaterial(item);
  // 仅在当前分类下显示
  if (activeCategory.value === "all" || item.assetType === activeCategory.value) {
    materials.value.unshift(item);
  }
  emit("materials-changed");
  return true;
};

// ===== 从生图工作台导入 =====
const imageStudioStore = useImageStudioStore();

/** 是否显示导入面板 */
const showImportPanel = ref(false);
/** 选中的生图历史图片 id */
const selectedImageIds = ref<string[]>([]);
/** 导入到素材库的目标类型 */
const importAssetType = ref<AssetType>("character");
/** 画夹分类筛选：all=全部，其余为 categoryId */
const galleryCategoryFilter = ref<string>("all");

/** 素材类型可选项 */
const assetTypeOptions: { key: AssetType; label: string }[] = [
  { key: "character", label: "角色" },
  { key: "scene", label: "场景" },
  { key: "prop", label: "物品" },
  { key: "outfit", label: "服装" },
];

/** 按画夹分类过滤后的生图历史（按时间倒序） */
const filteredGalleryImages = computed(() => {
  const list = [...imageStudioStore.history].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  if (galleryCategoryFilter.value === "all") return list;
  return list.filter((img) => img.categoryIds.includes(galleryCategoryFilter.value));
});

/** 打开导入面板，重置选中与默认类型 */
const openImportPanel = () => {
  selectedImageIds.value = [];
  // 默认类型推断：当前选中"服装"则 outfit，否则 character
  importAssetType.value = activeCategory.value === "outfit" ? "outfit" : "character";
  galleryCategoryFilter.value = "all";
  showImportPanel.value = true;
};

/** 切换某张生图历史图片的选中态 */
const toggleImageSelect = (id: string) => {
  if (selectedImageIds.value.includes(id)) {
    selectedImageIds.value = selectedImageIds.value.filter((x) => x !== id);
  } else {
    selectedImageIds.value = [...selectedImageIds.value, id];
  }
};

/** 判断某张图片是否被选中 */
const isImageSelected = (id: string) => selectedImageIds.value.includes(id);

/** 确认导入：遍历选中图片写入素材库 */
const confirmImport = async () => {
  if (selectedImageIds.value.length === 0) return;
  const images = imageStudioStore.history.filter((img) =>
    selectedImageIds.value.includes(img.id),
  );
  let imported = 0;
  let skipped = 0;
  for (const img of images) {
    const name = img.prompt ? img.prompt.slice(0, 20) : "生图导入";
    const ok = await syncMaterial(img.url, name, importAssetType.value);
    if (ok) imported++;
    else skipped++;
  }
  showImportPanel.value = false;
  if (imported > 0) {
    toast.success(
      `已导入 ${imported} 张${skipped > 0 ? `，跳过 ${skipped} 张已存在` : ""}`,
    );
  } else {
    toast.warning("所选图片均已存在于素材库");
  }
};

const triggerUpload = () => {
  fileInputRef.value?.click();
};

const handleFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  target.value = "";

  uploading.value = true;
  try {
    const result = await processImage(file, materialStorageMode.value);
    if (result.success && result.url) {
      const item: MaterialItem = {
        id: uuidv4(),
        projectId: props.projectId,
        url: result.url,
        name: file.name.replace(/\.[^.]+$/, ""),
        // 默认归类：当前选中"角色"则 character，选中"服装"则 outfit，否则 character
        assetType: activeCategory.value === "outfit" ? "outfit" : "character",
        createdAt: Date.now(),
      };
      await comicDb.saveMaterial(item);
      if (
        activeCategory.value === "all" ||
        item.assetType === activeCategory.value
      ) {
        materials.value.unshift(item);
      }
      emit("materials-changed");
      const tip =
        materialStorageMode.value === "local" ? "已本地存储" : "已上传到云端";
      toast.success(`${tip}：${item.name}`);
    } else {
      toast.error(result.error || "上传失败");
    }
  } catch {
    toast.error("上传失败");
  } finally {
    uploading.value = false;
  }
};

const handleSelect = (mat: MaterialItem) => {
  emit("select", mat.url);
};

const handleProjectChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  selectedProjectId.value = target.value;
  loadMaterials();
};

const handleDelete = async (mat: MaterialItem) => {
  await comicDb.deleteMaterial(mat.id);
  materials.value = materials.value.filter((m) => m.id !== mat.id);
  emit("materials-changed");
};

const close = () => {
  emit("update:modelValue", false);
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      loadProjects();
      loadMaterials();
    }
  },
);

/** 切换分类时重新过滤 */
watch(activeCategory, () => {
  loadMaterials();
});

onMounted(() => {
  loadProjects();
  loadMaterials();
});

defineExpose({ syncMaterial, loadMaterials });
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

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(20%);
  opacity: 0;
}
</style>
