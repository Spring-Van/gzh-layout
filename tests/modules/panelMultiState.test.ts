import { describe, expect, it } from 'vitest';
import {
  mergeCellBindings,
  panelBlockText,
  parsePanelBlock,
  parseStoryboardResponse,
  patchBlockTextAssetLines,
  serializePanelBlock,
  summarizeCellBindings,
} from '../../src/modules/comic/services/storyboardService';
import { syncPanelsAutoBindings, buildAssetNameIndex } from '../../src/modules/comic/services/promptAssetService';
import { resolvePanelAssetStates } from '../../src/modules/comic/services/panelPromptService';
import type {
  LongProjectAsset,
  LongProjectStoryboardAssetBinding,
  LongProjectStoryboardPanel,
} from '../../src/modules/comic/types';

const CHAPTER = 'c1';
const chapterOrders = { [CHAPTER]: 0 };

const assets = [
  {
    id: 'a1', type: 'prop', name: '测验魔石碑', aliases: [],
    variants: [
      { id: 'v1', name: '萧炎测验·三段显示', referenceImageIds: ['img-3'] },
      { id: 'v2', name: '萧媚测验·七段显示', referenceImageIds: ['img-7'] },
    ],
  },
  {
    id: 'a2', type: 'character', name: '萧炎', aliases: [],
    variants: [{ id: 'p1', name: '少年·当前形象', referenceImageIds: ['img-x'] }],
  },
] as unknown as LongProjectAsset[];

const bindingOf = (assetId: string, assetName: string, visualVersionId: string | undefined, visualVersionName: string | undefined): LongProjectStoryboardAssetBinding => ({
  assetId, assetName, visualVersionId, visualVersionName, matchSource: 'model', referenceImageIds: [],
});

const panelOf = (partial: Partial<LongProjectStoryboardPanel>): LongProjectStoryboardPanel => ({
  id: 'p1', order: 1, content: '', assetBindings: [], ...partial,
});

describe('分镜原文（blockText）', () => {
  it('有原文时一字不改地返回（不再按字段顺序重排）', () => {
    const raw = '第1格\n画面：少年握拳。\n我的备注：随便写点什么\n\n第2格\n特写：石碑亮起';
    const panel = panelOf({ blockText: raw, cells: parsePanelBlock(raw) });
    expect(panelBlockText(panel)).toBe(raw);
  });

  it('无原文时回落到序列化草稿', () => {
    const panel = panelOf({ cells: parsePanelBlock('第1格\n景别：近景\n画面：握拳。') });
    expect(panelBlockText(panel)).toBe(serializePanelBlock(panel));
  });

  it('定点回写「出场资产」行：只改那一行，自定义字段 / 顺序 / 空行全部保留', () => {
    const raw = '第1格\n画面：石碑亮起。\n画风：治愈系柔和光\n出场资产：测验魔石碑（萧炎测验·三段显示）\n\n第2格\n画面：人群骚动。\n';
    const cells = parsePanelBlock(raw);
    cells[0].assetBindings = [bindingOf('a1', '测验魔石碑', 'v2', '萧媚测验·七段显示')];
    const patched = patchBlockTextAssetLines(raw, panelOf({ cells }));
    expect(patched).toBe('第1格\n画面：石碑亮起。\n画风：治愈系柔和光\n出场资产：测验魔石碑（萧媚测验·七段显示）\n\n第2格\n画面：人群骚动。\n');
  });

  it('绑定清空时删掉「出场资产」行，其余不动', () => {
    const raw = '第1格\n画面：握拳。\n出场资产：测验魔石碑（萧炎测验·三段显示）\n表情：倔强\n';
    const cells = parsePanelBlock(raw);
    cells[0].assetBindings = [];
    expect(patchBlockTextAssetLines(raw, panelOf({ cells }))).toBe('第1格\n画面：握拳。\n表情：倔强\n');
  });

  it('回写剥掉编号前缀：编辑框不需要看编号（编号是提示词传输层协议）', () => {
    const raw = '第1格\n画面：广场出口。\n出场资产：A1 萧炎（少年·当前形象）、B1 萧薰儿（少女·紫色衣裙）\n旁白：一缕清莲之光。';
    const cells = parsePanelBlock(raw);
    cells[0].assetBindings = [
      bindingOf('a2', '萧炎', 'p1', '少年·当前形象'),
      bindingOf('a3', '萧薰儿', 'v2', '少女·紫色衣裙'),
    ];
    expect(patchBlockTextAssetLines(raw, panelOf({ cells })))
      .toBe('第1格\n画面：广场出口。\n出场资产：萧炎（少年·当前形象）、萧薰儿（少女·紫色衣裙）\n旁白：一缕清莲之光。');
  });

  it('回写对绑定已变的行同样输出无编号写法', () => {
    const raw = '第1格\n画面：广场出口。\n出场资产：A1 萧炎（少年·当前形象）\n';
    const cells = parsePanelBlock(raw);
    cells[0].assetBindings = [bindingOf('a2', '萧炎', 'p1', '少年·当前形象'), bindingOf('a3', '萧薰儿', 'v2', '少女·紫色衣裙')];
    expect(patchBlockTextAssetLines(raw, panelOf({ cells })))
      .toBe('第1格\n画面：广场出口。\n出场资产：萧炎（少年·当前形象）、萧薰儿（少女·紫色衣裙）\n');
  });

  it('用户自写的未知字段行在原文模式下不再丢失或被当成台词', () => {
    const raw = '第1格\n画面：握拳。\n- 画风：治愈系柔和光\n气氛：紧张\n';
    const panel = panelOf({ blockText: raw, cells: parsePanelBlock(raw) });
    expect(panelBlockText(panel)).toBe(raw);
  });

  it('解析时保存模型原文：模型的 Markdown 写法原样保留，不再反拼成固定格式', () => {
    const output = [
      '## 分镜 1 · 双格',
      '### 第1格',
      '- 景别：近景',
      '- 画面：少年握紧拳头。',
      '',
      '### 第2格',
      '- 画面：石碑亮起。',
    ].join('\n');
    const [panel] = parseStoryboardResponse(output, [], CHAPTER, chapterOrders);
    expect(panel.blockText).toBe('### 第1格\n- 景别：近景\n- 画面：少年握紧拳头。\n\n### 第2格\n- 画面：石碑亮起。');
  });

  it('多页切分：每页的原文只含本页内容（不含页头行）', () => {
    const output = [
      '## 分镜 1',
      '第1格',
      '画面：A 页。',
      '## 分镜 2',
      '第1格',
      '画面：B 页。',
    ].join('\n');
    const panels = parseStoryboardResponse(output, [], CHAPTER, chapterOrders);
    expect(panels).toHaveLength(2);
    expect(panels[0].blockText).toBe('第1格\n画面：A 页。');
    expect(panels[1].blockText).toBe('第1格\n画面：B 页。');
  });

  it('编辑器路径（parsePanelBlock）原文往返：进去什么文本，blockText 就是什么文本', () => {
    const raw = '第1格\n画面：握拳。\n我的自定义：随便写';
    const [panel] = parsePanelBlock(raw).length
      ? parseStoryboardResponse(`## 分镜 1\n${raw}`, [], CHAPTER, chapterOrders)
      : [];
    expect(panel?.blockText?.trim()).toBe(raw);
  });
});

