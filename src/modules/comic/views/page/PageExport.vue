<template>
  <div
    class="h-screen flex flex-col overflow-hidden relative bg-app-bg"
  >
    <div
      class="absolute top-10 right-1/4 w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none"
    />
    <div
      class="absolute bottom-10 left-1/3 w-80 h-80 bg-blue-600/8 rounded-full blur-[100px] pointer-events-none"
    />

    <main class="flex-1 flex flex-col overflow-hidden relative">
      <!-- 顶部导航 -->
      <div
        class="shrink-0 h-14 px-6 border-b border-border-subtle flex items-center gap-4"
      >
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

        <h1 class="text-sm font-semibold text-text-primary leading-7">
          {{ comicData?.title || exportTitle || projectName }}
        </h1>

        <div class="flex-1" />

        <div class="flex items-center gap-3 text-xs text-text-muted">
          <span>共 {{ imageUrls.length }} 张图片可导出</span>
          <span v-if="selectedIndices.size > 0" class="text-amber-400">
            其中 {{ selectedIndices.size }} 张脱敏
          </span>
        </div>
      </div>

      <!-- 三栏布局 -->
      <div class="flex-1 flex overflow-hidden gap-3 p-3">
        <!-- 左侧：项目信息 -->
        <ExportInfoPanel
          :title="exportTitle"
          :tags="exportTags"
          :creative-notes="creativeNotes"
          @update:title="handleUpdateTitle"
        />

        <!-- 中间：图片展示 -->
        <ExportImageGrid
          :images="imageUrls"
          :selected-indices="selectedIndices"
          @toggle-select="toggleSelect"
          @preview="openPreview"
          @select-all="selectAll"
          @deselect-all="deselectAll"
        />

        <!-- 右侧：导出操作 -->
        <ExportActionPanel
          :image-count="imageUrls.length"
          :selected-indices="selectedIndices"
          :export-format="exportFormat"
          :vibe-preset="vibePreset"
          :vibe-options="vibeOptions"
          :is-exporting="isExporting"
          @update:export-format="exportFormat = $event"
          @update:vibe-preset="vibePreset = $event"
          @update:vibe-options="vibeOptions = $event"
          @export="handleExport"
        />
      </div>
    </main>

    <!-- 图片放大查看 -->
    <ImagePreviewModal
      v-model="showPreview"
      :images="imageUrls"
      :image-index="previewIndex"
      alt="页面预览"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { comicDb } from "@/api/comic";
import { useToast } from "@comic/composables/useToast";
import { downloadBatch } from "@comic/services/downloadService";
import type { VibePreset, VibeOptions } from "@comic/services/downloadService";
import ImagePreviewModal from "@comic/components/ImagePreviewModal.vue";
import ExportInfoPanel from "./ExportInfoPanel.vue";
import ExportImageGrid from "./ExportImageGrid.vue";
import ExportActionPanel from "./ExportActionPanel.vue";
import type { ComicPageData } from "./types";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const projectId = route.params.projectId as string;

const projectName = ref("");
const comicData = ref<ComicPageData | null>(null);
const generatedImages = ref<Record<number, string>>({});
const exportTitle = ref("");
const exportTags = ref<string[]>([]);
const creativeNotes = ref<Record<string, string>>({});
const selectedIndices = ref(new Set<number>());
const exportFormat = ref<"zip" | "long">("zip");
const vibePreset = ref<VibePreset>("natural");
const vibeOptions = ref<VibeOptions>({
  blurSigma: 0.6,
  sharpenSigma: 1.0,
  brightness: 1.05,
  saturation: 0.95,
  normalise: true,
  tintEnabled: false,
});
const isExporting = ref(false);
const showPreview = ref(false);
const previewIndex = ref(0);

const imageUrls = computed(() =>
  Object.entries(generatedImages.value)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, url]) => url),
);

const toggleSelect = (index: number) => {
  const newSet = new Set(selectedIndices.value);
  if (newSet.has(index)) newSet.delete(index);
  else newSet.add(index);
  selectedIndices.value = newSet;
};

const selectAll = () => {
  selectedIndices.value = new Set(imageUrls.value.map((_, i) => i));
};

const deselectAll = () => {
  selectedIndices.value = new Set();
};

const openPreview = (index: number) => {
  previewIndex.value = index;
  showPreview.value = true;
};

