/**
 * 将归一化裁剪坐标字符串转换为 CSS background 样式
 * cropStr 格式: "x1_y1_x2_y2"，值为 0~1 的归一化比例
 *
 * 原理：
 * - background-size: 让整张图缩放后，裁剪区域恰好填满容器
 *   容器宽度 = cropW * 图片宽度 => 图片缩放后宽度 = 100% / cropW
 * - background-position: 裁剪起点对应容器左上角
 *   position% 的含义：(图片宽 - 容器宽) * position% = offset
 *   offset = x1 * 图片原始宽 * scale = x1 / cropW * 容器宽
 *   => position% = (x1 / cropW) / (1/cropW - 1) = x1 / (1 - cropW)
 */
export function cropToBackgroundStyle(
  imageSrc: string,
  cropStr?: string,
): Record<string, string> {
  if (!imageSrc) return {};

  const fallback: Record<string, string> = {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  if (!cropStr) return fallback;

  const parts = cropStr.split("_").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return fallback;

  const [x1, y1, x2, y2] = parts;
  const cropW = x2 - x1;
  const cropH = y2 - y1;

  if (cropW <= 0 || cropH <= 0) return fallback;

  const bgSizeW = (1 / cropW) * 100;
  const bgSizeH = (1 / cropH) * 100;

  const bgPosX = cropW >= 1 ? 0 : (x1 / (1 - cropW)) * 100;
  const bgPosY = cropH >= 1 ? 0 : (y1 / (1 - cropH)) * 100;

  return {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: `${bgSizeW}% ${bgSizeH}%`,
    backgroundPosition: `${bgPosX}% ${bgPosY}%`,
  };
}
