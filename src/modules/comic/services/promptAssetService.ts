import type { LongProjectAsset, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel } from '@comic/types'

/**
 * 文本资产自动绑定引擎：
 * 1. 收集项目全部资产的名称/别名（≥2 字符）构建名称索引；
 * 2. 对分镜文本（画面/对白/旁白/绘画提示词）做长名优先、命中区间消费的扫描，防止短名误吃包含它的长名；
 * 3. 按规则自动增删 auto-text 绑定：出现名称且未绑定 → 自动添加；auto-text 绑定且名称消失 → 自动移除；
 *    模型/手动/章节范围来源的绑定永不自动改动。
 */

/** 名称索引条目：一个名称对应一个资产（长名优先排序用）。 */
export interface AssetNameEntry {
  name: string
  asset: LongProjectAsset
}

/** 构建资产名称索引：资产名 + 全部别名，按名称长度降序（长名优先匹配）。 */
export function buildAssetNameIndex(assets: LongProjectAsset[]): AssetNameEntry[] {
  const entries: AssetNameEntry[] = []
  for (const asset of assets) {
    for (const name of [asset.name, ...asset.aliases]) {
      const trimmed = name.trim()
      if (trimmed.length >= 2) entries.push({ name: trimmed, asset })
    }
  }
  return entries.sort((a, b) => b.name.length - a.name.length)
}

/** 文本中一处资产名命中区间（含位置，用于提示词编辑区高亮渲染与点击命中判定）。 */
export interface AssetSpan {
  start: number
  end: number
  asset: LongProjectAsset
}

/** 扫描文本中的资产名命中区间（长名优先、命中区间消费，避免短名嵌在长名内重复命中）。 */
export function detectAssetSpans(text: string, index: AssetNameEntry[]): AssetSpan[] {
  if (!text) return []
  const spans: AssetSpan[] = []
  for (const entry of index) {
    let searchFrom = 0
    for (;;) {
      const pos = text.indexOf(entry.name, searchFrom)
      if (pos < 0) break
      searchFrom = pos + entry.name.length
      // 命中区间与已有区间重叠说明是更长名称的子串，跳过
      if (spans.some(({ start, end }) => pos < end && pos + entry.name.length > start)) continue
      spans.push({ start: pos, end: pos + entry.name.length, asset: entry.asset })
    }
  }
  return spans.sort((a, b) => a.start - b.start)
}

/** 扫描文本中出现的资产（长名优先、命中区间消费，避免短名嵌在长名内重复命中）。 */
export function detectAssetsInText(text: string, index: AssetNameEntry[]): Map<string, LongProjectAsset> {
  return new Map(detectAssetSpans(text, index).map((span) => [span.asset.id, span.asset]))
}

/** 分镜参与自动绑定的扫描文本：画面 + 对白 + 旁白 + 绘画提示词。 */
export function panelScanText(panel: LongProjectStoryboardPanel): string {
  return [panel.content, panel.dialogue, panel.narration, panel.imagePrompt].filter(Boolean).join('\n')
}

/**
 * 计算分镜绑定在自动规则下的增量变更（纯函数，不修改入参）。
 * 规则：
 * - 文本中出现资产名且未绑定 → 新增 auto-text 绑定；
 * - auto-text 绑定且资产名（含别名）从文本中消失 → 移除；
 * - 其余来源（model/manual/chapter-range/unmatched）一律不动。
 * @returns 变更后的绑定数组；无变化时返回 null（避免无谓的持久化）
 */
export function computeAutoBindings(
  panel: LongProjectStoryboardPanel,
  index: AssetNameEntry[],
  resolveVariant: (asset: LongProjectAsset) => LongProjectAsset['variants'][number] | undefined,
): LongProjectStoryboardAssetBinding[] | null {
  const detected = detectAssetsInText(panelScanText(panel), index)
  const next = panel.assetBindings.filter((binding) => {
    if (binding.matchSource !== 'auto-text' || !binding.assetId) return true
    const asset = detected.get(binding.assetId)
    if (!asset) return false // auto-text 且名称已消失 → 移除
    // 名称仍出现，保留
    return true
  })

  let changed = next.length !== panel.assetBindings.length
  for (const [assetId, asset] of detected) {
    if (next.some((binding) => binding.assetId === assetId)) continue
    const variant = resolveVariant(asset)
    next.push({
      assetId,
      assetName: asset.name,
      visualVersionId: variant?.id,
      visualVersionName: variant?.name,
      matchSource: 'auto-text',
      referenceImageIds: variant?.referenceImageIds ?? [],
    })
    changed = true
  }
  return changed ? next : null
}

