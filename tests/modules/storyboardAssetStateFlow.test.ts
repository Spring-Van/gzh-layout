import { describe, expect, it } from 'vitest';
import {
  backfillPanelAutoBindings,
  repairDanglingBindings,
} from '../../src/modules/comic/services/assetExtractionConfirm';
import { buildAssetUsageIndex } from '../../src/modules/comic/services/assetUsageService';
import {
  resolvePanelAssetStates,
  resolvePanelRefImage,
} from '../../src/modules/comic/services/panelPromptService';
import { bindingsFromValue, defaultVariant, parseStoryboardResponse } from '../../src/modules/comic/services/storyboardService';
import type { LongProjectAsset, LongProjectStoryboardPanel, LongProjectStoryboardRun } from '../../src/modules/comic/types';

/**
 * 分镜视觉状态绑定全链路回归：模型逐格声明 → 解析 → 各消费端口径一致。
 *
 * 锁死的口径是**「页级 ∪ 格级」**：`resolvePanelAssetStates` 是唯一展开实现，
 * 生图取图与工作台引用统计都必须按它消费；覆盖删除状态后的悬空修复
 * 也必须同时覆盖页级与格级，否则会出现「界面显示已删状态、生图按回落状态取图」的分裂。
 */

/** 两状态人物（换装场景）：便装 / 战斗服。 */
const character = {
  id: 'a1',
  name: '林小雨',
  type: 'character',
  aliases: [],
  fixedTraits: ['银发'],
  variants: [
    { id: 'v1', name: '便装', description: '日常便装', chapterRange: { startChapterId: 'c1' }, referenceImageIds: ['casual-1'] },
    { id: 'v2', name: '战斗服', description: '战斗装备', chapterRange: { startChapterId: 'c1' }, referenceImageIds: ['battle-1'] },
  ],
} as unknown as LongProjectAsset;

/** 单状态场景资产。 */
const scene = {
  id: 'a2',
  name: '训练场',
  type: 'scene',
  aliases: [],
  fixedTraits: [],
  variants: [{ id: 'v3', name: '全章默认', description: '露天训练场', chapterRange: { startChapterId: 'c1' }, referenceImageIds: ['field-1'] }],
} as unknown as LongProjectAsset;

const assets = [character, scene];
const chapterOrders = { c1: 0, c2: 1 };

/** 模型输出的 v4 页块：第 1 页双格换装（格1 便装 → 格2 战斗服），第 2 页未声明出场资产。 */
const modelOutput = [
  '## 分镜 1 · 双格',
  '【第1格】',
  '「景别」：近景',
  '「画面」：林小雨穿着便装推开训练场的铁门。',
  '「出场资产」：林小雨（便装）、训练场（全章默认）',
  '【第2格】',
  '「景别」：中景',
  '「画面」：林小雨扯紧战斗服的绑带，抬头看向镜头。',
  '「出场资产」：林小雨（战斗服）',
  '## 分镜 2 · 单格',
  '【第1格】',
  '「景别」：远景',
  '「画面」：林小雨独自站在训练场中央。',
].join('\n');

/** 解析模型输出（每页是纯函数，测试内复用）。 */
function parse() {
  return parseStoryboardResponse(modelOutput, assets, 'c1', chapterOrders);
}

