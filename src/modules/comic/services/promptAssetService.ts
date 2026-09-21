import type { LongProjectAsset, LongProjectStoryboardAssetBinding, LongProjectStoryboardCell, LongProjectStoryboardPanel } from '@comic/types'

/**
 * 文本资产自动绑定引擎：
 * 1. 收集项目全部资产的名称/别名（≥2 字符）构建名称索引；
 * 2. 对视觉字段（画面/人物/动作/表情/备注/画面描述）做长名优先扫描，避免把对白里提到的画外角色误绑为视觉参考；
 * 3. 对有分格的分镜逐格扫描并写入格级绑定，再由格级绑定汇总页级绑定；
 * 4. 按规则增删文本绑定：出现名称且未绑定 → 自动添加；自动/手动绑定的名称消失 → 自动移除；
 * 5. 文字明确写出视觉状态时覆盖旧状态；手选状态仅作为仍在画面中的资产的初始锚点。
 */

/** 名称索引条目：一个名称对应一个资产（长名优先排序用）。 */
export interface AssetNameEntry {
  name: string
  asset: LongProjectAsset
  /** 同一名称/别名指向多个资产时不自动绑定，交给审计提示人工确认。 */
  ambiguous?: boolean
}

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s　]+/g, '')
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
  const assetIdsByName = new Map<string, Set<string>>()
  for (const entry of entries) {
    const key = normalizedName(entry.name)
    const ids = assetIdsByName.get(key) ?? new Set<string>()
    ids.add(entry.asset.id)
    assetIdsByName.set(key, ids)
  }
  return entries
    .map((entry) => ({ ...entry, ambiguous: (assetIdsByName.get(normalizedName(entry.name))?.size ?? 0) > 1 }))
    .sort((a, b) => b.name.length - a.name.length)
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
    if (entry.ambiguous) continue
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
  const detected = new Map(detectAssetSpans(text, index).map((span) => [span.asset.id, span.asset]))
  // 资产名中间可能被模型插入空格或全角空白（如“林 小雨”），绑定识别不应因此漏掉。
  const compactText = text.toLocaleLowerCase().replace(/[\s　]+/g, '')
  for (const entry of index) {
    if (entry.ambiguous) continue
    const compactName = entry.name.toLocaleLowerCase().replace(/[\s　]+/g, '')
    if (compactName.length >= 2 && compactText.includes(compactName)) detected.set(entry.asset.id, entry.asset)
  }
  return detected
}

/** 文本明确写出视觉状态名或状态标签时优先使用该状态；多状态同时出现时取最后提及者。 */
function variantMentionedInText(asset: LongProjectAsset, text: string): LongProjectAsset['variants'][number] | undefined {
  const compactText = text.toLocaleLowerCase().replace(/[\s　]+/g, '')
  const candidates = asset.variants
    .flatMap((variant) => [variant.name, ...(variant.tags ?? [])].map((cue) => ({
      variant,
      cue: cue.trim().toLocaleLowerCase().replace(/[\s　]+/g, ''),
    })))
    .filter((item) => item.cue.length >= 2 && compactText.includes(item.cue))
    .map((item) => ({ ...item, position: compactText.lastIndexOf(item.cue) }))
    .sort((a, b) => b.position - a.position || b.cue.length - a.cue.length)
  return candidates[0]?.variant
}

/** 一格参与资产识别的全部文本字段。不能只扫描画面，否则人物/道具写在字段里会漏绑。 */
export function cellScanText(cell: LongProjectStoryboardCell): string {
  return [
    cell.content, cell.cast, cell.action, cell.expression, cell.note,
  ].filter(Boolean).join('\n')
}

/** 分镜参与自动绑定的页级扫描文本：旧数据画面 + 画面描述；对白/旁白不等于画面出场。 */
export function panelScanText(panel: LongProjectStoryboardPanel): string {
  return [panel.content, panel.imagePrompt].filter(Boolean).join('\n')
}