describe('同资产多状态绑定', () => {
  it('mergeCellBindings：同一格声明两个状态 → 两条都保留', () => {
    const merged = mergeCellBindings(
      [bindingOf('a1', '测验魔石碑', 'v1', '萧炎测验·三段显示')],
      [bindingOf('a1', '测验魔石碑', 'v2', '萧媚测验·七段显示')],
    );
    expect(merged.map((item) => item.visualVersionId)).toEqual(['v1', 'v2']);
  });

  it('mergeCellBindings：完全相同的 资产+状态 仍去重', () => {
    const merged = mergeCellBindings(
      [bindingOf('a1', '测验魔石碑', 'v1', '萧炎测验·三段显示')],
      [bindingOf('a1', '测验魔石碑', 'v1', '萧炎测验·三段显示')],
    );
    expect(merged).toHaveLength(1);
  });

  it('summarizeCellBindings：同资产多状态各留一条，资产按首次出现顺序分组', () => {
    const cells = [
      { content: '格1', assetBindings: [bindingOf('a2', '萧炎', 'p1', '少年'), bindingOf('a1', '测验魔石碑', 'v1', '三段')] },
      { content: '格2', assetBindings: [bindingOf('a1', '测验魔石碑', 'v2', '七段')] },
    ] as LongProjectStoryboardPanel['cells'];
    const summarized = summarizeCellBindings(cells!);
    expect(summarized.map((item) => `${item.assetId}:${item.visualVersionId}`)).toEqual(['a2:p1', 'a1:v1', 'a1:v2']);
  });

  it('同一格文本提到两个状态 → 自动绑定出两条', () => {
    const panel = panelOf({
      cells: [{ content: '测验魔石碑亮起萧炎测验·三段显示的字符，随后转为萧媚测验·七段显示', assetBindings: [] }],
    } as Partial<LongProjectStoryboardPanel>);
    const [synced] = syncPanelsAutoBindings([panel], buildAssetNameIndex(assets), () => undefined);
    const stone = (synced.cells?.[0].assetBindings ?? []).filter((item) => item.assetId === 'a1');
    expect(stone.map((item) => item.visualVersionId)).toEqual(['v1', 'v2']);
  });

  it('页级两条同资产不同状态 → 生图清单两条各带各的图，不重复', () => {
    const panel = panelOf({
      cells: [
        { content: '三段显示亮起。', assetBindings: [bindingOf('a1', '测验魔石碑', 'v1', '萧炎测验·三段显示')] },
        { content: '七段显示亮起。', assetBindings: [bindingOf('a1', '测验魔石碑', 'v2', '萧媚测验·七段显示')] },
      ],
      assetBindings: [
        bindingOf('a1', '测验魔石碑', 'v1', '萧炎测验·三段显示'),
        bindingOf('a1', '测验魔石碑', 'v2', '萧媚测验·七段显示'),
      ],
    });
    const states = resolvePanelAssetStates(panel, assets);
    const stone = states.filter((state) => state.asset.id === 'a1');
    expect(stone.map((state) => state.variant.id)).toEqual(['v1', 'v2']);
    expect(stone.map((state) => state.cellIndexes)).toEqual([[0], [1]]);
    expect(stone.map((state) => state.variant.referenceImageIds)).toEqual([['img-3'], ['img-7']]);
  });
});
