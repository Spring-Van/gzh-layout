import { describe, expect, it } from 'vitest'
import {
  REF_SHEET_VARIANT_NAME,
  auditSceneRefSheetNeeds,
  buildRefSheetVariantDraft,
  formatSceneRefSheetReasons,
  hasRefSheetVariant,
  summarizeSceneRefSheetNeeds,
} from '@comic/services/sceneRefSheetNeeds'
import type {
  LongProjectAsset,
  LongProjectChapterAsset,
  LongProjectStoryboardAssetBinding,
  LongProjectStoryboardCell,
  LongProjectStoryboardPanel,
} from '@comic/types'

function makeAsset(partial: Partial<LongProjectAsset> & { id: string; name: string }): LongProjectAsset {
  return {
    type: 'scene',
    aliases: [],
    fixedTraits: [],
    sourceChapterIds: [],
    variants: [],
    status: 'confirmed',
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  }
}

function binding(assetId: string, variantName = '全章默认'): LongProjectStoryboardAssetBinding {
  return { assetId, assetName: '占位', visualVersionName: variantName }
}

function makePanel(
  partial: Partial<LongProjectStoryboardPanel> & { id: string; order: number },
): LongProjectStoryboardPanel {
  return { content: '', assetBindings: [], ...partial }
}

function cell(partial: Partial<LongProjectStoryboardCell> = {}): LongProjectStoryboardCell {
  return { content: '', ...partial }
}

function chapterRef(chapterId: string, assetId: string, appearance: 'introduced' | 'reused' | 'changed' = 'introduced'): LongProjectChapterAsset {
  return { id: `${chapterId}-${assetId}`, chapterId, assetId, appearance, evidence: [], createdAt: 1, updatedAt: 1 }
}

