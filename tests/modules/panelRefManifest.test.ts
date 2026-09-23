import { describe, expect, it } from 'vitest';
import {
  ASSET_REF_ORDER,
  buildPanelRefManifest,
  groupManifestByType,
} from '../../src/modules/comic/services/panelRefManifest';
import {
  buildChapterPanelPromptPrompt,
  buildPanelPromptPrompt,
  composeFinalPrompt,
  parseChapterPanelPrompts,
  slotRefManifest,
} from '../../src/modules/comic/services/panelPromptService';
import { buildBlockText, computeBlockImageNumbers, getSharedRefImages } from '../../src/modules/comic/utils/sharedBlocks';
import { findUnknownVariables, getTemplateVariables } from '../../src/modules/comic/services/promptTemplateRegistry';
import type { LongProjectAsset, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel, SharedPromptBlock } from '../../src/modules/comic/types';

/**
 * 参考图清单（唯一图号来源）与共用属性拼装的核心口径单测：
 * 编号顺序、back 组排除、不截断、实时性、最终拼接、整章解析。
 * （手动排序 referenceOrder 已下线，顺序恒定为默认规则。）
 */

const character = {
  id: 'a1',
  name: '萧薰儿',
  type: 'character',
  aliases: [],
  fixedTraits: [],
  variants: [
    { id: 'v1', name: '便装', description: '日常便装', generatedImageIds: ['casual-1'] },
    { id: 'v2', name: '战斗服', description: '战斗装备', generatedImageIds: ['battle-1', 'battle-2'] },
  ],
} as unknown as LongProjectAsset;

const scene = {
  id: 'a2',
  name: '萧家测试广场',
  type: 'scene',
  aliases: [],
  fixedTraits: [],
  variants: [{ id: 'v3', name: '白天', description: '广场', generatedImageIds: ['plaza-1'] }],
} as unknown as LongProjectAsset;

const prop = {
  id: 'a3',
  name: '测验魔石碑',
  type: 'prop',
  aliases: [],
  fixedTraits: [],
  variants: [{ id: 'v4', name: '常态', description: '石碑', generatedImageIds: ['stone-1'] }],
} as unknown as LongProjectAsset;

const assets = [character, scene, prop];

function binding(assetId: string, variantId: string, selectedImageIds?: string[]): LongProjectStoryboardAssetBinding {
  return { assetId, assetName: '', matchSource: 'model', visualVersionId: variantId, selectedImageIds } as LongProjectStoryboardAssetBinding;
}

/** 一页两格：第 1 格便装、第 2 格战斗服（换装页）。 */
const panel = {
  id: 'p1',
  order: 1,
  content: '萧薰儿走向测验魔石碑',
  assetBindings: [binding('a1', 'v2'), binding('a2', 'v3'), binding('a3', 'v4')],
  cells: [
    { assetBindings: [binding('a1', 'v1'), binding('a2', 'v3')] },
    { assetBindings: [binding('a1', 'v2'), binding('a3', 'v4')] },
  ],
} as unknown as LongProjectStoryboardPanel;

/** 共用属性：两个 front（第二个带 2 张图）+ 一个 back（带 2 张图，应被完全忽略）。 */
const blocks: SharedPromptBlock[] = [
  { id: 'b1', name: '前置条件', description: '保持画面干净', enableRefImages: false, referenceImages: [], insertPosition: 'front', sortOrder: 0 },
  { id: 'b2', name: '绘画风格参考图', description: '综合参考图像的画风', enableRefImages: true, referenceImages: ['style-1', 'style-2'], insertPosition: 'front', sortOrder: 1 },
  { id: 'b3', name: '后置条件', description: '不要出现水印', enableRefImages: true, referenceImages: ['back-1', 'back-2'], insertPosition: 'back', sortOrder: 0 },
] as unknown as SharedPromptBlock[];

