import { describe, expect, it } from 'vitest';
import {
  bindingsFromValue,
  parsePanelBlock,
  serializeBindings,
  serializePanelBlock,
} from '../../src/modules/comic/services/storyboardService';
import type { LongProjectAsset, LongProjectStoryboardPanel } from '../../src/modules/comic/types';

/**
 * 分镜内容编辑器「编辑 → 保存」往返回归。
 *
 * 背景：编辑器解析走 `parsePanelBlock`，它**不携带资产上下文**（空 assets / 空 chapterId），
 * 于是所有「出场资产」声明在这一步都是 `unmatched`。若此时把状态名丢掉，
 * `serializeBindings` 就只能写回资产名 → 输入框里的文本被悄悄改写，
 * 保存时状态只能靠 `defaultVariant()` 猜，多状态资产（同章多个状态、无唯一默认）直接丢状态，
 * 最终表现为「资产绑着但取不到图 / 中栏资产消失」。
 *
 * 锁死的口径：**文本里写了什么，往返后还得是什么**——状态名必须原样保留，
 * 保证 `savePanelEdit` 按「资产名 + 状态名」能精确还原到同一个 visualVersionId。
 */

/** 三状态道具（同章多状态、无唯一默认 → defaultVariant 会返回 undefined，最能暴露丢状态）。 */
const stele = {
  id: 'a3',
  name: '测验魔石碑',
  type: 'prop',
  aliases: ['石碑'],
  fixedTraits: [],
  variants: [
    { id: 'v1', name: '萧炎测验·三段显示', description: '三段', chapterRange: { startChapterId: 'c1' }, referenceImageIds: ['stele-1'] },
    { id: 'v2', name: '萧媚测验·七段显示', description: '七段', chapterRange: { startChapterId: 'c1' }, referenceImageIds: ['stele-2'] },
    { id: 'v3', name: '萧薰儿测验·九段显示', description: '九段', chapterRange: { startChapterId: 'c1' }, referenceImageIds: ['stele-3'] },
  ],
} as unknown as LongProjectAsset;

/** 单状态人物。 */
const examiner = {
  id: 'a4',
  name: '中年测验员',
  type: 'character',
  aliases: ['测验员'],
  fixedTraits: [],
  variants: [{ id: 'v4', name: '中年·测验员形象', description: '面无表情', chapterRange: { startChapterId: 'c1' }, referenceImageIds: ['man-1'] }],
} as unknown as LongProjectAsset;

const assets = [stele, examiner];
const chapterOrders = { c1: 0 };

/** 导入落库后的分镜（格级绑定为 model，资产名与状态名都是库里的规范名）。 */
function importedPanel(): LongProjectStoryboardPanel {
  return {
    id: 'p1',
    order: 1,
    content: '石碑亮起三段。',
    cellLabel: '双格',
    assetBindings: [
      { assetId: 'a3', assetName: '测验魔石碑', visualVersionId: 'v1', visualVersionName: '萧炎测验·三段显示', matchSource: 'model', referenceImageIds: ['stele-1'] },
      { assetId: 'a4', assetName: '中年测验员', visualVersionId: 'v4', visualVersionName: '中年·测验员形象', matchSource: 'model', referenceImageIds: ['man-1'] },
    ],
    cells: [
      {
        shot: '特写',
        camera: '平视',
        content: '黑色的石碑表面绽放刺芒，亮起“斗之力，三段”。',
        assetBindings: [
          { assetId: 'a3', assetName: '测验魔石碑', visualVersionId: 'v1', visualVersionName: '萧炎测验·三段显示', matchSource: 'model', referenceImageIds: ['stele-1'] },
        ],
      },
      {
        shot: '中景',
        content: '测验员站在石碑旁公布结果。',
        cast: '中年测验员',
        assetBindings: [
          { assetId: 'a4', assetName: '中年测验员', visualVersionId: 'v4', visualVersionName: '中年·测验员形象', matchSource: 'model', referenceImageIds: ['man-1'] },
          { assetId: 'a3', assetName: '测验魔石碑', visualVersionId: 'v1', visualVersionName: '萧炎测验·三段显示', matchSource: 'model', referenceImageIds: ['stele-1'] },
        ],
      },
    ],
  } as unknown as LongProjectStoryboardPanel;
}

