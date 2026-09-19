import { describe, expect, it } from 'vitest';
import { resolvePanelRefImage } from '../../src/modules/comic/services/panelPromptService';

/**
 * 本镜参考图口径 —— 全项目唯一的「取哪张图」实现，单测锁死语义。
 * 分镜页取图（currentRefGroups / panelRefImages）、资产工作台「N 镜」角标、
 * 资产卡图片标记三处共用它，任何一边改错都会出现口径漂移。
 */
describe('resolvePanelRefImage（本镜参考图单选口径）', () => {
  const variant = { referenceImageIds: ['img-1', 'img-2', 'img-3'] };

  it('从未手动选过 → 取该状态第一张', () => {
    expect(resolvePanelRefImage(variant, {})).toBe('img-1');
    expect(resolvePanelRefImage(variant, { selectedImageIds: undefined })).toBe('img-1');
    expect(resolvePanelRefImage(variant, { selectedImageIds: [] })).toBe('img-1');
  });

  it('手动选过且该图仍在 → 取选中的那一张', () => {
    expect(resolvePanelRefImage(variant, { selectedImageIds: ['img-2'] })).toBe('img-2');
    expect(resolvePanelRefImage(variant, { selectedImageIds: ['img-3'] })).toBe('img-3');
  });

  it('选中的图已被从资产里删除 → 回落第一张（不会返回已不存在的图）', () => {
    expect(resolvePanelRefImage(variant, { selectedImageIds: ['已删除'] })).toBe('img-1');
  });

  it('历史数据存了多张（旧的勾选子集语义）→ 只认第一张', () => {
    expect(resolvePanelRefImage(variant, { selectedImageIds: ['img-3', 'img-1'] })).toBe('img-3');
  });

  it('该视觉状态没有任何参考图 → undefined（生图不带此资产参考图，UI 提示「无参考图」）', () => {
    expect(resolvePanelRefImage({ referenceImageIds: [] }, {})).toBe(undefined);
    expect(resolvePanelRefImage({ referenceImageIds: [] }, { selectedImageIds: ['img-9'] })).toBe(undefined);
  });

  it('referenceImageIds 缺省（旧数据）按无图处理', () => {
    expect(resolvePanelRefImage({ referenceImageIds: undefined as unknown as string[] }, {})).toBe(undefined);
  });

  it('只有一张图时选与不选结果一致', () => {
    const single = { referenceImageIds: ['only'] };
    expect(resolvePanelRefImage(single, {})).toBe('only');
    expect(resolvePanelRefImage(single, { selectedImageIds: ['only'] })).toBe('only');
  });

  it('无采纳图但有工作台生成图（generatedImageIds）→ 回落生成图第一张（生成的图就是参考图）', () => {
    expect(resolvePanelRefImage({ referenceImageIds: [], generatedImageIds: ['gen-1', 'gen-2'] }, {})).toBe('gen-1');
    expect(resolvePanelRefImage({ referenceImageIds: undefined, generatedImageIds: ['gen-1'] }, {})).toBe('gen-1');
  });

  it('手动选的图在生成图里 → 同样生效（单选口径覆盖有效参考图全集）', () => {
    expect(resolvePanelRefImage({ referenceImageIds: [], generatedImageIds: ['gen-1', 'gen-2'] }, { selectedImageIds: ['gen-2'] })).toBe('gen-2');
  });

  it('采纳图优先于生成图：两者都有时只用采纳图', () => {
    expect(resolvePanelRefImage({ referenceImageIds: ['img-1'], generatedImageIds: ['gen-1'] }, {})).toBe('img-1');
    expect(resolvePanelRefImage({ referenceImageIds: ['img-1'], generatedImageIds: ['gen-1'] }, { selectedImageIds: ['gen-1'] })).toBe('img-1');
  });

  it('采纳图与生成图都没有 → undefined', () => {
    expect(resolvePanelRefImage({ referenceImageIds: [], generatedImageIds: [] }, {})).toBe(undefined);
    expect(resolvePanelRefImage({ referenceImageIds: [], generatedImageIds: undefined }, {})).toBe(undefined);
  });
});
