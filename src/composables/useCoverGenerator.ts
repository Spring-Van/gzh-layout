import { ref } from "vue";
import type { CoverTemplate } from "../types";
import { cropToBackgroundStyle } from "../utils/cropStyle";

interface SimpleImage {
  id: string;
  path: string;
  name: string;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseCoverGeneratorOptions {
  coverTemplates: CoverTemplate[];
  getImageUrl: (path: string) => string;
  addLog?: (message: string) => void;
}

/** 中心偏移阈值：偏移量低于此值视为居中 */
const CENTER_OFFSET_THRESHOLD = 0.02;

/**
 * 将任意图片 URL（file:// 或 http(s)://）转换为 base64 data URL
 * 解决 html2canvas 加载 file:// 资源时导致 canvas 污染、
 * canvas.toDataURL() 抛 SecurityError 的问题
 * @returns 转换后的 data URL，失败返回 null
 */
async function loadImageAsDataUrl(imageUrl: string): Promise<string | null> {
  // 已经是 data URL，直接返回
  if (imageUrl.startsWith("data:")) return imageUrl;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    // 降级：使用 Image + canvas 方式（可能产生污染但仅用于读取）
    return new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  }
}

/**
 * 使用 canvas 对图片按归一化裁剪矩形进行裁剪
 * 优先使用 fetch + createImageBitmap 避免 canvas 污染，
 * 失败时回退到 Image 加载方式
 * @returns 裁剪后的 PNG data URL，失败返回 null
 */
async function cropImageWithCanvas(
  imageUrl: string,
  cropRect: CropRect,
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return cropImageWithCanvasFallback(imageUrl, cropRect);
    }
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const sx = Math.round(srcW * cropRect.x);
    const sy = Math.round(srcH * cropRect.y);
    const sw = Math.max(1, Math.round(srcW * cropRect.w));
    const sh = Math.max(1, Math.round(srcH * cropRect.h));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    bitmap.close();

    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl;
  } catch {
    return cropImageWithCanvasFallback(imageUrl, cropRect);
  }
}

function cropImageWithCanvasFallback(
  imageUrl: string,
  cropRect: CropRect,
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight;
        const sx = Math.round(srcW * cropRect.x);
        const sy = Math.round(srcH * cropRect.y);
        const sw = Math.max(1, Math.round(srcW * cropRect.w));
        const sh = Math.max(1, Math.round(srcH * cropRect.h));

        const canvas = document.createElement("canvas");
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = imageUrl;
  });
}