describe('buildPanelRefManifest — 图号顺序', () => {
  it('共用属性图（插入最前）→ 人物 → 场景 → 道具', () => {
    const manifest = buildPanelRefManifest({ panel, assets, sharedBlocks: blocks });
    expect(manifest.images).toEqual([
      'style-1', // 图1 front 共用属性
      'style-2', // 图2
      'casual-1', // 图3 人物（第1格便装）
      'battle-1', // 图4 人物（第2格战斗服）
      'plaza-1', // 图5 场景
      'stone-1', // 图6 道具
    ]);
    expect(manifest.entries.map((entry) => entry.index)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('不变式：images[i] 就是「图 i+1」', () => {
    const manifest = buildPanelRefManifest({ panel, assets, sharedBlocks: blocks });
    manifest.entries.forEach((entry, i) => {
      expect(entry.index).toBe(i + 1);
      expect(manifest.images[i]).toBe(entry.image);
    });
  });

  it('「插入最后」的块完全不参与取图与编号', () => {
    const manifest = buildPanelRefManifest({ panel, assets, sharedBlocks: blocks });
    expect(manifest.images).not.toContain('back-1');
    expect(manifest.images).not.toContain('back-2');
    expect(getSharedRefImages(blocks)).toEqual(['style-1', 'style-2']);
    // back 块的图号恒为空
    expect(computeBlockImageNumbers(blocks).get('b3')).toEqual([]);
  });

  it('不做截断：超过 14 张也全部返回', () => {
    const many = {
      id: 'b9',
      name: '多图属性',
      description: '',
      enableRefImages: true,
      referenceImages: Array.from({ length: 20 }, (_, i) => `img-${i + 1}`),
      insertPosition: 'front',
      sortOrder: 0,
    } as unknown as SharedPromptBlock;
    const manifest = buildPanelRefManifest({ panel, assets, sharedBlocks: [many] });
    expect(manifest.images).toHaveLength(20 + 4); // 20 张共用属性 + 4 张资产
    expect(manifest.images).not.toContain('back-1');
  });

  it('实时性：改资产视觉状态的图顺序后，图号立刻变化（无缓存）', () => {
    const before = buildPanelRefManifest({ panel, assets, sharedBlocks: blocks });
    const swapped = [
      { ...character, variants: [{ ...character.variants[0], generatedImageIds: ['casual-new'] }, character.variants[1]] },
      scene,
      prop,
    ] as unknown as LongProjectAsset[];
    const after = buildPanelRefManifest({ panel, assets: swapped, sharedBlocks: blocks });
    expect(before.images[2]).toBe('casual-1');
    expect(after.images[2]).toBe('casual-new');
    expect(after.images[0]).toBe('style-1'); // 其他图号不受影响
  });

  it('顺序恒定：手动排序已下线，图号始终按 共用属性 → 人物 → 场景 → 道具', () => {
    const manifest = buildPanelRefManifest({ panel, assets, sharedBlocks: blocks });
    // 与「共用属性 → 人物 → 场景 → 道具」的默认顺序一致，且与任何历史手动顺序无关。
    expect(manifest.images).toEqual(['style-1', 'style-2', 'casual-1', 'battle-1', 'plaza-1', 'stone-1']);
    expect(manifest.entries.map((entry) => entry.index)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('共用属性替换图片后，按默认顺序重新编号（无手动顺序残留）', () => {
    const changedBlocks = blocks.map((block) => block.id === 'b2' ? { ...block, referenceImages: ['style-new', 'style-2'] } : block)
    const after = buildPanelRefManifest({ panel, assets, sharedBlocks: changedBlocks });
    expect(after.images[0]).toBe('style-new');
    expect(after.entries[0].image).toBe('style-new');
    expect(after.entries.at(-1)?.image).toBe('stone-1');
  });

  it('分镜手选图优先（单选口径），未选则取该状态第一张', () => {
    const picked = {
      ...panel,
      assetBindings: [binding('a1', 'v2', ['battle-2']), binding('a2', 'v3'), binding('a3', 'v4')],
    } as unknown as LongProjectStoryboardPanel;
    const manifest = buildPanelRefManifest({ panel: picked, assets, sharedBlocks: blocks });
    expect(manifest.images).toContain('battle-2'); // 手选过 → 用它
    expect(manifest.images).not.toContain('battle-1');
    // 第1格的便装无页级 binding → 取状态第一张
    expect(manifest.images).toContain('casual-1');
  });
});

describe('slotRefManifest — 按提示词条的开关裁剪并重编图号', () => {
  const base = () => buildPanelRefManifest({ panel, assets, sharedBlocks: blocks });

  it('开关都开：与原始清单完全一致', () => {
    const manifest = base();
    const slot = slotRefManifest(manifest, { attachShared: true, useAssetRefs: true });
    expect(slot.images).toEqual(manifest.images);
    expect(slot.entries.map((entry) => entry.index)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('省略开关按「都开」处理（旧数据不会变成什么都不发）', () => {
    expect(slotRefManifest(base()).images).toEqual(base().images);
  });

  it('关掉「拼接共用属性」：共用属性图剔除，资产图从图1重编', () => {
    const slot = slotRefManifest(base(), { attachShared: false, useAssetRefs: true });
    expect(slot.images).toEqual(['casual-1', 'battle-1', 'plaza-1', 'stone-1']);
    expect(slot.entries.map((entry) => entry.index)).toEqual([1, 2, 3, 4]);
    expect(slot.entries.every((entry) => entry.source === 'asset')).toBe(true);
  });

  it('关掉「使用资产参考图」：资产图剔除，共用属性图仍是图1起', () => {
    const slot = slotRefManifest(base(), { attachShared: true, useAssetRefs: false });
    expect(slot.images).toEqual(['style-1', 'style-2']);
    expect(slot.entries.map((entry) => entry.index)).toEqual([1, 2]);
  });

  it('两个都关：清单为空', () => {
    const slot = slotRefManifest(base(), { attachShared: false, useAssetRefs: false });
    expect(slot.images).toEqual([]);
    expect(slot.entries).toEqual([]);
  });

  it('不变式：裁剪后 images[i] 依然是「图 i+1」', () => {
    const slot = slotRefManifest(base(), { attachShared: false, useAssetRefs: true });
    slot.entries.forEach((entry, index) => expect(entry.index).toBe(index + 1));
  });

  it('attachShared=false 时最终提示词不再拼前置/后置共用属性', () => {
    const manifest = base();
    const withShared = composeFinalPrompt('画面', blocks, slotRefManifest(manifest, { attachShared: true }));
    const without = composeFinalPrompt('画面', blocks, slotRefManifest(manifest, { attachShared: false }), [], { attachShared: false });
    expect(withShared).toContain('保持画面干净'); // 前置属性
    expect(withShared).toContain('不要出现水印'); // 后置属性
    expect(without).not.toContain('保持画面干净');
    expect(without).not.toContain('不要出现水印');
  });
});

describe('groupManifestByType — 分组', () => {
  it('共用属性归入 style 组，其余按资产类型分组且顺序与图号一致', () => {
    const groups = groupManifestByType(buildPanelRefManifest({ panel, assets, sharedBlocks: blocks }));
    const byType = Object.fromEntries(groups.map((group) => [group.type, group.images]));
    expect(byType.style).toEqual(['style-1', 'style-2']);
    expect(byType.character).toEqual(['casual-1', 'battle-1']);
    expect(byType.scene).toEqual(['plaza-1']);
    expect(byType.prop).toEqual(['stone-1']);
    expect(ASSET_REF_ORDER).toEqual(['character', 'scene', 'prop']);
  });
});

describe('composeFinalPrompt — 运行时最终拼接', () => {
  it('前置共用属性 + 动态参考图 + 画面描述 + 后置共用属性，图号来自当前清单', () => {
    const manifest = buildPanelRefManifest({ panel, assets, sharedBlocks: blocks });
    const result = composeFinalPrompt('第1格：她缓缓走向石碑。', blocks, manifest);
    expect(result).toContain('前置条件');
    expect(result).toContain('图1、图2 = 绘画风格参考图。');
    expect(result).toContain('【动态参考图】');
    expect(result).toContain('图3 = 萧薰儿（便装）人物参考，仅用于第1格的人物身份、脸部、发型、服装与外貌特征。');
    expect(result).toContain('图6 = 测验魔石碑（常态）道具参考，仅用于第2格的道具外观与材质。');
    expect(result).toContain('第1格：她缓缓走向石碑。');
    expect(result).toContain('后置条件');
    expect(result).toContain('不要出现水印');
    // 顺序：前置 → 动态图定义 → 描述 → 后置
    expect(result.indexOf('前置条件')).toBeLessThan(result.indexOf('第1格：她缓缓走向石碑。'));
    expect(result.indexOf('【动态参考图】')).toBeLessThan(result.indexOf('第1格：她缓缓走向石碑。'));
    expect(result.indexOf('第1格：她缓缓走向石碑。')).toBeLessThan(result.indexOf('后置条件'));
    // 后置块不得出现图号行
    const backSection = result.slice(result.indexOf('后置条件'));
    expect(backSection).not.toMatch(/图\d/);
  });

  it('最终提示词严格按前置属性、参考图定义、内容、后置属性排列', () => {
    const manifest = buildPanelRefManifest({ panel, assets, sharedBlocks: blocks });
    const result = composeFinalPrompt('唯一画面内容', blocks, manifest);
    const frontIndex = result.indexOf('前置条件');
    const referencesIndex = result.indexOf('【动态参考图】');
    const contentIndex = result.indexOf('唯一画面内容');
    const backIndex = result.indexOf('后置条件');
    expect(frontIndex).toBeGreaterThanOrEqual(0);
    expect(frontIndex).toBeLessThan(referencesIndex);
    expect(referencesIndex).toBeLessThan(contentIndex);
    expect(contentIndex).toBeLessThan(backIndex);
  });

  it('画面描述保持纯净：函数不改写 imagePrompt，只在其前后拼接', () => {
    const description = '原始描述，一个字都不该被改。';
    const manifest = buildPanelRefManifest({ panel, assets, sharedBlocks: blocks });
    const result = composeFinalPrompt(description, blocks, manifest);
    expect(result).toContain(description);
    expect(result.indexOf('前置条件')).toBeLessThan(result.indexOf(description));
    expect(result.indexOf(description)).toBeLessThan(result.indexOf('后置条件'));
  });

  it('额外参考图追加在核心清单末尾，定义图号与发送数组位置一致', () => {
    const manifest = buildPanelRefManifest({ panel, assets, sharedBlocks: blocks });
    const result = composeFinalPrompt('画面内容。', blocks, manifest, [
      { image: 'previous-result', label: '本镜上一版结果图' },
      { image: 'custom-1', label: '自定义参考图 1' },
    ]);
    expect(result).toContain('图7 = 本镜上一版结果图。');
    expect(result).toContain('图8 = 自定义参考图 1。');
    expect([...manifest.images, 'previous-result', 'custom-1'][6]).toBe('previous-result');
  });
});

describe('buildBlockText', () => {
  it('三段式：属性名 / 图号行 / 描述正文，互不覆盖', () => {
    const block = blocks[1];
    expect(buildBlockText(block, [1, 2], 'front')).toBe('绘画风格参考图\n图1、图2 = 绘画风格参考图。\n综合参考图像的画风');
  });

  it('back 组不产生图号行', () => {
    expect(buildBlockText(blocks[2], [], 'back')).toBe('后置条件\n不要出现水印');
  });

  it('无图无描述时整块跳过', () => {
    const empty = { id: 'x', name: '', description: '', enableRefImages: false, referenceImages: [], insertPosition: 'front', sortOrder: 0 } as unknown as SharedPromptBlock;
    expect(buildBlockText(empty, [], 'front')).toBe('');
  });
});

describe('parseChapterPanelPrompts — 整章输出对位', () => {
  const panels = [{ id: 'p1', order: 1 }, { id: 'p2', order: 2 }, { id: 'p3', order: 3 }];

  it('按【分镜N】标记对位（不依赖顺序）', () => {
    const text = '【分镜2】\n第二镜描述。\n\n【分镜1】\n第一镜描述。\n\n【分镜3】\n第三镜描述。';
    const parsed = parseChapterPanelPrompts(text, panels);
    expect(parsed.mode).toBe('marked');
    expect(parsed.missingOrders).toEqual([]);
    expect(parsed.entries).toEqual([
      { panelId: 'p1', order: 1, prompt: '第一镜描述。' },
      { panelId: 'p2', order: 2, prompt: '第二镜描述。' },
      { panelId: 'p3', order: 3, prompt: '第三镜描述。' },
    ]);
  });

  it('兼容「第N镜」与 Markdown 标题形态', () => {
    const text = '## 分镜1\n甲。\n\n### 第2镜\n乙。\n\n分镜3：丙。';
    const parsed = parseChapterPanelPrompts(text, panels);
    expect(parsed.entries.map((entry) => entry.prompt)).toEqual(['甲。', '乙。', '丙。']);
  });

  it('主形态：## 分镜 N 标题 + 段内第X格小节——格标题绝不当作分镜标记截断正文', () => {
    const text = [
      '## 分镜 1',
      '资产参考图：',
      '图4 = 角色参考。',
      '请根据以上参考图生成一页两格漫画。',
      '第1格：',
      '近景，平视。',
      '使用图4保持角色一致；',
      '第2格：',
      '中景。',
      '## 分镜 2',
      '第1格：',
      '特写。',
    ].join('\n');
    const parsed = parseChapterPanelPrompts(text, panels.slice(0, 2));
    expect(parsed.mode).toBe('marked');
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0].prompt).toContain('第1格：');
    expect(parsed.entries[0].prompt).toContain('第2格：');
    expect(parsed.entries[1].prompt).toContain('特写。');
  });

  it('漏段时记录 missingOrders，不误配到别的镜', () => {
    const parsed = parseChapterPanelPrompts('【分镜1】\n甲。\n\n【分镜3】\n丙。', panels);
    expect(parsed.entries.map((entry) => entry.order)).toEqual([1, 3]);
    expect(parsed.missingOrders).toEqual([2]);
  });

  it('完全没有标记时按顺序兜底并标记 mode=sequential', () => {
    const parsed = parseChapterPanelPrompts('甲。\n\n乙。\n\n丙。', panels);
    expect(parsed.mode).toBe('sequential');
    expect(parsed.entries.map((entry) => entry.prompt)).toEqual(['甲。', '乙。', '丙。']);
    expect(parsed.missingOrders).toEqual([]);
  });

  it('段落少于分镜数时，多出的镜进 missingOrders', () => {
    const parsed = parseChapterPanelPrompts('甲。\n\n乙。', panels);
    expect(parsed.entries.map((entry) => entry.order)).toEqual([1, 2]);
    expect(parsed.missingOrders).toEqual([3]);
  });
});

describe('画面描述推导 — 只推导纯画面内容', () => {
  it('逐镜推导只给分镜上下文，不包含参考图、图号或共用属性', () => {
    const template = ['{{当前分镜}}', '{{镜头}}', '{{前文分镜}}'].join('\n');
    const result = buildPanelPromptPrompt({
      templateContent: template,
      panel,
      chapterOutline: '分镜1：概要',
      prevEntries: [],
      targetImageModel: '即梦',
    });
    expect(result).toContain('分镜序号：1');
    expect(result).not.toMatch(/图\d+\s*=/);
    expect(result).not.toContain('角色参考');
    expect(result).not.toContain('保持画面干净');
    expect(result).not.toContain('综合参考图像的画风');
    expect(result).not.toContain('不要出现水印');
    expect(result).not.toContain('{{');
  });

  it('变量注册表里已没有共用属性变量与资产设定变量', () => {
    const names = getTemplateVariables('panel-prompt').map((spec) => spec.name);
    expect(names).not.toContain('前置共用属性');
    expect(names).not.toContain('后置共用属性');
    expect(names).not.toContain('绑定资产');
    expect(names).not.toContain('参考图清单');
    const chapterNames = getTemplateVariables('panel-prompt-chapter').map((spec) => spec.name);
    expect(chapterNames).not.toContain('全章资产设定');
    expect(chapterNames).not.toContain('全章参考图清单');
    expect(findUnknownVariables('{{前置共用属性}}', 'panel-prompt')).toEqual(['前置共用属性']);
    expect(findUnknownVariables('{{绑定资产}}', 'panel-prompt')).toEqual(['绑定资产']);
    expect(findUnknownVariables('{{参考图清单}}', 'panel-prompt')).toEqual(['参考图清单']);
  });
});

describe('逐镜与全章模板的变量差异', () => {
  it('逐镜模板含当前分镜/镜头/前文分镜，不含参考图与全章变量', () => {
    const template = ['{{当前分镜}}', '{{镜头}}', '{{前文分镜}}'].join('\n');
    const result = buildPanelPromptPrompt({
      templateContent: template,
      panel,
      chapterOutline: '分镜1：概要',
      prevEntries: [],
      targetImageModel: '即梦',
    });
    expect(result).toContain('分镜序号：1');
    expect(result).not.toMatch(/图\d+\s*=/);
    expect(result).not.toContain('{{');
  });

  it('全章模板只输出全章分镜，不注入逐镜参考图清单', () => {
    const panel2 = { ...panel, id: 'p2', order: 2 } as unknown as LongProjectStoryboardPanel;
    const template = '{{全章分镜}}';
    const result = buildChapterPanelPromptPrompt({
      templateContent: template,
      panels: [panel, panel2],
      targetImageModel: '即梦',
    });
    expect(result).toContain('分镜序号：1');
    expect(result).toContain('分镜序号：2');
    expect(result).not.toMatch(/图\d+\s*=/);
    expect(result).not.toContain('综合参考图像的画风');
    expect(result).not.toContain('{{');
  });
});
