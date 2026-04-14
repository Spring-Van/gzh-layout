import { ref } from "vue";
import { useBatchTypesetStore } from "../stores/batchTypeset";
import { useCoverGenerator } from "./useCoverGenerator";
import type { CoverTemplate } from "../types";

interface SimpleImage {
  id: string;
  path: string;
  name: string;
}

interface UseCoverManagerOptions {
  coverTemplates: CoverTemplate[];
  getImageUrl: (path: string) => string;
  addLog?: (message: string) => void;
}

interface CoverGenerateResult {
  coverImage: string;
  savedPath: string;
}

export function useCoverManager(options: UseCoverManagerOptions) {
  const batchStore = useBatchTypesetStore();
  const {
    generateCoverImage,
    getCoverTemplateImageCount,
    isGenerating,
  } = useCoverGenerator(options);

  const coverFolderPath = ref<string>("");

  /**
   * 从封面图片文件路径提取所在文件夹路径（兼容 Windows 和 Unix 路径分隔符）
   */
  function extractCoverFolderPath(coverImagePath: string): string {
    const lastSep = Math.max(
      coverImagePath.lastIndexOf("/"),
      coverImagePath.lastIndexOf("\\"),
    );
    return lastSep > 0 ? coverImagePath.substring(0, lastSep) : "";
  }

  /**
   * 删除单个封面图片文件
   */
  async function deleteCoverImageFile(filePath: string): Promise<void> {
    if (!filePath) return;
    try {
      await window.electronAPI.deleteCoverImage(filePath);
      options.addLog?.(`封面图已删除: ${filePath}`);
    } catch (error) {
      options.addLog?.(
        `删除封面图失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 删除封面文件夹及其所有内容
   */
  async function deleteCoverFolder(folderPath: string): Promise<void> {
    if (!folderPath) return;
    try {
      await window.electronAPI.deleteCoverFolder(folderPath);
      options.addLog?.(`封面文件夹已删除: ${folderPath}`);
    } catch (error) {
      options.addLog?.(
        `删除封面文件夹失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 确保封面文件夹存在，返回文件夹路径
   */
  async function ensureCoverFolder(basePath?: string): Promise<string> {
    const base = basePath || "";
    const folder = await window.electronAPI.createCoverFolder(base);
    coverFolderPath.value = folder;
    return folder;
  }

  /**
   * 从已有文章中查找封面文件夹路径
   */
  function findCoverFolderPathFromArticles(): string {
    for (const article of batchStore.articles) {
      if (article.coverConfig.generatedCoverImagePath) {
        return extractCoverFolderPath(
          article.coverConfig.generatedCoverImagePath,
        );
      }
    }
    return "";
  }

  /**
   * 获取或创建封面文件夹路径
   */
  async function getOrCreateCoverFolder(basePath?: string): Promise<string> {
    const existingPath = findCoverFolderPathFromArticles();
    if (existingPath) {
      const parentDir = existingPath.replace(/[/\\]封面$/, "");
      return ensureCoverFolder(parentDir);
    }
    return ensureCoverFolder(basePath);
  }

  /**
   * 生成封面图并保存到文件
   * 生成前先删除该文章已有的封面文件，确保每篇文章只对应一个封面文件
   */
  async function generateAndSaveCover(
    templateId: string,
    selectedImageIds: string[],
    images: SimpleImage[],
    articleId: string,
    folderPath: string,
    existingCoverPath?: string,
  ): Promise<CoverGenerateResult | null> {
    if (existingCoverPath) {
      await deleteCoverImageFile(existingCoverPath);
    }

    const coverImage = await generateCoverImage(
      templateId,
      selectedImageIds,
      images,
    );
    if (!coverImage) return null;

    const filename = `cover_${articleId}.png`;
    const savedPath = await window.electronAPI.saveCoverImage(
      folderPath,
      coverImage,
      filename,
    );

    options.addLog?.(`封面图已保存: ${savedPath}`);

    return { coverImage, savedPath };
  }

  /**
   * 重新生成单篇文章的封面（删除旧封面 + 生成新封面）
   * 用于：当前文章-封面tab，重新选择封面图片或模板后
   */
  async function regenerateSingleArticleCover(
    articleIndex: number,
  ): Promise<CoverGenerateResult | null> {
    const article = batchStore.articles[articleIndex];
    if (!article) {
      options.addLog?.("错误：文章不存在");
      return null;
    }

    options.addLog?.(`=== 重新生成文章 ${articleIndex + 1} 的封面 ===`);

    const templateId = article.coverConfig.templateId || batchStore.globalConfig.cover.templateId;
    if (!templateId) {
      options.addLog?.("错误：没有封面模板");
      return null;
    }

    const selectedImageIds = article.coverConfig.selectedImageIds;
    if (!selectedImageIds || selectedImageIds.length === 0) {
      options.addLog?.("错误：没有选中的图片");
      return null;
    }

    const folderPath = await getOrCreateCoverFolder();

    const result = await generateAndSaveCover(
      templateId,
      selectedImageIds,
      article.images,
      article.id,
      folderPath,
      article.coverConfig.generatedCoverImagePath,
    );

    if (result) {
      batchStore.updateArticleCoverConfigByIndex(articleIndex, {
        templateId,
        generatedCoverImage: result.coverImage,
        generatedCoverImagePath: result.savedPath,
      });
      options.addLog?.(`文章 ${articleIndex + 1} 封面图重新生成成功`);
      return result;
    }

    return null;
  }

  /**
   * 重新生成所有文章的封面（删除封面文件夹 + 根据序号重新生成所有封面）
   * 用于：全局设置-封面tab，重新选择封面序号或模板后
   */
  async function regenerateAllArticleCovers(
    templateId: string,
    coverImageIndices: number[],
    basePath?: string,
  ): Promise<void> {
    options.addLog?.("=== 重新生成所有文章封面 ===");

    const existingFolderPath = findCoverFolderPathFromArticles();

    if (existingFolderPath) {
      await deleteCoverFolder(existingFolderPath);
      options.addLog?.(`旧封面文件夹已删除: ${existingFolderPath}`);
    }

    batchStore.setGlobalCoverConfig({
      templateId,
      coverImageIndices,
    });
    batchStore.updateArticlesCoverImagesByIndices();

    let newCoverFolderPath: string;
    if (existingFolderPath) {
      const parentDir = existingFolderPath.replace(/[/\\]封面$/, "");
      newCoverFolderPath = await ensureCoverFolder(parentDir);
    } else {
      newCoverFolderPath = await ensureCoverFolder(basePath);
    }

    const articles = batchStore.articles;
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      if (!article.images || article.images.length === 0) continue;

      const selectedImageIds = coverImageIndices
        .map((index) => article.images[index - 1]?.id)
        .filter((id) => id !== undefined);

      options.addLog?.(
        `文章 ${i + 1}: 选中的图片 ID: ${JSON.stringify(selectedImageIds)}`,
      );

      const result = await generateAndSaveCover(
        templateId,
        selectedImageIds,
        article.images,
        article.id,
        newCoverFolderPath,
      );

      if (result) {
        batchStore.updateArticleCoverConfigByIndex(i, {
          templateId,
          selectedImageIds,
          generatedCoverImage: result.coverImage,
          generatedCoverImagePath: result.savedPath,
        });
        options.addLog?.(`文章 ${i + 1}: 封面图重新生成成功`);
      }
    }

    options.addLog?.("所有文章封面图重新生成完成");
  }

  /**
   * 初始生成所有文章封面（前往批量排版时调用）
   */
  async function initialGenerateAllArticleCovers(
    templateId: string,
    coverImageIndices: number[],
    basePath?: string,
  ): Promise<void> {
    options.addLog?.("=== 初始生成所有文章封面 ===");

    const existingFolderPath = findCoverFolderPathFromArticles();

    batchStore.setGlobalCoverConfig({
      templateId,
      coverImageIndices,
    });
    batchStore.updateArticlesCoverImagesByIndices();

    const isSplitMode = basePath === "";
    let sharedCoverFolderPath = "";

    if (!isSplitMode) {
      if (existingFolderPath) {
        const parentDir = existingFolderPath.replace(/[/\\]封面$/, "");
        sharedCoverFolderPath = await ensureCoverFolder(parentDir);
      } else {
        sharedCoverFolderPath = await ensureCoverFolder(basePath);
      }
    }

    const articles = batchStore.articles;
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      if (!article.images || article.images.length === 0) continue;

      const selectedImageIds = coverImageIndices
        .map((index) => article.images[index - 1]?.id)
        .filter((id) => id !== undefined);

      let articleCoverFolderPath: string;

      if (isSplitMode) {
        if (article.images.length > 0) {
          const lastSep = Math.max(
            article.images[0].path.lastIndexOf("/"),
            article.images[0].path.lastIndexOf("\\"),
          );
          const groupFolder =
            lastSep > 0 ? article.images[0].path.substring(0, lastSep) : "";
          articleCoverFolderPath = await window.electronAPI.createCoverFolder(
            groupFolder,
          );
        } else {
          articleCoverFolderPath = await window.electronAPI.createCoverFolder(
            "",
          );
        }
      } else {
        articleCoverFolderPath = sharedCoverFolderPath;
      }

      const result = await generateAndSaveCover(
        templateId,
        selectedImageIds,
        article.images,
        article.id,
        articleCoverFolderPath,
        article.coverConfig.generatedCoverImagePath,
      );

      if (result) {
        batchStore.updateArticleCoverConfigByIndex(i, {
          templateId,
          selectedImageIds,
          generatedCoverImage: result.coverImage,
          generatedCoverImagePath: result.savedPath,
        });
        options.addLog?.(`文章 ${i + 1}: 封面图生成成功`);
      }
    }

    options.addLog?.("所有文章封面图初始生成完成");
  }

  /**
   * 切换文章封面继承状态
   * - 继承→独立：取全局图片序号作为初始值，生成独立封面
   * - 独立→继承：删除独立封面，恢复全局封面
   */
  async function toggleArticleCoverInherit(
    articleIndex: number,
  ): Promise<CoverGenerateResult | null> {
    const article = batchStore.articles[articleIndex];
    if (!article) return null;

    const newInherit = !article.coverConfig.inheritGlobal;
    options.addLog?.(
      `=== 切换文章 ${articleIndex + 1} 封面继承：${article.coverConfig.inheritGlobal ? "继承→独立" : "独立→继承"} ===`,
    );

    if (newInherit) {
      // 独立→继承：删除独立封面，恢复使用全局模板和图片序号
      const oldCoverPath = article.coverConfig.generatedCoverImagePath;

      const globalTemplateId = batchStore.globalConfig.cover.templateId;
      const globalIndices = batchStore.globalConfig.cover.coverImageIndices || [];

      const selectedImageIds = globalIndices
        .map((index) => article.images[index - 1]?.id)
        .filter((id) => id !== undefined);

      batchStore.updateArticleCoverConfigByIndex(articleIndex, {
        inheritGlobal: true,
        templateId: globalTemplateId,
        selectedImageIds,
        generatedCoverImage: undefined,
        generatedCoverImagePath: undefined,
      });

      const folderPath = await getOrCreateCoverFolder();

      const result = await generateAndSaveCover(
        globalTemplateId!,
        selectedImageIds,
        article.images,
        article.id,
        folderPath,
        oldCoverPath,
      );

      if (result) {
        batchStore.updateArticleCoverConfigByIndex(articleIndex, {
          generatedCoverImage: result.coverImage,
          generatedCoverImagePath: result.savedPath,
        });
        options.addLog?.(`文章 ${articleIndex + 1} 恢复全局封面成功`);
        return result;
      }

      return null;
    } else {
      // 继承→独立：取全局图片序号作为初始值，生成独立封面
      const oldCoverPath = article.coverConfig.generatedCoverImagePath;

      const globalTemplateId = batchStore.globalConfig.cover.templateId;
      const globalIndices = batchStore.globalConfig.cover.coverImageIndices || [];

      const selectedImageIds = globalIndices
        .map((index) => article.images[index - 1]?.id)
        .filter((id) => id !== undefined);

      batchStore.updateArticleCoverConfigByIndex(articleIndex, {
        inheritGlobal: false,
        templateId: globalTemplateId,
        selectedImageIds,
      });

      const folderPath = await getOrCreateCoverFolder();

      const result = await generateAndSaveCover(
        globalTemplateId!,
        selectedImageIds,
        article.images,
        article.id,
        folderPath,
        oldCoverPath,
      );

      if (result) {
        batchStore.updateArticleCoverConfigByIndex(articleIndex, {
          generatedCoverImage: result.coverImage,
          generatedCoverImagePath: result.savedPath,
        });
        options.addLog?.(`文章 ${articleIndex + 1} 独立封面生成成功`);
        return result;
      }

      return null;
    }
  }

  return {
    isGenerating,
    coverFolderPath,
    getCoverTemplateImageCount,
    generateCoverImage,
    extractCoverFolderPath,
    deleteCoverImageFile,
    deleteCoverFolder,
    ensureCoverFolder,
    findCoverFolderPathFromArticles,
    getOrCreateCoverFolder,
    generateAndSaveCover,
    regenerateSingleArticleCover,
    regenerateAllArticleCovers,
    initialGenerateAllArticleCovers,
    toggleArticleCoverInherit,
  };
}