/**
 * 对一组分镜执行自动绑定同步，返回新的分镜数组（未变化的分镜保持原引用）。
 * 视觉状态解析：延续上一镜同资产绑定 → 无则调用 fallbackVariant（通常是章节范围默认）。
 */
export function syncPanelsAutoBindings(
  panels: LongProjectStoryboardPanel[],
  index: AssetNameEntry[],
  fallbackVariant: (asset: LongProjectAsset) => LongProjectAsset['variants'][number] | undefined,
): LongProjectStoryboardPanel[] {
  // 记录每个资产最近一次绑定的视觉状态（跨分镜延续）
  const lastVariantByAsset = new Map<string, string>()
  return panels.map((panel) => {
    const resolveVariant = (asset: LongProjectAsset) => {
      const lastId = lastVariantByAsset.get(asset.id)
      const continued = lastId ? asset.variants.find((v) => v.id === lastId) : undefined
      return continued ?? fallbackVariant(asset)
    }
    const nextBindings = computeAutoBindings(panel, index, resolveVariant)
    // 无论是否变更，都更新延续状态（取该分镜绑定后的最新视觉状态）
    for (const binding of nextBindings ?? panel.assetBindings) {
      if (binding.assetId && binding.visualVersionId) lastVariantByAsset.set(binding.assetId, binding.visualVersionId)
    }
    return nextBindings ? { ...panel, assetBindings: nextBindings } : panel
  })
}

/**
 * 手动锚点后的状态延续重算（纯函数，不修改入参）。
 * 某资产在 fromPanelOrder 镜被手动固定为 anchorVariantId 后，重算其后各镜该资产的绑定：
 * - auto-text 绑定跟随延续状态（初始 = 锚点状态；含 visualVersionName 同步更新）；
 * - model/manual/chapter-range 绑定不动，并以其为新延续起点；
 * - 延续状态悬空（资产已删该状态）时跳过。
 * @param panels 本章全部分镜（按 order 升序）
 * @param assetId 手动锚定的资产 ID
 * @param anchorVariantId 锚定的视觉状态 ID
 * @param fromPanelOrder 锚点所在分镜的 order（含，其后各镜参与重算）
 * @param assets 项目资产库（查找锚定资产与其状态）
 * @returns 变更后的分镜数组；无任何变化返回 null（避免无谓持久化）
 */
export function reapplyVariantContinuation(
  panels: LongProjectStoryboardPanel[],
  assetId: string,
  anchorVariantId: string,
  fromPanelOrder: number,
  assets: LongProjectAsset[],
): LongProjectStoryboardPanel[] | null {
  const asset = assets.find((item) => item.id === assetId)
  if (!asset) return null
  let lastVariantId = anchorVariantId
  let changed = false
  const next = panels.map((panel) => {
    if (panel.order <= fromPanelOrder) return panel
    const binding = panel.assetBindings.find((item) => item.assetId === assetId)
    if (!binding) return panel
    if (binding.matchSource === 'auto-text') {
      if (binding.visualVersionId === lastVariantId) return panel
      const variant = asset.variants.find((item) => item.id === lastVariantId)
      if (!variant) return panel // 延续状态悬空（资产已删该状态）→ 跳过
      changed = true
      return {
        ...panel,
        assetBindings: panel.assetBindings.map((item) =>
          item === binding
            ? { ...item, visualVersionId: variant.id, visualVersionName: variant.name, referenceImageIds: variant.referenceImageIds ?? [] }
            : item),
      }
    }
    // model/manual/chapter-range 绑定不动，并以其为新延续起点
    if (binding.visualVersionId) lastVariantId = binding.visualVersionId
    return panel
  })
  return changed ? next : null
}
