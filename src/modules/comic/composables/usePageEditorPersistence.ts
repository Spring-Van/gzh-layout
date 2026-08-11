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
      const pageData = clone(refs.comicData.value) as NonNullable<typeof project.pageData>;
      await comicDb.saveProject({
        ...project,
        pageData,
        generatedImages: clone(refs.generatedImages.value),
        pageModelOverrides: clone(refs.pageModelOverrides.value),
        pageRefImages: clone(refs.pageRefImages.value),
        imageGenConfig: clone(refs.imageConfig.value),
        updatedAt: Date.now(),
      });
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
    if (saveTimer) clearTimeout(saveTimer);
  });

  return { isLoadingData, savePageData, flushSavePageData, loadPageData };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
