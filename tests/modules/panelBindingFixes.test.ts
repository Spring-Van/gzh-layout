import { describe, expect, it } from 'vitest';
import { buildAssetNameIndex, buildPanelBindingFixes } from '../../src/modules/comic/services/promptAssetService';
import type { LongProjectAsset, LongProjectStoryboardCell, LongProjectStoryboardPanel } from '../../src/modules/comic/types';

/**
 * 绑定待核对项：把审计问题翻译成「一个明确的解法 + 现成的候选」，
 * 让中栏能一键补绑 / 选状态 / 换绑 / 移除，而不必回编辑器改分镜文本再重解析。
 */

const character = {
  id: 'a1',
  name: '林小雨',
  type: 'character',
  aliases: [],
  fixedTraits: [],
  variants: [
    { id: 'v1', name: '便装', referenceImageIds: ['casual-1'] },
    { id: 'v2', name: '战斗服', referenceImageIds: ['battle-1'] },
  ],
} as unknown as LongProjectAsset;

/** 无视觉状态的道具（补绑时应给「补绑」而非状态 chip）。 */
const prop = {
  id: 'a2',
  name: '测验魔石碑',
  type: 'prop',
  aliases: [],
  fixedTraits: [],
  variants: [],
} as unknown as LongProjectAsset;

const assets = [character, prop];
const index = buildAssetNameIndex(assets);

function panel(overrides: Partial<LongProjectStoryboardPanel>): LongProjectStoryboardPanel {
  return { id: 'p1', order: 1, content: '', assetBindings: [], ...overrides };
}

function cells(...contents: string[]): LongProjectStoryboardCell[] {
  return contents.map((content) => ({ content }));
}

describe('分镜绑定待核对项', () => {
  it('文本出现资产但未绑定 → add，候选资产已确定（不需要用户选资产）', () => {
    const fixes = buildPanelBindingFixes(panel({ cells: cells('林小雨站在雨中，攥紧了拳头。') }), index);
    expect(fixes).toHaveLength(1);
    expect(fixes[0]).toMatchObject({
      reason: 'missing-binding',
      action: 'add',
      label: '林小雨',
      cellIndex: 0,
      bindingIndex: undefined,
    });
    expect(fixes[0].asset?.id).toBe('a1');
    expect(fixes[0].asset?.variants).toHaveLength(2);
  });

  it('同一资产在多格命中 → 去重成一条（解法只有一个：补一条绑定）', () => {
    const fixes = buildPanelBindingFixes(
      panel({ cells: cells('林小雨抬头。', '雨水打在林小雨脸上。') }),
      index,
    );
    expect(fixes.filter((fix) => fix.reason === 'missing-binding')).toHaveLength(1);
  });

  it('资产已绑定但状态未定 → set-variant，并带回该绑定在页级数组中的下标', () => {
    const fixes = buildPanelBindingFixes(
      panel({
        cells: cells('林小雨站在雨中。'),
        assetBindings: [
          { assetId: 'a2', assetName: '测验魔石碑', matchSource: 'model', referenceImageIds: [] },
          { assetId: 'a1', assetName: '林小雨', matchSource: 'chapter-range', referenceImageIds: [] },
        ],
      }),
      index,
    );
    expect(fixes).toHaveLength(1);
    expect(fixes[0]).toMatchObject({ reason: 'missing-variant', action: 'set-variant', label: '林小雨', bindingIndex: 1 });
    expect(fixes[0].asset?.variants.map((variant) => variant.name)).toEqual(['便装', '战斗服']);
  });

  it('无视觉状态的资产不会被报「状态未定」', () => {
    const fixes = buildPanelBindingFixes(
      panel({
        cells: cells('测验魔石碑亮起字样。'),
        assetBindings: [{ assetId: 'a2', assetName: '测验魔石碑', matchSource: 'model', referenceImageIds: [] }],
      }),
      index,
    );
    expect(fixes).toHaveLength(0);
  });

  it('绑定指向资产库已无的资产（名字写错 / 资产已删）→ remove，且能定位到原绑定', () => {
    const fixes = buildPanelBindingFixes(
      panel({
        cells: cells('广场上人头攒动。'),
        assetBindings: [{ assetName: '萧炎（错名）', matchSource: 'unmatched', referenceImageIds: [] }],
      }),
      index,
    );
    expect(fixes).toHaveLength(1);
    expect(fixes[0]).toMatchObject({ reason: 'unmatched-asset', action: 'remove', label: '萧炎（错名）', bindingIndex: 0 });
    expect(fixes[0].asset).toBeUndefined();
  });

  it('同名资产造成歧义 → add，并给出两个候选供用户选（不自动绑定）', () => {
    const clash = { ...character, id: 'a3', name: '林小雨', variants: [] } as unknown as LongProjectAsset;
    const fixes = buildPanelBindingFixes(
      panel({ cells: cells('林小雨走进来。') }),
      buildAssetNameIndex([character, clash]),
    );
    expect(fixes).toHaveLength(1);
    expect(fixes[0].action).toBe('add');
    expect(fixes[0].asset).toBeUndefined();
    expect(fixes[0].candidates?.map((item) => item.id).sort()).toEqual(['a1', 'a3']);
  });

  it('绑定完整且状态确定 → 无待核对项', () => {
    const fixes = buildPanelBindingFixes(
      panel({
        cells: cells('林小雨站在雨中。'),
        assetBindings: [
          { assetId: 'a1', assetName: '林小雨', visualVersionId: 'v1', visualVersionName: '便装', matchSource: 'model', referenceImageIds: ['casual-1'] },
        ],
      }),
      index,
    );
    expect(fixes).toHaveLength(0);
  });
});
