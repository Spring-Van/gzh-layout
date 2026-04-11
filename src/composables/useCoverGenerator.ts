import { ref } from "vue";
import type { CoverTemplate } from "../types";

interface SimpleImage {
  id: string;
  path: string;
  name: string;
}

interface UseCoverGeneratorOptions {
  coverTemplates: CoverTemplate[];
  getImageUrl: (path: string) => string;
  addLog?: (message: string) => void;
}

export function useCoverGenerator(options: UseCoverGeneratorOptions) {
  const { coverTemplates, getImageUrl, addLog } = options;
  const isGenerating = ref(false);

  function getCoverTemplateImageCount(templateId: string): number {
    if (!templateId) return 0;
    const template = coverTemplates.find((t) => t.id === templateId);
    if (!template) return 0;

    const html = template.html;

    const imgRegex = /<img[^>]*>/gi;
    const imgMatches = html.match(imgRegex);
    const imgCount = imgMatches ? imgMatches.length : 0;

    const bgImageRegex = /background-image:\s*url\(['"]?[^'")\s]+['"]?\)/gi;
    const bgMatches = html.match(bgImageRegex);
    const bgCount = bgMatches ? bgMatches.length : 0;

    return imgCount + bgCount;
  }

  async function generateCoverImage(
    templateId: string,
    selectedImageIds: string[],
    images: SimpleImage[],
  ): Promise<string> {
    const template = coverTemplates.find((t) => t.id === templateId);
    if (!template) {
      addLog?.("警告：封面模板不存在：" + templateId);
      return "";
    }

    if (!selectedImageIds || selectedImageIds.length === 0) {
      addLog?.("警告：没有选中的图片");
      return "";
    }

    addLog?.(
      "开始生成封面图：" +
      JSON.stringify({
        templateId,
        selectedImageIds,
        imagesCount: images.length,
      }),
    );

    let html = template.html;

    const tempDiv = document.createElement("div");
    tempDiv.style.width = "2350px";
    tempDiv.style.height = "1000px";
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "-9999px";
    tempDiv.innerHTML = html;

    const imgElements = tempDiv.querySelectorAll("img");
    addLog?.("模板中的 img 标签数量：" + imgElements.length);

    imgElements.forEach((img, idx) => {
      if (idx < selectedImageIds.length) {
        const imageId = selectedImageIds[idx];
        const image = images.find((i) => i.id === imageId);
        if (image) {
          const imgUrl = getImageUrl(image.path);
          addLog?.(
            `替换 img ${idx}: ${imageId} -> ${imgUrl.substring(0, 50)}...`,
          );
          img.setAttribute("src", imgUrl);
        } else {
          addLog?.("警告：找不到图片：" + imageId);
        }
      }
    });

    const allElements = tempDiv.querySelectorAll("*");
    let bgImageCount = 0;
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const styleAttr = htmlEl.getAttribute("style") || "";

      if (
        styleAttr.includes("background-image") &&
        styleAttr.includes("maque.toai.art/static/emoji/default_bz.png")
      ) {
        const imageIndex = bgImageCount;
        if (imageIndex < selectedImageIds.length) {
          const imageId = selectedImageIds[imageIndex];
          const image = images.find((i) => i.id === imageId);
          if (image) {
            const imgUrl = getImageUrl(image.path);
            addLog?.(
              `替换 background-image ${imageIndex}: ${imageId} -> ${imgUrl.substring(0, 50)}...`,
            );
            const newStyle = styleAttr.replace(
              /background-image:\s*url\(['"]?[^'")\s]+['"]?\)/gi,
              `background-image: url('${imgUrl}')`,
            );
            htmlEl.setAttribute("style", newStyle);
            bgImageCount++;
          } else {
            addLog?.("警告：找不到图片：" + imageId);
          }
        }
      }
    });

    addLog?.("选中的图片数量：" + selectedImageIds.length);
    addLog?.(
      "总共替换的图片数量：img=" +
      imgElements.length +
      ", background-image=" +
      bgImageCount,
    );

    document.body.appendChild(tempDiv);
    isGenerating.value = true;

    try {
      await Promise.all(
        Array.from(tempDiv.querySelectorAll("img")).map(
          (img) =>
            new Promise((resolve, reject) => {
              if (img.complete) {
                resolve(true);
              } else {
                img.onload = () => resolve(true);
                img.onerror = () => reject(new Error("图片加载失败"));
              }
            }),
        ),
      );

      addLog?.("所有图片加载完成，开始生成 canvas");

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(tempDiv, {
        width: 2350,
        height: 1000,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL("image/png");
      addLog?.("封面图生成成功：" + dataUrl.substring(0, 50) + "...");
      return dataUrl;
    } catch (error) {
      addLog?.("错误：生成封面图失败：" + (error as Error).message);
      if (selectedImageIds.length > 0) {
        const firstImage = images.find((i) => i.id === selectedImageIds[0]);
        if (firstImage) {
          const fallbackUrl = getImageUrl(firstImage.path);
          addLog?.("降级显示第一张图片：" + fallbackUrl.substring(0, 50) + "...");
          return fallbackUrl;
        }
      }
      return "";
    } finally {
      document.body.removeChild(tempDiv);
      isGenerating.value = false;
    }
  }

  return {
    isGenerating,
    getCoverTemplateImageCount,
    generateCoverImage,
  };
}
