import { describe, expect, it } from 'vitest';
import type {
  LongProjectAsset,
  LongProjectAssetExtractionCandidate,
  LongProjectAssetExtractionRun,
  LongProjectAssetVariant,
  LongProjectChapterAsset,
  LongProjectStoryboardPanel,
} from '../../src/modules/comic/types';
import {
  buildExtractionConfirmResult,
  mergeCandidateIntoAsset,
  overrideAssetWithCandidate,
  repairDanglingBindings,
} from '../../src/modules/comic/services/assetExtractionConfirm';

const CHAPTER = 'chapter-1';

/** 已有视觉状态（可指定 id，便于断言 id 复用）。 */
function makeVariant(partial: Partial<LongProjectAssetVariant> & { id: string; name: string }): LongProjectAssetVariant {
  return {
    description: '',
    referenceImageIds: [],
    sourceChapterIds: [CHAPTER],
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

function makeAsset(partial: Partial<LongProjectAsset> = {}): LongProjectAsset {
  return {
    id: 'asset-1',
    type: 'character',
    name: '李渔',
    content: '# 李渔\n已有正文',
    aliases: ['小鱼'],
    description: '已有描述',
    fixedTraits: [],
    attributes: { 职业: '画师', 门派: '旧门派' },
    sourceChapterIds: [CHAPTER],
    variants: [
      makeVariant({ id: 'variant-a', name: '少年期', description: '已有状态描述', imagePrompt: '已有的状态提示词' }),
      makeVariant({ id: 'variant-b', name: '成年期', description: '成年期描述' }),
    ],
    status: 'confirmed',
    scope: 'chapter',
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

function makeCandidate(partial: Partial<LongProjectAssetExtractionCandidate> = {}): LongProjectAssetExtractionCandidate {
  return {
    id: 'candidate-1',
    type: 'character',
    name: '李渔',
    content: '# 李渔\n新提取正文',
    aliases: ['阿渔'],
    importance: 'major',
    description: '新提取描述',
    evidence: [],
    attributes: { 职业: '画师新', 身份: '谜团' },
    suggestedAssetId: 'asset-1',
    decision: 'merge',
    ...partial,
  };
}

function makeRun(candidates: LongProjectAssetExtractionCandidate[]): LongProjectAssetExtractionRun {
  return {
    id: 'run-1',
    chapterId: CHAPTER,
    sourceContent: '原文',
    sourceWordCount: 2,
    modelId: 'model-1',
    templateId: 'template-1',
    prompt: 'prompt',
    status: 'completed',
    candidates,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('mergeCandidateIntoAsset（已有值优先）', () => {
  it('资产级字段不被候选覆盖，只补空缺', () => {
    const merged = mergeCandidateIntoAsset(makeAsset(), makeCandidate(), CHAPTER);

    expect(merged.content).toBe('# 李渔\n已有正文');
    expect(merged.description).toBe('已有描述');
    expect(merged.attributes).toEqual({ 职业: '画师', 门派: '旧门派', 身份: '谜团' });
    // 别名是身份标识，始终求并集
    expect(merged.aliases).toEqual(['小鱼', '阿渔']);
  });

  it('已有视觉状态只补空缺字段，不覆盖已有描述与提示词', () => {
    const candidate = makeCandidate({
      states: [{ id: 's1', name: '少年期', description: '候选的新描述', imagePrompt: '候选的新提示词', matchSource: 'model', suggestedVariantId: 'variant-a' }],
    });

    const merged = mergeCandidateIntoAsset(makeAsset(), candidate, CHAPTER);
    const variant = merged.variants.find((item) => item.id === 'variant-a');

    expect(variant?.description).toBe('已有状态描述');
    expect(variant?.imagePrompt).toBe('已有的状态提示词');
    expect(merged.variants).toHaveLength(2);
  });

  it('已有字段为空时用候选补齐（资产级与状态级都生效）', () => {
    const asset = makeAsset({
      content: undefined,
      description: undefined,
      variants: [makeVariant({ id: 'variant-a', name: '少年期', description: '' })],
    });
    const candidate = makeCandidate({
      states: [{ id: 's1', name: '少年期', description: '补齐的描述', matchSource: 'model', suggestedVariantId: 'variant-a' }],
    });

    const merged = mergeCandidateIntoAsset(asset, candidate, CHAPTER);

    expect(merged.content).toBe('# 李渔\n新提取正文');
    expect(merged.description).toBe('新提取描述');
    expect(merged.variants.find((item) => item.id === 'variant-a')?.description).toBe('补齐的描述');
  });
});

describe('overrideAssetWithCandidate（本次结果优先）', () => {
  it('资产信息被候选重写，本次未出现的视觉状态被删除', () => {
    const candidate = makeCandidate({
      states: [{ id: 's1', name: '少年期', description: '新描述', matchSource: 'model', suggestedVariantId: 'variant-a' }],
    });

    const overridden = overrideAssetWithCandidate(makeAsset(), candidate, CHAPTER);

    expect(overridden.content).toBe('# 李渔\n新提取正文');
    expect(overridden.description).toBe('新提取描述');
    expect(overridden.variants.map((item) => item.name)).toEqual(['少年期']);
  });

  it('命中已有状态时复用原 id，分镜绑定不会悬空', () => {
    const candidate = makeCandidate({
      states: [
        { id: 's1', name: '少年期', description: '新描述', matchSource: 'model', suggestedVariantId: 'variant-a' },
        { id: 's2', name: '成年期', matchSource: 'model', suggestedVariantId: 'variant-b' },
      ],
    });

    const overridden = overrideAssetWithCandidate(makeAsset(), candidate, CHAPTER);

    expect(overridden.variants.map((item) => item.id)).toEqual(['variant-a', 'variant-b']);
    // 已有值优先补空缺仍在：候选没给描述时保留原描述
    expect(overridden.variants.find((item) => item.id === 'variant-b')?.description).toBe('成年期描述');
  });

  it('没有归属建议时按同名状态复用 id', () => {
    const candidate = makeCandidate({ states: [{ id: 's1', name: '少年期', description: '新描述', matchSource: 'new' }] });

    const overridden = overrideAssetWithCandidate(makeAsset(), candidate, CHAPTER);

    expect(overridden.variants.map((item) => item.id)).toEqual(['variant-a']);
  });

  it('候选没有任何视觉状态时保留旧状态，避免清空资产的视觉身份', () => {
    const overridden = overrideAssetWithCandidate(makeAsset(), makeCandidate(), CHAPTER);

    expect(overridden.variants.map((item) => item.id)).toEqual(['variant-a', 'variant-b']);
  });
});

describe('buildExtractionConfirmResult', () => {
  it('merge 模式：旧状态保留，本次新增状态追加', () => {
    const candidate = makeCandidate({
      states: [
        { id: 's1', name: '少年期', description: 'x', matchSource: 'model', suggestedVariantId: 'variant-a' },
        { id: 's2', name: '结局期', description: 'y', matchSource: 'new' },
      ],
    });
    const result = buildExtractionConfirmResult(makeRun([candidate]), CHAPTER, [makeAsset()], []);

    expect(result.assets[0].variants.map((item) => item.name)).toEqual(['少年期', '成年期', '结局期']);
  });

  it('override 模式：旧状态删除，本章引用重建', () => {
    const candidate = makeCandidate({
      states: [
        { id: 's1', name: '少年期', description: 'x', matchSource: 'model', suggestedVariantId: 'variant-a' },
        { id: 's2', name: '结局期', description: 'y', matchSource: 'new' },
      ],
    });
    const result = buildExtractionConfirmResult(makeRun([candidate]), CHAPTER, [makeAsset()], [], 'override');

    const names = result.assets[0].variants.map((item) => item.name);
    expect(names).toEqual(['少年期', '结局期']);
    // 命中的状态引用原 variant id，新建状态引用 override 新建的 variant id
    const createdVariantId = result.assets[0].variants.find((item) => item.name === '结局期')?.id;
    expect(result.chapterAssets.map((entry) => entry.variantId)).toEqual(['variant-a', createdVariantId]);
    // appearance 按候选粒度标记：命中已有资产整条记 reused，未命中记 introduced
    expect(result.chapterAssets.map((entry) => entry.appearance)).toEqual(['reused', 'reused']);
  });

  it('未匹配到已有资产的候选走新建，scope 为 chapter', () => {
    const candidate = makeCandidate({ suggestedAssetId: undefined, decision: 'create' });
    const result = buildExtractionConfirmResult(makeRun([candidate]), CHAPTER, [makeAsset()], []);

    expect(result.assets).toHaveLength(2);
    const created = result.assets.find((item) => item.id !== 'asset-1');
    expect(created?.scope).toBe('chapter');
    expect(result.chapterAssets[0].appearance).toBe('introduced');
  });

  it('清空本章旧章节引用，不再出现的章节资产被移除', () => {
    const stale = makeAsset({ id: 'asset-stale', name: '旧道具', type: 'prop', scope: 'chapter' });
    const staleEntries: LongProjectChapterAsset[] = [
      { id: 'entry-1', chapterId: CHAPTER, assetId: 'asset-stale', appearance: 'introduced', evidence: [], createdAt: 1, updatedAt: 1 },
    ];
    const result = buildExtractionConfirmResult(makeRun([makeCandidate()]), CHAPTER, [makeAsset(), stale], staleEntries);

    expect(result.assets.map((item) => item.id)).not.toContain('asset-stale');
    expect(result.chapterAssets.every((entry) => entry.assetId !== 'asset-stale')).toBe(true);
  });

  it('被其他章节引用的章节资产不会被误删', () => {
    const shared = makeAsset({ id: 'asset-shared', name: '共用场景', type: 'scene', scope: 'chapter' });
    const otherChapterEntries: LongProjectChapterAsset[] = [
      { id: 'entry-2', chapterId: 'chapter-2', assetId: 'asset-shared', appearance: 'introduced', evidence: [], createdAt: 1, updatedAt: 1 },
    ];
    const result = buildExtractionConfirmResult(makeRun([makeCandidate()]), CHAPTER, [makeAsset(), shared], otherChapterEntries);

    expect(result.assets.map((item) => item.id)).toContain('asset-shared');
    expect(result.chapterAssets.some((entry) => entry.chapterId === 'chapter-2')).toBe(true);
  });

  it('ignore / pending 的候选不产生任何写入', () => {
    const result = buildExtractionConfirmResult(
      makeRun([makeCandidate({ decision: 'ignore' }), makeCandidate({ id: 'c2', decision: 'pending' })]),
      CHAPTER,
      [makeAsset()],
      [],
    );

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].content).toBe('# 李渔\n已有正文');
    expect(result.chapterAssets).toHaveLength(0);
  });
});

describe('repairDanglingBindings（覆盖后的悬空绑定兜底）', () => {
  function makePanel(bindings: LongProjectStoryboardPanel['assetBindings']): LongProjectStoryboardPanel {
    return { id: 'panel-1', order: 1, content: '画面', assetBindings: bindings };
  }

  it('指向已被删除状态的绑定回落到章节范围默认状态', () => {
    const asset = makeAsset({ variants: [makeVariant({ id: 'variant-new', name: '新状态', referenceImageIds: ['img-1'] })] });
    const panels = repairDanglingBindings(
      [makePanel([{ assetId: 'asset-1', assetName: '李渔', visualVersionId: 'variant-deleted', visualVersionName: '已删状态', matchSource: 'manual' }])],
      [asset],
      CHAPTER,
      { [CHAPTER]: 0 },
    );

    expect(panels[0].assetBindings[0]).toMatchObject({
      visualVersionId: 'variant-new',
      visualVersionName: '新状态',
      referenceImageIds: ['img-1'],
    });
  });

  it('资产改名后同步 assetName，未悬空的绑定不改视觉状态', () => {
    const asset = makeAsset({ name: '李渔（改名后）' });
    const panels = repairDanglingBindings(
      [makePanel([{ assetId: 'asset-1', assetName: '李渔', visualVersionId: 'variant-a', visualVersionName: '少年期', matchSource: 'manual' }])],
      [asset],
      CHAPTER,
      { [CHAPTER]: 0 },
    );

    expect(panels[0].assetBindings[0]).toMatchObject({ assetName: '李渔（改名后）', visualVersionId: 'variant-a' });
  });

  it('本来就没有视觉状态的绑定不被主动补状态', () => {
    const asset = makeAsset();
    const panels = repairDanglingBindings(
      [makePanel([{ assetId: 'asset-1', assetName: '李渔', matchSource: 'chapter-range' }])],
      [asset],
      CHAPTER,
      { [CHAPTER]: 0 },
    );

    expect(panels[0].assetBindings[0].visualVersionId).toBeUndefined();
  });

  it('无变化时保持原分镜引用，避免无谓持久化', () => {
    const asset = makeAsset();
    const panels = [makePanel([{ assetId: 'asset-1', assetName: '李渔', visualVersionId: 'variant-a', visualVersionName: '少年期', matchSource: 'manual' }])];
    const result = repairDanglingBindings(panels, [asset], CHAPTER, { [CHAPTER]: 0 });

    expect(result[0]).toBe(panels[0]);
  });
});