function isCentered(rect: CropRect): boolean {
  return (
    Math.abs(rect.x + rect.w / 2 - 0.5) < CENTER_OFFSET_THRESHOLD &&
    Math.abs(rect.y + rect.h / 2 - 0.5) < CENTER_OFFSET_THRESHOLD
  );
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
    imageCropRects?: Record<number, CropRect>,
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

    // 预加载所有选中的图片为 base64 data URL，避免 html2canvas 因 file:// 资源污染 canvas
    const dataUrlMap = new Map<string, string>();
    const uniqueImageIds = Array.from(new Set(selectedImageIds));
    await Promise.all(
      uniqueImageIds.map(async (id) => {
        const image = images.find((i) => i.id === id);
        if (!image) return;
        const imgUrl = getImageUrl(image.path);
        const dataUrl = await loadImageAsDataUrl(imgUrl);
        if (dataUrl) {
          dataUrlMap.set(id, dataUrl);
        }
      }),
    );
    addLog?.(`预加载 data URL 成功：${dataUrlMap.size}/${uniqueImageIds.length}`);

    const tempDiv = document.createElement("div");
    tempDiv.style.width = "2350px";
    tempDiv.style.height = "1000px";
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "-9999px";
    tempDiv.innerHTML = template.html;

    const imgElements = tempDiv.querySelectorAll("img");
    addLog?.("模板中的 img 标签数量：" + imgElements.length);

    for (let idx = 0; idx < imgElements.length; idx++) {
      if (idx >= selectedImageIds.length) continue;
      const imageId = selectedImageIds[idx];
      const image = images.find((i) => i.id === imageId);
      if (!image) {
        addLog?.("警告：找不到图片：" + imageId);
        console.warn('[generateCoverImage] 找不到图片:', imageId, 'idx:', idx, 'selectedImageIds:', selectedImageIds);
        continue;
      }

      // 优先使用预加载的 data URL，否则回退到原 file:// URL
      const imgUrl = dataUrlMap.get(imageId) || getImageUrl(image.path);
      addLog?.(`替换 img ${idx}: ${imageId} -> ${imgUrl.substring(0, 50)}...`);

      const rect = imageCropRects?.[idx];

      if (rect && !(rect.w >= 0.99 && rect.h >= 0.99)) {
        // 裁剪源必须是 data URL（file:// 在 fetch+canvas 中可能失败）
        const cropSource = dataUrlMap.get(imageId) || getImageUrl(image.path);
        const cropped = await cropImageWithCanvas(cropSource, rect);
        if (cropped) {
          imgElements[idx].setAttribute("src", cropped);
          addLog?.(`卡槽 ${idx} 已canvas裁剪: x=${rect.x.toFixed(2)} y=${rect.y.toFixed(2)} w=${rect.w.toFixed(2)} h=${rect.h.toFixed(2)}`);
          continue;
        }
        addLog?.(`卡槽 ${idx} canvas裁剪失败，尝试object-fit偏移`);
        if (!isCentered(rect)) {
          const centerX = ((rect.x + rect.w / 2) * 100).toFixed(2);
          const centerY = ((rect.y + rect.h / 2) * 100).toFixed(2);
          imgElements[idx].style.objectFit = "cover";
          imgElements[idx].style.objectPosition = `${centerX}% ${centerY}%`;
          addLog?.(`卡槽 ${idx} 已object-fit偏移: centerX=${centerX}% centerY=${centerY}%`);
        }
      }

      imgElements[idx].setAttribute("src", imgUrl);
    }

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
            // 优先使用预加载的 data URL
            const imgUrl = dataUrlMap.get(imageId) || getImageUrl(image.path);
            addLog?.(`替换 background-image ${imageIndex}: ${imageId} -> ${imgUrl.substring(0, 50)}...`);

            const rect = imageCropRects?.[imageIndex];
            if (rect && !(rect.w >= 0.99 && rect.h >= 0.99)) {
              const cropKey = `${rect.x.toFixed(6)}_${rect.y.toFixed(6)}_${(rect.x + rect.w).toFixed(6)}_${(rect.y + rect.h).toFixed(6)}`;
              const bgStyle = cropToBackgroundStyle(imgUrl, cropKey);
              const styleEntries = Object.entries(bgStyle)
                .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${v}`)
                .join(";");
              const cleanedStyle = styleAttr
                .replace(/;\s*background-image:\s*url\(['"]?[^'")\s]+['"]?\)/gi, ";")
                .replace(/background-image:\s*url\(['"]?[^'")\s]+['"]?\);?\s*/gi, "")
                .replace(/;;+/g, ";")
                .replace(/^\s*;\s*/, "")
                .replace(/\s*;\s*$/, "");
              htmlEl.setAttribute("style", cleanedStyle ? cleanedStyle + ";" + styleEntries : styleEntries);
              addLog?.(`bg卡槽 ${imageIndex} 已裁剪`);
            } else {
              const newStyle = styleAttr.replace(
                /background-image:\s*url\(['"]?[^'")\s]+['"]?\)/gi,
                `background-image: url('${imgUrl}')`,
              );
              htmlEl.setAttribute("style", newStyle);
            }
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
              if ((img as HTMLImageElement).complete) {
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
        useCORS: false,
        allowTaint: true,
        logging: true,
      });

      const dataUrl = canvas.toDataURL("image/png");
      addLog?.("封面图生成成功：" + dataUrl.substring(0, 50) + "...");
      return dataUrl;
    } catch (error) {
      addLog?.("错误：生成封面图失败：" + (error as Error).message);
      // 降级：返回第一张图片的 data URL（保持 base64，避免污染）
      if (selectedImageIds.length > 0) {
        const firstImage = images.find((i) => i.id === selectedImageIds[0]);
        if (firstImage) {
          const firstDataUrl = dataUrlMap.get(selectedImageIds[0]);
          if (firstDataUrl) {
            addLog?.("降级显示第一张图片（data URL）");
            return firstDataUrl;
          }
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
