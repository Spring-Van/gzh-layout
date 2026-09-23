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
  findOrphanEntries,
  overrideAssetWithCandidate,
  pruneOrphanEntries,
  repairDanglingBindings,
  repairDanglingChapterAssets,
  selectDroppedVariants,
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

  it('别名以本次提取结果为准（覆盖而非并集）——旧别名累积会让资产被判成歧义而退出自动绑定', () => {
    const candidate = makeCandidate({ aliases: ['阿渔'] });

    const overridden = overrideAssetWithCandidate(makeAsset(), candidate, CHAPTER);

    // makeAsset 原有别名「小鱼」，本次候选只给「阿渔」→ 旧别名必须被覆盖掉
    expect(overridden.aliases).toEqual(['阿渔']);
    expect(overridden.aliases).not.toContain('小鱼');
  });

  it('本次候选完全没给别名时保留原有别名，不把资产清空', () => {
    const candidate = makeCandidate({ aliases: [] });

    const overridden = overrideAssetWithCandidate(makeAsset(), candidate, CHAPTER);

    expect(overridden.aliases).toEqual(['小鱼']);
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

describe('selectDroppedVariants（审核页提示与影响面统计的共用口径）', () => {
  it('只有建议 id 命中的状态保留，其余旧状态算将被删除', () => {
    const candidate = makeCandidate({
      states: [{ id: 's1', name: '少年期', matchSource: 'model', suggestedVariantId: 'variant-a' }],
    });

    expect(selectDroppedVariants(makeAsset(), candidate).map((item) => item.id)).toEqual(['variant-b']);
  });

  it('没有建议 id 但状态同名时同样算保留（与 override 的兜底一致）', () => {
    const candidate = makeCandidate({ states: [{ id: 's1', name: '成年期', matchSource: 'new' }] });

    expect(selectDroppedVariants(makeAsset(), candidate).map((item) => item.id)).toEqual(['variant-a']);
  });

  it('旧状态全被接住时返回空数组', () => {
    const candidate = makeCandidate({
      states: [
        { id: 's1', name: '少年期', matchSource: 'model', suggestedVariantId: 'variant-a' },
        { id: 's2', name: '成年期', matchSource: 'model', suggestedVariantId: 'variant-b' },
      ],
    });

    expect(selectDroppedVariants(makeAsset(), candidate)).toEqual([]);
  });

  it('口径与实际覆盖结果一致：提示会删几个，就真有几个旧状态没被保留', () => {
    const candidate = makeCandidate({
      states: [
        { id: 's1', name: '少年期', matchSource: 'model', suggestedVariantId: 'variant-a' },
        { id: 's2', name: '结局期', matchSource: 'new' },
      ],
    });
    const asset = makeAsset();

    const dropped = selectDroppedVariants(asset, candidate);
    const overridden = overrideAssetWithCandidate(asset, candidate, CHAPTER);
    const keptOld = overridden.variants.filter((item) => asset.variants.some((old) => old.id === item.id));

    expect(keptOld).toHaveLength(asset.variants.length - dropped.length);
    expect(keptOld.map((item) => item.id)).toEqual(['variant-a']);
  });
});

describe('buildExtractionConfirmResult', () => {
  it('旧状态删除，本章引用重建（唯一行为，无模式选择）', () => {
    const candidate = makeCandidate({
      states: [
        { id: 's1', name: '少年期', description: 'x', matchSource: 'model', suggestedVariantId: 'variant-a' },
        { id: 's2', name: '结局期', description: 'y', matchSource: 'new' },
      ],
    });
    const result = buildExtractionConfirmResult(makeRun([candidate]), CHAPTER, [makeAsset()], []);

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

  it('手工引用（origin: manual，跨章节引用其他章节的图）在重新提取确认后仍保留', () => {
    const manualEntries: LongProjectChapterAsset[] = [
      { id: 'entry-manual', chapterId: CHAPTER, assetId: 'asset-from-chapter-1', variantId: 'variant-from-chapter-1', appearance: 'reused', evidence: [], origin: 'manual', createdAt: 1, updatedAt: 1 },
    ];
    const result = buildExtractionConfirmResult(makeRun([makeCandidate()]), CHAPTER, [makeAsset()], manualEntries);

    // extraction 来源的引用照旧重建，手工引用不能被抹掉
    expect(result.chapterAssets.some((entry) => entry.id === 'entry-manual')).toBe(true);
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

describe('buildExtractionConfirmResult · 状态去重（回归：确认后状态不被覆盖反而新增）', () => {
  it('两个候选状态命中同一条已有状态时只保留一条，不产生重复视觉状态', () => {
    const candidate = makeCandidate({
      states: [
        { id: 's1', name: '少年期', matchSource: 'model', suggestedVariantId: 'variant-a' },
        // 模糊匹配的第 ④ 档：包含匹配会把「少年」也指到「少年期」上
        { id: 's2', name: '少年', matchSource: 'model', suggestedVariantId: 'variant-a' },
      ],
    });
    const result = buildExtractionConfirmResult(makeRun([candidate]), CHAPTER, [makeAsset()], []);

    expect(result.assets[0].variants.map((item) => item.id)).toEqual(['variant-a']);
    // 保序：先出现的状态名胜出，不会把已有状态改名成后一条的名字
    expect(result.assets[0].variants[0].name).toBe('少年期');
    expect(result.chapterAssets.map((entry) => entry.variantId)).toEqual(['variant-a']);
  });

  it('两个都没有命中、但同名的状态只新建一条', () => {
    const candidate = makeCandidate({
      states: [
        { id: 's1', name: '常服', matchSource: 'new' },
        { id: 's2', name: '常服', matchSource: 'new' },
      ],
    });
    const result = buildExtractionConfirmResult(makeRun([candidate]), CHAPTER, [makeAsset()], []);

    expect(result.assets[0].variants.map((item) => item.name).filter((name) => name === '常服')).toHaveLength(1);
    expect(new Set(result.assets[0].variants.map((item) => item.id)).size).toBe(result.assets[0].variants.length);
  });

  it('同一次提取里重复的同名候选合并到同一条资产，不造第二条资产', () => {
    const first = makeCandidate({ id: 'c1', decision: 'create', suggestedAssetId: undefined, states: [{ id: 's1', name: '常服', matchSource: 'new' }] });
    const second = makeCandidate({ id: 'c2', decision: 'create', suggestedAssetId: undefined, states: [{ id: 's2', name: '受伤', matchSource: 'new' }] });
    const result = buildExtractionConfirmResult(makeRun([first, second]), CHAPTER, [], []);

    expect(result.assets).toHaveLength(1);
    // 两个候选的状态合并重建，互不冲掉
    expect(result.assets[0].variants.map((item) => item.name)).toEqual(['常服', '受伤']);
  });

  it('同资产多候选合并重建，状态不互相覆盖丢失', () => {
    const first = makeCandidate({ id: 'c1', states: [{ id: 's1', name: '少年期', matchSource: 'model', suggestedVariantId: 'variant-a' }] });
    const second = makeCandidate({ id: 'c2', states: [{ id: 's2', name: '成年期', matchSource: 'model', suggestedVariantId: 'variant-b' }] });
    const result = buildExtractionConfirmResult(makeRun([first, second]), CHAPTER, [makeAsset()], []);

    expect(result.assets[0].variants.map((item) => item.id)).toEqual(['variant-a', 'variant-b']);
    expect(result.chapterAssets.map((entry) => entry.variantId)).toEqual(['variant-a', 'variant-b']);
  });

  it('状态名只有空格/大小写差异时同样视为同一条（不新增重复）', () => {
    const candidate = makeCandidate({ states: [{ id: 's1', name: ' 少年 期 ', matchSource: 'new' }] });
    const result = buildExtractionConfirmResult(makeRun([candidate]), CHAPTER, [makeAsset()], []);

    expect(result.assets[0].variants.map((item) => item.id)).toEqual(['variant-a']);
    // 复用已有状态时用本次状态名回写（保留用户的命名意图）
    expect(result.assets[0].variants[0].name).toBe('少年 期');
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

  it('资产已被整条删除时移除该绑定（不留悬空 assetId = 幽灵资产）', () => {
    const panels = [makePanel([
      { assetId: 'asset-deleted', assetName: '已删资产', visualVersionId: 'v-x', visualVersionName: '旧状态', matchSource: 'manual' },
      { assetId: 'asset-1', assetName: '李渔', visualVersionId: 'variant-a', visualVersionName: '少年期', matchSource: 'manual' },
    ])];
    const result = repairDanglingBindings(panels, [makeAsset()], CHAPTER, { [CHAPTER]: 0 });

    expect(result[0].assetBindings.map((binding) => binding.assetId)).toEqual(['asset-1']);
  });

  it('没有 assetId 的绑定（名字没匹配到资产）保持原样，交给待核对区换绑', () => {
    const panels = [makePanel([{ assetName: '写错的名字', matchSource: 'unmatched' }])];
    const result = repairDanglingBindings(panels, [makeAsset()], CHAPTER, { [CHAPTER]: 0 });

    expect(result[0]).toBe(panels[0]);
    expect(result[0].assetBindings).toHaveLength(1);
  });

  it('格级绑定同样清理已删资产（页级与格级口径一致）', () => {
    const panel = makePanel([]);
    panel.cells = [
      { content: '画面', assetBindings: [{ assetId: 'asset-deleted', assetName: '已删资产', matchSource: 'manual' }] },
      { content: '画面二', assetBindings: [{ assetId: 'asset-1', assetName: '李渔', visualVersionId: 'variant-a', matchSource: 'manual' }] },
    ];
    const result = repairDanglingBindings([panel], [makeAsset()], CHAPTER, { [CHAPTER]: 0 });

    expect(result[0].cells?.[0].assetBindings).toEqual([]);
    expect(result[0].cells?.[1].assetBindings).toHaveLength(1);
  });
});

describe('repairDanglingChapterAssets（跨章引用悬空兜底）', () => {
  function entry(partial: Partial<LongProjectChapterAsset> & { assetId: string }): LongProjectChapterAsset {
    return { id: `entry-${partial.assetId}-${partial.variantId ?? 'whole'}`, chapterId: CHAPTER, appearance: 'reused', evidence: [], createdAt: 1, updatedAt: 1, ...partial };
  }

  it('指向已被删除状态的其他章节引用，回落到该引用方章节的默认状态', () => {
    const asset = makeAsset({ variants: [makeVariant({ id: 'variant-new', name: '新状态' })] });
    const other = { ...entry({ assetId: 'asset-1', variantId: 'variant-deleted' }), chapterId: 'chapter-2' };
    const result = repairDanglingChapterAssets([other], [asset], { [CHAPTER]: 0, 'chapter-2': 1 });

    expect(result.reassigned).toBe(1);
    expect(result.dropped).toBe(0);
    expect(result.chapterAssets[0].variantId).toBe('variant-new');
  });

  it('引用仍然有效时原样返回（保持引用，避免无谓持久化）', () => {
    const asset = makeAsset();
    const valid = entry({ assetId: 'asset-1', variantId: 'variant-a' });
    const result = repairDanglingChapterAssets([valid], [asset], { [CHAPTER]: 0 });

    expect(result.chapterAssets[0]).toBe(valid);
    expect(result.reassigned + result.dropped).toBe(0);
  });

  it('整资产引用（无 variantId）不被主动补状态', () => {
    const asset = makeAsset();
    const whole = entry({ assetId: 'asset-1' });
    const result = repairDanglingChapterAssets([whole], [asset], { [CHAPTER]: 0 });

    expect(result.chapterAssets[0]).toBe(whole);
  });

  it('资产整条已不存在时丢弃该引用', () => {
    const result = repairDanglingChapterAssets([entry({ assetId: 'asset-gone', variantId: 'v-x' })], [makeAsset()], { [CHAPTER]: 0 });

    expect(result.dropped).toBe(1);
    expect(result.chapterAssets).toEqual([]);
  });
});

describe('findOrphanEntries（孤儿数据扫描）', () => {
  function entry(partial: Partial<LongProjectChapterAsset> & { assetId: string }): LongProjectChapterAsset {
    return { id: `entry-${partial.assetId}-${partial.variantId ?? 'whole'}`, chapterId: CHAPTER, appearance: 'reused', evidence: [], createdAt: 1, updatedAt: 1, ...partial };
  }

  it('被引用的视觉状态不算孤儿，没有被引用的才算', () => {
    const scan = findOrphanEntries([makeAsset()], [entry({ assetId: 'asset-1', variantId: 'variant-a' })]);

    expect(scan.variants.map((item) => item.variantId)).toEqual(['variant-b']);
    expect(scan.variants[0]).toMatchObject({ assetId: 'asset-1', assetName: '李渔', variantName: '成年期' });
    expect(scan.assets).toEqual([]);
  });

  it('被其他章节引用的状态同样不算孤儿', () => {
    const scan = findOrphanEntries(
      [makeAsset()],
      [entry({ assetId: 'asset-1', variantId: 'variant-a' }), entry({ assetId: 'asset-1', variantId: 'variant-b', chapterId: 'chapter-2' })],
    );

    expect(scan.variants).toEqual([]);
  });

  it('存在「整资产引用」时该资产的全部状态豁免（旧数据语义为引用全部状态）', () => {
    const scan = findOrphanEntries([makeAsset()], [entry({ assetId: 'asset-1' })]);

    expect(scan.variants).toEqual([]);
    expect(scan.assets).toEqual([]);
  });

  it('没有任何章节引用的 chapter 资产整条算孤儿，project 资产受保护', () => {
    const scan = findOrphanEntries(
      [makeAsset({ id: 'asset-orphan', name: '孤儿角色' }), makeAsset({ id: 'asset-project', name: '项目素材', scope: 'project' })],
      [],
    );

    expect(scan.assets).toEqual([{ assetId: 'asset-orphan', assetName: '孤儿角色', variantCount: 2 }]);
    expect(scan.variants).toEqual([]);
  });

  it('标记孤儿状态是否已有参考图/生成图，供清理前提示', () => {
    const asset = makeAsset({
      variants: [
        makeVariant({ id: 'variant-a', name: '少年期' }),
        makeVariant({ id: 'variant-b', name: '成年期', generatedImageIds: ['img-1'] }),
      ],
    });
    const scan = findOrphanEntries([asset], [entry({ assetId: 'asset-1', variantId: 'variant-a' })]);

    expect(scan.variants.map((item) => item.variantId)).toEqual(['variant-b']);
    expect(scan.variants[0].hasImages).toBe(true);
  });
});

describe('pruneOrphanEntries（按扫描结果剔除）', () => {
  function entry(partial: Partial<LongProjectChapterAsset> & { assetId: string }): LongProjectChapterAsset {
    return { id: `entry-${partial.assetId}-${partial.variantId ?? 'whole'}`, chapterId: CHAPTER, appearance: 'reused', evidence: [], createdAt: 1, updatedAt: 1, ...partial };
  }

  it('删除孤儿状态与孤儿资产，其余保持不变', () => {
    const assets = [makeAsset(), makeAsset({ id: 'asset-orphan', name: '孤儿角色', scope: 'chapter' })];
    const scan = findOrphanEntries(assets, [entry({ assetId: 'asset-1', variantId: 'variant-a' })]);
    const pruned = pruneOrphanEntries(assets, scan);

    expect(pruned.map((item) => item.id)).toEqual(['asset-1']);
    expect(pruned[0].variants.map((item) => item.id)).toEqual(['variant-a']);
  });

  it('没有孤儿数据时返回原引用，避免无谓持久化', () => {
    const assets = [makeAsset()];
    const pruned = pruneOrphanEntries(assets, { variants: [], assets: [] });

    expect(pruned).toBe(assets);
  });
});
