import { describe, expect, it } from 'vitest';
import { cleanupChapterData, hasSweepWork, sweepProjectData } from '../../src/modules/comic/services/projectDataCleanup';
import type {
  ComicProject,
  LongProjectAsset,
  LongProjectAssetExtractionRun,
  LongProjectAssetVariant,
  LongProjectChapterAsset,
  LongProjectData,
  LongProjectNode,
  LongProjectPanelArtwork,
  LongProjectStoryboardPanel,
  LongProjectStoryboardRun,
} from '../../src/modules/comic/types';

/**
 * 项目数据清理的语义锁，两块：
 * 1. 删除章节时连带清理该章名下的全部数据（原先只摘节点树的坑）；
 * 2. 版本历史压缩 —— 分镜与提取都是「每次重跑/重导入追加一条」，历史版本没有界面消费，
 *    实测占了数据文件 90% 以上体积。
 */

const DEAD = 'chapter-dead';
const ALIVE = 'chapter-alive';

function node(id: string, order: number, type: LongProjectNode['type'] = 'chapter'): LongProjectNode {
  return { id, type, name: id, order, createdAt: 1, updatedAt: 1 } as LongProjectNode;
}

function variant(id: string, name: string, sourceChapterIds: string[]): LongProjectAssetVariant {
  return { id, name, referenceImageIds: [], sourceChapterIds, createdAt: 1, updatedAt: 1 };
}

function asset(partial: Partial<LongProjectAsset> & { id: string }): LongProjectAsset {
  return {
    type: 'character', name: partial.id, aliases: [], fixedTraits: [], variants: [],
    sourceChapterIds: [DEAD], status: 'confirmed', scope: 'chapter', createdAt: 1, updatedAt: 1,
    ...partial,
  };
}

function entry(id: string, chapterId: string, assetId: string, variantId?: string): LongProjectChapterAsset {
  return { id, chapterId, assetId, variantId, appearance: 'introduced', evidence: [], createdAt: 1, updatedAt: 1 };
}

function run(id: string, chapterId: string, panels: LongProjectStoryboardPanel[] = []) {
  return {
    id, chapterId, sourceContent: '', modelId: '', templateId: '', prompt: '',
    status: 'completed' as const, panels, createdAt: 1, updatedAt: 1,
  };
}

function artwork(panelId: string, chapterId: string): LongProjectPanelArtwork {
  return { panelId, chapterId, promptStatus: 'done', genStatus: 'none', updatedAt: 1 };
}

function doc(id: string, chapterId: string) {
  return { id, chapterId, content: 'x', status: 'completed' as const, sourceContent: 'x', createdAt: 1, updatedAt: 1 };
}

/** 构造一份「两章并存」的项目数据；死章各集合都有记录。 */
function makeData(): LongProjectData {
  const binding = (assetId: string, variantId?: string) => ({
    assetId, assetName: assetId, visualVersionId: variantId, matchSource: 'model' as const,
  });
  return {
    nodes: [node(ALIVE, 0)],
    assets: [
      // 只被死章引用 → 应整体删除
      asset({ id: 'asset-only-dead', variants: [variant('v-dead-1', '状态一', [DEAD])] }),
      // 两章共用 → 保留；其中死章引入且存活章未引用的状态应被清掉
      asset({
        id: 'asset-shared',
        variants: [
          variant('v-shared-alive', '存活章状态', [DEAD, ALIVE]),
          variant('v-shared-dead', '只死章用过', [DEAD]),
        ],
      }),
      // 项目级资产，即使无人引用也不动
      asset({ id: 'asset-project', scope: 'project', variants: [variant('v-project', '项目状态', [DEAD])] }),
    ] as LongProjectAsset[],
    chapterAssets: [
      entry('ca-1', DEAD, 'asset-only-dead'),
      entry('ca-2', ALIVE, 'asset-shared', 'v-shared-alive'),
      entry('ca-3', DEAD, 'asset-shared', 'v-shared-dead'),
    ],
    assetExtractionRuns: [
      { id: 'run-dead', chapterId: DEAD, sourceContent: '', sourceWordCount: 0, modelId: '', templateId: '', prompt: '', status: 'confirmed', candidates: [], createdAt: 1, updatedAt: 1 },
      { id: 'run-alive', chapterId: ALIVE, sourceContent: '', sourceWordCount: 0, modelId: '', templateId: '', prompt: '', status: 'confirmed', candidates: [], createdAt: 1, updatedAt: 1 },
    ],
    storyboardRuns: [
      run('sb-dead', DEAD, [{ id: 'p-dead', order: 1, content: '', assetBindings: [] }]),
      run('sb-alive', ALIVE, [{
        id: 'p-alive', order: 1, content: '',
        assetBindings: [
          binding('asset-shared', 'v-shared-alive'),
          binding('asset-only-dead', 'v-dead-1'),
          binding('asset-shared', 'v-shared-dead'),
        ],
      }]),
    ],
    panelArtworks: [artwork('p-dead', DEAD), artwork('p-alive', ALIVE)],
    chapterAnalyses: [doc('an-dead', DEAD), doc('an-alive', ALIVE)],
    chapterScripts: [doc('sc-dead', DEAD), doc('sc-alive', ALIVE)],
  };
}