/** 复刻 `savePanelEdit` 里对格级声明的重解析。 */
function reparseLikeSave(cells: ReturnType<typeof parsePanelBlock>) {
  return cells.map((cell) => {
    if (!cell.assetBindings?.length) return cell;
    return {
      ...cell,
      assetBindings: bindingsFromValue(serializeBindings(cell.assetBindings), assets, 'c1', chapterOrders),
    };
  });
}

describe('分镜编辑器往返：状态名不丢', () => {
  it('serializePanelBlock → parsePanelBlock 保留状态名', () => {
    const box = serializePanelBlock(importedPanel());
    expect(box).toContain('出场资产：测验魔石碑（萧炎测验·三段显示）');

    const cells = parsePanelBlock(box);
    const stateNames = cells.flatMap((cell) => (cell.assetBindings ?? []).map((binding) => binding.visualVersionName));
    expect(stateNames).toContain('萧炎测验·三段显示');
    expect(stateNames).toContain('中年·测验员形象');
  });

  it('往返后回写输入框，文本与首次打开时一致（不悄悄改写）', () => {
    const panel = importedPanel();
    const box = serializePanelBlock(panel);
    const back = serializePanelBlock({ ...panel, cells: parsePanelBlock(box) });
    expect(back).toBe(box);
  });

  it('保存重解析能还原同一个 visualVersionId（不靠 defaultVariant 猜）', () => {
    const panel = importedPanel();
    const reparsed = reparseLikeSave(parsePanelBlock(serializePanelBlock(panel)));
    const bindings = reparsed.flatMap((cell) => cell.assetBindings ?? []);
    expect(bindings.map((binding) => binding.visualVersionId)).toEqual(['v1', 'v4', 'v1']);
    expect(bindings.every((binding) => binding.matchSource === 'model')).toBe(true);
  });

  it('解析不到资产时保留原文状态名（round-trip 的唯一依据）', () => {
    // 直接模拟编辑器上下文：空资产库 + 空章节
    const bindings = bindingsFromValue('测验魔石碑（萧炎测验·三段显示）', [], '', {});
    expect(bindings[0].assetId).toBeUndefined();
    expect(bindings[0].matchSource).toBe('unmatched');
    expect(bindings[0].assetName).toBe('测验魔石碑');
    expect(bindings[0].visualVersionName).toBe('萧炎测验·三段显示');
    expect(serializeBindings(bindings)).toBe('测验魔石碑（萧炎测验·三段显示）');
  });

  it('资产命中但状态未命中时仍按现状回落（不保留原文，避免显示名与实际取图不一致）', () => {
    const bindings = bindingsFromValue('测验魔石碑（某个不存在的状态）', assets, 'c1', chapterOrders);
    expect(bindings[0].assetId).toBe('a3');
    expect(bindings[0].visualVersionName).toBeUndefined();
  });

  it('只写资产名（没写状态）时不凭空造状态名', () => {
    const bindings = bindingsFromValue('中年测验员', [], '', {});
    expect(bindings[0].visualVersionName).toBeUndefined();
    expect(serializeBindings(bindings)).toBe('中年测验员');
  });

  it('编号前缀在编辑器往返中被剥离，且不污染资产名', () => {
    const cells = parsePanelBlock('第1格\n画面：石碑亮起。\n出场资产：F1 测验魔石碑（萧炎测验·三段显示）');
    expect(cells[0].assetBindings?.[0].assetName).toBe('测验魔石碑');
    expect(cells[0].assetBindings?.[0].visualVersionName).toBe('萧炎测验·三段显示');
  });
});
