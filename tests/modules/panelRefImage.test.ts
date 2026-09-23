import { describe, expect, it } from 'vitest';
import { resolvePanelRefImage } from '../../src/modules/comic/services/panelPromptService';

/**
 * 本镜参考图口径 —— 全项目唯一的「取哪张图」实现，单测锁死语义。
 * 分镜页取图（currentRefGroups / buildPanelRefManifest）、资产工作台「N 镜」角标、
 * 资产卡图片标记三处共用它，任何一边改错都会出现口径漂移。
 */
describe('resolvePanelRefImage（本镜参考图单选口径）', () => {
  // 分镜只认生成图；上传的 referenceImageIds 不进候选
  const variant = { generatedImageIds: ['img-1', 'img-2', 'img-3'] };

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
    const single = { generatedImageIds: ['only'] };
    expect(resolvePanelRefImage(single, {})).toBe('only');
    expect(resolvePanelRefImage(single, { selectedImageIds: ['only'] })).toBe('only');
  });

  it('只有生成图（generatedImageIds）→ 取生成图第一张', () => {
    expect(resolvePanelRefImage({ referenceImageIds: [], generatedImageIds: ['gen-1', 'gen-2'] }, {})).toBe('gen-1');
    expect(resolvePanelRefImage({ referenceImageIds: undefined, generatedImageIds: ['gen-1'] }, {})).toBe('gen-1');
  });

  it('手动选的图在生成图里 → 同样生效', () => {
    expect(resolvePanelRefImage({ referenceImageIds: [], generatedImageIds: ['gen-1', 'gen-2'] }, { selectedImageIds: ['gen-2'] })).toBe('gen-2');
  });

  it('上传的参考图不进分镜：有上传图也有生成图时只用生成图', () => {
    expect(resolvePanelRefImage({ referenceImageIds: ['img-1'], generatedImageIds: ['gen-1'] }, {})).toBe('gen-1');
    // 分镜手选指向的是上传图（不在生成图里）→ 回落生成图第一张，不把上传图发出去
    expect(resolvePanelRefImage({ referenceImageIds: ['img-1'], generatedImageIds: ['gen-1'] }, { selectedImageIds: ['img-1'] })).toBe('gen-1');
  });

  it('只有上传参考图、没有生成图 → undefined（上传图只给资产生图用）', () => {
    expect(resolvePanelRefImage({ referenceImageIds: ['img-1', 'img-2'] }, {})).toBe(undefined);
    expect(resolvePanelRefImage({ referenceImageIds: ['img-1'], generatedImageIds: [] }, { selectedImageIds: ['img-1'] })).toBe(undefined);
  });

  it('采纳图与生成图都没有 → undefined', () => {
    expect(resolvePanelRefImage({ referenceImageIds: [], generatedImageIds: [] }, {})).toBe(undefined);
    expect(resolvePanelRefImage({ referenceImageIds: [], generatedImageIds: undefined }, {})).toBe(undefined);
  });

  // 2026-09-23 扩口径：自上传的**成品图**（uploadedImageIds）与生成图一样可被分镜取用
  it('自上传成品图可被分镜取用，排序在生成图之后', () => {
    const variant = { referenceImageIds: [], generatedImageIds: ['gen-1'], uploadedImageIds: ['up-1'] };
    expect(resolvePanelRefImage(variant, {})).toBe('gen-1');
    expect(resolvePanelRefImage(variant, { selectedImageIds: ['up-1'] })).toBe('up-1');
    // 上传的**参考图**（referenceImageIds）仍不进候选
    expect(resolvePanelRefImage({ referenceImageIds: ['ref-1'], generatedImageIds: [], uploadedImageIds: ['up-1'] }, { selectedImageIds: ['ref-1'] })).toBe('up-1');
  });

  it('只有自上传成品图（没有生成图）也能被分镜取用', () => {
    expect(resolvePanelRefImage({ referenceImageIds: [], generatedImageIds: [], uploadedImageIds: ['up-1', 'up-2'] }, {})).toBe('up-1');
  });
});
