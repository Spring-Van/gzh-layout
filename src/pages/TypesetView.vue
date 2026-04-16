<template>
  <section
    class="w-full h-full flex flex-col lg:flex-row overflow-hidden bg-background"
  >
    <!-- 左栏：文章队列 -->
    <ArticleQueue
      :articles="batchStore.articles"
      :current-article-index="batchStore.currentArticleIndex"
      :global-title-config="batchStore.globalConfig.title"
      @select-article="batchStore.selectArticle"
      @reconfigure="$router.push('/setup')"
    />

    <!-- 中栏：实时预览 -->
    <div
      class="flex-1 h-full flex flex-col items-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50"
    >
      <div class="w-full max-w-md mb-4 flex items-center justify-center gap-2">
        <div
          class="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200"
        >
          <button
            v-for="mode in previewModes"
            :key="mode.value"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
            :class="[
              batchStore.previewMode === mode.value
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            ]"
            @click="batchStore.setPreviewMode(mode.value as any)"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <PhoneMockup class="flex-1 overflow-hidden">
        <template v-if="batchStore.previewMode === 'cover'">
          <CoverPreview
            v-model:ratio="selectedCoverRatio"
            :template-id="currentArticle?.coverConfig.templateId"
            :generated-cover-image="displayGeneratedCoverImage"
            :images="currentArticle?.images || []"
            :selected-cover-index="selectedCoverIndex"
            :title="batchStore.currentArticleFinalTitle"
            :subtitle="currentArticle?.titleConfig.subtitle"
            :get-image-url="getImageUrl"
            @crop="openCoverCropTool"
          />
        </template>

        <template v-else>
          <ContentPreview
            :title="batchStore.currentArticleFinalTitle"
            :subtitle="currentArticle?.titleConfig.subtitle"
            :account-name="wechatOfficialAccountName"
            :template-id="currentTemplateId"
            :images="currentArticle?.images || []"
            :processed-html="processedTemplateHtml"
            :get-image-url="getImageUrl"
          />
        </template>
      </PhoneMockup>
    </div>

    <!-- 右栏：配置面板 -->
    <ConfigPanel
      :config-mode="batchStore.configMode"
      :config-tab="batchStore.configTab"
      :global-title-config="batchStore.globalConfig.title"
      :global-layout-config="batchStore.globalConfig.layout"
      :global-cover-template-id="batchStore.globalConfig.cover.templateId"
      :global-cover-template-name="globalCoverTemplateName"
      :global-generated-cover-image-src="globalGeneratedCoverImageSrc"
      :global-cover-image-indices="
        batchStore.globalConfig.cover.coverImageIndices
      "
      :global-cover-template-image-count="globalCoverTemplateImageCount"
      :current-article="currentArticle"
      :current-article-index="batchStore.currentArticleIndex"
      :current-article-cover-template-name="currentArticleCoverTemplateName"
      :current-article-generated-cover-image-src="
        currentArticleGeneratedCoverImageSrc
      "
      :current-article-cover-template-image-count="
        currentArticleCoverTemplateImageCount
      "
      :current-article-image-count="currentArticle?.images.length || 0"
      @update:config-mode="batchStore.setConfigMode"
      @update:config-tab="batchStore.setConfigTab"
      @update:global-title-config="batchStore.setGlobalTitleConfig"
      @update:global-layout-config="batchStore.setGlobalLayoutConfig"
      @update:article-title-config="batchStore.updateCurrentArticleTitleConfig"
      @update:article-layout-config="
        batchStore.updateCurrentArticleLayoutConfig
      "
      @toggle:inherit-cover="toggleInheritGlobalCover"
      @open-template-manager="showTemplateModal = true"
      @open-cover-template-manager="showCoverTemplateManager = true"
      @open-cover-template-selector="showCoverTemplateSelector = true"
      @open-article-cover-template-selector="
        showArticleCoverTemplateSelector = true
      "
      @open-index-selector="showCoverImageIndexSelector = true"
      @open-image-selector="showCoverImageSelector = true"
      @open-image-manager="showImageManagerDrawer = true"
      @crop="handleCropRequest"
      @back="$router.push('/setup')"
      @publish="$router.push('/sync')"
    />

    <!-- Modals and Drawers -->
    <ModalTemplate
      :visible="showTemplateModal"
      @close="showTemplateModal = false"
    />

    <ModalCoverTemplate
      :visible="showCoverTemplateManager"
      @close="showCoverTemplateManager = false"
    />

    <ImageManagerDrawer
      :visible="showImageManagerDrawer"
      :images="currentArticle?.images || []"
      @close="showImageManagerDrawer = false"
      @update:images="handleUpdateArticleImages"
    />

    <CoverImageSelectorDrawer
      :visible="showCoverImageSelector"
      :images="(currentArticle?.images as any) || []"
      :selected-image-ids="currentArticle?.coverConfig.selectedImageIds || []"
      :required-count="currentArticleCoverTemplateImageCount"
      :get-image-url="getImageUrl"
      @close="showCoverImageSelector = false"
      @update:selected-image-ids="handleUpdateCoverImageIds"
    />

    <CoverImageIndexSelectorDrawer
      :visible="showCoverImageIndexSelector"
      :initial-indices="batchStore.globalConfig.cover.coverImageIndices || []"
      :required-image-count="globalCoverTemplateImageCount"
      :total-image-count="currentArticle?.images?.length || 0"
      @close="showCoverImageIndexSelector = false"
      @confirm="handleConfirmCoverImageIndices"
    />

    <ModalCoverTemplateSelector
      :visible="showCoverTemplateSelector"
      :current-template-id="batchStore.globalConfig.cover.templateId"
      @close="showCoverTemplateSelector = false"
      @select="handleCoverTemplateSelect"
      @open-cover-template="
        showCoverTemplateSelector = false;
        showCoverTemplateManager = true;
      "
    />

    <ModalCoverTemplateSelector
      :visible="showArticleCoverTemplateSelector"
      :current-template-id="currentArticle?.coverConfig.templateId"
      @close="showArticleCoverTemplateSelector = false"
      @select="handleArticleCoverTemplateSelect"
      @open-cover-template="
        showArticleCoverTemplateSelector = false;
        showCoverTemplateManager = true;
      "
    />

    <CoverCropTool
      :visible="showCoverCropTool"
      :image-src="
        isCropModeGlobal
          ? globalGeneratedCoverImageSrc
          : currentArticleGeneratedCoverImageSrc
      "
      :initial-crop-235="
        isCropModeGlobal
          ? batchStore.globalConfig.cover.pic_crop_235_1
          : currentArticle?.coverConfig.pic_crop_235_1
      "
      :initial-crop-11="
        isCropModeGlobal
          ? batchStore.globalConfig.cover.pic_crop_1_1
          : currentArticle?.coverConfig.pic_crop_1_1
      "
      :initial-ratio="targetCropRatio"
      @close="showCoverCropTool = false"
      @confirm="handleCoverCropConfirm"
    />

    <!-- 调试日志区域 -->
    <DebugLogPanel
      v-if="debugLogs.length > 0 && showDebugLogs"
      :logs="debugLogs"
      @close="showDebugLogs = false"
      @clear="clearDebugLogs"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useProjectStore } from "../stores/project";
