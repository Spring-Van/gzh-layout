import { describe, expect, it } from 'vitest';
import { summarizePanelBindingHealth, summarizePanelsBindingHealth } from '../../src/modules/comic/services/promptAssetService';
import type { LongProjectAsset, LongProjectStoryboardPanel } from '../../src/modules/comic/types';

/**
 * 导入后绑定体检：把「模型声明 → 解析 → 落库绑定」的结果摊开，
 * 让「没赋值成功」能被区分成三类可操作的原因（未声明 / 资产未匹配 / 状态未确定）。
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

const assets = [character];

function panel(bindings: LongProjectStoryboardPanel['assetBindings'], order = 1): LongProjectStoryboardPanel {
  return { id: `p${order}`, order, content: '画面内容', assetBindings: bindings };
}

describe('分镜资产绑定体检', () => {
  it('绑定完整时无风险，摘要带资产与状态名', () => {
    const health = summarizePanelBindingHealth(
      panel([{ assetId: 'a1', assetName: '林小雨', visualVersionId: 'v1', visualVersionName: '便装', matchSource: 'model', referenceImageIds: [] }]),
      assets,
    );
    expect(health).toMatchObject({ bindingCount: 1, unmatchedCount: 0, missingVariantCount: 0, risk: '' });
    expect(health.summary).toBe('林小雨（便装）');
  });

  it('整镜没有声明出场资产时报「无出场资产声明」', () => {
    const health = summarizePanelBindingHealth(panel([]), assets);
    expect(health.bindingCount).toBe(0);
    expect(health.risk).toBe('无出场资产声明');
  });

  it('资产命中但状态为空时报「状态未确定」（模型漏写状态且同章无唯一默认）', () => {
    const health = summarizePanelBindingHealth(
      panel([{ assetId: 'a1', assetName: '林小雨', matchSource: 'chapter-range', referenceImageIds: [] }]),
      assets,
    );
    expect(health.missingVariantCount).toBe(1);
    expect(health.risk).toContain('状态未确定');
    expect(health.summary).toBe('林小雨');
  });

  it('资产名写错（assetId 悬空）时报「资产未匹配」', () => {
    const health = summarizePanelBindingHealth(
      panel([{ assetName: '林小雨（错）', matchSource: 'unmatched', referenceImageIds: [] }]),
      assets,
    );
    expect(health.unmatchedCount).toBe(1);
    expect(health.risk).toContain('资产未匹配');
  });

  it('整章汇总给出未声明镜数与三类计数', () => {
    const summary = summarizePanelsBindingHealth([
      panel([{ assetId: 'a1', assetName: '林小雨', visualVersionId: 'v1', visualVersionName: '便装', matchSource: 'model', referenceImageIds: [] }], 1),
      panel([], 2),
      panel([{ assetId: 'a1', assetName: '林小雨', matchSource: 'chapter-range', referenceImageIds: [] }], 3),
    ], assets);
    expect(summary.missingPanelCount).toBe(1);
    expect(summary.bindingCount).toBe(2);
    expect(summary.missingVariantCount).toBe(1);
    expect(summary.healths.map((item) => item.order)).toEqual([1, 2, 3]);
  });
});
