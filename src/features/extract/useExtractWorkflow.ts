import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { useToast } from "@/hooks/useToast";
import {
  buildFilterDescription,
  getPreviewFilteredIds,
  getPreviewFilterReason,
  isFilterActive,
  platformClass,
  platformName,
} from "./extractUtils";
import type {
  ExtractedImage,
  ExtractFilterThresholds,
  ExtractTask,
} from "./types";

export function useExtractWorkflow() {
  const {
    success: showSuccess,
    error: showError,
    warning: showWarning,
  } = useToast();

  const urlInput = ref("");
  const savePath = ref("");
  const tasks = ref<ExtractTask[]>([]);
  const isProcessing = ref(false);
  const isDownloading = ref(false);
  const downloadProgress = ref(0);
  const showLogs = ref(false);
  const logs = ref<string[]>([]);
  const hideFiltered = ref(false);
  const filterOptions = reactive<ExtractFilterThresholds>({
    minWidth: 0,
    minHeight: 0,
    minSizeKB: 0,
  });

  const sourceImages = computed(() => tasks.value.flatMap((task) => task.images));
  const filterIsActive = computed(() => isFilterActive(filterOptions));
  const previewFilteredIds = computed(() =>
    getPreviewFilteredIds(sourceImages.value, filterOptions),
  );
  const allImages = computed(() => {
    if (!filterIsActive.value || !hideFiltered.value) return sourceImages.value;
    const previewSet = previewFilteredIds.value;
    return sourceImages.value.filter(
      (image) => !image.filtered && !previewSet.has(image.id),
    );
  });
  const totalImageCount = computed(() => sourceImages.value.length);
  const filteredCount = computed(() => {
    const previewSet = previewFilteredIds.value;
    return sourceImages.value.filter(
      (image) => image.filtered || previewSet.has(image.id),
    ).length;
  });
  const filterDescription = computed(() =>
    buildFilterDescription(sourceImages.value, filterOptions),
  );
  const downloadedCount = computed(
    () => sourceImages.value.filter((image) => image.downloaded).length,
  );
  const canParse = computed(
    () => urlInput.value.trim().length > 0 && !isProcessing.value,
  );
  const downloadableCount = computed(() => {
    const previewSet = previewFilteredIds.value;
    return sourceImages.value.filter(
      (image) => !image.filtered && !previewSet.has(image.id),
    ).length;
  });

  const previewFilterReason = (image: ExtractedImage) =>
    getPreviewFilterReason(image, filterOptions);

  function resetFilterOptions() {
    filterOptions.minWidth = 0;
    filterOptions.minHeight = 0;
    filterOptions.minSizeKB = 0;
    hideFiltered.value = false;
  }

  async function selectFolder() {
    try {
      const result = await window.electronAPI.selectFolder();
      if (result) savePath.value = result;
    } catch {
      showError("选择文件夹失败");
    }
  }

  async function parseUrls() {
    if (!canParse.value) return;
    isProcessing.value = true;
    const urls = urlInput.value
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);

    try {
      const results = await window.electronAPI.extract.parseUrls(urls);
      tasks.value = results;
      const totalImages = results.reduce(
        (sum, task) => sum + task.images.length,
        0,
      );
      if (totalImages > 0) {
        showSuccess(`解析完成，共发现 ${totalImages} 张图片`);
      } else {
        showWarning("未找到可下载的图片");
      }
    } catch (error) {
      showError(
        "解析失败：" + (error instanceof Error ? error.message : "未知错误"),
      );
    } finally {
      isProcessing.value = false;
    }
  }

  async function downloadAll() {
    if (totalImageCount.value === 0) {
      showWarning("请先解析链接");
      return;
    }
    if (!savePath.value) {
      showWarning("请先选择保存目录");
      return;
    }
    if (isDownloading.value) return;

    isDownloading.value = true;
    showLogs.value = true;
    downloadProgress.value = 0;

    try {
      const previewSet = previewFilteredIds.value;
      const skipped: ExtractedImage[] = [];
      const downloadable: ExtractedImage[] = [];
      for (const image of sourceImages.value) {
        if (image.filtered || previewSet.has(image.id)) {
          skipped.push({
            ...image,
            filtered: true,
            filterReason:
              image.filterReason || previewFilterReason(image) || "已过滤",
          });
        } else {
          downloadable.push(image);
        }
      }

      const filterDesc = filterIsActive.value
        ? ` [过滤: ${filterDescription.value}]`
        : "";
      logs.value.push(
        `[前端] 共 ${sourceImages.value.length} 张，将过滤 ${skipped.length} 张，实际下载 ${downloadable.length} 张到 ${savePath.value}${filterDesc}`,
      );

      if (downloadable.length === 0) {
        const skippedMap = new Map(skipped.map((image) => [image.id, image]));
        for (const task of tasks.value) {
          task.images = task.images.map(
            (image) =>
              skippedMap.get(image.id) || {
                ...image,
                filtered: true,
                filterReason: previewFilterReason(image) || "已过滤",
              },
          );
        }
        showWarning(`全部 ${skipped.length} 张都被过滤，无可下载图片`);
        return;
      }

      const plainImages = JSON.parse(JSON.stringify(downloadable));
      const results = filterIsActive.value
        ? await window.electronAPI.extract.filterAndDownloadImages(
            plainImages,
            savePath.value,
            { enabled: true, ...filterOptions },
          )
        : await window.electronAPI.extract.downloadImages(
            plainImages,
            savePath.value,
          );

      logs.value.push(`[前端] 下载完成，结果: ${results.length} 张`);
      const resultMap = new Map(results.map((image) => [image.id, image]));
      const skippedMap = new Map(skipped.map((image) => [image.id, image]));
      for (const task of tasks.value) {
        task.images = task.images.map(
          (image) =>
            resultMap.get(image.id) || skippedMap.get(image.id) || image,
        );
      }

      const successCount = results.filter((image) => image.downloaded).length;
      const skippedCount =
        results.filter((image) => image.filtered).length + skipped.length;
      const failCount = results.filter(
        (image) => !image.downloaded && !image.filtered,
      ).length;

      if (failCount === 0 && skippedCount === 0) {
        showSuccess(`全部下载完成，共 ${successCount} 张图片`);
      } else if (failCount === 0) {
        showSuccess(`下载完成：${successCount} 成功，过滤 ${skippedCount} 张`);
      } else {
        showWarning(
          `下载完成：${successCount} 成功，${skippedCount} 过滤，${failCount} 失败`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      logs.value.push(`[前端] 下载出错: ${message}`);
      showError("下载失败：" + message);
    } finally {
      isDownloading.value = false;
    }
  }

  function clearWorkflow() {
    tasks.value = [];
    urlInput.value = "";
    logs.value = [];
  }

  let unsubscribeProgress: (() => void) | null = null;
  let unsubscribeLog: (() => void) | null = null;

  onMounted(() => {
    unsubscribeProgress = window.electronAPI.extract.onDownloadProgress(
      (progress) => {
        downloadProgress.value = progress.total
          ? Math.round((progress.current / progress.total) * 100)
          : 0;
        const image = sourceImages.value.find(
          (item) => item.id === progress.image.id,
        );
        if (image) Object.assign(image, progress.image);
      },
    );
    unsubscribeLog = window.electronAPI.extract.onLog((message) => {
      logs.value.push(message);
      if (logs.value.length > 200) logs.value.shift();
    });
  });

  onUnmounted(() => {
    unsubscribeProgress?.();
    unsubscribeLog?.();
  });

  return {
    urlInput,
    savePath,
    tasks,
    isProcessing,
    isDownloading,
    downloadProgress,
    showLogs,
    logs,
    filterOptions,
    filterIsActive,
    hideFiltered,
    allImages,
    totalImageCount,
    filteredCount,
    filterDescription,
    previewFilteredIds,
    downloadedCount,
    canParse,
    downloadableCount,
    previewFilterReason,
    resetFilterOptions,
    selectFolder,
    parseUrls,
    downloadAll,
    clearWorkflow,
    platformName,
    platformClass,
  };
}
