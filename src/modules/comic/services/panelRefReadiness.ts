/**
 * 分镜参考图就绪门禁（`panelRefReadiness`）—— 补齐绑定审计看不见的那一类问题。
 *
 * 绑定审计（`auditPanelAssetBindings`）只校验「文本 ↔ 绑定 ↔ 资产/状态」这条链，
 * **不看那张图到底存不存在**。于是存在这样一条静默链路：
 *   分镜声明「出场资产：A1 林小雨（便装）」→ 绑定落库 → 审计**全绿** →
 *   但该视觉状态一张成品图都没有 → `buildPanelRefManifest` 里的 `if (!image) continue`
 *   把它**静默剔除** → 提示词少一张参考图、模型自由发挥 → 这一镜的角色与其它镜不是同一个人，
 *   而且**全程零告警**。最糟的是「审计全绿」会给出虚假安全感。
 *
 * 本模块只做一件事：把「本镜声明的每个视觉状态是否都有可用成品图」摊开。
 *
 * ⚠️ 判定与生图**共用** `resolvePanelAssetStates` + `resolvePanelRefImage`（同一个取图口径），
 * 因此「门禁说缺」与「生图实际缺」必然一致 —— 不会误报，也不会漏报。
 * 取图口径见 `effectiveVariantRefImages`：**生成图 + 自行上传的成品图**；
 * 用户上传的 `referenceImageIds`（给该状态自己生图用的参考图）**不算**，与本项目其它处一致。
 *
 * 为什么单独成一个模块（而不是放进 `promptAssetService`）：
 * 依赖方向是 `promptAssetService` ← `storyboardService` ← `panelPromptService`，
 * 本模块需要 `panelPromptService` 的取图函数，放进 `promptAssetService` 会形成循环依赖。
 *
 * 纯函数、只读、无副作用：不写库、不改绑定、不触发任何持久化 —— 因此零迁移、零数据风险。
 */

import { resolvePanelAssetStates, resolvePanelRefImage } from './panelPromptService'
import { ASSET_REF_ORDER } from './panelRefManifest'
import type { LongProjectAsset, LongProjectStoryboardPanel } from '@comic/types'

/** 缺图项：某镜声明的某个视觉状态没有任何可用成品图。 */
export interface PanelRefReadinessIssue {
  /** 涉及的格序号（0 起）；来自页级声明（无格级出现）时为 -1。 */
  cellIndex: number
  assetId: string
  assetName: string
  variantId: string
  variantName: string
  reason: 'missing-image'
}

/** 门禁原因 → 界面文案（与绑定审计的措辞风格一致）。 */
export const PANEL_REF_READINESS_REASON_TEXT: Record<PanelRefReadinessIssue['reason'], string> = {
  'missing-image': '缺参考图',
}

/**
 * 逐镜列出缺图项，顺序与生图清单**严格同序**：人物 → 场景 → 道具（组内保持状态展开顺序）。
 *
 * ⚠️ `resolvePanelAssetStates` 返回的是**绑定声明顺序**，而 `buildPanelRefManifest` 会按
 * `ASSET_REF_ORDER` 重排后编号。这里必须自己再排一次，否则提示语里的顺序与「图N」对不上。
 *
 * 注意：同一「资产+状态」在本镜只出现一次（`resolvePanelAssetStates` 已按身份键去重），
 * 所以不会因为一个状态在多格出场而重复计入。
 */
export function auditPanelRefReadiness(
  panel: LongProjectStoryboardPanel,
  assets: LongProjectAsset[],
): PanelRefReadinessIssue[] {
  const states = resolvePanelAssetStates(panel, assets)
  const issues: PanelRefReadinessIssue[] = []
  for (const type of ASSET_REF_ORDER) {
    for (const { asset, variant, cellIndexes, binding } of states.filter((entry) => entry.asset.type === type)) {
      if (resolvePanelRefImage(variant, binding ?? {})) continue
      issues.push({
        cellIndex: cellIndexes.length ? cellIndexes[0] : -1,
        assetId: asset.id,
        assetName: asset.name,
        variantId: variant.id,
        variantName: variant.name,
        reason: 'missing-image',
      })
    }
  }
  return issues
}

/** 面向界面的摘要：`林小雨（便装）、训练场（全章默认）`（同一资产+状态只列一次）。 */
export function formatPanelRefReadinessIssues(issues: PanelRefReadinessIssue[]): string[] {
  return [...new Set(issues.map((issue) => `${issue.assetName}（${issue.variantName}）`))]
}

/** 整章缺图汇总（导入体检 / 批量生图前的提示语用）。 */
export interface PanelsRefReadinessSummary {
  /** 存在缺图的镜数。 */
  panelCount: number
  /** 缺图项总数（按「资产+状态」跨镜去重）—— 提示语用这个数更有意义：是几个状态没图，不是几处。 */
  stateCount: number
  /** 明细（按镜序），供需要逐条展示的场景使用。 */
  items: Array<{ panelOrder: number; assetName: string; variantName: string }>
}

/**
 * 整章缺图汇总。
 *
 * `stateCount` 按「资产+状态」去重：同一状态在第 3、第 7 镜都缺图时，
 * 「3 个状态缺图」比「12 处缺图」更能告诉用户该去做几件事。
 */
export function summarizePanelsRefReadiness(
  panels: LongProjectStoryboardPanel[],
  assets: LongProjectAsset[],
): PanelsRefReadinessSummary {
  const items: PanelsRefReadinessSummary['items'] = []
  const stateKeys = new Set<string>()
  let panelCount = 0
  for (const panel of panels) {
    const issues = auditPanelRefReadiness(panel, assets)
    if (!issues.length) continue
    panelCount += 1
    for (const issue of issues) {
      stateKeys.add(`${issue.assetId}::${issue.variantId}`)
      items.push({ panelOrder: panel.order, assetName: issue.assetName, variantName: issue.variantName })
    }
  }
  return { panelCount, stateCount: stateKeys.size, items }
}
