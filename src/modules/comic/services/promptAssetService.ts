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
  const all = variantMentionsInText(asset, text)
  return all.length ? all[all.length - 1].variant : undefined
}

interface VariantMention {
  variant: LongProjectAsset['variants'][number]
  /** 该状态在文本中的**最后**一次出现位置（紧凑文本下标） */
  position: number
}

/**
 * 文本提及的**全部**视觉状态，按首次提及顺序排列（去重）。
 *
 * 2026-09-22 起同一格/同一镜允许同一资产出现多个状态（`魔石碑亮起三段字符，随后变为七段` → 两个都绑），
 * `variantMentionedInText` 保留为「取最后提及者」的旧语义包装。
 */
function variantsMentionedInText(asset: LongProjectAsset, text: string): LongProjectAsset['variants'][number][] {
  return variantMentionsInText(asset, text).map((mention) => mention.variant)
}

function variantMentionsInText(asset: LongProjectAsset, text: string): VariantMention[] {
  const compactText = text.toLocaleLowerCase().replace(/[\s　]+/g, '')
  const byVariant = new Map<string, VariantMention>()
  for (const variant of asset.variants) {
    let best: VariantMention | undefined
    for (const cue of [variant.name, ...(variant.tags ?? [])]) {
      const compact = cue.trim().toLocaleLowerCase().replace(/[\s　]+/g, '')
      if (compact.length < 2 || !compactText.includes(compact)) continue
      const mention = { variant, position: compactText.lastIndexOf(compact) }
      if (!best || mention.position > best.position) best = mention
    }
    if (best && !byVariant.has(variant.id)) byVariant.set(variant.id, best)
  }
  return [...byVariant.values()].sort((a, b) => a.position - b.position)
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

/**
 * 绑定的**身份键**：`资产 + 视觉状态`。
 *
 * 2026-09-22 起同一资产允许在同一镜（页级）或同一格（格级）持有多个视觉状态 ——
 * 分镜画面需要几个状态就出几张参考图，去重与匹配一律按 `assetId::visualVersionId`，
 * 不再按 assetId 折叠（那会把多状态抹平成一个）。
 * 没有状态的绑定以空状态位参与键（`资产::`），与「有状态」的绑定互不冲突。
 */
export function bindingIdentityKey(binding: LongProjectStoryboardAssetBinding): string {
  const asset = binding.assetId ?? normalizedName(binding.assetName)
  return `${asset}::${binding.visualVersionId ?? ''}`
}

/**
 * 按「资产 + 状态」去重合并绑定列表：资产按首次出现顺序分组，同资产的多个状态按首次出现顺序排列。
 * 格级 → 页级汇总（`summarizeCellBindings` / `summarizeCellBindingsForSync`）共用这一条口径，
 * 保证 `格1 便装 + 格2 战斗服` 汇总成 `林小雨（便装）、林小雨（战斗服）` 而不是只留镜末状态。
 */
export function mergeBindingsByIdentity(bindings: Iterable<LongProjectStoryboardAssetBinding>): LongProjectStoryboardAssetBinding[] {
  const assetOrder: string[] = []
  const byAsset = new Map<string, Map<string, LongProjectStoryboardAssetBinding>>()
  for (const binding of bindings) {
    const assetKey = binding.assetId ?? normalizedName(binding.assetName)
    let variants = byAsset.get(assetKey)
    if (!variants) {
      variants = new Map()
      byAsset.set(assetKey, variants)
      assetOrder.push(assetKey)
    }
    const key = bindingIdentityKey(binding)
    if (!variants.has(key)) variants.set(key, { ...binding })
  }
  return assetOrder.flatMap((assetKey) => [...byAsset.get(assetKey)!.values()])
}

function sameBinding(a: LongProjectStoryboardAssetBinding, b: LongProjectStoryboardAssetBinding): boolean {
  return bindingKey(a) === bindingKey(b)
    && a.visualVersionId === b.visualVersionId
    && a.visualVersionName === b.visualVersionName
    && a.matchSource === b.matchSource
}

/**
 * 单个资产的自动绑定扫描（格级 / 页级共用一套口径）。
 *
 * 2026-09-22 起**同一资产允许多个状态**：
 * - 文本提及的状态**全部**绑定（`魔石碑亮起三段，随后变七段` → 两条绑定、出两张参考图）；
 *   已有 auto-text 槽位按序复用（保持列表位置，避免图号跳动），不够的追加，多余的移除；
 * - **manual 绑定是用户锚点，永不自动改写、不因文本提及其他状态而被覆盖**；
 * - 文本未提及任何状态时：维持既有绑定不动（多状态下「该改哪条」无从判断）；
 *   仅在「完全没有绑定」或「唯一一条缺状态」时用延续/默认兜底 —— 与旧单状态行为一致。
 */
function scanAssetBindingsForAsset(
  bindings: LongProjectStoryboardAssetBinding[],
  asset: LongProjectAsset,
  mentioned: LongProjectAsset['variants'][number][],
  resolveVariant: (asset: LongProjectAsset, text?: string) => LongProjectAsset['variants'][number] | undefined,
  text: string,
): { next: LongProjectStoryboardAssetBinding[]; changed: boolean } {
  const next = [...bindings]
  let changed = false
  const isAsset = (binding: LongProjectStoryboardAssetBinding) => binding.assetId === asset.id
  const autoSlots = () => next.reduce<number[]>((acc, binding, index) => {
    if (isAsset(binding) && binding.matchSource === 'auto-text') acc.push(index)
    return acc
  }, [])
  const makeBinding = (variant: LongProjectAsset['variants'][number] | undefined): LongProjectStoryboardAssetBinding => ({
    assetId: asset.id,
    assetName: asset.name,
    visualVersionId: variant?.id,
    visualVersionName: variant?.name,
    matchSource: 'auto-text',
    referenceImageIds: variant?.referenceImageIds ?? [],
  })

  if (mentioned.length) {
    const mentionedIds = new Set(mentioned.map((variant) => variant.id))
    const slots = autoSlots()
    let slotCursor = 0
    mentioned.forEach((variant) => {
      // 非 auto 来源（model / manual / chapter-range）已有这个「资产+状态」→ 不重复建
      if (next.some((binding) => isAsset(binding) && binding.matchSource !== 'auto-text' && binding.visualVersionId === variant.id)) return
      if (slotCursor < slots.length) {
        const index = slots[slotCursor]
        slotCursor += 1
        if (next[index].visualVersionId !== variant.id) {
          next[index] = { ...next[index], visualVersionId: variant.id, visualVersionName: variant.name, referenceImageIds: variant.referenceImageIds ?? [], selectedImageIds: undefined }
          changed = true
        }
        return
      }
      next.push(makeBinding(variant))
      changed = true
    })
    // 移除不再被提及的 auto 槽位（从后往前删，避免下标失效）
    for (let index = next.length - 1; index >= 0; index -= 1) {
      const binding = next[index]
      if (isAsset(binding) && binding.matchSource === 'auto-text' && binding.visualVersionId && !mentionedIds.has(binding.visualVersionId)) {
        next.splice(index, 1)
        changed = true
      }
    }
    return { next, changed }
  }

  const existing = next.filter(isAsset)
  if (!existing.length) {
    next.push(makeBinding(resolveVariant(asset, text)))
    return { next, changed: true }
  }
  if (existing.length === 1 && !existing[0].visualVersionId) {
    const variant = resolveVariant(asset, text)
    if (variant) {
      const index = next.indexOf(existing[0])
      next[index] = { ...existing[0], visualVersionId: variant.id, visualVersionName: variant.name, referenceImageIds: variant.referenceImageIds ?? [], selectedImageIds: undefined }
      return { next, changed: true }
    }
  }
  return { next, changed }
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
  for (const [, asset] of detected) {
    const result = scanAssetBindingsForAsset(next, asset, variantsMentionedInText(asset, text), resolveVariant, text)
    if (result.changed) changed = true
    next.splice(0, next.length, ...result.next)
  }
  return changed ? next : null
}

/** 格级绑定汇总到页级：按「资产+状态」去重（同一资产的多个状态各留一条），保留首次出现顺序。 */
function summarizeCellBindingsForSync(cells: LongProjectStoryboardCell[]): LongProjectStoryboardAssetBinding[] {
  return mergeBindingsByIdentity(cells.flatMap((cell) => cell.assetBindings ?? []))
}

/** 自动绑定完整性审计：返回文本已命中、但当前格没有对应绑定的资产。 */
export interface PanelBindingAuditIssue {
  cellIndex: number
  asset?: LongProjectAsset
  label: string
  reason: 'missing-binding' | 'ambiguous-name' | 'unmatched-asset' | 'missing-variant'
  /** 名称有歧义时的候选资产（reason = 'ambiguous-name'），供一键补绑直接选用。 */
  candidates?: LongProjectAsset[]
}

/** 审计原因 → 界面文案（toast 与中栏待核对区共用，保证同一问题两处措辞一致）。 */
export const PANEL_BINDING_AUDIT_REASON_TEXT: Record<PanelBindingAuditIssue['reason'], string> = {
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
  // 页级绑定 id 集合：格级与页级是同一份声明的两个视图（生图取图以页级为准），
  // 任一有绑定就不算漏绑 —— 否则「只写页级」的旧数据会被逐格误报未绑定。
  const pageBoundIds = new Set((panel.assetBindings ?? []).map((binding) => binding.assetId).filter(Boolean) as string[])
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
    const bound = new Set([
      ...bindings.map((binding) => binding.assetId).filter(Boolean),
      ...pageBoundIds,
    ] as string[])
    for (const asset of detectAssetsInText(text, index).values()) {
      if (!bound.has(asset.id)) issues.push({ cellIndex, asset, label: asset.name, reason: 'missing-binding' })
    }
    const compactText = normalizedName(text)
    for (const [name, entries] of ambiguousGroups) {
      const candidates = [...new Map(entries.map((entry) => [entry.asset.id, entry.asset])).values()]
      if (!compactText.includes(name) || candidates.some((asset) => bound.has(asset.id))) continue
      issues.push({ cellIndex, label: `${entries[0].name}（候选：${candidates.map((asset) => asset.name).join(' / ')}）`, reason: 'ambiguous-name', candidates })
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
 * 「本镜绑定待核对」项：把审计问题翻译成**一个明确的解法 + 现成的候选**。
 *
 * 审计只负责发现问题，本结构负责让每个问题都能一步解决：
 * - `add`：补一条绑定（文本已命中但未绑 → 候选已定；歧义名 → 候选为同名资产列表）；
 * - `set-variant`：绑定已存在但视觉状态未定 → 选一个状态（取图时状态未定会被直接丢弃，这是漏图主因）；
 * - `remove`：绑定指向的资产在库里找不到（名字写错 / 资产已删）→ 移除或换绑。
 */
export interface PanelBindingFix {
  /** 列表 key（同一分镜内唯一） */
  id: string
  reason: PanelBindingAuditIssue['reason']
  /** 涉及的格序号（0 起；-1 = 仅页级声明） */
  cellIndex: number
  /** 展示标签：资产名 / 歧义名（含候选）/ 未匹配的原始名 */
  label: string
  /** 动作类型 */
  action: 'add' | 'set-variant' | 'remove'
  /** 目标资产：`add`/`set-variant` 已确定；歧义名与未匹配需用户先选 */
  asset?: LongProjectAsset
  /** 需要用户先选资产时的候选（歧义名有多个候选；未匹配时为空 = 从全库选） */
  candidates?: LongProjectAsset[]
  /** 已有绑定在 `panel.assetBindings` 中的下标（`set-variant` / `remove` 用） */
  bindingIndex?: number
}

/**
 * 审计问题 → 可执行操作项（同资产的同类问题去重，保留首次出现的格序号）。
 *
 * 去重的意义：同一资产漏绑往往在多个格同时命中（同一页第1格和第3格都写了它），
 * 但解法只有一个 —— 补一条页级绑定，所以列表里只该出现一行。
 */
export function buildPanelBindingFixes(panel: LongProjectStoryboardPanel, index: AssetNameEntry[]): PanelBindingFix[] {
  const fixes: PanelBindingFix[] = []
  const seen = new Set<string>()
  for (const issue of auditPanelAssetBindings(panel, index)) {
    if (issue.reason === 'unmatched-asset') {
      const key = `remove:${issue.label}`
      if (seen.has(key)) continue
      seen.add(key)
      // 未匹配的绑定没有 assetId（资产已删或名字写错），只能按名字定位原绑定
      const bindingIndex = panel.assetBindings.findIndex((binding) => (binding.assetName ?? '').trim() === issue.label.trim())
      fixes.push({
        id: key, reason: issue.reason, cellIndex: issue.cellIndex, label: issue.label,
        action: 'remove',
        bindingIndex: bindingIndex >= 0 ? bindingIndex : undefined,
      })
      continue
    }
    if (issue.reason === 'ambiguous-name') {
      const key = `ambiguous:${issue.label}`
      if (seen.has(key)) continue
      seen.add(key)
      fixes.push({
        id: key, reason: issue.reason, cellIndex: issue.cellIndex, label: issue.label,
        action: 'add',
        candidates: issue.candidates,
      })
      continue
    }
    const asset = issue.asset
    if (!asset) continue
    const key = `${issue.reason}:${asset.id}`
    if (seen.has(key)) continue
    seen.add(key)
    const bindingIndex = panel.assetBindings.findIndex((binding) => binding.assetId === asset.id)
    fixes.push({
      id: key,
      reason: issue.reason,
      cellIndex: issue.cellIndex,
      label: asset.name,
      action: issue.reason === 'missing-variant' ? 'set-variant' : 'add',
      asset,
      bindingIndex: bindingIndex >= 0 ? bindingIndex : undefined,
    })
  }
  return fixes
}

/**
 * 计算分镜绑定在自动规则下的增量变更（纯函数，不修改入参）。
 * 规则：
 * - 文本中出现资产名且未绑定 → 新增 auto-text 绑定；
 * - auto-text / manual 绑定且资产名（含别名）从文本中消失 → 移除（文本是绑定的事实来源：
 *   画面上不再出现的资产不该继续占参考图位）；
 * - 文字明确写出的**每个**视觉状态都各有一条绑定（同一资产可多条，见 `scanAssetBindingsForAsset`）；
 * - manual 绑定是用户锚点，不自动改写；model/chapter-range/unmatched 不改动。
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
    return detected.has(binding.assetId)
  })

  let changed = next.length !== panel.assetBindings.length
  for (const [, asset] of detected) {
    const result = scanAssetBindingsForAsset(next, asset, variantsMentionedInText(asset, text), resolveVariant, text)
    if (result.changed) changed = true
    next.splice(0, next.length, ...result.next)
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
      // 键一律是「资产+状态」（bindingIdentityKey）：格级声明了 七段，页级画面描述又补了 九段 → 两条都保留。
      const summarizedCellBindings = summarizeCellBindingsForSync(cells)
      const cellKeys = new Set(summarizedCellBindings.map(bindingIdentityKey))
      const pageScanPanel = { ...panel, content: '', dialogue: undefined, narration: undefined, cells: undefined }
      const pageBindings = computeAutoBindings(pageScanPanel, index, resolveVariant)
      const resolvedPageBindings = pageBindings ?? panel.assetBindings
      const pageAuto = resolvedPageBindings.filter((binding) => binding.matchSource === 'auto-text' && !cellKeys.has(bindingIdentityKey(binding)))
      const pageOverrideKeys = new Set(pageAuto.map(bindingIdentityKey))
      const previousByKey = new Map(panel.assetBindings.map((binding) => [bindingIdentityKey(binding), binding]))
      const cellBindings = summarizedCellBindings.filter((binding) => !pageOverrideKeys.has(bindingIdentityKey(binding))).map((binding) => {
        const previous = previousByKey.get(bindingIdentityKey(binding))
        if (previous && previous.visualVersionId === binding.visualVersionId && previous.selectedImageIds?.length) {
          return { ...binding, selectedImageIds: [...previous.selectedImageIds] }
        }
        return binding
      })
      const retainedPage = resolvedPageBindings.filter((binding) => binding.matchSource !== 'auto-text' && !cellKeys.has(bindingIdentityKey(binding)))
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
    // 多状态镜（同资产多条绑定）参与延续无从判断该跟哪条 → 整镜跳过，只把非 auto 状态并入延续起点
    const assetBindings = panel.assetBindings.filter((item) => item.assetId === assetId)
    if (!assetBindings.length) return panel
    if (assetBindings.length > 1) {
      for (const binding of assetBindings) {
        if (binding.matchSource !== 'auto-text' && binding.visualVersionId) lastVariantId = binding.visualVersionId
      }
      return panel
    }
    const binding = assetBindings[0]
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
