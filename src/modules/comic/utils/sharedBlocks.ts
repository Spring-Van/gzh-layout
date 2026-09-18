/**
 * 绘图配置共用属性块工具
 * @description 负责排序、迁移旧配置、图号计算、Prompt 拼接等纯函数逻辑
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ImageGenConfig,
  SharedPromptBlock,
  PromptInsertPosition,
} from "@comic/types";

/**
 * 创建空的共用属性块
 * @param partial - 可选覆盖字段
 * @returns 新的 SharedPromptBlock
 */
export function createEmptyBlock(
  partial: Partial<SharedPromptBlock> & { name: string },
): SharedPromptBlock {
  return {
    id: partial.id || uuidv4(),
    name: partial.name,
    description: partial.description ?? "",
    enableRefImages: partial.enableRefImages ?? false,
    referenceImages: partial.referenceImages
      ? [...partial.referenceImages]
      : [],
    storageMode: partial.storageMode ?? "local",
    insertPosition: partial.insertPosition ?? "front",
    sortOrder: partial.sortOrder ?? 0,
    contentSource: partial.contentSource ?? "manual",
    styleTemplateId: partial.styleTemplateId,
  };
}

/**
 * 默认共用属性（新项目 / 空配置）
 * @returns 默认 sharedBlocks 列表
 */
export function createDefaultSharedBlocks(): SharedPromptBlock[] {
  return [
    createEmptyBlock({
      name: "前置条件",
      insertPosition: "front",
      sortOrder: 0,
      contentSource: "manual",
    }),
    createEmptyBlock({
      name: "绘画风格",
      insertPosition: "front",
      sortOrder: 1,
      contentSource: "style_template",
    }),
    createEmptyBlock({
      name: "绘画风格参考图",
      insertPosition: "front",
      sortOrder: 2,
      enableRefImages: true,
      contentSource: "manual",
    }),
    createEmptyBlock({
      name: "后置条件",
      insertPosition: "back",
      sortOrder: 0,
      contentSource: "manual",
    }),
  ];
}

/**
 * 按插入位置 + sortOrder 排序共用属性
 * @param blocks - 原始列表
 * @returns 先 front 再 back，各组内 sortOrder 升序
 */
export function sortSharedBlocks(
  blocks: SharedPromptBlock[] | undefined | null,
): SharedPromptBlock[] {
  if (!blocks?.length) return [];
  const front = blocks
    .filter((b) => b.insertPosition === "front")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const back = blocks
    .filter((b) => b.insertPosition !== "front")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return [...front, ...back];
}

/**
 * 仅返回某插入位置的已排序块
 * @param blocks - 原始列表
 * @param position - front | back
 */