import { useTemplateStore } from "../stores/template";
import { useCoverTemplateStore } from "../stores/coverTemplate";
import { useBatchTypesetStore } from "../stores/batchTypeset";
import { useWechatAccountStore } from "../stores/wechatAccount";
import { useCoverManager } from "../composables/useCoverManager";
import PhoneMockup from "../components/common/PhoneMockup.vue";
import ModalTemplate from "../components/layout/ModalTemplate.vue";
import ModalCoverTemplate from "../components/layout/ModalCoverTemplate.vue";
import ModalCoverTemplateSelector from "../components/layout/ModalCoverTemplateSelector.vue";
import CoverImageSelectorDrawer from "../components/common/CoverImageSelectorDrawer.vue";
import CoverImageIndexSelectorDrawer from "../components/common/CoverImageIndexSelectorDrawer.vue";
import CoverCropTool from "../components/common/CoverCropTool.vue";
import ImageManagerDrawer from "../components/typeset/ImageManagerDrawer.vue";
import ArticleQueue from "../components/typeset/ArticleQueue.vue";
import CoverPreview from "../components/typeset/CoverPreview.vue";
import ContentPreview from "../components/typeset/ContentPreview.vue";
import ConfigPanel from "../components/typeset/ConfigPanel.vue";
import type { ImageFile } from "../types";
import DebugLogPanel from "../components/common/DebugLogPanel.vue";