/** 包一层 run，供引用统计（按 storyboardRuns 遍历全部章节分镜）使用。 */
function asRun(panels: LongProjectStoryboardPanel[]): LongProjectStoryboardRun {
  return {
    id: 'r1',
    chapterId: 'c1',
    sourceContent: '',
    modelId: 'm',
    templateId: 't',
    prompt: '',
    status: 'completed',
    panels,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('分镜视觉状态绑定全链路', () => {
  it('模型给出未知状态名时，回落绑定保存实际状态名与章节范围来源', () => {
    const fallbackAsset = {
      ...character,
      variants: [
        { ...character.variants[0], chapterRange: { startChapterId: 'c1', endChapterId: 'c2' } },
      ],
    } as LongProjectAsset;
    const [binding] = bindingsFromValue('林 小雨（不存在的状态）', [fallbackAsset], 'c1', chapterOrders);
    expect(binding).toMatchObject({
      assetId: 'a1',
      assetName: '林小雨',
      visualVersionId: 'v1',
      visualVersionName: '便装',
      matchSource: 'chapter-range',
    });
  });

  it('章节默认状态同时遵守开始与结束范围，不使用已结束或尚未开始的状态', () => {
    const rangedAsset = {
      ...character,
      variants: [
        { ...character.variants[0], chapterRange: { startChapterId: 'c1', endChapterId: 'c1' } },
        { ...character.variants[1], chapterRange: { startChapterId: 'c3' } },
      ],
    } as LongProjectAsset;
    const orders = { c1: 0, c2: 1, c3: 2 };
    expect(defaultVariant(rangedAsset, 'c1', orders)?.id).toBe('v1');
    expect(defaultVariant(rangedAsset, 'c2', orders)).toBeUndefined();
    expect(defaultVariant(rangedAsset, 'c3', orders)?.id).toBe('v2');
  });

  it('解析：格级「出场资产」各自保存状态，页级汇总取镜末状态', () => {
    const panels = parse();
    expect(panels).toHaveLength(2);

    const [first] = panels;
    expect(first.cells).toHaveLength(2);
    expect(first.cells?.[0].assetBindings).toMatchObject([
      { assetId: 'a1', visualVersionId: 'v1', visualVersionName: '便装', matchSource: 'model' },
      { assetId: 'a2', visualVersionId: 'v3', visualVersionName: '全章默认', matchSource: 'model' },
    ]);
    expect(first.cells?.[1].assetBindings).toMatchObject([
      { assetId: 'a1', visualVersionId: 'v2', visualVersionName: '战斗服', matchSource: 'model' },
    ]);
    // 页级 = 镜末状态（战斗服），是后续分镜 auto-text 延续链的起点
    expect(first.assetBindings).toMatchObject([
      { assetId: 'a1', visualVersionId: 'v2', visualVersionName: '战斗服' },
      { assetId: 'a2', visualVersionId: 'v3', visualVersionName: '全章默认' },
    ]);
  });

  it('生图取图：镜内多状态各带各的参考图（页级 ∪ 格级）', () => {
    const [first] = parse();
    const states = resolvePanelAssetStates(first, assets);
    expect(states.map((state) => [state.variant.id, state.cellIndexes])).toEqual([
      ['v1', [0]],
      ['v2', [1]],
      ['v3', [0]],
    ]);
    expect(states.map((state) => resolvePanelRefImage(state.variant, state.binding ?? {})))
      .toEqual(['casual-1', 'battle-1', 'field-1']);
  });

  it('工作台引用统计：格级独有的状态同样计入（不显示「0 镜引用」）', () => {
    const panels = parse();
    const index = buildAssetUsageIndex({
      assets,
      chapterAssets: [],
      storyboardRuns: [asRun(panels)],
    });
    // 便装只在格级出现，战斗服是页级主状态 —— 两者都必须被算到
    expect(index.variants.get('v1')?.panelCount).toBe(1);
    expect(index.variants.get('v1')?.imagePanelCount).toEqual({ 'casual-1': 1 });
    expect(index.variants.get('v2')?.panelCount).toBe(1);
    expect(index.variants.get('v2')?.imagePanelCount).toEqual({ 'battle-1': 1 });
    expect(index.variants.get('v3')?.panelCount).toBe(1);
  });

  it('后续分镜延续：auto-text 自动绑定并跟随镜末状态', () => {
    const panels = parse();
    const synced = backfillPanelAutoBindings(panels, assets, 'c1', chapterOrders);
    const second = synced.find((panel) => panel.order === 2)!;
    expect(second.assetBindings).toMatchObject([
      { assetId: 'a1', visualVersionId: 'v2', visualVersionName: '战斗服', matchSource: 'auto-text' },
      { assetId: 'a2', visualVersionId: 'v3', visualVersionName: '全章默认', matchSource: 'auto-text' },
    ]);
  });

  it('悬空修复：状态被覆盖删除后，页级与格级声明同时回落（界面与生图口径不分叉）', () => {
    const panels = parse();
    // 覆盖后资产只剩「便装」——战斗服被删除
    const prunedAssets: LongProjectAsset[] = [{ ...character, variants: [character.variants[0]] }];
    const repaired = repairDanglingBindings(panels, prunedAssets, 'c1', chapterOrders);
    const [first] = repaired;

    expect(first.assetBindings[0]).toMatchObject({ assetId: 'a1', visualVersionId: 'v1', visualVersionName: '便装' });
    // 格2 原本指向已删的战斗服，必须同步回落 —— 否则界面显示战斗服、生图实际按便装取图
    expect(first.cells?.[1].assetBindings?.[0]).toMatchObject({ assetId: 'a1', visualVersionId: 'v1', visualVersionName: '便装' });
    expect(first.cells?.[0].assetBindings?.[0]).toMatchObject({ assetId: 'a1', visualVersionId: 'v1' });

    // 无悬空的绑定保持原引用（不产生无谓持久化）
    const untouched = repairDanglingBindings(panels, assets, 'c1', chapterOrders);
    expect(untouched[0]).toBe(panels[0]);
    expect(untouched[1]).toBe(panels[1]);
  });

  it('悬空修复：资产改名同步页级与格级 assetName', () => {
    const panels = parse();
    const renamed: LongProjectAsset[] = [{ ...character, name: '林小雨·改' } as LongProjectAsset, scene];
    const repaired = repairDanglingBindings(panels, renamed, 'c1', chapterOrders);
    expect(repaired[0].assetBindings[0].assetName).toBe('林小雨·改');
    expect(repaired[0].cells?.[0].assetBindings?.[0].assetName).toBe('林小雨·改');
  });

  it('修复后重新统计：口径与生图取图保持一致', () => {
    const panels = parse();
    const prunedAssets: LongProjectAsset[] = [{ ...character, variants: [character.variants[0]] }];
    const repaired = repairDanglingBindings(panels, prunedAssets, 'c1', chapterOrders);
    const index = buildAssetUsageIndex({
      assets: prunedAssets,
      chapterAssets: [],
      storyboardRuns: [asRun(repaired)],
    });
    expect(index.variants.get('v1')?.imagePanelCount).toEqual({ 'casual-1': 1 });
    expect(index.variants.get('v2')).toBeUndefined();
  });
});
