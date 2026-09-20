import { describe, expect, it } from 'vitest';
import {
  resolveCellBindings,
  resolvePanelAssetStates,
} from '../../src/modules/comic/services/panelPromptService';
import { formatCellsForPrompt, summarizeCellBindings } from '../../src/modules/comic/services/storyboardService';
import type { LongProjectAsset, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel } from '../../src/modules/comic/types';

/**
 * 格级资产状态绑定 —— 镜内多状态展开（页级 ∪ 格级）核心口径单测：
 * 生图参考图（currentRefGroups / buildPanelRefManifest）与工作台引用统计
 * 都按 resolvePanelAssetStates 的结果消费，此处锁死展开语义。
 */

/** 两个状态的人物资产（换装场景）。 */
const character = {
  id: 'a1',
  name: '林小雨',
  type: 'character',
  aliases: [],
  fixedTraits: ['银发'],
  variants: [
    { id: 'v1', name: '便装', description: '日常便装', referenceImageIds: ['casual-1'] },
    { id: 'v2', name: '战斗服', description: '战斗装备', referenceImageIds: ['battle-1'] },
  ],
} as unknown as LongProjectAsset;

/** 单状态场景资产。 */
const scene = {
  id: 'a2',
  name: '训练场',
  type: 'scene',
  aliases: [],
  fixedTraits: [],
  variants: [{ id: 'v3', name: '全章默认', description: '露天训练场', referenceImageIds: [] }],
} as unknown as LongProjectAsset;

const assets = [character, scene];

function bindingOf(assetId: string, assetName: string, variantId: string, variantName: string): LongProjectStoryboardAssetBinding {
  return { assetId, assetName, visualVersionId: variantId, visualVersionName: variantName, matchSource: 'model', referenceImageIds: [] };
}

/** 双格换装页：格1 便装、格2 战斗服；页级绑定 = 镜末（战斗服）。 */
const multiStatePanel = {
  id: 'p1',
  order: 1,
  content: '换装页',
  assetBindings: [bindingOf('a1', '林小雨', 'v2', '战斗服')],
  cells: [
    { content: '格一', assetBindings: [bindingOf('a1', '林小雨', 'v1', '便装')] },
    { content: '格二', assetBindings: [bindingOf('a1', '林小雨', 'v2', '战斗服')] },
  ],
} as unknown as LongProjectStoryboardPanel;

/** 旧数据镜：无格级声明，只有页级绑定。 */
const legacyPanel = {
  id: 'p2',
  order: 2,
  content: '旧数据页',
  assetBindings: [bindingOf('a2', '训练场', 'v3', '全章默认')],
} as unknown as LongProjectStoryboardPanel;

describe('resolveCellBindings（格级声明解析）', () => {
  it('按格序解析每格出场资产的实际状态', () => {
    const resolved = resolveCellBindings(multiStatePanel, assets);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toMatchObject({ asset: character, cellIndex: 0 });
    expect(resolved[0].variant.id).toBe('v1');
    expect(resolved[1]).toMatchObject({ asset: character, cellIndex: 1 });
    expect(resolved[1].variant.id).toBe('v2');
  });

  it('资产已删 / 状态悬空（资产无任何状态）的声明跳过', () => {
    const panel = {
      ...multiStatePanel,
      cells: [
        { content: '格一', assetBindings: [bindingOf('已删除', '路人', 'vx', '状态X')] },
        { content: '格二', assetBindings: [bindingOf('a1', '林小雨', 'v1', '便装')] },
      ],
    } as unknown as LongProjectStoryboardPanel;
    const resolved = resolveCellBindings(panel, assets);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].asset.id).toBe('a1');
  });

  it('无格数据（旧镜）返回空数组', () => {
    expect(resolveCellBindings(legacyPanel, assets)).toEqual([]);
  });
});

describe('resolvePanelAssetStates（镜内状态展开：页级 ∪ 格级）', () => {
  it('同资产多状态各成一条目，按格标注；页级主状态条目附页级绑定', () => {
    const states = resolvePanelAssetStates(multiStatePanel, assets);
    expect(states).toHaveLength(2);
    expect(states[0]).toMatchObject({ variant: character.variants[0], cellIndexes: [0] });
    expect(states[0].binding).toBeUndefined(); // 便装不是页级主状态
    expect(states[1]).toMatchObject({ variant: character.variants[1], cellIndexes: [1] });
    expect(states[1].binding).toBe(multiStatePanel.assetBindings[0]); // 战斗服 = 镜末主状态
  });

  it('同状态出现在多格时合并 cellIndexes', () => {
    const panel = {
      ...multiStatePanel,
      cells: [
        { content: '格一', assetBindings: [bindingOf('a1', '林小雨', 'v1', '便装')] },
        { content: '格二', assetBindings: [bindingOf('a1', '林小雨', 'v1', '便装')] },
      ],
    } as unknown as LongProjectStoryboardPanel;
    const states = resolvePanelAssetStates(panel, assets);
    expect(states).toHaveLength(1);
    expect(states[0].cellIndexes).toEqual([0, 1]);
  });

  it('无格级声明的资产退化为页级绑定状态（cellIndexes 空）', () => {
    const states = resolvePanelAssetStates(legacyPanel, assets);
    expect(states).toHaveLength(1);
    expect(states[0]).toMatchObject({ asset: scene, cellIndexes: [] });
    expect(states[0].binding).toBe(legacyPanel.assetBindings[0]);
  });
});

describe('summarizeCellBindings（格级 → 页级汇总）', () => {
  it('同资产多格声明取最后一格（镜末状态 = 延续链起点）', () => {
    const cells = multiStatePanel.cells!;
    const summarized = summarizeCellBindings(cells);
    expect(summarized).toHaveLength(1);
    expect(summarized[0].visualVersionId).toBe('v2');
    expect(summarized[0].visualVersionName).toBe('战斗服');
  });

  it('顺序 = 首次出现顺序（后格新资产排在后面）', () => {
    const cells = [
      { content: '格一', assetBindings: [bindingOf('a1', '林小雨', 'v1', '便装')] },
      { content: '格二', assetBindings: [bindingOf('a2', '训练场', 'v3', '全章默认')] },
    ];
    const summarized = summarizeCellBindings(cells);
    expect(summarized.map((item) => item.assetId)).toEqual(['a1', 'a2']);
  });
});

describe('formatCellsForPrompt（画面描述的分格详情）', () => {
  it('每格带出场资产行（含状态名），供画面描述模型区分各格状态', () => {
    const text = formatCellsForPrompt(multiStatePanel.cells!);
    expect(text).toContain('第1格');
    expect(text).toContain('出场资产：林小雨（便装）');
    expect(text).toContain('第2格');
    expect(text).toContain('出场资产：林小雨（战斗服）');
  });

  it('无出场资产的格不输出该行', () => {
    const text = formatCellsForPrompt([{ content: '空镜' }]);
    expect(text).not.toContain('出场资产');
  });
});

describe('buildPanelAssetsContext（已随绑定资产变量下线）', () => {
  it('resolvePanelAssetStates 仍按格序展开多状态（供生图清单与引用统计）', () => {
    const states = resolvePanelAssetStates(multiStatePanel, assets);
    expect(states.map((state) => state.variant.name)).toEqual(['便装', '战斗服']);
  });
});
