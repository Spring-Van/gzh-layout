import type { CustomTemplate } from '../types';

/**
 * 模板渲染逻辑封装
 */
export function useTemplateRender() {
  /**
   * 处理模板 HTML，将占位图片替换为实际图片
   * @param template 自定义模板
   * @param images 文章图片列表
   * @param getImageUrl 图片 URL 转换函数
   * @returns 处理后的 HTML
   */
  function renderTemplate(
    template: CustomTemplate,
    images: Array<{ path: string }>,
    getImageUrl: (path: string) => string
  ): string {
    if (!template || !images || !getImageUrl) {
      return '';
    }

    let html = template.html;

    // 清理模板中的反引号
    html = html.replace(/`/g, '');

    // 提取模板中所有的 img 标签
    const imgRegex = /<img[^>]*>/gi;
    const imgTags = html.match(imgRegex) || [];

    // 按顺序替换占位图片为实际图片
    imgTags.forEach((imgTag, index) => {
      if (index < images.length && images[index]?.path) {
        // 提取原 img 标签的属性（除了 src）
        const attributes = extractAttributes(imgTag);
        // 创建新的 img 标签
        const newImgTag = createImgTag(attributes, getImageUrl(images[index].path));
        // 替换原标签（只替换第一次出现的，避免重复替换）
        html = html.replace(imgTag, newImgTag);
      }
    });

    return html;
  }

  /**
   * 从 img 标签中提取属性（除了 src）
   */
  function extractAttributes(imgTag: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    if (!imgTag) return attributes;

    const attrRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let match;

    while ((match = attrRegex.exec(imgTag)) !== null) {
      const name = match[1]?.toLowerCase();
      const value = match[2] || match[3] || match[4] || '';
      if (name && name !== 'src') {
        attributes[name] = value;
      }
    }

    return attributes;
  }

  /**
   * 创建 img 标签
   */
  function createImgTag(attributes: Record<string, string>, src: string): string {
    if (!src) return '';

    const attrs = Object.entries(attributes)
      .filter(([key]) => key)
      .map(([key, value]) => `${key}="${value || ''}"`)
      .join(' ');

    return attrs ? `<img src="${src}" ${attrs} />` : `<img src="${src}" />`;
  }

  return {
    renderTemplate,
  };
}
