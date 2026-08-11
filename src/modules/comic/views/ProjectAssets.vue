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
      <ProjectAssetsToolbar
        :project-name="projectName"
        :style-templates="styleTemplates"
        :models="models"
        v-model:style-id="selectedStyleId"
        v-model:image-model-id="selectedImageModelId"
        v-model:aspect-ratio="selectedAspectRatio"
        v-model:resolution="selectedResolution"
        @back="router.push('/comic/projects')"
        @style-change="handleStyleChange"
      />

      <!-- 主体内容：左侧人物列表 + 中间参考图编辑 + 右侧服装列表 -->
      <div class="flex-1 flex overflow-hidden gap-3 p-3">
        <ProjectAssetSidebar
          :assets="assets"
          :selected-asset-id="selectedAsset?.id"
          @select="selectAsset"
          @delete="handleDeleteAsset"
        />

        <CharacterReferenceEditor
          :asset="selectedAsset"
          v-model:storage-mode="storageMode"
          :uploading="uploadingImage"
          :syncing="syncingImage"
          :image-in-library="charImageFromLibrary"
          :default-reference-description="DEFAULT_CHAR_REF_DESC"
          @upload="triggerUpload"
          @select-material="openMaterialLibrary('character')"
          @sync-material="syncToMaterial"
          @remove-image="removeRefImage"
          @preview="openImagePreview"
          @description-input="handleAssetDescInput"
          @reference-description-input="handleCharRefDescInput"
          @toggle-insert-description="toggleInsertCharacterDescription"
        />

        <OutfitEditor
          :asset="selectedAsset"
          :uploading-outfit-id="uploadingOutfitId"
          :syncing="syncingImage"
          :default-reference-description="DEFAULT_OUTFIT_REF_DESC"
          @delete="handleDeleteOutfit"
          @upload="triggerOutfitUpload"
          @select-material="openOutfitMaterial"
          @sync-material="syncOutfitToMaterial"
          @remove-image="removeOutfitImage"
          @name-input="handleOutfitNameInput"
          @description-input="handleOutfitDescInput"
          @reference-description-input="handleOutfitRefDescInput"
          @preview="openImagePreview"
          @save="saveOutfits"
          @toggle-insert-description="toggleInsertOutfitDescription"
        />
      </div>

      <!-- 底部操作栏 -->
      <div
        class="shrink-0 px-6 py-3 border-t border-border-subtle flex items-center justify-between"
      >
        <button
          class="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
          @click="router.push(`/comic/project-editor/${projectId}`)"
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
        <button
          class="px-5 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isNavigating"
          @click="goToGenerate"
        >
          <svg
            v-if="isNavigating"
            class="w-4 h-4 animate-spin"
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
          {{ isNavigating ? "处理中..." : "下一步：页面生成" }}
          <svg
            v-if="!isNavigating"
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
    </main>

    <!-- 隐藏文件输入（人物） -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileUpload"
    />

    <!-- 隐藏文件输入（服装） -->
    <input
      ref="outfitFileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleOutfitFileUpload"
    />

    <ImagePreviewModal
      v-model="showImagePreview"
      :images="previewImages"
      :image-index="previewImageIndex"
      :alt="previewImageAlt"
    />

    <MaterialLibrary
      ref="materialLibraryRef"
      v-model="showMaterialLibrary"
      :project-id="projectId"
      select-label="设为参考图"
      @select="handleSelectFromMaterial"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { comicDb } from "@/api/comic";
import { processPageData } from "@comic/composables/usePageDataProcessor";
import { useProjectAssetMedia } from "@comic/composables/useProjectAssetMedia";
import { getSharedRefImagesFromConfig } from "@comic/utils/sharedBlocks";
import type {
  ProjectAsset,
  ModelConfig,
  PromptTemplate,
} from "@comic/types";
import ImagePreviewModal from "@comic/components/ImagePreviewModal.vue";
import MaterialLibrary from "@comic/components/MaterialLibrary.vue";
import ProjectAssetsToolbar from "@comic/components/ProjectAssetsToolbar.vue";
import ProjectAssetSidebar from "@comic/components/ProjectAssetSidebar.vue";
import CharacterReferenceEditor from "@comic/components/CharacterReferenceEditor.vue";
import OutfitEditor from "@comic/components/OutfitEditor.vue";

const route = useRoute();
const router = useRouter();
const projectId = route.params.projectId as string;

const projectName = ref("");
const assets = ref<ProjectAsset[]>([]);
const models = ref<ModelConfig[]>([]);
const selectedAsset = ref<ProjectAsset | null>(null);

const styleTemplates = ref<PromptTemplate[]>([]);
const selectedStyleId = ref("");
const selectedImageModelId = ref("");
const selectedAspectRatio = ref("");
const selectedResolution = ref("");

const isNavigating = ref(false);

const {
  fileInputRef,
  outfitFileInputRef,
  uploadingImage,
  uploadingOutfitId,
  syncingImage,
  storageMode,
  showMaterialLibrary,
  materialLibraryRef,
  charImageFromLibrary,
  showImagePreview,
  previewImages,
  previewImageIndex,
  previewImageAlt,
  saveOutfits,
  refreshCharImageFromLibrary,
  refreshOutfitsLibraryStatus,
  handleAssetDescInput,
  handleCharRefDescInput,
  handleOutfitNameInput,
  handleOutfitDescInput,
  handleOutfitRefDescInput,
  toggleInsertCharacterDescription,
  toggleInsertOutfitDescription,
  triggerUpload,
  handleFileUpload,
  removeRefImage,
  openMaterialLibrary,
  handleSelectFromMaterial,
  syncToMaterial,
  triggerOutfitUpload,
  handleOutfitFileUpload,
  openOutfitMaterial,
  removeOutfitImage,
  handleDeleteOutfit,
  handleDeleteAsset,
  syncOutfitToMaterial,
  openImagePreview,
} = useProjectAssetMedia(projectId, assets, selectedAsset);