export function getBlocksByPosition(
  blocks: SharedPromptBlock[] | undefined | null,
  position: PromptInsertPosition,
): SharedPromptBlock[] {
  if (!blocks?.length) return [];
  return blocks
    .filter((b) =>
      position === "front"
        ? b.insertPosition === "front"
        : b.insertPosition !== "front",
    )
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 扁平化「插入最前」组内启用参考图的共用图（顺序决定全局图号）
 *
 * **只算 front 组**：图号是「从前往后」编的，而后置属性的文字出现在画面描述之后。
 * 后置属性若也带图，图号顺序与文字出现顺序必然错位，模型会混淆 —— 因此后置属性
 * 不参与取图与编号（数据保留，切回 front 即恢复）。
 *
 * @param blocks - 共用属性列表
 * @returns 参考图 URL 数组
 */
export function getSharedRefImages(
  blocks: SharedPromptBlock[] | undefined | null,
): string[] {
  return getBlocksByPosition(blocks, "front")
    .filter((b) => b.enableRefImages)
    .flatMap((b) => b.referenceImages || []);
}

/**
 * 计算每个 block 内每张图的全局 1-based 图号
 *
 * **只算 front 组**（原因见 `getSharedRefImages`）；back 组的 block 一律返回空数组。
 * 注意：这里得到的是「**仅共用属性内部**」的图号（从 1 开始）；
 * 含资产图的完整全局图号请用 `buildPanelRefManifest`（`services/panelRefManifest.ts`）。
 *
 * @param blocks - 共用属性列表
 * @returns Map<blockId, number[]> 每个 block 对应图号列表
 */
export function computeBlockImageNumbers(
  blocks: SharedPromptBlock[] | undefined | null,
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  let next = 1;
  for (const block of sortSharedBlocks(blocks)) {
    // back 组恒为空数组（显式落进 map，便于消费方读取时口径一致）
    if (block.insertPosition !== "front") {
      map.set(block.id, []);
      continue;
    }
    const nums: number[] = [];
    if (block.enableRefImages) {
      for (let i = 0; i < (block.referenceImages || []).length; i++) {
        nums.push(next++);
      }
    }
    map.set(block.id, nums);
  }
  return map;
}

/**
 * 共用属性的中文拼装文本：`属性名` → `图N、图M：属性名。` → 用户填写的描述正文。
 *
 * 三段各自独立、互不覆盖：图号行由代码实时算（不落库），描述正文永远是用户手填内容。
 *
 * @param block - 属性块
 * @param imageNumbers - 该块的全局图号（back 组传空数组）
 * @param position - 该块所属位置（图号行只出现在 front 组）
 * @returns 拼装后的多行文本；无任何内容时返回空串
 */
export function buildBlockText(
  block: SharedPromptBlock,
  imageNumbers: number[],
  position: PromptInsertPosition,
): string {
  const lines: string[] = [];
  const name = block.name?.trim() || "";
  const description = block.description?.trim() || "";
  // 无属性名且无描述、也无图 → 整块跳过
  if (!name && !description) return "";
  if (name) lines.push(name);
  if (position === "front" && imageNumbers.length > 0) {
    lines.push(`${imageNumbers.map((n) => `图${n}`).join("、")}：${name}。`);
  }
  if (description) lines.push(description);
  return lines.join("\n");
}

/**
 * 构建带图号的默认描述话术
 * @param name - 属性名
 * @param imageNumbers - 全局图号列表（1-based）
 * @returns 描述文本；无图时返回空串
 */
export function buildBlockRefDescription(
  name: string,
  imageNumbers: number[],
): string {
  if (imageNumbers.length === 0) {
    return "";
  }
  const numbers = imageNumbers.map((n) => `图${n}`);
  return `${name}参考上传的${numbers.join("，")}`;
}

/**
 * 说明（避免回退）：**不要再新增「按图号回写 description」的函数**。
 * `description` 是用户手填的正文，历史实现会在上传 / 删除参考图时把整段正文重写成
 * 「XX参考上传的图1，图2」话术，静默冲掉用户内容。图号行现在由 `buildBlockText`
 * 在**拼装时实时生成、不落库**，因此永远不需要回写。
 */

/**
 * 是否为旧版字段配置（尚无 sharedBlocks）
 * @param config - 绘图配置
 */
export function isLegacyImageGenConfig(
  config: ImageGenConfig | undefined | null,
): boolean {
  if (!config) return false;
  if (config.sharedBlocks && config.sharedBlocks.length > 0) return false;
  return !!(
    config.paintingStyle ||
    config.promptPrefix ||
    (config.styleReferenceImages && config.styleReferenceImages.length > 0) ||
    config.styleReferenceDescription
  );
}

/**
 * 将旧版 ImageGenConfig 迁移为 sharedBlocks
 * @param old - 旧配置（可能已有 sharedBlocks）
 * @returns 规范化后的配置（保证含 sharedBlocks）
 */
export function migrateLegacyImageGenConfig(
  old: ImageGenConfig | undefined | null,
): ImageGenConfig {
  if (!old) {
    return {
      imageModelId: "",
      aspectRatio: "",
      resolution: "",
      quality: "",
      sharedBlocks: createDefaultSharedBlocks(),
    };
  }

  // 已有 sharedBlocks：深拷贝规范化
  if (old.sharedBlocks && old.sharedBlocks.length > 0) {
    return normalizeImageGenConfig(old);
  }

  const blocks: SharedPromptBlock[] = [];
  let front = 0;
  let back = 0;

  const prefix = old.promptPrefix?.trim() || "";
  blocks.push(
    createEmptyBlock({
      name: "前置条件",
      description: prefix,
      insertPosition: "front",
      sortOrder: front++,
      contentSource: "manual",
    }),
  );

  blocks.push(
    createEmptyBlock({
      name: "绘画风格",
      description: old.paintingStyle || "",
      insertPosition: "front",
      sortOrder: front++,
      contentSource: "style_template",
    }),
  );

  const styleImages = old.styleReferenceImages || [];
  const styleNums = styleImages.map((_, i) => i + 1);
  const styleDesc =
    styleImages.length > 0
      ? buildBlockRefDescription("绘画风格参考图", styleNums)
      : old.styleReferenceDescription || "";

  blocks.push(
    createEmptyBlock({
      name: "绘画风格参考图",
      description: styleDesc,
      enableRefImages: true,
      referenceImages: [...styleImages],
      storageMode: old.styleStorageMode || "local",
      insertPosition: "front",
      sortOrder: front++,
      contentSource: "manual",
    }),
  );

  const suffix = old.promptSuffix?.trim() || "";
  blocks.push(
    createEmptyBlock({
      name: "后置条件",
      description: suffix,
      insertPosition: "back",
      sortOrder: back++,
      contentSource: "manual",
    }),
  );

  return {
    imageModelId: old.imageModelId || "",
    aspectRatio: old.aspectRatio || "",
    resolution: old.resolution || "",
    quality: old.quality || "",
    sharedBlocks: blocks,
  };
}

/**
 * 规范化配置：补全缺省、深拷贝 sharedBlocks
 * @param config - 原始配置
 */
export function normalizeImageGenConfig(
  config: ImageGenConfig,
): ImageGenConfig {
  const blocks = (config.sharedBlocks || []).map((b, idx) =>
    createEmptyBlock({
      ...b,
      name: b.name || `属性${idx + 1}`,
      description: b.description ?? "",
      enableRefImages: !!b.enableRefImages,
      referenceImages: [...(b.referenceImages || [])],
      storageMode: b.storageMode ?? "local",
      insertPosition: b.insertPosition === "back" ? "back" : "front",
      sortOrder: typeof b.sortOrder === "number" ? b.sortOrder : idx,
      contentSource: b.contentSource ?? "manual",
      styleTemplateId: b.styleTemplateId,
    }),
  );

  // 保留原 id
  for (let i = 0; i < blocks.length; i++) {
    if (config.sharedBlocks?.[i]?.id) {
      blocks[i].id = config.sharedBlocks[i].id;
    }
  }

  return {
    imageModelId: config.imageModelId || "",
    aspectRatio: config.aspectRatio || "",
    resolution: config.resolution || "",
    quality: config.quality || "",
    sharedBlocks: blocks,
  };
}

/**
 * 将 front/back 两组重新编号 sortOrder（0..n-1）
 * @param blocks - 属性列表（会被修改副本）
 * @returns 新数组
 */
export function reindexBlockSortOrders(
  blocks: SharedPromptBlock[],
): SharedPromptBlock[] {
  const next = blocks.map((b) => ({
    ...b,
    referenceImages: [...(b.referenceImages || [])],
  }));
  const reindex = (pos: PromptInsertPosition) => {
    const group = next
      .filter((b) =>
        pos === "front"
          ? b.insertPosition === "front"
          : b.insertPosition !== "front",
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
    group.forEach((b, i) => {
      b.sortOrder = i;
    });
  };
  reindex("front");
  reindex("back");
  return next;
}

/**
 * 根据 sharedBlocks 构建 front / back 的 Prompt 字段
 * @param blocks - 共用属性
 * @returns { front: Record, back: Record } 仅含有内容的字段
 */
export function buildSharedPromptFields(blocks: SharedPromptBlock[] | undefined | null): {
  front: Record<string, string>;
  back: Record<string, string>;
} {
  const front: Record<string, string> = {};
  const back: Record<string, string> = {};

  for (const block of getBlocksByPosition(blocks, "front")) {
    const text = resolveBlockPromptValue(block, blocks);
    if (text) front[block.name] = text;
  }
  for (const block of getBlocksByPosition(blocks, "back")) {
    const text = resolveBlockPromptValue(block, blocks);
    if (text) back[block.name] = text;
  }

  return { front, back };
}

/**
 * 解析单个 block 写入 Prompt 的文本值
 * @description 优先 description；有图且 description 为空时自动生成图号话术
 */
function resolveBlockPromptValue(
  block: SharedPromptBlock,
  allBlocks: SharedPromptBlock[] | undefined | null,
): string {
  const trimmed = block.description?.trim() || "";
  if (trimmed) return trimmed;

  if (block.enableRefImages && (block.referenceImages?.length || 0) > 0) {
    const numMap = computeBlockImageNumbers(allBlocks);
    const nums = numMap.get(block.id) || [];
    return buildBlockRefDescription(block.name, nums);
  }
  return "";
}

/**
 * 从配置读取共用参考图（兼容旧 styleReferenceImages）
 * @param config - 绘图配置
 */
export function getSharedRefImagesFromConfig(
  config: ImageGenConfig | undefined | null,
): string[] {
  if (!config) return [];
  if (config.sharedBlocks && config.sharedBlocks.length > 0) {
    return getSharedRefImages(config.sharedBlocks);
  }
  return [...(config.styleReferenceImages || [])];
}