describe('删除章节的数据清理', () => {
  it('按 chapterId 清掉死章的全部分析 / 剧本 / 分镜版本 / 画面工件 / 提取记录 / 章节引用', () => {
    const data = makeData();
    const report = cleanupChapterData(data, [DEAD]);
    expect(report).toMatchObject({
      analyses: 1, scripts: 1, storyboardRuns: 1, panelArtworks: 1, assetExtractionRuns: 1, chapterAssets: 2,
    });
    expect(data.chapterAnalyses?.map((d) => d.chapterId)).toEqual([ALIVE]);
    expect(data.chapterScripts?.map((d) => d.chapterId)).toEqual([ALIVE]);
    expect(data.storyboardRuns?.map((r) => r.chapterId)).toEqual([ALIVE]);
    expect(data.panelArtworks?.map((a) => a.chapterId)).toEqual([ALIVE]);
    expect(data.assetExtractionRuns?.map((r) => r.chapterId)).toEqual([ALIVE]);
    expect(data.chapterAssets?.map((e) => e.chapterId)).toEqual([ALIVE]);
  });

  it('资产库只清「已无任何章节引用」的部分：共用资产与其存活状态保留', () => {
    const data = makeData();
    const report = cleanupChapterData(data, [DEAD]);
    expect(report.assets).toBe(1);   // asset-only-dead
    expect(report.variants).toBe(1); // v-shared-dead
    const ids = (data.assets ?? []).map((a) => a.id).sort();
    expect(ids).toEqual(['asset-project', 'asset-shared']);
    const shared = (data.assets ?? []).find((a) => a.id === 'asset-shared')!;
    expect(shared.variants.map((v) => v.id)).toEqual(['v-shared-alive']);
  });

  it('项目级资产永不被删（即使一次都没被引用）', () => {
    const data = makeData();
    cleanupChapterData(data, [DEAD]);
    expect((data.assets ?? []).some((a) => a.id === 'asset-project')).toBe(true);
  });

  it('存活章节里指向被清资产的悬空绑定被顺带修复（不会留下指向不存在资产的绑定）', () => {
    const data = makeData();
    const report = cleanupChapterData(data, [DEAD]);
    expect(report.repairedRuns).toBe(1);
    const alive = (data.storyboardRuns ?? []).find((r) => r.id === 'sb-alive')!;
    const bindings = alive.panels[0].assetBindings;
    // 指向被删状态的绑定回落到该资产仅存的状态，不再指向 v-shared-dead
    expect(bindings.every((b) => b.visualVersionId !== 'v-shared-dead')).toBe(true);
  });

  it('章节仍在节点树里时不动任何数据（防止误清活章）', () => {
    const data = makeData();
    data.nodes = [node(ALIVE, 0), node(DEAD, 1)];
    const report = cleanupChapterData(data, [DEAD]);
    expect(report.storyboardRuns).toBe(0);
    expect(data.storyboardRuns).toHaveLength(2);
    expect(data.assets).toHaveLength(3);
  });

  it('重复调用是幂等的', () => {
    const data = makeData();
    cleanupChapterData(data, [DEAD]);
    const snapshot = JSON.stringify(data);
    const second = cleanupChapterData(data, [DEAD]);
    expect(second.storyboardRuns + second.assets + second.variants).toBe(0);
    expect(JSON.stringify(data)).toBe(snapshot);
  });

  it('删除整个文件夹（多章）时一次性清完', () => {
    const data = makeData();
    data.nodes = [];
    data.storyboardRuns = [run('sb-1', DEAD), run('sb-2', ALIVE)];
    const report = cleanupChapterData(data, [DEAD, ALIVE]);
    expect(report.storyboardRuns).toBe(2);
    expect(data.storyboardRuns).toEqual([]);
  });
});