describe('sceneRefSheetNeeds · 触发条件', () => {
  it('单章只出镜 1 页、单章引用、无机位变化 → 不需要机位图', () => {
    const asset = makeAsset({ id: 'scene-1', name: '教室' })
    const panels = [makePanel({ id: 'p1', order: 1, assetBindings: [binding('scene-1')] })]
    expect(auditSceneRefSheetNeeds({ assets: [asset], panels })).toEqual([])
  })

  it('单章出镜 ≥2 页 → 命中 multi-page', () => {
    const asset = makeAsset({ id: 'scene-1', name: '教室' })
    const panels = [
      makePanel({ id: 'p1', order: 1, assetBindings: [binding('scene-1')] }),
      makePanel({ id: 'p2', order: 2, assetBindings: [binding('scene-1')] }),
    ]
    const [need] = auditSceneRefSheetNeeds({ assets: [asset], panels })
    expect(need.reasons).toEqual(['multi-page'])
    expect(need.panelCount).toBe(2)
  })

  it('格级绑定同样计入出镜页数（页级未声明、某格声明）', () => {
    const asset = makeAsset({ id: 'scene-1', name: '教室' })
    const panels = [
      makePanel({ id: 'p1', order: 1, cells: [cell({ content: 'a', assetBindings: [binding('scene-1')] })] }),
      makePanel({ id: 'p2', order: 2, cells: [cell({ content: 'b', assetBindings: [binding('scene-1')] })] }),
    ]
    const [need] = auditSceneRefSheetNeeds({ assets: [asset], panels })
    expect(need.panelCount).toBe(2)
    expect(need.reasons).toContain('multi-page')
  })

  it('同一页内绑定多次只算一页', () => {
    const asset = makeAsset({ id: 'scene-1', name: '教室' })
    const panels = [
      makePanel({
        id: 'p1',
        order: 1,
        assetBindings: [binding('scene-1')],
        cells: [cell({ content: 'a', assetBindings: [binding('scene-1')] })],
      }),
      makePanel({ id: 'p2', order: 2, assetBindings: [binding('scene-1')] }),
    ]
    const [need] = auditSceneRefSheetNeeds({ assets: [asset], panels })
    expect(need.panelCount).toBe(2)
  })

  it('跨章复用：来源章节 ≥2 → 命中 reused', () => {
    const asset = makeAsset({ id: 'scene-1', name: '教室', sourceChapterIds: ['c1', 'c2'] })
    const [need] = auditSceneRefSheetNeeds({ assets: [asset], panels: [] })
    expect(need.reasons).toEqual(['reused'])
    expect(need.chapterCount).toBe(2)
  })

  it('跨章复用：章节引用标记 reused 也命中', () => {
    const asset = makeAsset({ id: 'scene-1', name: '教室', sourceChapterIds: ['c1'] })
    const needs = auditSceneRefSheetNeeds({
      assets: [asset],
      panels: [],
      chapterAssets: [chapterRef('c1', 'scene-1', 'reused')],
    })
    expect(needs[0].reasons).toContain('reused')
  })

  it('本章 + 上一章的引用合计 ≥2 → 命中 reused', () => {
    const asset = makeAsset({ id: 'scene-1', name: '教室' })
    const needs = auditSceneRefSheetNeeds({
      assets: [asset],
      panels: [],
      chapterAssets: [chapterRef('c1', 'scene-1')],
      chapterId: 'c2',
    })
    expect(needs[0].reasons).toContain('reused')
    expect(needs[0].chapterCount).toBe(2)
  })

  it('机位变化：命中 ≥2 类机位语汇才触发（单类不触发）', () => {
    const asset = makeAsset({ id: 'scene-1', name: '停车场' })
    // 单类机位：只有高机位 → 不触发
    const onlyHigh = [
      makePanel({
        id: 'p1',
        order: 1,
        assetBindings: [binding('scene-1')],
        cells: [cell({ content: 'a', shot: '俯视全景' })],
      }),
    ]
    expect(auditSceneRefSheetNeeds({ assets: [asset], panels: onlyHigh })).toEqual([])

    // 两类机位（同一页内即构成机位变化）→ 只命中 camera-change
    const twoClasses = [
      makePanel({
        id: 'p1',
        order: 1,
        assetBindings: [binding('scene-1')],
        cells: [cell({ content: 'a', shot: '俯视全景' }), cell({ content: 'b', camera: '反打机位' })],
      }),
    ]
    const [need] = auditSceneRefSheetNeeds({ assets: [asset], panels: twoClasses })
    expect(need.reasons).toEqual(['camera-change'])
    expect(need.cameraHints).toEqual(['高机位', '反打'])
  })

  it('机位语汇取自格级 景别 与 机位 两个字段', () => {
    const asset = makeAsset({ id: 'scene-1', name: '教室' })
    const panels = [
      makePanel({
        id: 'p1',
        order: 1,
        cells: [cell({ content: 'a', shot: '仰拍', camera: '地面向上推近', assetBindings: [binding('scene-1')] })],
      }),
      makePanel({
        id: 'p2',
        order: 2,
        cells: [cell({ content: 'b', camera: '自上方俯拍全景', assetBindings: [binding('scene-1')] })],
      }),
    ]
    const [need] = auditSceneRefSheetNeeds({ assets: [asset], panels })
    expect(need.cameraHints).toEqual(['高机位', '低机位'])
  })

  it('过肩 / POV 不算机位变化（否则对话戏会被全量误触发）', () => {
    const asset = makeAsset({ id: 'scene-1', name: '教室' })
    const panels = [
      makePanel({
        id: 'p1',
        order: 1,
        assetBindings: [binding('scene-1')],
        cells: [cell({ content: 'a', shot: '过肩' }), cell({ content: 'b', shot: 'POV' })],
      }),
    ]
    expect(auditSceneRefSheetNeeds({ assets: [asset], panels })).toEqual([])
  })

  it('机位语汇只统计绑定了该场景的分镜', () => {
    const target = makeAsset({ id: 'scene-1', name: '教室' })
    const other = makeAsset({ id: 'scene-2', name: '走廊' })
    const panels = [
      makePanel({ id: 'p1', order: 1, shot: '俯视', assetBindings: [binding('scene-1')] }),
      makePanel({ id: 'p2', order: 2, shot: '反打', assetBindings: [binding('scene-2')] }),
    ]
    const needs = auditSceneRefSheetNeeds({ assets: [target, other], panels })
    expect(needs).toEqual([])
  })

  it('非场景类型不参与判定', () => {
    const character = makeAsset({ id: 'a1', name: '林小雨', type: 'character', sourceChapterIds: ['c1', 'c2'] })
    expect(auditSceneRefSheetNeeds({ assets: [character], panels: [] })).toEqual([])
  })

  it('绑定无 assetId 时按资产名 / 别名兜底匹配', () => {
    const asset = makeAsset({ id: 'scene-1', name: '教室', aliases: ['三年二班教室'] })
    const panels = [
      makePanel({ id: 'p1', order: 1, assetBindings: [{ assetName: '教室' }] }),
      makePanel({ id: 'p2', order: 2, assetBindings: [{ assetName: ' 三年二班教室 ' }] }),
    ]
    const [need] = auditSceneRefSheetNeeds({ assets: [asset], panels })
    expect(need.panelCount).toBe(2)
    expect(need.reasons).toContain('multi-page')
  })

  it('已存在「机位图」状态时标记 hasRefSheetVariant（仍会返回，供 UI 显示已就绪）', () => {
    const asset = makeAsset({
      id: 'scene-1',
      name: '教室',
      sourceChapterIds: ['c1', 'c2'],
      variants: [{ id: 'v1', name: '全章默认', referenceImageIds: [] }, { id: 'v2', name: '机位图', referenceImageIds: [] }],
    })
    const [need] = auditSceneRefSheetNeeds({ assets: [asset], panels: [] })
    expect(need.hasRefSheetVariant).toBe(true)
  })

  it('多个触发条件同时命中时按固定顺序排列', () => {
    const asset = makeAsset({ id: 'scene-1', name: '教室', sourceChapterIds: ['c1', 'c2'] })
    const panels = [
      makePanel({ id: 'p1', order: 1, shot: '俯视', assetBindings: [binding('scene-1')] }),
      makePanel({ id: 'p2', order: 2, shot: '反打', assetBindings: [binding('scene-1')] }),
    ]
    const [need] = auditSceneRefSheetNeeds({ assets: [asset], panels })
    expect(need.reasons).toEqual(['multi-page', 'reused', 'camera-change'])
  })
})

