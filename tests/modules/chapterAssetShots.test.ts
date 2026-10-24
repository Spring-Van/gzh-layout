import { describe, expect, it } from 'vitest'
import { buildChapterAssetShots, groupChapterAssetShots } from '../../src/modules/comic/services/chapterAssetShots'
import type { LongProjectAsset, LongProjectChapterAsset } from '../../src/modules/comic/types'

/**
 * 资产「图片」视图的唯一口径问题：**同一资产的图必须挨在一起**。
 *
 * 章的 `chapterAssets` 是引用列表，顺序会随提取/确认交错（人物A、人物B、人物A 的另一个状态）。
 * 直接按列表铺进瀑布流，同一个角色的图会被拆散到各处。本文件锁三件事：
 * 1. 交错引用下，同一资产的图仍连续；
 * 2. 资产按类型归堆（人物 → 场景 → 道具）；
 * 3. 没生成图的状态不产项；同一变体被多条引用时不去重出错。
 */

function variant(id: string, name: string, images: string[] = []) {
  return { id, name, description: '', generatedImageIds: images, referenceImageIds: [] }
}

function asset(id: string, name: string, type: 'character' | 'scene' | 'prop', variants: ReturnType<typeof variant>[]) {
  return { id, name, type, aliases: [], description: '', variants, attributes: {}, sourceChapterIds: [] }
}

function entry(assetId: string, variantId?: string): LongProjectChapterAsset {
  return { id: `${assetId}:${variantId ?? 'all'}`, chapterId: 'c1', assetId, variantId } as LongProjectChapterAsset
}

const cast = (entries: LongProjectChapterAsset[], assets: unknown[]): string[] =>
  buildChapterAssetShots(entries, assets as LongProjectAsset[]).map((shot) => shot.url)

describe('buildChapterAssetShots · 同资产相邻', () => {
  it('引用列表交错时，同一资产的图仍然连续', () => {
    const 宋玉 = asset('a1', '宋玉', 'character', [
      variant('v1', '现在', ['宋玉-现在-1', '宋玉-现在-2']),
      variant('v2', '回忆', ['宋玉-回忆-1']),
    ])
    const 林越 = asset('a2', '林越', 'character', [variant('v3', '现在', ['林越-现在-1'])])
    // 真实场景：确认本章资产时按「候选出现顺序」写引用，两个角色会交错
    const entries = [entry('a1', 'v1'), entry('a2', 'v3'), entry('a1', 'v2')]
    expect(cast(entries, [宋玉, 林越])).toEqual([
      '宋玉-现在-1',
      '宋玉-现在-2',
      '宋玉-回忆-1',
      '林越-现在-1',
    ])
  })

  it('资产内状态按资产自身 variants 顺序，不跟引用顺序跳', () => {
    const 宋玉 = asset('a1', '宋玉', 'character', [
      variant('v1', '现在', ['图-现在']),
      variant('v2', '回忆', ['图-回忆']),
    ])
    // 引用顺序反着来（回忆先入），输出仍按资产定义顺序
    expect(cast([entry('a1', 'v2'), entry('a1', 'v1')], [宋玉])).toEqual(['图-现在', '图-回忆'])
  })

  it('资产按类型归堆：人物 → 场景 → 道具，同类型保持首次引用顺序', () => {
    const 场景 = asset('s1', '楼道', 'scene', [variant('sv', '夜', ['楼道-夜'])])
    const 人物 = asset('c1', '宋玉', 'character', [variant('cv', '现在', ['宋玉-现在'])])
    const 道具 = asset('p1', '手机', 'prop', [variant('pv', '默认', ['手机'])])
    const 人物2 = asset('c2', '林越', 'character', [variant('cv2', '现在', ['林越-现在'])])
    expect(cast([entry('s1'), entry('c1'), entry('p1'), entry('c2')], [场景, 人物, 道具, 人物2])).toEqual([
      '宋玉-现在',
      '林越-现在',
      '楼道-夜',
      '手机',
    ])
  })
})