// ========== 版本历史压缩 ==========

function sbRun(id: string, status: LongProjectStoryboardRun['status'], updatedAt: number, panelId: string): LongProjectStoryboardRun {
  return {
    id, chapterId: ALIVE, sourceContent: '', modelId: '', templateId: '', prompt: '',
    status, createdAt: updatedAt, updatedAt, panels: [{ id: panelId, order: 1, content: '', assetBindings: [] }],
  };
}

function exRun(id: string, status: LongProjectAssetExtractionRun['status'], updatedAt: number): LongProjectAssetExtractionRun {
  return {
    id, chapterId: ALIVE, sourceContent: '', sourceWordCount: 0, modelId: '', templateId: '',
    prompt: `prompt-${id}`, status, candidates: [], createdAt: updatedAt, updatedAt,
  };
}

/** 一个章节堆了 3 版分镜 + 3 条提取记录，外加指向旧版本的画面工件。 */
function makeStacked(): LongProjectData {
  return {
    nodes: [node(ALIVE, 0)],
    assets: [asset({ id: 'asset-1', sourceChapterIds: [ALIVE], variants: [variant('v-1', '状态一', [ALIVE])] })],
    storyboardRuns: [
      sbRun('sb-old', 'completed', 100, 'p-old'),
      sbRun('sb-mid', 'completed', 200, 'p-mid'),
      sbRun('sb-new', 'completed', 300, 'p-new'),
    ],
    panelArtworks: [
      { panelId: 'p-old', chapterId: ALIVE, promptStatus: 'done', genStatus: 'none', updatedAt: 1 },
      { panelId: 'p-mid', chapterId: ALIVE, promptStatus: 'done', genStatus: 'none', updatedAt: 1 },
      { panelId: 'p-new', chapterId: ALIVE, promptStatus: 'done', genStatus: 'none', updatedAt: 1 },
    ],
    assetExtractionRuns: [
      exRun('ex-old', 'confirmed', 100),
      exRun('ex-mid', 'failed', 200),
      exRun('ex-new', 'confirmed', 300),
    ],
    chapterAssets: [entry('ca-1', ALIVE, 'asset-1')],
  };
}

