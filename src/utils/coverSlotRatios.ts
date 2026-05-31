/**
 * 从封面模板 HTML 中提取每个图片槽位的宽高比
 *
 * 将模板 HTML 渲染到 2350×1000 的虚拟容器中，
 * 测量每个图片槽位（img 标签 + background-image 占位符）的实际渲染尺寸，
 * 计算 width/height 比值。
 *
 * 顺序与 useCoverGenerator 的替换逻辑一致：先 img，再 background-image。
 */
export function getCoverSlotRatios(templateHtml: string): number[] {
  const container = document.createElement('div');
  container.style.cssText =
    'position:absolute;left:-9999px;top:-9999px;width:2350px;height:1000px;overflow:hidden;';
  container.innerHTML = templateHtml;
  document.body.appendChild(container);

  const ratios: number[] = [];
  try {
    const imgs = container.querySelectorAll('img');
    imgs.forEach((img) => {
      const rect = img.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        ratios.push(rect.width / rect.height);
      } else {
        ratios.push(1);
      }
    });

    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const styleAttr = htmlEl.getAttribute('style') || '';
      if (
        styleAttr.includes('background-image') &&
        styleAttr.includes('maque.toai.art/static/emoji/default_bz.png')
      ) {
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          ratios.push(rect.width / rect.height);
        } else {
          ratios.push(1);
        }
      }
    });
  } finally {
    document.body.removeChild(container);
  }

  return ratios;
}