const projectStore = useProjectStore();
const templateStore = useTemplateStore();
const coverTemplateStore = useCoverTemplateStore();
const batchStore = useBatchTypesetStore();
const wechatAccountStore = useWechatAccountStore();

const debugLogs = ref<string[]>([]);
const showDebugLogs = ref(true);

function clearDebugLogs() {
  debugLogs.value = [];
}

function addLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  debugLogs.value.push(`[${timestamp}] ${message}`);
  if (debugLogs.value.length > 50) {
    debugLogs.value = debugLogs.value.slice(-50);
  }
}

const {
  getCoverTemplateImageCount,
  regenerateSingleArticleCover,
  regenerateAllArticleCovers,
  toggleArticleCoverInherit,
} = useCoverManager({
  coverTemplates: coverTemplateStore.coverTemplates,
  getImageUrl: (path) => getImageUrl(path),
  addLog,
});

const showTemplateModal = ref(false);
const showCoverTemplateManager = ref(false);
const showCoverTemplateSelector = ref(false);
const showArticleCoverTemplateSelector = ref(false);
const showCoverImageSelector = ref(false);
const showCoverImageIndexSelector = ref(false);
const showCoverCropTool = ref(false);
const showImageManagerDrawer = ref(false);
const selectedCoverIndex = ref(0);
const selectedCoverRatio = ref<"235" | "11">("235");
const isCropModeGlobal = ref(false);
const targetCropRatio = ref<"235" | "11">("235");
const coverVersion = ref(Date.now());

const previewModes = [
  { label: "封面", value: "cover" },
  { label: "正文", value: "content" },
];

const currentArticle = computed(() => batchStore.currentArticle);

const wechatOfficialAccountName = computed(() => {
  return wechatAccountStore.activeAccount?.nickname || "微信公众号配置名称";
});

const currentTemplateId = computed(() => {
  if (!currentArticle.value) return "flow";
  if (
    !currentArticle.value.layoutConfig.inheritGlobal &&
    currentArticle.value.layoutConfig.templateId
  ) {
    return currentArticle.value.layoutConfig.templateId;
  }
  return batchStore.globalConfig.layout.templateId;
});

const currentTemplate = computed(() => {
  if (
    !currentTemplateId.value ||
    currentTemplateId.value === "flow" ||
    currentTemplateId.value === "card"
  ) {
    return null;
  }
  return (
    templateStore.customTemplates.find(
      (t) => t.id === currentTemplateId.value,
    ) || null
  );
});

const globalCoverTemplateName = computed(() => {
  const tid = batchStore.globalConfig.cover.templateId;
  if (!tid) return "";
  const tpl = coverTemplateStore.coverTemplates.find((t) => t.id === tid);
  return tpl?.name || "未知模板";
});

const globalCoverTemplateImageCount = computed(() => {
  return getCoverTemplateImageCount(
    batchStore.globalConfig.cover.templateId || "",
  );
});

const currentArticleCoverTemplateName = computed(() => {
  const tid = currentArticle.value?.coverConfig.templateId;
  if (!tid) return "";
  const tpl = coverTemplateStore.coverTemplates.find((t) => t.id === tid);
  return tpl?.name || "未知模板";
});

const currentArticleCoverTemplateImageCount = computed(() => {
  return getCoverTemplateImageCount(
    currentArticle.value?.coverConfig.templateId || "",
  );
});

const displayGeneratedCoverImage = computed(() => {
  if (currentArticle.value?.coverConfig.generatedCoverImagePath) {
    return (
      getImageUrl(currentArticle.value.coverConfig.generatedCoverImagePath) +
      `?v=${coverVersion.value}`
    );
  }
  return "";
});

const globalGeneratedCoverImageSrc = computed(() => {
  if (currentArticle.value?.coverConfig.generatedCoverImagePath) {
    return (
      getImageUrl(currentArticle.value.coverConfig.generatedCoverImagePath) +
      `?v=${coverVersion.value}`
    );
  }
  return "";
});

const currentArticleGeneratedCoverImageSrc = computed(() => {
  if (currentArticle.value?.coverConfig.generatedCoverImagePath) {
    return (
      getImageUrl(currentArticle.value.coverConfig.generatedCoverImagePath) +
      `?v=${coverVersion.value}`
    );
  }
  return "";
});

