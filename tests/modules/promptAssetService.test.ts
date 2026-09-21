import { describe, expect, it } from 'vitest'
import {
  auditPanelAssetBindings,
  buildAssetNameIndex,
  cellScanText,
  formatPanelBindingAuditIssues,
  syncPanelsAutoBindings,
} from '../../src/modules/comic/services/promptAssetService'
import type { LongProjectAsset, LongProjectStoryboardPanel } from '../../src/modules/comic/types'

const assets = [
  {
    id: 'a1', type: 'character', name: '林小雨', aliases: ['小雨'], variants: [
      { id: 'v1', name: '便装', referenceImageIds: ['casual'] },
      { id: 'v2', name: '战斗服', tags: ['作战姿态'], referenceImageIds: ['battle'] },
    ],
  },
  {
    id: 'a2', type: 'scene', name: '训练场', aliases: [], variants: [
      { id: 'v3', name: '白天', referenceImageIds: ['field'] },
    ],
  },
] as unknown as LongProjectAsset[]

const fallback = (asset: LongProjectAsset) => asset.variants[0]

describe('promptAssetService · 逐格自动绑定', () => {
  it('人物字段、动作字段和画面字段中的资产都会绑定到当前格', () => {
    expect(cellScanText({ content: '', cast: '林小雨', action: '林小雨推门', expression: '紧张', } as any)).toContain('林小雨')
    const panel = {
      id: 'p1', order: 1, content: '一页', assetBindings: [], cells: [
        { content: '铁门被推开', cast: '林小雨', action: '林小雨推门', assetBindings: [] },
        { content: '训练场中央', assetBindings: [] },
      ],
    } as unknown as LongProjectStoryboardPanel
    const [synced] = syncPanelsAutoBindings([panel], buildAssetNameIndex(assets), fallback)
    expect(synced.cells?.[0].assetBindings).toMatchObject([
      { assetId: 'a1', visualVersionId: 'v1', matchSource: 'auto-text' },
    ])
    expect(synced.cells?.[1].assetBindings).toMatchObject([
      { assetId: 'a2', visualVersionId: 'v3', matchSource: 'auto-text' },
    ])
    expect(synced.assetBindings.map((binding) => binding.assetId)).toEqual(['a1', 'a2'])
  })

  it('对白只提到资产时不视为画面出场，避免发送画外角色参考图', () => {
    const panel = {
      id: 'p1', order: 1, content: '一页', assetBindings: [], cells: [
        { content: '空荡的走廊', cast: '', speaker: '路人', dialogue: '林小雨已经离开训练场了', assetBindings: [] },
      ],
    } as unknown as LongProjectStoryboardPanel
    const [synced] = syncPanelsAutoBindings([panel], buildAssetNameIndex(assets), fallback)
    expect(synced.cells?.[0].assetBindings).toEqual([])
    expect(synced.assetBindings).toEqual([])
  })

  it('同一资产在后一格出现时沿用前一格自动状态，并且页级汇总取最后一格', () => {
    const panel = {
      id: 'p1', order: 1, content: '换装', assetBindings: [], cells: [
        { content: '林小雨穿便装', assetBindings: [{ assetId: 'a1', assetName: '林小雨', visualVersionId: 'v1', visualVersionName: '便装', matchSource: 'model' }] },
        { content: '林小雨继续前进', assetBindings: [] },
      ],
    } as unknown as LongProjectStoryboardPanel
    const [synced] = syncPanelsAutoBindings([panel], buildAssetNameIndex(assets), fallback)
    expect(synced.cells?.[1].assetBindings?.[0]).toMatchObject({ assetId: 'a1', visualVersionId: 'v1' })
    expect(synced.assetBindings[0]).toMatchObject({ assetId: 'a1', visualVersionId: 'v1' })
  })

  it('格内明确出现视觉状态名时优先切换状态，不盲目沿用上一状态', () => {
    const panel = {
      id: 'p1', order: 1, content: '换装', assetBindings: [], cells: [
        { content: '林小雨穿便装', assetBindings: [] },
        { content: '林小雨换上战斗服', assetBindings: [] },
      ],
    } as unknown as LongProjectStoryboardPanel
    const [synced] = syncPanelsAutoBindings([panel], buildAssetNameIndex(assets), fallback)
    expect(synced.cells?.[0].assetBindings?.[0]).toMatchObject({ visualVersionId: 'v1' })
    expect(synced.cells?.[1].assetBindings?.[0]).toMatchObject({ visualVersionId: 'v2', visualVersionName: '战斗服' })
    expect(synced.assetBindings[0]).toMatchObject({ visualVersionId: 'v2' })
  })

  it('审计能指出文本出现但格级没有绑定的资产', () => {
    const panel = {
      id: 'p1', order: 1, content: '一页', assetBindings: [], cells: [
        { content: '林小雨站在训练场', assetBindings: [] },
      ],
    } as unknown as LongProjectStoryboardPanel
    const issues = auditPanelAssetBindings(panel, buildAssetNameIndex(assets))
    expect(issues.map((issue) => [issue.cellIndex, issue.asset?.id])).toEqual([[0, 'a1'], [0, 'a2']])
    expect(formatPanelBindingAuditIssues(issues)).toEqual(['林小雨（未绑定）', '训练场（未绑定）'])
  })

  it('审计摘要会合并同一资产的重复问题并保留原因', () => {
    expect(formatPanelBindingAuditIssues([
      { cellIndex: 0, label: '测验魔石碑', reason: 'missing-variant' },
      { cellIndex: 1, label: '测验魔石碑', reason: 'missing-variant' },
      { cellIndex: 1, label: '旧资产', reason: 'unmatched-asset' },
    ])).toEqual(['测验魔石碑（未确定视觉状态）', '旧资产（资产未匹配）'])
  })

  it('重名别名不静默绑定到第一个资产，审计要求人工确认', () => {
    const ambiguousAssets = [
      ...assets,
      { id: 'a3', type: 'character', name: '周小雨', aliases: ['小雨'], variants: [{ id: 'v4', name: '常态', referenceImageIds: [] }] } as unknown as LongProjectAsset,
    ]
    const panel = {
      id: 'p1', order: 1, content: '一页', assetBindings: [], cells: [{ content: '小雨推门进来', assetBindings: [] }],
    } as unknown as LongProjectStoryboardPanel
    const index = buildAssetNameIndex(ambiguousAssets)
    const [synced] = syncPanelsAutoBindings([panel], index, fallback)
    expect(synced.cells?.[0].assetBindings).toEqual([])
    expect(auditPanelAssetBindings(synced, index)).toMatchObject([
      { cellIndex: 0, reason: 'ambiguous-name' },
    ])
  })

  it('文字明确写出新状态时覆盖手动状态，并清除旧状态的手选参考图', () => {
    const panel = {
      id: 'p1', order: 1, content: '换装',
      assetBindings: [{
        assetId: 'a1', assetName: '林小雨', visualVersionId: 'v2', visualVersionName: '战斗服',
        matchSource: 'manual', referenceImageIds: ['battle'], selectedImageIds: ['battle'],
      }],
      cells: [{
        content: '林小雨穿便装站着',
        assetBindings: [{ assetId: 'a1', assetName: '林小雨', visualVersionId: 'v1', visualVersionName: '便装', matchSource: 'auto-text' }],
      }],
    } as unknown as LongProjectStoryboardPanel
    const [synced] = syncPanelsAutoBindings([panel], buildAssetNameIndex(assets), fallback)
    expect(synced.cells?.[0].assetBindings?.[0]).toMatchObject({ visualVersionId: 'v1', matchSource: 'auto-text' })
    expect(synced.assetBindings[0]).toMatchObject({ visualVersionId: 'v1', matchSource: 'auto-text' })
    expect(synced.assetBindings[0].selectedImageIds).toBeUndefined()
  })

  it('资产从分镜与画面描述中都消失后移除旧手动绑定', () => {
    const panel = {
      id: 'p1', order: 1, content: '空房间', imagePrompt: '空房间内没有人物',
      assetBindings: [{
        assetId: 'a1', assetName: '林小雨', visualVersionId: 'v2', visualVersionName: '战斗服',
        matchSource: 'manual', referenceImageIds: ['battle'], selectedImageIds: ['battle'],
      }],
      cells: [{
        content: '空房间',
        assetBindings: [{ assetId: 'a1', assetName: '林小雨', visualVersionId: 'v2', visualVersionName: '战斗服', matchSource: 'manual' }],
      }],
    } as unknown as LongProjectStoryboardPanel
    const [synced] = syncPanelsAutoBindings([panel], buildAssetNameIndex(assets), fallback)
    expect(synced.cells?.[0].assetBindings).toEqual([])
    expect(synced.assetBindings).toEqual([])
  })

  it('同一资产在格内容与画面描述写出不同状态时保留两个状态来源', () => {
    const panel = {
      id: 'p1', order: 1, content: '换装', imagePrompt: '林小雨穿战斗服冲出门',
      assetBindings: [{ assetId: 'a1', assetName: '林小雨', visualVersionId: 'v1', visualVersionName: '便装', matchSource: 'model' }],
      cells: [{
        content: '林小雨穿便装站在门边',
        assetBindings: [{ assetId: 'a1', assetName: '林小雨', visualVersionId: 'v1', visualVersionName: '便装', matchSource: 'model' }],
      }],
    } as unknown as LongProjectStoryboardPanel
    const [synced] = syncPanelsAutoBindings([panel], buildAssetNameIndex(assets), fallback)
    expect(synced.cells?.[0].assetBindings?.[0]).toMatchObject({ visualVersionId: 'v1' })
    expect(synced.assetBindings[0]).toMatchObject({ visualVersionId: 'v2', matchSource: 'auto-text' })
  })

  it('画面描述写视觉状态标签时也能切换同一资产状态', () => {
    const panel = {
      id: 'p1', order: 1, content: '', imagePrompt: '林小雨进入作战姿态',
      assetBindings: [{ assetId: 'a1', assetName: '林小雨', visualVersionId: 'v1', visualVersionName: '便装', matchSource: 'manual' }],
    } as unknown as LongProjectStoryboardPanel
    const [synced] = syncPanelsAutoBindings([panel], buildAssetNameIndex(assets), fallback)
    expect(synced.assetBindings[0]).toMatchObject({ visualVersionId: 'v2', visualVersionName: '战斗服', matchSource: 'auto-text' })
  })
})