describe('版本历史压缩', () => {
  it('分镜只保留最新一版，旧版本与它们的画面工件一并清掉', () => {
    const data = makeStacked();
    const report = sweepProjectData(data);
    expect(report.storyboardRuns).toBe(2);
    expect(report.panelArtworks).toBe(2);
    expect(data.storyboardRuns?.map((r) => r.id)).toEqual(['sb-new']);
    expect(data.panelArtworks?.map((a) => a.panelId)).toEqual(['p-new']);
  });

  it('最新一版是失败态时，仍保留最近一版已完成的分镜（工作台消费的是 completed）', () => {
    const data = makeStacked();
    data.storyboardRuns = [
      sbRun('sb-ok', 'completed', 100, 'p-ok'),
      sbRun('sb-failed', 'failed', 300, 'p-failed'),
    ];
    sweepProjectData(data);
    expect(data.storyboardRuns?.map((r) => r.id).sort()).toEqual(['sb-failed', 'sb-ok']);
  });

  it('提取记录只保留最新一版，并清掉指向被删记录的溯源 id', () => {
    const data = makeStacked();
    data.chapterAssets = [{ ...entry('ca-1', ALIVE, 'asset-1'), sourceExtractionRunId: 'ex-old' }];
    const report = sweepProjectData(data);
    expect(report.assetExtractionRuns).toBe(2);
    expect(data.assetExtractionRuns?.map((r) => r.id)).toEqual(['ex-new']);
    expect(report.clearedSourceRunIds).toBe(1);
    expect(data.chapterAssets?.[0].sourceExtractionRunId).toBeUndefined();
  });

  it('指向存活提取记录的溯源 id 不动', () => {
    const data = makeStacked();
    data.chapterAssets = [{ ...entry('ca-1', ALIVE, 'asset-1'), sourceExtractionRunId: 'ex-new' }];
    const report = sweepProjectData(data);
    expect(report.clearedSourceRunIds).toBe(0);
    expect(data.chapterAssets?.[0].sourceExtractionRunId).toBe('ex-new');
  });

  it('节点树里已不存在的章节：名下数据一并清掉（修复前遗留的残留也能自愈）', () => {
    const data = makeStacked();
    data.nodes = [node(ALIVE, 0)];
    data.storyboardRuns = [...(data.storyboardRuns ?? []), { ...sbRun('sb-dead', 'completed', 400, 'p-dead'), chapterId: DEAD }];
    data.panelArtworks = [...(data.panelArtworks ?? []), { panelId: 'p-dead', chapterId: DEAD, promptStatus: 'done', genStatus: 'none', updatedAt: 1 }];
    const report = sweepProjectData(data);
    expect(report.danglingChapters).toBe(1);
    expect(data.storyboardRuns?.every((r) => r.chapterId === ALIVE)).toBe(true);
    expect(data.panelArtworks?.every((a) => a.chapterId === ALIVE)).toBe(true);
  });

  it('hasSweepWork 判定与执行口径一致，压缩后即认为干净（幂等）', () => {
    const data = makeStacked();
    expect(hasSweepWork(data)).toBe(true);
    sweepProjectData(data);
    expect(hasSweepWork(data)).toBe(false);
    const snapshot = JSON.stringify(data);
    const second = sweepProjectData(data);
    expect(second.storyboardRuns + second.assetExtractionRuns + second.panelArtworks).toBe(0);
    expect(JSON.stringify(data)).toBe(snapshot);
  });

  it('已经干净的库不会被误判为需要体检', () => {
    const data = makeStacked();
    sweepProjectData(data);
    expect(hasSweepWork(data)).toBe(false);
  });
});

describe('脏数据自愈', () => {
  function makeDirtyData() {
    return {
      nodes: [node(ALIVE, 0)],
      storyboardRuns: [run('run-1', ALIVE, [{ id: 'panel-1', order: 1, content: 'x', assetBindings: [] } as unknown as LongProjectStoryboardPanel])],
      panelArtworks: [{
        ...artwork('panel-1', ALIVE),
        imagePrompt: '描述',
        genPrompts: [
          { id: 'slot-1', text: null as unknown as string, attachShared: true },
          { id: 'slot-2', text: '正常正文' },
        ],
        activeGenPromptId: 'slot-1',
      }],
    } as unknown as LongProjectData;
  }

  it('候选提示词的 text 为 null 时归一成空串（否则右栏渲染抛错、整块空白）', () => {
    const data = makeDirtyData();
    expect(hasSweepWork(data)).toBe(true);
    const report = sweepProjectData(data);
    expect(report.normalizedPromptSlots).toBe(1);
    expect(data.panelArtworks?.[0].genPrompts?.[0].text).toBe('');
    expect(data.panelArtworks?.[0].genPrompts?.[1].text).toBe('正常正文');
    expect(hasSweepWork(data)).toBe(false);
  });

  it('text 都正常时不动数据、也不计入自愈数量', () => {
    const data = makeDirtyData();
    data.panelArtworks![0].genPrompts = [{ id: 'slot-1', text: '', attachShared: true }];
    const report = sweepProjectData(data);
    expect(report.normalizedPromptSlots).toBe(0);
  });
});

// 类型自检：确保测试数据形状与项目数据类型一致
const _typecheck = (data: LongProjectData): NonNullable<ComicProject['longProjectData']> => data;
void _typecheck;
