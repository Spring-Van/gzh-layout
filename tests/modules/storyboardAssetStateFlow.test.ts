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
import { bindingsFromValue, buildVariantCodeMap, defaultVariant, parseStoryboardResponse, renderChapterAssetsText } from '../../src/modules/comic/services/storyboardService';
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
    { id: 'v1', name: '便装', description: '日常便装', chapterRange: { startChapterId: 'c1' }, generatedImageIds: ['casual-1'] },
    { id: 'v2', name: '战斗服', description: '战斗装备', chapterRange: { startChapterId: 'c1' }, generatedImageIds: ['battle-1'] },
  ],
} as unknown as LongProjectAsset;

/** 单状态场景资产。 */
const scene = {
  id: 'a2',
  name: '训练场',
  type: 'scene',
  aliases: [],
  fixedTraits: [],
  variants: [{ id: 'v3', name: '全章默认', description: '露天训练场', chapterRange: { startChapterId: 'c1' }, generatedImageIds: ['field-1'] }],
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

  it('同一章节同时有多个状态且没有唯一默认时不按数组顺序猜测', () => {
    expect(defaultVariant(character, 'c1', chapterOrders)).toBeUndefined();
    const withDefault = {
      ...character,
      variants: [
        { ...character.variants[0], name: '全章默认' },
        character.variants[1],
      ],
    } as LongProjectAsset;
    expect(defaultVariant(withDefault, 'c1', chapterOrders)?.id).toBe('v1');
  });

  it('同一个别名指向多个资产时不静默绑定到首个资产', () => {
    const first = { ...character, aliases: ['小雨'] } as LongProjectAsset;
    const other = { ...character, id: 'a3', name: '周小雨', aliases: ['小雨'] } as LongProjectAsset;
    const [binding] = bindingsFromValue('小雨（便装）', [first, other], 'c1', chapterOrders);
    expect(binding).toMatchObject({ assetId: undefined, assetName: '小雨', visualVersionId: undefined, matchSource: 'unmatched' });
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
    // 页级 = 本镜用到的状态全集（多状态语义：便装与战斗服各留一条，不再折叠成镜末状态）
    expect(first.assetBindings).toMatchObject([
      { assetId: 'a1', visualVersionId: 'v1', visualVersionName: '便装' },
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

/**
 * 状态编号通道：清单渲染给编号、模型照抄编号、解析直接查表得 id。
 *
 * 编号是**名字匹配之外的第二证据通道**，不取代名字：
 * 名字来自资产库、跨章稳定是第一证据；编号依赖当次清单会漂移，故冲突时以名字为准。
 * 这一组用例同时锁死「不劣化」：无编号的旧文本、无编号表的编辑器路径，行为必须与改造前一致。
 */
describe('状态编号通道', () => {
  const chapterContext = [
    { asset: character, variants: character.variants },
    { asset: scene, variants: scene.variants },
  ];
  const codes = buildVariantCodeMap(chapterContext);

  it('编号规则：资产按清单次序取字母、状态按资产内次序取数字，无状态资产不占字母位', () => {
    expect([...codes.keys()]).toEqual(['A1', 'A2', 'B1']);
    expect(codes.get('A1')).toMatchObject({ assetId: 'a1', variantId: 'v1' });
    expect(codes.get('A2')).toMatchObject({ assetId: 'a1', variantId: 'v2' });
    expect(codes.get('B1')).toMatchObject({ assetId: 'a2', variantId: 'v3' });

    const noStateAsset = { id: 'a4', name: '空资产', type: 'prop', aliases: [], variants: [] } as unknown as LongProjectAsset;
    const shifted = buildVariantCodeMap([{ asset: noStateAsset, variants: [] }, ...chapterContext]);
    expect([...shifted.keys()]).toEqual(['A1', 'A2', 'B1']);
  });

  it('清单渲染带上编号，模型按「编号 资产名（状态名）」照抄', () => {
    const text = renderChapterAssetsText(chapterContext)!;
    expect(text).toContain('- 林小雨（人物）：A1 便装（日常便装）｜A2 战斗服（战斗装备）');
    expect(text).toContain('- 训练场（场景）：B1 全章默认（露天训练场）');
  });

  it('编号救场：状态名措辞不一致导致名字通道全断时仍能精确命中', () => {
    // 无编号：模型把「便装」写成「便服」，模糊匹配不上、同章多状态又无唯一默认 → 状态丢失
    const [bare] = bindingsFromValue('林小雨（便服）', assets, 'c1', chapterOrders);
    expect(bare).toMatchObject({ assetId: 'a1', visualVersionId: undefined });
    // 带编号：编号直接命中，不再依赖字符串比对
    const [coded] = bindingsFromValue('A1 林小雨（便服）', assets, 'c1', chapterOrders, codes);
    expect(coded).toMatchObject({ assetId: 'a1', visualVersionId: 'v1', visualVersionName: '便装', matchSource: 'model' });
  });

  it('编号救场：资产名写错/写别名之外时仍能命中资产与状态', () => {
    const [bare] = bindingsFromValue('小雨（战斗服）', assets, 'c1', chapterOrders);
    expect(bare).toMatchObject({ assetId: undefined, matchSource: 'unmatched' });
    const [coded] = bindingsFromValue('A2 小雨', assets, 'c1', chapterOrders, codes);
    expect(coded).toMatchObject({ assetId: 'a1', visualVersionId: 'v2', visualVersionName: '战斗服', matchSource: 'model' });
  });

  it('编号与名字冲突时以名字为准（不引入新错绑）', () => {
    const [binding] = bindingsFromValue('A1 林小雨（战斗服）', assets, 'c1', chapterOrders, codes);
    expect(binding).toMatchObject({ assetId: 'a1', visualVersionId: 'v2', visualVersionName: '战斗服' });
  });

  it('编号悬空（状态已被删）时回落名字通道', () => {
    const stale = new Map([['A1', { code: 'A1', assetId: 'a1', variantId: 'v-deleted' }]]);
    const [binding] = bindingsFromValue('A1 林小雨（便装）', assets, 'c1', chapterOrders, stale);
    expect(binding).toMatchObject({ assetId: 'a1', visualVersionId: 'v1', visualVersionName: '便装' });
  });

  it('模型只写编号不写资产名时同样命中', () => {
    const [binding] = bindingsFromValue('B1', assets, 'c1', chapterOrders, codes);
    expect(binding).toMatchObject({ assetId: 'a2', visualVersionId: 'v3', visualVersionName: '全章默认', matchSource: 'model' });
  });

  it('无编号表时也剥离编号前缀：编辑器保存路径不因编号污染资产名而回归', () => {
    const [binding] = bindingsFromValue('A1 林小雨（便装）', assets, 'c1', chapterOrders);
    expect(binding).toMatchObject({ assetId: 'a1', visualVersionId: 'v1', matchSource: 'model' });
  });

  it('不误伤以字母数字开头的资产名', () => {
    const droid = {
      id: 'a9', name: 'R2D2', type: 'prop', aliases: [],
      variants: [{ id: 'v9', name: '待机', description: '银白机身', generatedImageIds: ['droid-1'] }],
    } as unknown as LongProjectAsset;
    const [binding] = bindingsFromValue('R2D2（待机）', [droid], 'c1', chapterOrders);
    expect(binding).toMatchObject({ assetId: 'a9', visualVersionId: 'v9', assetName: 'R2D2' });
  });

  it('端到端：模型按编号声明时格级与页级绑定都精确落到状态', () => {
    const output = [
      '## 分镜 1 · 双格',
      '第1格',
      '景别：近景',
      '画面：林小雨穿着便装推开训练场的铁门。',
      '出场资产：A1 林小雨（便装）、B1 训练场（全章默认）',
      '第2格',
      '景别：中景',
      '画面：林小雨扯紧战斗服的绑带。',
      '出场资产：A2 林小雨（战斗服）',
    ].join('\n');
    const [panel] = parseStoryboardResponse(output, assets, 'c1', chapterOrders, codes);
    expect(panel.cells?.[0].assetBindings).toMatchObject([
      { assetId: 'a1', visualVersionId: 'v1', visualVersionName: '便装', matchSource: 'model' },
      { assetId: 'a2', visualVersionId: 'v3', visualVersionName: '全章默认', matchSource: 'model' },
    ]);
    expect(panel.cells?.[1].assetBindings).toMatchObject([
      { assetId: 'a1', visualVersionId: 'v2', visualVersionName: '战斗服', matchSource: 'model' },
    ]);
    // 页级 = 本镜用到的状态全集（多状态语义：同一资产的多个状态各留一条）
    expect(panel.assetBindings).toMatchObject([
      { assetId: 'a1', visualVersionId: 'v1' },
      { assetId: 'a1', visualVersionId: 'v2' },
      { assetId: 'a2', visualVersionId: 'v3' },
    ]);
  });
});