onMounted(() => {
  generateArticlesFromProject();
  templateStore.loadTemplates();
  coverTemplateStore.loadCoverTemplates();
  wechatAccountStore.loadAccounts();
});

function generateArticlesFromProject() {
  const articleData: Array<{
    id: string;
    images: ImageFile[];
  }> = [];

  if (
    projectStore.currentProject?.groups &&
    projectStore.currentProject.groups.length > 0
  ) {
    projectStore.currentProject.groups.forEach((group) => {
      articleData.push({
        id: group.groupId,
        images: group.images,
      });
    });
  } else if (projectStore.currentProject?.images) {
    const countPerArticle = 9;
    const images = projectStore.currentProject.images;

    for (let i = 0; i < images.length; i += countPerArticle) {
      const chunk = images.slice(i, i + countPerArticle);
      articleData.push({
        id: `article_${articleData.length + 1}`,
        images: chunk,
      });
    }
  }

  batchStore.initArticles(articleData);
  batchStore.updateArticlesCoverImagesByIndices();
}

function handleUpdateArticleImages(images: any[]) {
  if (currentArticle.value) {
    batchStore.updateCurrentArticleImages(images);
  }
}

async function toggleInheritGlobalCover() {
  const result = await toggleArticleCoverInherit(
    batchStore.currentArticleIndex,
  );
  if (result) {
    coverVersion.value = Date.now();
    addLog("封面继承切换成功");
  }
}

async function handleConfirmCoverImageIndices(indices: number[]) {
  addLog("=== 确认封面图片序号：" + indices.join(", ") + " ===");

  const templateId = batchStore.globalConfig.cover.templateId;
  if (!templateId) {
    addLog("错误：没有封面模板");
    return;
  }

  await regenerateAllArticleCovers(templateId, indices);
  coverVersion.value = Date.now();
}

async function handleCoverTemplateSelect(templateId: string) {
  addLog("=== 选择全局封面模板：" + templateId + " ===");

  if (!templateId) {
    addLog("错误：全局封面模板 ID 为空");
    return;
  }

  const imageCount = getCoverTemplateImageCount(templateId);
  const defaultIndices = Array.from({ length: imageCount }, (_, i) => i + 1);

  await regenerateAllArticleCovers(templateId, defaultIndices);
  coverVersion.value = Date.now();
}

async function handleArticleCoverTemplateSelect(templateId: string) {
  addLog("=== 选择文章封面模板：" + templateId + " ===");

  if (!templateId) {
    addLog("错误：模板 ID 为空");
    return;
  }

  if (currentArticle.value) {
    const imageCount = getCoverTemplateImageCount(templateId);
    const availableImages = currentArticle.value.images;

    if (imageCount > 0 && availableImages.length > 0) {
      const selectedIds = availableImages
        .slice(0, imageCount)
        .map((img) => img.id);

      batchStore.updateCurrentArticleCoverConfig({
        templateId,
        selectedImageIds: selectedIds,
      });

      await regenerateSingleArticleCover(batchStore.currentArticleIndex);
      coverVersion.value = Date.now();
    } else if (imageCount > 0 && availableImages.length === 0) {
      alert(
        `封面模板需要 ${imageCount} 张图片，但当前文章没有图片素材。请先添加图片素材后再选择封面图片。`,
      );
    }
  }
}

function handleCropRequest(mode: "global" | "article", ratio: "235" | "11") {
  isCropModeGlobal.value = mode === "global";
  targetCropRatio.value = ratio;
  showCoverCropTool.value = true;
}

function openCoverCropTool(ratio: "235" | "11" = "235") {
  isCropModeGlobal.value = false;
  targetCropRatio.value = ratio;
  showCoverCropTool.value = true;
}

function handleCoverCropConfirm(data: {
  pic_crop_235_1: string;
  pic_crop_1_1: string;
}) {
  if (isCropModeGlobal.value) {
    batchStore.setGlobalCoverConfig({
      pic_crop_235_1: data.pic_crop_235_1,
      pic_crop_1_1: data.pic_crop_1_1,
    });
  } else {
    if (currentArticle.value) {
      batchStore.updateCurrentArticleCoverConfig({
        pic_crop_235_1: data.pic_crop_235_1,
        pic_crop_1_1: data.pic_crop_1_1,
      });
    }
  }
}