function bindingKey(binding: Pick<LongProjectStoryboardAssetBinding, 'assetId' | 'assetName'>): string {
  return binding.assetId ?? normalizedName(binding.assetName)
}

function sameBinding(a: LongProjectStoryboardAssetBinding, b: LongProjectStoryboardAssetBinding): boolean {
  return bindingKey(a) === bindingKey(b)
    && a.visualVersionId === b.visualVersionId
    && a.visualVersionName === b.visualVersionName
    && a.matchSource === b.matchSource
}

/** 格级自动绑定：扫描这一格的所有可见/可听字段，保证人物字段和画面字段都能触发绑定。 */
export function computeCellAutoBindings(
  cell: LongProjectStoryboardCell,
  index: AssetNameEntry[],
  resolveVariant: (asset: LongProjectAsset, text?: string) => LongProjectAsset['variants'][number] | undefined,
): LongProjectStoryboardAssetBinding[] | null {
  const text = cellScanText(cell)
  const detected = detectAssetsInText(text, index)
  const current = cell.assetBindings ?? []
  const next = current.filter((binding) => {
    if (!['auto-text', 'manual'].includes(binding.matchSource) || !binding.assetId) return true
    return detected.has(binding.assetId)
  })
  let changed = next.length !== current.length
  for (const [assetId, asset] of detected) {
    const mentionedVariant = variantMentionedInText(asset, text)
    const variant = mentionedVariant ?? resolveVariant(asset, text)
    const existingIndex = next.findIndex((binding) => binding.assetId === assetId)
    if (existingIndex >= 0) {
      const existing = next[existingIndex]
      const followsResolvedState = existing.matchSource === 'auto-text' || existing.matchSource === 'manual'
      if (variant && existing.visualVersionId !== variant.id && (mentionedVariant || followsResolvedState)) {
        next[existingIndex] = {
          ...existing,
          assetName: asset.name,
          visualVersionId: variant.id,
          visualVersionName: variant.name,
          matchSource: 'auto-text',
          referenceImageIds: variant.referenceImageIds ?? [],
          selectedImageIds: undefined,
        }
        changed = true
      }
      continue
    }
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

/** 格级绑定汇总到页级：同资产取最后一个格的状态，保留首次出现顺序。 */
function summarizeCellBindingsForSync(cells: LongProjectStoryboardCell[]): LongProjectStoryboardAssetBinding[] {
  const byKey = new Map<string, LongProjectStoryboardAssetBinding>()
  for (const cell of cells) for (const binding of cell.assetBindings ?? []) byKey.set(bindingKey(binding), { ...binding })
  return [...byKey.values()]
}

/** 自动绑定完整性审计：返回文本已命中、但当前格没有对应绑定的资产。 */
export interface PanelBindingAuditIssue {
  cellIndex: number
  asset?: LongProjectAsset
  label: string
  reason: 'missing-binding' | 'ambiguous-name' | 'unmatched-asset' | 'missing-variant'
}

const PANEL_BINDING_AUDIT_REASON_TEXT: Record<PanelBindingAuditIssue['reason'], string> = {
  'missing-binding': '未绑定',
  'ambiguous-name': '名称有歧义',
  'unmatched-asset': '资产未匹配',
  'missing-variant': '未确定视觉状态',
}

/** 面向界面展示的去重审计摘要，保留失败原因以便用户知道下一步该怎么处理。 */
export function formatPanelBindingAuditIssues(issues: PanelBindingAuditIssue[]): string[] {
  return [...new Set(issues.map((issue) => `${issue.label}（${PANEL_BINDING_AUDIT_REASON_TEXT[issue.reason]}）`))]
}

/** 单个分镜的绑定健康度（导入 / 生成后的即时自检）。 */
export interface PanelBindingHealth {
  order: number
  bindingCount: number
  /** 绑定存在但资产在资产库中找不到（名字写错 / 资产已被删） */
  unmatchedCount: number
  /** 资产命中但视觉状态未确定（模型没写状态名且同章多状态无唯一默认） */
  missingVariantCount: number
  /** 已确定的绑定摘要：`林小雨（便装）、训练场（全章默认）` */
  summary: string
  /** 风险描述（无风险为空串），可直接展示给用户 */
  risk: string
}

/**
 * 逐镜统计资产绑定健康度：把「模型声明 → 解析 → 落库绑定」的结果摊开，
 * 让导入后立刻能区分是「模型没声明出场资产」「资产名没匹配上」还是「状态没确定」。
 *
 * 与 `auditPanelAssetBindings` 的分工：审计靠扫描文本找**漏绑**（需要文本里出现资产名），
 * 本函数只看**已落库的绑定**本身，因此能覆盖「模型整行没写」这种审计扫不到的情形。
 */
export function summarizePanelBindingHealth(panel: LongProjectStoryboardPanel, assets: LongProjectAsset[]): PanelBindingHealth {
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  const bindings = panel.assetBindings ?? []
  const labels: string[] = []
  let unmatchedCount = 0
  let missingVariantCount = 0
  for (const binding of bindings) {
    const asset = binding.assetId ? byId.get(binding.assetId) : undefined
    if (!asset) {
      unmatchedCount += 1
      labels.push(binding.assetName?.trim() || '未知资产')
      continue
    }
    const variant = binding.visualVersionId
      ? asset.variants.find((item) => item.id === binding.visualVersionId)
      : undefined
    if (!variant && asset.variants.length) missingVariantCount += 1
    labels.push(variant ? `${asset.name}（${variant.name}）` : asset.name)
  }
  const risks: string[] = []
  if (!bindings.length) risks.push('无出场资产声明')
  if (unmatchedCount) risks.push(`${unmatchedCount} 项资产未匹配`)
  if (missingVariantCount) risks.push(`${missingVariantCount} 项状态未确定`)
  return {
    order: panel.order,
    bindingCount: bindings.length,
    unmatchedCount,
    missingVariantCount,
    summary: labels.join('、'),
    risk: risks.join('；'),
  }
}

/** 整章绑定体检汇总（导入完成后的提示语用）。 */
export function summarizePanelsBindingHealth(panels: LongProjectStoryboardPanel[], assets: LongProjectAsset[]) {
  const healths = panels.map((panel) => summarizePanelBindingHealth(panel, assets))
  return {
    healths,
    bindingCount: healths.reduce((sum, item) => sum + item.bindingCount, 0),
    unmatchedCount: healths.reduce((sum, item) => sum + item.unmatchedCount, 0),
    missingVariantCount: healths.reduce((sum, item) => sum + item.missingVariantCount, 0),
    missingPanelCount: healths.filter((item) => item.bindingCount === 0).length,
  }
}

export function auditPanelAssetBindings(panel: LongProjectStoryboardPanel, index: AssetNameEntry[]): PanelBindingAuditIssue[] {
  const assets = new Map(index.map((entry) => [entry.asset.id, entry.asset]))
  const ambiguousGroups = new Map<string, AssetNameEntry[]>()
  for (const entry of index.filter((item) => item.ambiguous)) {
    const key = normalizedName(entry.name)
    ambiguousGroups.set(key, [...(ambiguousGroups.get(key) ?? []), entry])
  }
  const issues: PanelBindingAuditIssue[] = []
  const auditBindings = (bindings: LongProjectStoryboardAssetBinding[], cellIndex: number) => {
    for (const binding of bindings) {
      const asset = binding.assetId ? assets.get(binding.assetId) : undefined
      if (!asset) {
        issues.push({ cellIndex, label: binding.assetName || '未知资产', reason: 'unmatched-asset' })
        continue
      }
      const variant = asset.variants.find((item) => item.id === binding.visualVersionId)
        ?? (!binding.visualVersionId ? asset.variants.find((item) => item.name === binding.visualVersionName) : undefined)
      if (asset.variants.length && !variant) issues.push({ cellIndex, asset, label: asset.name, reason: 'missing-variant' })
    }
  }
  const auditText = (text: string, bindings: LongProjectStoryboardAssetBinding[], cellIndex: number) => {
    const bound = new Set(bindings.map((binding) => binding.assetId).filter(Boolean))
    for (const asset of detectAssetsInText(text, index).values()) {
      if (!bound.has(asset.id)) issues.push({ cellIndex, asset, label: asset.name, reason: 'missing-binding' })
    }
    const compactText = normalizedName(text)
    for (const [name, entries] of ambiguousGroups) {
      const candidates = [...new Map(entries.map((entry) => [entry.asset.id, entry.asset])).values()]
      if (!compactText.includes(name) || candidates.some((asset) => bound.has(asset.id))) continue
      issues.push({ cellIndex, label: `${entries[0].name}（候选：${candidates.map((asset) => asset.name).join(' / ')}）`, reason: 'ambiguous-name' })
    }
  }
  if (!panel.cells?.length) {
    auditBindings(panel.assetBindings ?? [], -1)
    auditText(panelScanText(panel), panel.assetBindings ?? [], -1)
    return issues
  }
  panel.cells.forEach((cell, cellIndex) => {
    auditBindings(cell.assetBindings ?? [], cellIndex)
    auditText(cellScanText(cell), cell.assetBindings ?? [], cellIndex)
  })
  // 页级还可能保存画面描述单独提到的资产，以及手动绑定；同样校验悬空资产/状态与歧义名称。
  auditBindings(panel.assetBindings ?? [], -1)
  auditText(panel.imagePrompt ?? '', panel.assetBindings ?? [], -1)
  return issues
}

/**
 * 计算分镜绑定在自动规则下的增量变更（纯函数，不修改入参）。
 * 规则：
 * - 文本中出现资产名且未绑定 → 新增 auto-text 绑定；
 * - auto-text / manual 绑定且资产名（含别名）从文本中消失 → 移除；
 * - 文字明确写出另一个视觉状态 → 覆盖旧状态，并转为 auto-text；
 * - model/chapter-range/unmatched 在没有明确新状态时不改动。
 * @returns 变更后的绑定数组；无变化时返回 null（避免无谓的持久化）
 */
export function computeAutoBindings(
  panel: LongProjectStoryboardPanel,
  index: AssetNameEntry[],
  resolveVariant: (asset: LongProjectAsset, text?: string) => LongProjectAsset['variants'][number] | undefined,
): LongProjectStoryboardAssetBinding[] | null {
  const text = panelScanText(panel)
  const detected = detectAssetsInText(text, index)
  const next = panel.assetBindings.filter((binding) => {
    if (!['auto-text', 'manual'].includes(binding.matchSource) || !binding.assetId) return true
    const asset = detected.get(binding.assetId)
    if (!asset) return false
    // 名称仍出现，保留
    return true
  })

  let changed = next.length !== panel.assetBindings.length
  for (const [assetId, asset] of detected) {
    const mentionedVariant = variantMentionedInText(asset, text)
    const variant = mentionedVariant ?? resolveVariant(asset, text)
    const existingIndex = next.findIndex((binding) => binding.assetId === assetId)
    if (existingIndex >= 0) {
      const existing = next[existingIndex]
      const followsResolvedState = existing.matchSource === 'auto-text' || existing.matchSource === 'manual'
      if (variant && existing.visualVersionId !== variant.id && (mentionedVariant || followsResolvedState)) {
        next[existingIndex] = {
          ...existing,
          assetName: asset.name,
          visualVersionId: variant.id,
          visualVersionName: variant.name,
          matchSource: 'auto-text',
          referenceImageIds: variant.referenceImageIds ?? [],
          selectedImageIds: undefined,
        }
        changed = true
      }
      continue
    }
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
 * 视觉状态解析：文字明确状态 → 本镜/上一镜延续 → 当前镜手选初始状态 → 章节范围默认。
 */
export function syncPanelsAutoBindings(
  panels: LongProjectStoryboardPanel[],
  index: AssetNameEntry[],
  fallbackVariant: (asset: LongProjectAsset) => LongProjectAsset['variants'][number] | undefined,
): LongProjectStoryboardPanel[] {
  // 记录每个资产最近一次绑定的视觉状态（跨分镜延续）
  const lastVariantByAsset = new Map<string, string>()
  return panels.map((panel) => {
    // 当前镜的手选状态是本镜初始锚点；一旦后续格文字明确切换状态，延续链随文字继续向后。
    const visibleAssets = detectAssetsInText([
      panelScanText(panel),
      ...(panel.cells ?? []).map(cellScanText),
    ].join('\n'), index)
    for (const binding of panel.assetBindings) {
      if (binding.matchSource === 'manual' && binding.assetId && binding.visualVersionId && visibleAssets.has(binding.assetId)) {
        lastVariantByAsset.set(binding.assetId, binding.visualVersionId)
      }
    }
    const resolveVariant = (asset: LongProjectAsset, text = '') => {
      const mentioned = variantMentionedInText(asset, text)
      if (mentioned) return mentioned
      const lastId = lastVariantByAsset.get(asset.id)
      const continued = lastId ? asset.variants.find((v) => v.id === lastId) : undefined
      return continued ?? fallbackVariant(asset)
    }
    if (panel.cells?.length) {
      let cellsChanged = false
      const cells = panel.cells.map((cell) => {
        const nextCellBindings = computeCellAutoBindings(cell, index, resolveVariant)
        const nextCell = nextCellBindings ? { ...cell, assetBindings: nextCellBindings } : cell
        if (nextCell !== cell) cellsChanged = true
        for (const binding of nextCell.assetBindings ?? []) {
          if (binding.assetId && binding.visualVersionId) lastVariantByAsset.set(binding.assetId, binding.visualVersionId)
        }
        return nextCell
      })
      // 画面描述可能提到资产但无法定位到具体格，先作为页级自动绑定保留，避免完全丢失。
      const summarizedCellBindings = summarizeCellBindingsForSync(cells)
      const cellKeys = new Set(summarizedCellBindings.map(bindingKey))
      const pageScanPanel = { ...panel, content: '', dialogue: undefined, narration: undefined, cells: undefined }
      const pageBindings = computeAutoBindings(pageScanPanel, index, resolveVariant)
      const resolvedPageBindings = pageBindings ?? panel.assetBindings
      const pageAuto = resolvedPageBindings.filter((binding) => binding.matchSource === 'auto-text' && (
        !cellKeys.has(bindingKey(binding))
        || summarizedCellBindings.some((cellBinding) => bindingKey(cellBinding) === bindingKey(binding) && cellBinding.visualVersionId !== binding.visualVersionId)
      ))
      const pageOverrideKeys = new Set(pageAuto.map(bindingKey))
      const previousByKey = new Map(panel.assetBindings.map((binding) => [bindingKey(binding), binding]))
      const cellBindings = summarizedCellBindings.filter((binding) => !pageOverrideKeys.has(bindingKey(binding))).map((binding) => {
        const previous = previousByKey.get(bindingKey(binding))
        if (previous && previous.visualVersionId === binding.visualVersionId && previous.selectedImageIds?.length) {
          return { ...binding, selectedImageIds: [...previous.selectedImageIds] }
        }
        return binding
      })
      const retainedPage = resolvedPageBindings.filter((binding) => binding.matchSource !== 'auto-text' && !cellKeys.has(bindingKey(binding)))
      const nextBindings = [...cellBindings, ...retainedPage, ...pageAuto]
      const bindingsChanged = nextBindings.length !== panel.assetBindings.length
        || nextBindings.some((binding, i) => !sameBinding(binding, panel.assetBindings[i]))
      if (!cellsChanged && !bindingsChanged) return panel
      return { ...panel, cells: cellsChanged ? cells : panel.cells, assetBindings: nextBindings }
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
