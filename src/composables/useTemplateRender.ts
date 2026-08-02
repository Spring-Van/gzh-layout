import type { CustomTemplate } from '../types';

/**
 * 按行单元循环展开模板，填充所有图片
 *
 * 解析模板 HTML 结构，保留子元素的原始顺序：
 * - 前导静态元素（第一个含 img 子元素之前的元素）→ 原样保留在顶部
 * - 行单元（含 img 的子元素）→ 循环复制并填充图片
 * - 尾部静态元素（最后一个含 img 子元素之后的元素）→ 原样保留在底部
 *
 * 这样能正确处理「序号+图片」分组模板：尾部文字/话题/标题不会被提到顶部。
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

    const children = Array.from(container.children) as HTMLElement[];

    // 定位第一个和最后一个含 img 的子元素
    let firstImgIdx = -1;
    let lastImgIdx = -1;
    children.forEach((child, idx) => {
        if (child.querySelector('img')) {
            if (firstImgIdx === -1) firstImgIdx = idx;
            lastImgIdx = idx;
        }
    });

    if (firstImgIdx === -1) {
        return fallbackImageReplace(html, images, getImageUrl);
    }

    // 三段划分：前导静态 / 行单元 / 尾部静态
    const leadingStatic = children.slice(0, firstImgIdx);
    const rowUnits = children
        .slice(firstImgIdx, lastImgIdx + 1)
        .filter((el) => el.querySelector('img'));
    const trailingStatic = children.slice(lastImgIdx + 1);

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

    // 1. 前导静态元素（保持原顺序）
    leadingStatic.forEach((el) => {
        container.appendChild(el.cloneNode(true));
    });

    // 2. 循环行单元并填充图片
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

    // 3. 尾部静态元素（保持原顺序）
    trailingStatic.forEach((el) => {
        container.appendChild(el.cloneNode(true));
    });

    return container.outerHTML;
}

/**
 * 填充行内所有 img 标签的 src 属性，并添加 lazy loading 和异步解码
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
            img.setAttribute('loading', 'lazy');
            img.setAttribute('decoding', 'async');
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
 * 回退方案：循环复制含 img 的顶层元素来渲染所有图片
 * - 若 body 有多个顶层元素且其中含 img，以第一个含 img 的元素为模板行循环复制
 * - 否则对每个 img 标签做 src 替换（图片数 > 槽位时多余的 img 用最后一张图填充）
 */
function fallbackImageReplace(
    html: string,
    images: Array<{ path: string }>,
    getImageUrl: (path: string) => string,
): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html.replace(/`/g, ''), 'text/html');

    // 收集所有顶层元素，分离静态和含 img 的
    const topElements = Array.from(doc.body.children) as HTMLElement[];
    const imgElements = topElements.filter((el) => el.querySelector('img'));
    const staticElements = topElements.filter((el) => !el.querySelector('img'));

    // 没有 img 元素：直接逐个替换 img src
    if (imgElements.length === 0) {
        return simpleImgReplace(html, images, getImageUrl);
    }

    // 清空 body
    doc.body.innerHTML = '';

    // 先放回静态元素
    staticElements.forEach((el) => doc.body.appendChild(el));

    // 以第一个含 img 的元素为模板行，循环复制
    const templateRow = imgElements[0];
    const imgPerRow = templateRow.querySelectorAll('img').length;
    const rowsNeeded = Math.ceil(images.length / Math.max(imgPerRow, 1));

    let imgIdx = 0;
    for (let r = 0; r < rowsNeeded; r++) {
        const clone = templateRow.cloneNode(true) as HTMLElement;
        const remaining = images.length - imgIdx;
        if (remaining < imgPerRow) {
            trimRowExcessCells(clone, remaining);
        }
        fillRowImages(clone, images, imgIdx, getImageUrl);
        imgIdx += Math.min(remaining, imgPerRow);
        doc.body.appendChild(clone);
    }

    return doc.body.innerHTML;
}

/**
 * 最简回退：逐个 img 标签 src 替换，并添加 loading="lazy" 和 decoding="async"
 */
function simpleImgReplace(
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
            // 添加 loading="lazy" 和 decoding="async"
            let result = imgTag;
            if (!result.includes('loading=')) {
                result = result.replace('<img', '<img loading="lazy"');
            }
            if (!result.includes('decoding=')) {
                result = result.replace('<img', '<img decoding="async"');
            }
            return result.replace(/src\s*=\s*(['"])[^'"]*\1/, `src="${imgUrl}"`);
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