async function handleUpdateCoverImageIds(ids: string[]) {
  if (currentArticle.value) {
    batchStore.updateCurrentArticleCoverConfig({
      selectedImageIds: ids,
    });

    await regenerateSingleArticleCover(batchStore.currentArticleIndex);
    coverVersion.value = Date.now();
  }
}

function getImageUrl(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return normalizedPath.match(/^[a-zA-Z]:/)
    ? `file:///${normalizedPath}`
    : `file://${normalizedPath}`;
}

const processedTemplateHtml = computed(() => {
  if (!currentTemplate.value || !currentArticle.value) return "";
  const templateHtml = currentTemplate.value.html;
  const images = currentArticle.value.images;

  if (images.length === 0) return templateHtml;

  const imgTagRegex = /<img[^>]*>/gi;
  const hasImgTags = imgTagRegex.test(templateHtml);

  if (hasImgTags) {
    let resultHtml = templateHtml;
    let imageIdx = 0;

    resultHtml = resultHtml.replace(imgTagRegex, (imgTag) => {
      if (imageIdx < images.length) {
        const imgUrl = getImageUrl(images[imageIdx].path);
        imageIdx++;
        return imgTag.replace(/src\s*=\s*(['"])[^'"]*\1/, `src="${imgUrl}"`);
      }
      return imgTag;
    });

    if (images.length > 0) {
      const imgTagCount = (templateHtml.match(imgTagRegex) || []).length;
      if (imgTagCount > 0) {
        const fullBlocks = Math.floor(images.length / imgTagCount);
        let finalHtml = "";
        let currentImageIdx = 0;

        for (let i = 0; i < fullBlocks; i++) {
          let blockHtml = templateHtml;
          let blockImageIdx = 0;

          blockHtml = blockHtml.replace(imgTagRegex, (imgTag) => {
            if (currentImageIdx + blockImageIdx < images.length) {
              const imgUrl = getImageUrl(
                images[currentImageIdx + blockImageIdx].path,
              );
              blockImageIdx++;
              return imgTag.replace(
                /src\s*=\s*(['"])[^'"]*\1/,
                `src="${imgUrl}"`,
              );
            }
            return imgTag;
          });

          finalHtml += blockHtml;
          currentImageIdx += imgTagCount;
        }

        return finalHtml || resultHtml;
      }
    }

    return resultHtml;
  }

  const placeholderMatch = templateHtml.match(
    /https:\/\/toai\.art\/b\d+\.png/g,
  );
  const placeholderCount = placeholderMatch ? placeholderMatch.length : 0;

  if (placeholderCount === 0) return templateHtml;

  let finalHtml = "";
  let imageIdx = 0;
  const fullBlocks = Math.floor(images.length / placeholderCount);
  const remainingImages = images.length % placeholderCount;

  for (let i = 0; i < fullBlocks; i++) {
    let blockHtml = templateHtml;
    blockHtml = blockHtml.replace(/https:\/\/toai\.art\/b\d+\.png/g, () => {
      const imgUrl = getImageUrl(images[imageIdx].path);
      imageIdx++;
      return imgUrl;
    });
    finalHtml += blockHtml;
  }

  if (remainingImages > 0) {
    const placeholderRegex = /https:\/\/toai\.art\/b\d+\.png/g;
    const parts: string[] = [];
    let lastIndex = 0;
    let match;

    placeholderRegex.lastIndex = 0;

    while ((match = placeholderRegex.exec(templateHtml)) !== null) {
      parts.push(templateHtml.slice(lastIndex, match.index));
      parts.push(match[0]);
      lastIndex = match.index + match[0].length;
    }
    parts.push(templateHtml.slice(lastIndex));

    const keepCount = 2 * remainingImages + 1;
    const keptParts = parts.slice(0, keepCount);

    let finalBlockHtml = "";
    let placeholderIdx = 0;

    for (let i = 0; i < keptParts.length; i++) {
      const part = keptParts[i];
      if (part.match(placeholderRegex)) {
        if (placeholderIdx < remainingImages && imageIdx < images.length) {
          const imgUrl = getImageUrl(images[imageIdx].path);
          imageIdx++;
          placeholderIdx++;
          finalBlockHtml += imgUrl;
        }
      } else {
        finalBlockHtml += part;
      }
    }

    finalHtml += finalBlockHtml;
  }

  return finalHtml;
});
</script>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.background {
  background-color: #f8fafc;
}
</style>
