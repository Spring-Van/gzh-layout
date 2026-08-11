import type { ContentBlock } from "@/types";

function toCssPropertyName(property: string): string {
  return property.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

export function serializeInlineStyle(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([property, value]) => `${toCssPropertyName(property)}:${value}`)
    .join(";");
}

/**
 * 将正文编辑器的内容块渲染为微信公众号正文 HTML。
 * 普通排版与漫画同步共用此实现，确保预览后的内容结构一致。
 */
export function buildContentBlocksHtml(
  blocks: readonly ContentBlock[],
  containerStyle: Record<string, string> = {},
): string {
  const parts = blocks.map((block) => {
    if (block.type === "image") {
      const source = block.imagePath || block.content || "";
      return `<p><img src="${source}" style="max-width:100%;display:block;margin:0 auto;"/></p>`;
    }

    if (block.type === "html") {
      return block.html || "";
    }

    if (block.type === "empty") {
      const align = block.align || "left";
      return `<p style="text-align:${align}">${block.content || "<br/>"}</p>`;
    }

    return `<p>${block.content || ""}</p>`;
  });

  const html = parts.join("\n");
  if (Object.keys(containerStyle).length === 0) {
    return html;
  }

  return `<section style="${serializeInlineStyle(containerStyle)}">${html}</section>`;
}