describe('sceneRefSheetNeeds · 汇总与草稿', () => {
  it('汇总区分「命中场景数」与「待补建数」', () => {
    const needs = [
      { assetId: 's1', assetName: 'A', reasons: ['reused' as const], panelCount: 0, chapterCount: 2, cameraHints: [], hasRefSheetVariant: false },
      { assetId: 's2', assetName: 'B', reasons: ['reused' as const], panelCount: 0, chapterCount: 2, cameraHints: [], hasRefSheetVariant: true },
    ]
    expect(summarizeSceneRefSheetNeeds(needs)).toEqual({ sceneCount: 2, pendingCount: 1 })
  })

  it('触发原因拼成中文提示', () => {
    expect(formatSceneRefSheetReasons(['multi-page', 'camera-change'])).toBe('单章出镜 ≥2 页、场景内机位变化')
  })

  it('草稿名称与模板口径一致、锚点写明不参与分镜、且每次生成独立 id', () => {
    const a = buildRefSheetVariantDraft()
    const b = buildRefSheetVariantDraft()
    expect(a.name).toBe(REF_SHEET_VARIANT_NAME)
    expect(a.anchor).toContain('不参与分镜画面')
    expect(a.description).toContain('3×3 九宫格机位图')
    expect(a.referenceImageIds).toEqual([])
    expect(a.id).not.toBe(b.id)
    // 必须带 manual 标记：资产提取重新确认按候选整表重建状态，没有它这条会被静默删除
    expect(a.origin).toBe('manual')
  })

  it('buildRefSheetVariantDraft 带 sourceChapterId 时写入来源章节', () => {
    expect(buildRefSheetVariantDraft({ sourceChapterId: 'chapter-9' }).sourceChapterIds).toEqual(['chapter-9'])
  })

  it('hasRefSheetVariant 按名称包含判断，兼容带后缀的命名', () => {
    expect(hasRefSheetVariant(makeAsset({ id: 's', name: 'A', variants: [{ id: 'v', name: '机位图（备用）', referenceImageIds: [] }] }))).toBe(true)
    expect(hasRefSheetVariant(makeAsset({ id: 's', name: 'A', variants: [{ id: 'v', name: '全章默认', referenceImageIds: [] }] }))).toBe(false)
  })
})
