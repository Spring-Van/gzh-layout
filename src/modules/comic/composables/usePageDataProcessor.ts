/**
 * 页面数据处理 Composable
 *
 * 负责 "按人名匹配" 注入人物描述、替换服装描述、追加参考图编号 等逻辑。
 * 原始页面数据（人物特征.服装描述="服装1" 等 id 形式）保存在
 * sessionStorage[page-editor-original-${projectId}] 中，从未被修改。
 *
 * 每次都从原始拷贝一份执行匹配，写入
 * sessionStorage[page-editor-data-${projectId}]，保证可以反复刷新序号。
 */

import type { ProjectAsset, Outfit } from "@comic/types";

/** 共用参考图 + 资产参考图 = 每页传给后端的实际参考图（按类型分组） */
export interface PageRefImageSet {
  character: string[];
  scene: string[];
  prop: string[];
}

export interface ProcessResult {
  pageData: Record<string, any> | null;
  pageRefImages: Record<number, PageRefImageSet>;
}

/**
 * processPageData 的可选配置（保留签名兼容历史调用方）
 * 此前包含 insertCharacterDescription / insertOutfitDescription，均已迁移到
 * ProjectAsset 对应字段（按人物独立控制），此处保留为空对象类型
 */
export interface ProcessPageDataOptions {
  /** 预留：历史字段已废弃，调用方无需再传 */
  insertCharacterDescription?: boolean;
}

const buildKey = (projectId: string, suffix: "original" | "data") =>
  `page-editor-${suffix}-${projectId}`;

/**
 * 处理页面数据（纯函数 + IO）
 * @param projectId 项目 id
 * @param assets 资产列表（已加载）
 * @param styleReferenceImages 当前的风格参考图 URL 列表（决定编号偏移）
 * @param options 预留配置（当前未使用；"人物描述"和"服装描述"是否插入均已迁移到 ProjectAsset 对应字段，按人物独立控制）
 */
