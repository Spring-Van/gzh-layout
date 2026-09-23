import { describe, expect, it } from 'vitest';
import { buildAssetNameIndex, summarizePanelBindingHealth, syncPanelsAutoBindings } from '../../src/modules/comic/services/promptAssetService';
import type { LongProjectAsset, LongProjectStoryboardCell, LongProjectStoryboardPanel } from '../../src/modules/comic/types';

/**
 * 「描述/文本里出现了资产 → 自动补上绑定」这条链的语义锁。
 *
 * 根因背景：整章推导、单镜推导、导入外部描述三条路径写完画面描述后**都没有回填绑定**，
 * 于是描述里提到的资产只活在文本里 —— 不进绑定、不进参考图清单、取图时凭空消失。
 * 这里锁住的是服务层行为（同步函数本身），页面接线由各自调用点保证。
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

const scene = {
  id: 'a2',
  name: '测验广场',
  type: 'scene',
  aliases: [],
  fixedTraits: [],
  variants: [{ id: 'v3', name: '全章默认', referenceImageIds: ['plaza-1'] }],
} as unknown as LongProjectAsset;

const assets = [character, scene];
const index = buildAssetNameIndex(assets);
/** 测试用缺省状态解析：取第一个状态（等价于「章节范围推不出」时的兜底）。 */
const firstVariant = (asset: LongProjectAsset) => asset.variants[0];

function panel(overrides: Partial<LongProjectStoryboardPanel>): LongProjectStoryboardPanel {
  return { id: 'p1', order: 1, content: '', assetBindings: [], ...overrides };
}

function cells(...items: Array<string | Partial<LongProjectStoryboardCell>>): LongProjectStoryboardCell[] {
  return items.map((item) => (typeof item === 'string' ? { content: item } : (item as LongProjectStoryboardCell)));
}

describe('画面描述写入后的自动绑定同步', () => {
  it('描述里提到的资产会补上绑定（根因回归：推导完描述后绑定仍为空）', () => {
    const before = panel({ imagePrompt: '画面内容：林小雨站在雨里，肩膀剧烈颤抖。' });
    const [after] = syncPanelsAutoBindings([before], index, firstVariant);
    expect(after.assetBindings).toHaveLength(1);
    expect(after.assetBindings[0]).toMatchObject({
      assetId: 'a1',
      assetName: '林小雨',
      visualVersionId: 'v1',
      visualVersionName: '便装',
      matchSource: 'auto-text',
    });
  });

  it('描述里新增的场景同样会被绑上（新增一页里有新场景）', () => {
    const before = panel({ content: '测验广场上人潮涌动，石碑高耸。' });
    const [after] = syncPanelsAutoBindings([before], index, firstVariant);
    expect(after.assetBindings.map((binding) => binding.assetId)).toEqual(['a2']);
  });

  it('格级「人物」字段新增角色 → 格级绑定补上并汇总到页级', () => {
    const before = panel({ cells: cells({ content: '少女走进教室，抬眼看向讲台。', cast: '林小雨' }) });
    const [after] = syncPanelsAutoBindings([before], index, firstVariant);
    expect(after.cells?.[0].assetBindings?.map((binding) => binding.assetId)).toEqual(['a1']);
    expect(after.assetBindings.some((binding) => binding.assetId === 'a1')).toBe(true);
  });

  it('描述提到的资产状态跟随上一镜延续（前镜手动锚定 → 后镜自动跟随）', () => {
    const p1 = panel({
      id: 'p1',
      order: 1,
      imagePrompt: '画面内容：林小雨换上战斗服，背影笔直。',
      assetBindings: [{
        assetId: 'a1', assetName: '林小雨',
        visualVersionId: 'v2', visualVersionName: '战斗服',
        matchSource: 'manual', referenceImageIds: ['battle-1'],
      }],
    });
    const p2 = panel({ id: 'p2', order: 2, imagePrompt: '画面内容：林小雨推开木门。' });
    const [, r2] = syncPanelsAutoBindings([p1, p2], index, firstVariant);
    const binding = r2.assetBindings.find((item) => item.assetId === 'a1');
    expect(binding?.visualVersionId).toBe('v2');
    expect(binding?.visualVersionName).toBe('战斗服');
  });

  it('待核对区补绑（manual）的绑定在后续同步中不会丢 —— 补绑前提就是文本里已命中该资产名', () => {
    const before = panel({
      content: '林小雨站在测验广场上。',
      assetBindings: [{
        assetId: 'a1', assetName: '林小雨',
        visualVersionId: 'v1', visualVersionName: '便装',
        matchSource: 'manual', referenceImageIds: ['casual-1'],
      }],
    });
    const [after] = syncPanelsAutoBindings([before], index, firstVariant);
    expect(after.assetBindings.some((binding) => binding.assetId === 'a1')).toBe(true);
  });

  it('auto-text 绑定在名称消失时仍会被移除（自动绑定跟随文本存在性）', () => {
    const before = panel({
      content: '测验广场上空无一人。',
      assetBindings: [{
        assetId: 'a1', assetName: '林小雨',
        visualVersionId: 'v1', visualVersionName: '便装',
        matchSource: 'auto-text', referenceImageIds: ['casual-1'],
      }],
    });
    const [after] = syncPanelsAutoBindings([before], index, firstVariant);
    expect(after.assetBindings.map((binding) => binding.assetId)).toEqual(['a2']);
  });

  it('同步是幂等的：第二遍同步不再产生新的分镜对象', () => {
    const before = panel({ imagePrompt: '画面内容：林小雨站在测验广场中央。' });
    const once = syncPanelsAutoBindings([before], index, firstVariant);
    const twice = syncPanelsAutoBindings(once, index, firstVariant);
    expect(twice[0]).toBe(once[0]);
  });

  it('补绑后绑定体检不再报「无出场资产声明」', () => {
    const before = panel({ imagePrompt: '画面内容：林小雨站在雨里。' });
    expect(summarizePanelBindingHealth(before, assets).risk).toContain('无出场资产声明');
    const [after] = syncPanelsAutoBindings([before], index, firstVariant);
    expect(summarizePanelBindingHealth(after, assets).risk).toBe('');
  });
});
