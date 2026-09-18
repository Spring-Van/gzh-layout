import { describe, expect, it } from 'vitest';
import type {
  LongProjectAsset,
  LongProjectAssetVariant,
  LongProjectChapterAsset,
  LongProjectStoryboardRun,
} from '../../src/modules/comic/types';
import { buildAssetUsageIndex } from '../../src/modules/comic/services/assetUsageService';

/** 视觉状态（可指定参考图）。 */
function makeVariant(id: string, name: string, referenceImageIds: string[] = []): LongProjectAssetVariant {
  return {
    id,
    name,
    referenceImageIds,
    sourceChapterIds: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

function makeAsset(id: string, variants: LongProjectAssetVariant[]): LongProjectAsset {
  return {
    id,
    type: 'character',
    name: id,
    aliases: [],
    fixedTraits: [],
    sourceChapterIds: [],
    variants,
    status: 'confirmed',
    createdAt: 1,
    updatedAt: 1,
  };
}

/** 章节引用条目。 */
function makeChapterAsset(chapterId: string, assetId: string, variantId?: string): LongProjectChapterAsset {
  return { id: `${chapterId}-${assetId}-${variantId ?? 'all'}`, chapterId, assetId, variantId, appearance: 'introduced', evidence: [], createdAt: 1, updatedAt: 1 };
}

/** 分镜 run：panelId → 绑定列表。 */
function makeRun(chapterId: string, panels: Array<{ id: string; bindings: Array<{ assetId: string; visualVersionId?: string; selectedImageIds?: string[] }> }>): LongProjectStoryboardRun {
  return {
    id: `${chapterId}-run`,
    chapterId,
    sourceContent: '',
    modelId: 'm',
    templateId: 't',
    prompt: '',
    status: 'completed',
    panels: panels.map((panel, index) => ({
      id: panel.id,
      order: index + 1,
      content: '',
      assetBindings: panel.bindings.map((binding) => ({
        assetId: binding.assetId,
        assetName: binding.assetId,
        visualVersionId: binding.visualVersionId,
        matchSource: 'manual' as const,
        selectedImageIds: binding.selectedImageIds,
      })),
    })),
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('buildAssetUsageIndex', () => {
  const asset = makeAsset('a1', [makeVariant('v1', '常态', ['img-1', 'img-2']), makeVariant('v2', '受伤', ['img-9'])]);
  const assets = [asset];

  it('章节引用按 variantId 归属，整资产引用（variantId 为空）归给全部状态', () => {
    const index = buildAssetUsageIndex({
      assets,
      chapterAssets: [makeChapterAsset('c1', 'a1', 'v1'), makeChapterAsset('c2', 'a1')],
    });
    expect(index.variants.get('v1')?.chapterNames).toEqual(['c1', 'c2']);
    expect(index.variants.get('v2')?.chapterNames).toEqual(['c2']);
    expect(index.assets.get('a1')).toEqual(['c1', 'c2']);
  });

  it('章节名通过 chapterNameOf 解析；未命中时回落 id', () => {
    const index = buildAssetUsageIndex({
      assets,
      chapterAssets: [makeChapterAsset('c1', 'a1', 'v1')],
      chapterNameOf: (id) => (id === 'c1' ? '第 1 章' : id),
    });
    expect(index.variants.get('v1')?.chapterNames).toEqual(['第 1 章']);
  });

  it('分镜绑定按 panelId 去重计数；未手动选图时每镜只取该状态第一张', () => {
    const index = buildAssetUsageIndex({
      assets,
      storyboardRuns: [
        makeRun('c1', [
          { id: 'p1', bindings: [{ assetId: 'a1', visualVersionId: 'v1' }] },
          { id: 'p2', bindings: [{ assetId: 'a1', visualVersionId: 'v1' }] },
        ]),
        makeRun('c2', [{ id: 'p3', bindings: [{ assetId: 'a1', visualVersionId: 'v1' }] }]),
      ],
    });
    expect(index.variants.get('v1')?.panelCount).toBe(3);
    expect(index.variants.get('v1')?.imagePanelCount).toEqual({ 'img-1': 3 });
  });

  it('本镜手动选图时只统计选中的那一张（单选口径，与分镜页取图一致）', () => {
    const index = buildAssetUsageIndex({
      assets,
      storyboardRuns: [
        makeRun('c1', [
          { id: 'p1', bindings: [{ assetId: 'a1', visualVersionId: 'v1', selectedImageIds: ['img-2'] }] },
          { id: 'p2', bindings: [{ assetId: 'a1', visualVersionId: 'v1' }] },
        ]),
      ],
    });
    expect(index.variants.get('v1')?.panelCount).toBe(2);
    expect(index.variants.get('v1')?.imagePanelCount).toEqual({ 'img-1': 1, 'img-2': 1 });
  });

  it('选中的图已被删除时回落为该状态第一张', () => {
    const index = buildAssetUsageIndex({
      assets,
      storyboardRuns: [makeRun('c1', [{ id: 'p1', bindings: [{ assetId: 'a1', visualVersionId: 'v1', selectedImageIds: ['已删除'] }] }])],
    });
    expect(index.variants.get('v1')?.imagePanelCount).toEqual({ 'img-1': 1 });
  });

  it('历史数据里存了多张（旧的勾选子集语义）时只认第一张', () => {
    const index = buildAssetUsageIndex({
      assets,
      storyboardRuns: [makeRun('c1', [{ id: 'p1', bindings: [{ assetId: 'a1', visualVersionId: 'v1', selectedImageIds: ['img-2', 'img-1'] }] }])],
    });
    expect(index.variants.get('v1')?.imagePanelCount).toEqual({ 'img-2': 1 });
  });

  it('visualVersionId 缺失时回落该资产第一个状态；资产不存在则忽略', () => {
    const index = buildAssetUsageIndex({
      assets,
      storyboardRuns: [
        makeRun('c1', [
          { id: 'p1', bindings: [{ assetId: 'a1' }] },
          { id: 'p2', bindings: [{ assetId: 'missing' }] },
        ]),
      ],
    });
    expect(index.variants.get('v1')?.panelCount).toBe(1);
    expect(index.variants.get('v2')).toBeUndefined();
  });

  it('无任何引用时索引为空，且参考图为空的状态不产生图片统计', () => {
    const empty = buildAssetUsageIndex({ assets, chapterAssets: [], storyboardRuns: [] });
    expect(empty.variants.size).toBe(0);
    const noImage = makeAsset('a2', [makeVariant('v3', '空图')]);
    const index = buildAssetUsageIndex({
      assets: [noImage],
      storyboardRuns: [makeRun('c1', [{ id: 'p1', bindings: [{ assetId: 'a2', visualVersionId: 'v3' }] }])],
    });
    expect(index.variants.get('v3')?.panelCount).toBe(1);
    expect(index.variants.get('v3')?.imagePanelCount).toEqual({});
  });
});
