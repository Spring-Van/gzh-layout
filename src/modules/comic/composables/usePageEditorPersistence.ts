import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { comicDb } from '@/api/comic';
import type { ImageGenConfig } from '@comic/types';
import type { ComicPageData } from '@comic/views/page/types';

type PageRefImages = Record<number, { character: string[]; scene: string[]; prop: string[] }>;

interface PersistenceRefs {
  comicData: Ref<ComicPageData | null>;
  generatedImages: Ref<Record<number, string>>;
  pageModelOverrides: Ref<Record<number, string>>;
  pageRefImages: Ref<PageRefImages>;
  imageConfig: Ref<ImageGenConfig>;
}

export function usePageEditorPersistence(
  projectId: string,
  refs: PersistenceRefs,
  clearLegacyTasks: () => Promise<void>,
) {
  const storageKey = `page-editor-data-${projectId}`;
  const isLoadingData = ref(true);
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  async function doSave() {
    if (!projectId || !refs.comicData.value) return;
    try {
      const project = await comicDb.getProject(projectId);
      if (!project) return;
      // 直接传引用：Electron IPC 序列化时自带快照，避免在渲染主线程
      // 对含 base64 图片的大对象做 JSON.parse(JSON.stringify()) 深拷贝（批量生图时的主要卡顿源）
      const pageData = refs.comicData.value as unknown as NonNullable<typeof project.pageData>;
      const { project: saved } = await comicDb.saveProject({
        ...project,
        pageData,
        generatedImages: refs.generatedImages.value,
        pageModelOverrides: refs.pageModelOverrides.value,
        pageRefImages: refs.pageRefImages.value,
        imageGenConfig: refs.imageConfig.value,
        updatedAt: Date.now(),
      });
      // 主进程写库时会把内联图片外置成 `app-image://` 引用，用返回值就地刷新本地 ref：
      // 不回写的话内存里一直压着 base64，此后每次自动保存都要重新搬运几十 MB。
      //
      // 用 `Object.assign` 就地改属性、而不是整体替换 `ref.value` ——
      // `generatedImages` 上挂了 `watch(..., savePageData)`，整体替换会改变引用从而
      // 再次触发保存，形成「保存 → 回写 → 再保存」的死循环。浅 watch 不感知属性改动。
      Object.assign(refs.generatedImages.value, (saved.generatedImages ?? {}) as Record<number, string>);
      Object.assign(refs.pageModelOverrides.value, (saved.pageModelOverrides ?? {}) as Record<number, string>);
      if (saved.pageRefImages) refs.pageRefImages.value = saved.pageRefImages;
      if (saved.imageGenConfig) refs.imageConfig.value = saved.imageGenConfig;
      sessionStorage.setItem(storageKey, JSON.stringify(pageData));
    } catch (error) {
      console.error('保存页面数据失败:', error);
    }
  }

  function savePageData() {
    if (isLoadingData.value) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 300);
  }

  async function flushSavePageData() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    await doSave();
  }

  async function loadPageData() {
    isLoadingData.value = true;
    try {
      const project = projectId ? await comicDb.getProject(projectId) : null;
      if (project?.pageData) {
        refs.comicData.value = { pages: project.pageData.pages || [] } as ComicPageData;
      }
      if (project?.generatedImages) refs.generatedImages.value = project.generatedImages as Record<number, string>;
      if (project?.pageModelOverrides) refs.pageModelOverrides.value = project.pageModelOverrides as Record<number, string>;
      if (project?.pageRefImages) refs.pageRefImages.value = project.pageRefImages;
      if (refs.comicData.value) return;

      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      refs.comicData.value = { pages: parsed.pages || [] } as ComicPageData;
      await clearLegacyTasks();
      refs.generatedImages.value = {};
    } catch (error) {
      console.error('加载页面数据失败:', error);
    } finally {
      isLoadingData.value = false;
    }
  }

  watch(refs.comicData, savePageData, { deep: true });
  watch(refs.generatedImages, savePageData);
  onBeforeUnmount(() => {
    // 防抖期间离开页面时兜底落盘，避免最后一次改动丢失
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      void doSave();
    }
  });

  return { isLoadingData, savePageData, flushSavePageData, loadPageData };
}