const loadProject = async () => {
  const project = await comicDb.getProject(projectId);
  if (project) {
    projectName.value = project.name;
    // "插入人物描述"和"插入服装描述"开关均已迁移为按人物控制，
    // 存到 ProjectAsset.insertCharacterDescription / insertOutfitDescription
  }
};

/** 默认的人物参考图描述（输入框为空时显示在输入框中） */
const DEFAULT_CHAR_REF_DESC = "参考图中人物形象，保持人物角色一致性";

/** 默认的服装参考图描述（输入框为空时显示在输入框中） */
const DEFAULT_OUTFIT_REF_DESC = "参考图中衣服设计，人物穿戴保持一致";

const loadAssets = async () => {
  const list = await comicDb.getProjectAssetsByProjectId(projectId);
  // 仅展示人物类型
  const characters = list
    .filter((a) => a.type === "character")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  // 确保 outfits 字段存在；为空的描述填充默认值（让输入框一开始就有内容）并写回 DB
  for (const c of characters) {
    if (!c.outfits) c.outfits = [];
    if (!c.referenceImageDescs) c.referenceImageDescs = [""];
    let needsUpdate = false;
    if (!c.referenceImageDescs[0]) {
      c.referenceImageDescs[0] = DEFAULT_CHAR_REF_DESC;
      needsUpdate = true;
    }
    for (const o of c.outfits) {
      if (!o.referenceImageDesc) {
        o.referenceImageDesc = DEFAULT_OUTFIT_REF_DESC;
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      await comicDb.saveProjectAsset({ ...c, updatedAt: Date.now() });
    }
  }
  assets.value = characters;
};

const loadModels = async () => {
  models.value = await comicDb.getAllModelConfigs();
};

const loadStyleTemplates = async () => {
  const all = await comicDb.getAllPromptTemplates();
  styleTemplates.value = all.filter((t) => t.type === "style");
  const project = await comicDb.getProject(projectId);
  if (project?.comicConfig?.paintingStyle) {
    const matched = styleTemplates.value.find(
      (t) => t.content === project.comicConfig!.paintingStyle,
    );
    selectedStyleId.value = matched?.id ?? "";
  }
};

const handleStyleChange = async () => {
  const template = styleTemplates.value.find(
    (t) => t.id === selectedStyleId.value,
  );
  const project = await comicDb.getProject(projectId);
  if (!project) return;
  const existing = project.comicConfig;
  const comicConfig = {
    premise: existing?.premise ?? "",
    paintingStyle: template?.content ?? "",
    worldSetting: existing?.worldSetting ?? "",
    basicFormat: existing?.basicFormat ?? "",
  };
  await comicDb.saveProject({ ...project, comicConfig, updatedAt: Date.now() });
};

const selectAsset = async (asset: ProjectAsset) => {
  selectedAsset.value = asset;
  if (!asset.referenceImageDescs) asset.referenceImageDescs = [""];
  if (!asset.outfits) asset.outfits = [];
  await refreshCharImageFromLibrary();
  // 检查每个 outfit 的 syncedToLibrary
  await refreshOutfitsLibraryStatus();
};


// ============ 页面生成时的数据处理 ============

/**
 * 处理页面数据：按人名匹配每个 人物特征，注入人物描述、替换服装描述、追加参考图字段
 * 始终从 "原始数据"（独立 key 保存，从未修改）拷贝一份再处理。
 * 实际逻辑已抽到 composables/usePageDataProcessor.ts，便于在 PageEditor 中复用。
 */
const WORKING_PAGE_DATA_KEY = `page-editor-data-${projectId}`;

const processPagesWithCharacterMatch = async () => {
  const project = await comicDb.getProject(projectId);
  // 共用参考图（风格/字体等）决定页内人物参考图编号偏移
  const sharedImages: string[] = getSharedRefImagesFromConfig(
    project?.imageGenConfig,
  );
  // insertCharacterDescription / insertOutfitDescription 均已迁移为按人物控制
  // （ProjectAsset.insertCharacterDescription / insertOutfitDescription），
  // 由 processPageData 在匹配阶段按 matchedAsset 自身字段判断
  const { pageRefImages } = processPageData(
    projectId,
    assets.value,
    sharedImages,
  );
  return pageRefImages;
};

const goToGenerate = async () => {
  isNavigating.value = true;
  try {
    const pageRefImages = await processPagesWithCharacterMatch();
    const stored = sessionStorage.getItem(WORKING_PAGE_DATA_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const pageData = JSON.parse(JSON.stringify(parsed));
        const p = await comicDb.getProject(projectId);
        if (p) {
          await comicDb.saveProject({
            ...p,
            pageData,
            pageRefImages: pageRefImages || undefined,
            updatedAt: Date.now(),
          });
        }
      } catch {
        // 忽略解析失败
      }
    }
    router.push(`/comic/page-editor/${projectId}`);
  } finally {
    isNavigating.value = false;
  }
};

onMounted(async () => {
  await loadProject();
  await loadAssets();
  loadModels();
  loadStyleTemplates();

  if (assets.value.length > 0) await selectAsset(assets.value[0]);
});
</script>
