import { useRouter } from "vue-router";
import { useProjectStore } from "../stores/project";
import { useBatchTypesetStore } from "../stores/batchTypeset";
import { useCoverTemplateStore } from "../stores/coverTemplate";
import { useTemplateStore } from "../stores/template";
import { useCoverManager } from "./useCoverManager";
import { toDisplayImageUrl } from "../shared/image/imageUrl";

/**
 * 批量排版跳转 composable
 *
 * 把「加载模板 → initArticles → 生成封面 → 跳转 /typeset」的核心流程抽离，
 * 供 SetupView（公众号矩阵）与 ExtractView（图片提取）复用。
 *
 * 前置条件：调用前 projectStore.currentProject 已设置好（images + groups）。
 */
export function useTypesetNavigation() {
  const router = useRouter();
  const projectStore = useProjectStore();
  const batchStore = useBatchTypesetStore();
  const coverTemplateStore = useCoverTemplateStore();
  const templateStore = useTemplateStore();

  /**
   * 初始化批量排版并跳转
   * @param coverBasePath 封面图保存基础路径
   *   - 非空字符串：所有文章封面集中存到该目录下的「封面」子文件夹
   *   - 空字符串：拆分模式，每篇文章封面存到各自分组图片所在文件夹
   */
  async function navigateToTypeset(coverBasePath: string): Promise<void> {
    if (!projectStore.currentProject) {
      throw new Error("当前没有项目，无法进入排版");
    }

    // 1. 加载模板数据
    await templateStore.loadTemplates();
    await coverTemplateStore.loadCoverTemplates();

    // 2. 从 projectStore.groups 构建 articleData（兜底：无分组时按 9 张/篇切）
    const articleData: Array<{
      id: string;
      images: Array<{ id: string; path: string; name: string }>;
    }> = [];

    const project = projectStore.currentProject;
    if (project.groups && project.groups.length > 0) {
      project.groups.forEach((group) => {
        articleData.push({
          id: group.groupId,
          images: group.images,
        });
      });
    } else if (project.images && project.images.length > 0) {
      const countPerArticle = 9;
      const images = project.images;
      for (let i = 0; i < images.length; i += countPerArticle) {
        const chunk = images.slice(i, i + countPerArticle);
        articleData.push({
          id: `article_${articleData.length + 1}`,
          images: chunk,
        });
      }
    }

    batchStore.initArticles(articleData);

    // 3. 生成封面（使用第一个封面模板 + 默认前 N 张序号）
    const firstCoverTemplateId =
      coverTemplateStore.coverTemplates.length > 0
        ? coverTemplateStore.coverTemplates[0].id
        : "";

    if (firstCoverTemplateId) {
      batchStore.setGlobalCoverConfig({ templateId: firstCoverTemplateId });

      // 实例化封面管理器（此时模板已加载，拿到最新 coverTemplates）
      const { getCoverTemplateImageCount, initialGenerateAllArticleCovers } =
        useCoverManager({
          coverTemplates: coverTemplateStore.coverTemplates,
          getImageUrl: toDisplayImageUrl,
          addLog: (msg) => console.log("[排版跳转]", msg),
        });

      const imageCount = getCoverTemplateImageCount(firstCoverTemplateId);
      const defaultIndices = Array.from(
        { length: imageCount },
        (_, i) => i + 1,
      );
      await initialGenerateAllArticleCovers(
        firstCoverTemplateId,
        defaultIndices,
        coverBasePath,
      );
    } else {
      console.warn("[排版跳转] 没有找到封面模板，跳过封面生成");
    }

    // 4. 跳转
    await router.push("/typeset");
  }

  return { navigateToTypeset };
}
