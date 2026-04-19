import type { CustomTemplate } from '../types';

/**
 * 按行单元循环展开模板，填充所有图片
 *
 * 解析模板 HTML 结构：
 * - 外层容器（flex-direction: column 的 section）
 * - 静态元素（不包含 img 的子元素，如标题文本等）
 * - 行单元（包含 img 的子元素）
 *
 * 当文章图片数 > 模板图片槽位数时，按行单元循环生成新行，
 * 保证模板的样式和布局一致，同时保留所有静态元素
 *
 * @param templateHtml 模板 HTML 字符串
 * @param images 文章图片列表
 * @param getImageUrl 图片路径转 URL 函数，默认返回原路径
 * @returns 处理后的 HTML
 */
export function expandTemplateWithImages(
    templateHtml: string,
    images: Array<{ path: string }>,
    getImageUrl: (path: string) => string = (p) => p,
): string {
    if (!templateHtml || images.length === 0) return templateHtml;

    const html = templateHtml.replace(/`/g, '');

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const container = doc.body.firstElementChild as HTMLElement | null;
    if (!container) {
        return fallbackImageReplace(html, images, getImageUrl);
    }

    // 分离静态元素和行单元
    const { staticElements, rowUnits } = separateContainerElements(container);
    if (rowUnits.length === 0) {
        return fallbackImageReplace(html, images, getImageUrl);
    }

    const imagesPerRow = rowUnits.map(
        (row) => row.querySelectorAll('img').length,
    );
    const totalPerCycle = imagesPerRow.reduce((a, b) => a + b, 0);

    if (totalPerCycle === 0) {
        return fallbackImageReplace(html, images, getImageUrl);
    }

    // 清空容器
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // 先添加静态元素
    staticElements.forEach((el) => {
        container.appendChild(el.cloneNode(true));
    });

    // 循环生成行单元并填充图片
    let imgIdx = 0;

    while (imgIdx < images.length) {
        for (let r = 0; r < rowUnits.length && imgIdx < images.length; r++) {
            const clone = rowUnits[r].cloneNode(true) as HTMLElement;
            const rowImgCount = imagesPerRow[r];
            const remaining = images.length - imgIdx;

            if (remaining >= rowImgCount) {
                fillRowImages(clone, images, imgIdx, getImageUrl);
                imgIdx += rowImgCount;
            } else {
                trimRowExcessCells(clone, remaining);
                fillRowImages(clone, images, imgIdx, getImageUrl);
                imgIdx += remaining;
            }
            container.appendChild(clone);
        }
    }

    return container.outerHTML;
}

/**
 * 分离容器中的静态元素（不含 img）和行单元（含 img）
 */
function separateContainerElements(container: HTMLElement): {
    staticElements: HTMLElement[];
    rowUnits: HTMLElement[];
} {
    const staticElements: HTMLElement[] = [];
    const rowUnits: HTMLElement[] = [];

    for (const child of Array.from(container.children)) {
        if (child instanceof HTMLElement) {
            if (child.querySelector('img')) {
                rowUnits.push(child);
            } else {
                staticElements.push(child);
            }
        }
    }

    return { staticElements, rowUnits };
}

/**
 * 填充行内所有 img 标签的 src 属性
 */
function fillRowImages(
    row: HTMLElement,
    images: Array<{ path: string }>,
    startIdx: number,
    getImageUrl: (path: string) => string,
): void {
    const imgs = row.querySelectorAll('img');
    let idx = startIdx;
    imgs.forEach((img) => {
        if (idx < images.length) {
            img.setAttribute('src', getImageUrl(images[idx].path));
            idx++;
        }
    });
}

/**
 * 裁剪行内多余的图片单元格（从末尾移除）
 * 保留前 keepCount 个包含 img 的子元素
 */
function trimRowExcessCells(
    rowClone: HTMLElement,
    keepCount: number,
): void {
    const children = Array.from(rowClone.children);
    const imgCells: Element[] = [];

    for (const child of children) {
        if (child.querySelector('img')) {
            imgCells.push(child);
        }
    }

    for (let i = imgCells.length - 1; i >= keepCount; i--) {
        imgCells[i].remove();
    }
}

/**
 * 回退方案：简单的逐个 img 标签 src 替换
 */
function fallbackImageReplace(
    html: string,
    images: Array<{ path: string }>,
    getImageUrl: (path: string) => string,
): string {
    const imgTagRegex = /<img[^>]*>/gi;
    let imageIdx = 0;

    return html.replace(imgTagRegex, (imgTag) => {
        if (imageIdx < images.length) {
            const imgUrl = getImageUrl(images[imageIdx].path);
            imageIdx++;
            return imgTag.replace(/src\s*=\s*(['"])[^'"]*\1/, `src="${imgUrl}"`);
        }
        return imgTag;
    });
}

/**
 * 模板渲染逻辑封装（composable）
 */
export function useTemplateRender() {
    /**
     * 处理模板 HTML，将占位图片替换为实际图片
     * 内部调用 expandTemplateWithImages 实现行单元循环
     */
    function renderTemplate(
        template: CustomTemplate,
        images: Array<{ path: string }>,
        getImageUrl: (path: string) => string,
    ): string {
        if (!template || !images || !getImageUrl) {
            return '';
        }
        return expandTemplateWithImages(template.html, images, getImageUrl);
    }

    return {
        renderTemplate,
    };
}