describe('buildChapterAssetShots · 出图口径', () => {
  it('没有生成图的状态不产任何一项（不占位）', () => {
    const 宋玉 = asset('a1', '宋玉', 'character', [
      variant('v1', '现在', []),
      variant('v2', '回忆', ['回忆-1']),
    ])
    expect(cast([entry('a1')], [宋玉])).toEqual(['回忆-1'])
  })

  it('同一变体被多条引用时去重，图不重复出现', () => {
    const 宋玉 = asset('a1', '宋玉', 'character', [variant('v1', '现在', ['图1'])])
    expect(cast([entry('a1', 'v1'), entry('a1')], [宋玉])).toEqual(['图1'])
  })

  it('entry 指定了状态时只取该状态；未指定（旧数据）取全部状态', () => {
    const 宋玉 = asset('a1', '宋玉', 'character', [
      variant('v1', '现在', ['现在-1']),
      variant('v2', '回忆', ['回忆-1']),
    ])
    expect(cast([entry('a1', 'v2')], [宋玉])).toEqual(['回忆-1'])
    expect(cast([entry('a1')], [宋玉])).toEqual(['现在-1', '回忆-1'])
  })

  it('引用指向已删除的资产时跳过，不抛错', () => {
    expect(cast([entry('missing')], [])).toEqual([])
  })

  it('下载文件名：单图不带序号，多图带序号', () => {
    const 宋玉 = asset('a1', '宋玉', 'character', [
      variant('v1', '现在·病弱', ['x']),
      variant('v2', '回忆', ['y', 'z']),
    ])
    const shots = buildChapterAssetShots([entry('a1')], [宋玉] as unknown as LongProjectAsset[])
    expect(shots.map((shot) => shot.filename)).toEqual(['宋玉_现在·病弱', '宋玉_回忆_1', '宋玉_回忆_2'])
    // key 唯一，预览定位靠它
    expect(new Set(shots.map((shot) => shot.key)).size).toBe(shots.length)
  })
})

/**
 * 视图是「一个资产一行、行内横向排列」，分组必须与排序同源：
 * 组内顺序 = 扁平顺序，不会因为分组把同一资产的图拆到两行。
 */
describe('groupChapterAssetShots · 一个资产一行', () => {
  const build = (entries: LongProjectChapterAsset[], assets: unknown[]) =>
    groupChapterAssetShots(buildChapterAssetShots(entries, assets as LongProjectAsset[]))

  it('同一资产的全部状态、全部图落在同一组，且顺序不变', () => {
    const 宋玉 = asset('a1', '宋玉', 'character', [
      variant('v1', '现在', ['现在-1', '现在-2']),
      variant('v2', '回忆', ['回忆-1']),
    ])
    const 林越 = asset('a2', '林越', 'character', [variant('v3', '现在', ['林越-1'])])
    const groups = build([entry('a1', 'v1'), entry('a2', 'v3'), entry('a1', 'v2')], [宋玉, 林越])

    expect(groups.map((group) => group.assetId)).toEqual(['a1', 'a2'])
    expect(groups[0].assetName).toBe('宋玉')
    expect(groups[0].shots.map((shot) => shot.url)).toEqual(['现在-1', '现在-2', '回忆-1'])
    expect(groups[1].shots.map((shot) => shot.url)).toEqual(['林越-1'])
  })

  it('没有生成图的资产不出组（不占一行）', () => {
    const 宋玉 = asset('a1', '宋玉', 'character', [variant('v1', '现在', ['现在-1'])])
    const 空资产 = asset('a2', '没人画', 'character', [variant('v2', '现在', [])])
    const groups = build([entry('a1'), entry('a2')], [宋玉, 空资产])
    expect(groups.map((group) => group.assetId)).toEqual(['a1'])
  })

  it('没有任何生成图时返回空数组（视图走空态）', () => {
    expect(build([entry('missing')], [])).toEqual([])
  })

  it('每张图都带上所属资产 id，供分组使用', () => {
    const 宋玉 = asset('a1', '宋玉', 'character', [variant('v1', '现在', ['现在-1'])])
    const shots = buildChapterAssetShots([entry('a1')], [宋玉] as unknown as LongProjectAsset[])
    expect(shots.every((shot) => shot.assetId === 'a1')).toBe(true)
  })
})
