import { describe, expect, it } from 'vitest';
import type {
  LongProjectAsset,
  LongProjectAssetExtractionCandidate,
  LongProjectAssetExtractionRun,
} from '../../src/modules/comic/types';
import { sortAssetsByExtractionOrder } from '../../src/modules/comic/services/assetExtractionService';

function makeAsset(id: string, name: string, type: LongProjectAsset['type'], aliases: string[] = []): LongProjectAsset {
  return {
    id,
    type,
    name,
    aliases,
    fixedTraits: [],
    sourceChapterIds: ['chapter-1'],
    variants: [],
    status: 'confirmed',
    scope: 'chapter',
    createdAt: 1,
    updatedAt: 1,
  };
}

function makeCandidate(partial: Partial<LongProjectAssetExtractionCandidate> & { name: string; type: LongProjectAsset['type'] }): LongProjectAssetExtractionCandidate {
  return {
    id: `c-${partial.name}`,
    content: '',
    aliases: [],
    importance: 'major',
    evidence: [],
    decision: 'create',
    ...partial,
  };
}

function makeRun(candidates: LongProjectAssetExtractionCandidate[]): LongProjectAssetExtractionRun {
  return {
    id: 'run-1',
    chapterId: 'chapter-1',
    sourceContent: '',
    sourceWordCount: 0,
    modelId: 'm',
    templateId: 't',
    prompt: '',
    status: 'confirmed',
    candidates,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('sortAssetsByExtractionOrder', () => {
  it('按 人物 → 场景 → 道具 分组，组内保持候选顺序', () => {
    const assets = [
      makeAsset('a-prop', '怀表', 'prop'),
      makeAsset('a-scene', '雨夜小巷', 'scene'),
      makeAsset('a-char-2', '陈默', 'character'),
      makeAsset('a-char-1', '李渔', 'character'),
    ];
    const run = makeRun([
      makeCandidate({ name: '李渔', type: 'character', suggestedAssetId: 'a-char-1', decision: 'merge' }),
      makeCandidate({ name: '陈默', type: 'character', suggestedAssetId: 'a-char-2', decision: 'merge' }),
      makeCandidate({ name: '雨夜小巷', type: 'scene', suggestedAssetId: 'a-scene', decision: 'merge' }),
      makeCandidate({ name: '怀表', type: 'prop', suggestedAssetId: 'a-prop', decision: 'merge' }),
    ]);

    expect(sortAssetsByExtractionOrder(assets, run).map((item) => item.id))
      .toEqual(['a-char-1', 'a-char-2', 'a-scene', 'a-prop']);
  });

  it('新建资产确认前没有 assetId，按名称/别名归一化补位', () => {
    const assets = [makeAsset('a-new', '李渔', 'character'), makeAsset('a-other', '路人甲', 'character')];
    const run = makeRun([
      makeCandidate({ name: '李渔', type: 'character' }),
      makeCandidate({ name: '路人甲', type: 'character', aliases: ['路人'] }),
    ]);

    expect(sortAssetsByExtractionOrder(assets, run).map((item) => item.id)).toEqual(['a-new', 'a-other']);
  });

  it('别名也能对上已有的新建资产', () => {
    const assets = [makeAsset('a-1', '陈默', 'character', ['小默']), makeAsset('a-2', '李渔', 'character')];
    const run = makeRun([
      makeCandidate({ name: '李渔', type: 'character', suggestedAssetId: 'a-2', decision: 'merge' }),
      makeCandidate({ name: '小默', type: 'character' }),
    ]);

    expect(sortAssetsByExtractionOrder(assets, run).map((item) => item.id)).toEqual(['a-2', 'a-1']);
  });

  it('不在本次提取结果中的资产排在最后并保持原有相对顺序', () => {
    const assets = [makeAsset('a-old-1', '旧道具一', 'prop'), makeAsset('a-char', '李渔', 'character'), makeAsset('a-old-2', '旧道具二', 'prop')];
    const run = makeRun([makeCandidate({ name: '李渔', type: 'character', suggestedAssetId: 'a-char', decision: 'merge' })]);

    expect(sortAssetsByExtractionOrder(assets, run).map((item) => item.id)).toEqual(['a-char', 'a-old-1', 'a-old-2']);
  });

  it('ignore / pending 的候选不参与排序', () => {
    const assets = [makeAsset('a-1', '李渔', 'character'), makeAsset('a-2', '陈默', 'character')];
    const run = makeRun([
      makeCandidate({ name: '陈默', type: 'character', suggestedAssetId: 'a-2', decision: 'ignore' }),
      makeCandidate({ name: '李渔', type: 'character', suggestedAssetId: 'a-1', decision: 'merge' }),
    ]);

    expect(sortAssetsByExtractionOrder(assets, run).map((item) => item.id)).toEqual(['a-1', 'a-2']);
  });

  it('无 run 或无候选时原样返回（保持引用）', () => {
    const assets = [makeAsset('a-1', '李渔', 'character')];

    expect(sortAssetsByExtractionOrder(assets, null)).toBe(assets);
    expect(sortAssetsByExtractionOrder(assets, makeRun([]))).toBe(assets);
  });
});
