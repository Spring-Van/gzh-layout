import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REF_USAGE,
  renderRefUsage,
  resolveRefUsageTemplate,
  REF_USAGE_SCOPE_TOKEN,
  REF_USAGE_TYPE_TOKEN,
} from '../../src/modules/comic/services/refUsage';
import { buildPanelRefManifest } from '../../src/modules/comic/services/panelRefManifest';
import { composeFinalPrompt } from '../../src/modules/comic/services/panelPromptService';
import type { LongProjectAsset, LongProjectStoryboardPanel } from '../../src/modules/comic/types';

/**
 * 「动态参考图用途描述」可配置化的语义锁。
 *
 * 背景：这整句原先硬编码在 `buildFinalPromptSections` 里；现在用户可写。
 * 不变式：**图号 / 资产名 / 状态名 / 格号永远由代码算**（必须与真实发送的图片数组同序），
 * 用户只写「资产名（状态）」之后那整句 —— 所以默认模板必须与原硬编码逐字一致。
 */

const asset = {
  id: 'a1',
  type: 'character',
  name: '萧媚',
  aliases: [],
  fixedTraits: [],
  variants: [{ id: 'v1', name: '少女·当前形象', generatedImageIds: ['img-1'] }],
  status: 'confirmed',
  scope: 'chapter',
  sourceChapterIds: ['c1'],
  createdAt: 1,
  updatedAt: 1,
} as unknown as LongProjectAsset;

const panel = {
  id: 'p1',
  order: 1,
  content: '',
  assetBindings: [{
    assetId: 'a1', assetName: '萧媚', visualVersionId: 'v1', visualVersionName: '少女·当前形象',
    matchSource: 'model', referenceImageIds: ['img-1'],
  }],
  cells: [{ content: '画面内容。', assetBindings: [{ assetId: 'a1', assetName: '萧媚', visualVersionId: 'v1', matchSource: 'model' }] }],
} as unknown as LongProjectStoryboardPanel;

describe('参考图用途模板 · 渲染', () => {
  it('默认模板渲染结果与原硬编码文案逐字一致（重构回归锁）', () => {
    expect(renderRefUsage(DEFAULT_REF_USAGE.character, 'character', '第1、3格'))
      .toBe('人物参考，仅用于第1、3格的人物身份、脸部、发型、服装与外貌特征。');
    expect(renderRefUsage(DEFAULT_REF_USAGE.scene, 'scene', '第2格'))
      .toBe('场景参考，仅用于第2格的环境与空间布局。');
    expect(renderRefUsage(DEFAULT_REF_USAGE.prop, 'prop', '整镜'))
      .toBe('道具参考，仅用于整镜的道具外观与材质。');
  });

  it('两个占位符都替换；用户自己写了句号不重复加', () => {
    expect(renderRefUsage(`${REF_USAGE_TYPE_TOKEN}参考，只用于${REF_USAGE_SCOPE_TOKEN}的脸。`, 'character', '第1格'))
      .toBe('人物参考，只用于第1格的脸。');
  });

  it('模板里不写占位符也能用（完全固定的文案）', () => {
    expect(renderRefUsage('这是固定说明', 'prop', '整镜')).toBe('这是固定说明。');
  });
});

describe('参考图用途模板 · 取值优先级', () => {
  it('资产级覆盖优先于项目级', () => {
    expect(resolveRefUsageTemplate('character', '资产自己的写法', { character: '项目写法' })).toBe('资产自己的写法');
  });

  it('资产没填时用项目级', () => {
    expect(resolveRefUsageTemplate('character', undefined, { character: '项目写法' })).toBe('项目写法');
  });

  it('资产留空串 / 纯空白视为未填，继续回落（用户清空输入即回到默认）', () => {
    expect(resolveRefUsageTemplate('scene', '   ', { scene: '项目写法' })).toBe('项目写法');
    expect(resolveRefUsageTemplate('scene', undefined, { scene: '' })).toBe(DEFAULT_REF_USAGE.scene);
    expect(resolveRefUsageTemplate('prop', undefined, undefined)).toBe(DEFAULT_REF_USAGE.prop);
  });
});

describe('参考图用途模板 · 端到端（清单 → 最终提示词）', () => {
  it('未配置时输出与原格式一致', () => {
    const manifest = buildPanelRefManifest({ panel, assets: [asset] });
    const prompt = composeFinalPrompt('画面内容。', undefined, manifest);
    expect(prompt).toContain('图1 = 萧媚（少女·当前形象）人物参考，仅用于第1格的人物身份、脸部、发型、服装与外貌特征。');
  });

  it('项目级配置生效', () => {
    const manifest = buildPanelRefManifest({
      panel, assets: [asset],
      refUsage: { character: '角色外貌基准，只用于{格号}的脸与发型' },
    });
    const prompt = composeFinalPrompt('画面内容。', undefined, manifest);
    expect(prompt).toContain('图1 = 萧媚（少女·当前形象）角色外貌基准，只用于第1格的脸与发型。');
  });

  it('资产级覆盖压过项目级', () => {
    const custom = { ...asset, refUsage: '本角色专用说明，{格号}生效' } as unknown as LongProjectAsset;
    const manifest = buildPanelRefManifest({
      panel, assets: [custom],
      refUsage: { character: '项目写法' },
    });
    const prompt = composeFinalPrompt('画面内容。', undefined, manifest);
    expect(prompt).toContain('图1 = 萧媚（少女·当前形象）本角色专用说明，第1格生效。');
  });

  it('图号与资产名始终由代码算，用户模板改不动它们', () => {
    const manifest = buildPanelRefManifest({
      panel, assets: [asset],
      refUsage: { character: '图99 = 我自己写的' },
    });
    expect(manifest.entries[0].index).toBe(1);
    const prompt = composeFinalPrompt('画面内容。', undefined, manifest);
    expect(prompt).toContain('图1 = 萧媚（少女·当前形象）图99 = 我自己写的。');
  });
});