/** ZIP 批量导出 */
const handleZipExport = async () => {
  const urls = imageUrls.value;
  if (urls.length === 0) {
    toast.warning("没有可导出的图片");
    return;
  }
  const secureIndices = Array.from(selectedIndices.value);
  const folderName = exportTitle.value || projectName.value || "漫画导出";
  toast.info(
    secureIndices.length > 0
      ? `正在处理 ${secureIndices.length} 张图片脱敏并打包下载...`
      : "正在打包下载，请稍候...",
  );
  const result = await downloadBatch(
    urls,
    folderName,
    secureIndices,
    vibePreset.value,
    vibeOptions.value,
  );
  if (result.success) {
    const securedCount =
      (result as unknown as Record<string, unknown>).securedCount || 0;
    toast.success(
      `已成功导出 ${urls.length} 张图片${securedCount ? `，其中 ${securedCount} 张已脱敏处理` : ""}`,
    );
  } else {
    throw new Error(result.error || "导出失败");
  }
};

/** 长图拼接导出 */
const handleLongImageExport = async () => {
  const urls = imageUrls.value;
  if (urls.length === 0) {
    toast.warning("没有可导出的图片");
    return;
  }
  toast.info("正在拼接长图，请稍候...");
  const images = await Promise.all(
    urls.map(async (url) => {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return createImageBitmap(blob);
    }),
  );
  const maxWidth = Math.max(...images.map((img) => img.width));
  const totalHeight = images.reduce((sum, img) => {
    const scale = maxWidth / img.width;
    return sum + Math.round(img.height * scale);
  }, 0);
  const canvas = document.createElement("canvas");
  canvas.width = maxWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d")!;
  let offsetY = 0;
  for (const img of images) {
    const scale = maxWidth / img.width;
    const drawHeight = Math.round(img.height * scale);
    ctx.drawImage(img, 0, offsetY, maxWidth, drawHeight);
    offsetY += drawHeight;
    img.close();
  }
  canvas.toBlob(async (blob) => {
    if (!blob) {
      toast.error("长图生成失败");
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${exportTitle.value || projectName.value || "漫画"}_长图.png`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("长图导出成功");
  }, "image/png");
};

const handleExport = async () => {
  if (isExporting.value) return;
  isExporting.value = true;
  try {
    if (exportFormat.value === "zip") {
      await handleZipExport();
    } else {
      await handleLongImageExport();
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "导出失败");
  } finally {
    isExporting.value = false;
  }
};

const goBack = () => {
  router.push(projectId ? `/comic/page-editor/${projectId}` : "/");
};
const goToProject = () => {
  router.push("/comic/projects");
};

const handleUpdateTitle = async (value: string) => {
  exportTitle.value = value;
  if (!projectId) return;
  const project = await comicDb.getProject(projectId);
  if (!project) return;
  const publishData = {
    title: value,
    tags: project.publishData?.tags || [],
    creativeNotes: project.publishData?.creativeNotes || {},
  };
  await comicDb.saveProject({
    ...project,
    publishData,
    updatedAt: Date.now(),
  });
};

onMounted(async () => {
  if (!projectId) return;
  const project = await comicDb.getProject(projectId);
  if (project) {
    projectName.value = project.name;
    if (project.pageData) {
      comicData.value = {
        title: project.pageData.title || "",
        summary: project.pageData.summary || "",
        pages: project.pageData.pages || [],
      } as ComicPageData;
    }
    // 优先使用 publishData，其次从 pageData 提取
    if (project.publishData) {
      exportTitle.value = project.publishData.title || project.name;
      exportTags.value = project.publishData.tags || [];
      creativeNotes.value = project.publishData.creativeNotes || {};
    } else if (project.pageData) {
      exportTitle.value = project.pageData.title || project.name;
      const rawTags = extractTagsFromPages(project.pageData.pages || []);
      if (rawTags.length > 0) exportTags.value = rawTags;
    }
    if (project.generatedImages) {
      generatedImages.value = project.generatedImages as Record<number, string>;
    }
  }
});

/** 从页面 JSON 数据中提取标签字段 */
const extractTagsFromPages = (pages: Record<string, unknown>[]): string[] => {
  const tagKeys = ["标签", "tags", "类型", "分类", "风格", "genre"];
  for (const page of pages) {
    for (const key of tagKeys) {
      const val = page[key];
      if (typeof val === "string" && val.trim())
        return val
          .split(/[,，、]/)
          .map((s) => s.trim())
          .filter(Boolean);
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string")
        return val.map(String);
    }
  }
  return [];
};
</script>