export function processPageData(
  projectId: string,
  assets: ProjectAsset[],
  styleReferenceImages: string[],
  options: ProcessPageDataOptions = {},
): ProcessResult {
  // 兼容历史签名：保留 options 但不再使用，统一按 matchedAsset 自身字段判断
  void options;

  const ORIGINAL_KEY = buildKey(projectId, "original");
  const WORKING_KEY = buildKey(projectId, "data");

  // 1) 确保原始数据已保存
  let original = sessionStorage.getItem(ORIGINAL_KEY);
  if (!original) {
    const working = sessionStorage.getItem(WORKING_KEY);
    if (working) {
      sessionStorage.setItem(ORIGINAL_KEY, working);
      original = working;
    }
  }
  if (!original) {
    return { pageData: null, pageRefImages: {} };
  }

  // 2) 深拷贝
  let data: Record<string, any>;
  try {
    data = JSON.parse(JSON.stringify(JSON.parse(original)));
  } catch {
    return { pageData: null, pageRefImages: {} };
  }

  const allPages = data.pages;
  if (!Array.isArray(allPages)) {
    return { pageData: data, pageRefImages: {} };
  }

  // 3) 资产名 -> 资产 映射
  const assetMap = new Map<string, ProjectAsset>();
  for (const asset of assets) {
    if (asset.name) assetMap.set(asset.name, asset);
  }

  const styleOffset = (styleReferenceImages || []).length;
  const pageRefImages: Record<number, PageRefImageSet> = {};

  for (let i = 0; i < allPages.length; i++) {
    const page = allPages[i];
    const charFeatures = page["人物特征"];
    if (!charFeatures || typeof charFeatures !== "object") continue;

    const charRefImages: string[] = [];
    let charStartIdx = styleOffset + 1; // 1-based 编号

    for (const [charName, charDetail] of Object.entries(charFeatures)) {
      if (!charDetail || typeof charDetail !== "object") continue;
      const detail = charDetail as Record<string, any>;

      const matchedAsset = assetMap.get(charName);

      // 1) 人物描述
      const charDescText = matchedAsset?.description?.trim() || "";

      // 2) 人物参考图
      let charRefImgText = "";
      if (matchedAsset && matchedAsset.referenceImages.length > 0) {
        charRefImages.push(...matchedAsset.referenceImages);
        const imgCount = matchedAsset.referenceImages.length;
        const startNum = charStartIdx;
        const endNum = startNum + imgCount - 1;
        charStartIdx = endNum + 1;
        const numText =
          imgCount > 1 ? `图${startNum}~${endNum}` : `图${startNum}`;
        const refDesc = (matchedAsset.referenceImageDescs?.[0] || "").trim();
        charRefImgText = refDesc ? `${numText}，${refDesc}` : numText;
      }

      // 是否走服装逻辑：人物资源库无「服装」/ outfits 为空时，与「不插入服装描述」一致，整段跳过
      const hasOutfits = (matchedAsset?.outfits?.length ?? 0) > 0;
      const shouldProcessOutfit =
        hasOutfits && matchedAsset?.insertOutfitDescription !== false;

      // 3) 替换服装描述（仅有服装且允许插入时匹配）
      let newClothingText: string | null = null;
      let matchedOutfit: Outfit | undefined;
      const originalClothing = detail["服装描述"];
      if (
        shouldProcessOutfit &&
        matchedAsset &&
        typeof originalClothing === "string" &&
        originalClothing.trim()
      ) {
        matchedOutfit = matchedAsset.outfits!.find(
          (o) => o.name === originalClothing.trim(),
        );
        if (matchedOutfit) {
          newClothingText = matchedOutfit.description || originalClothing;
        }
      }

      // 4) 服装参考图（与服装描述同开关：无服装 / 关闭插入时不挂图、不占编号）
      let outfitRefImgText = "";
      if (shouldProcessOutfit && matchedOutfit?.referenceImage) {
        charRefImages.push(matchedOutfit.referenceImage);
        const oStart = charStartIdx;
        charStartIdx += 1;
        const numText = `图${oStart}`;
        const refDesc = (matchedOutfit.referenceImageDesc || "").trim();
        outfitRefImgText = refDesc ? `${numText}，${refDesc}` : numText;
      }

      // 5) 重组：人物描述 → 人物参考图 → 服装描述 → 服装参考图 → 其它字段
      const PRIORITY_KEYS = new Set([
        "人物描述",
        "人物参考图",
        "服装描述",
        "服装参考图",
      ]);
      const newDetail: Record<string, any> = {};

      // 人物描述是否插入，按当前人物（matchedAsset）独立控制；未设置时默认关闭
      if (charDescText && matchedAsset?.insertCharacterDescription === true)
        newDetail["人物描述"] = charDescText;
      if (charRefImgText) newDetail["人物参考图"] = charRefImgText;
      // 服装：无 outfits 或 insertOutfitDescription === false 时不写入描述/参考图
      if (shouldProcessOutfit && newClothingText !== null)
        newDetail["服装描述"] = newClothingText;
      if (shouldProcessOutfit && outfitRefImgText)
        newDetail["服装参考图"] = outfitRefImgText;

      for (const [k, v] of Object.entries(detail)) {
        if (!PRIORITY_KEYS.has(k)) {
          newDetail[k] = v;
        }
      }

      // 原地替换（保持对象引用不变）
      for (const k of Object.keys(detail)) {
        delete detail[k];
      }
      Object.assign(detail, newDetail);
    }

    if (charRefImages.length > 0) {
      pageRefImages[i] = {
        character: charRefImages,
        scene: [],
        prop: [],
      };
    }
  }

  // 6) 写入 working key
  delete data.pageRefImages;
  sessionStorage.setItem(WORKING_KEY, JSON.stringify(data));

  return { pageData: data, pageRefImages };
}
