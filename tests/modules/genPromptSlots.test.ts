import { describe, expect, it } from 'vitest';
import { createGenPromptSlot, normalizeGenPromptSlot, resolveActiveGenSlot, slotAttachShared, slotUseAssetRefs } from '../../src/modules/comic/utils/genPromptSlots';
import type { GenPromptSlot } from '../../src/modules/comic/types';

/**
 * 候选提示词条的读取口径：界面（编辑态）与生图（只读态）必须拿到**同一条**，
 * 否则会出现「界面显示第 1 条、发出去的却是另一条」这种最难查的错位。
 */

const slot = (id: string, text: string, patch: Partial<GenPromptSlot> = {}): GenPromptSlot =>
  ({ ...createGenPromptSlot(id, text), ...patch });

describe('resolveActiveGenSlot — 选中哪条就发哪条', () => {
  it('命中 activeGenPromptId 时返回那一条', () => {
    const slots = [slot('a', '第一条'), slot('b', '第二条')];
    expect(resolveActiveGenSlot({ genPrompts: slots, activeGenPromptId: 'b' }).text).toBe('第二条');
  });

  it('activeGenPromptId 悬空（条已删）时回落到第 1 条', () => {
    const slots = [slot('a', '第一条'), slot('b', '第二条')];
    expect(resolveActiveGenSlot({ genPrompts: slots, activeGenPromptId: 'deleted' }).id).toBe('a');
  });

  it('没有 genPrompts 时返回虚拟条：正文取 imagePrompt、开关全开', () => {
    const resolved = resolveActiveGenSlot({ imagePrompt: '老数据的描述' });
    expect(resolved.text).toBe('老数据的描述');
    expect(resolved.attachShared).toBe(true);
    expect(resolved.useAssetRefs).toBe(true);
    expect(resolved.id).toBe('');
  });

  it('genPrompts 为空数组时同样回落到 imagePrompt（新字段刚加上时的中间态）', () => {
    expect(resolveActiveGenSlot({ genPrompts: [], imagePrompt: '描述' }).text).toBe('描述');
  });

  it('完全没有工件时返回空正文，而不是抛错', () => {
    expect(resolveActiveGenSlot(undefined).text).toBe('');
    expect(resolveActiveGenSlot(null).text).toBe('');
  });
});

describe('开关口径 — 缺省一律按「开」', () => {
  it('缺字段 / undefined 都算开（旧数据不会变成什么都不发）', () => {
    expect(slotAttachShared(undefined)).toBe(true);
    expect(slotAttachShared(null)).toBe(true);
    expect(slotAttachShared({ id: 'a', text: '' })).toBe(true);
    expect(slotUseAssetRefs({ id: 'a', text: '' })).toBe(true);
  });

  it('显式 false 才算关', () => {
    expect(slotAttachShared({ id: 'a', text: '', attachShared: false })).toBe(false);
    expect(slotUseAssetRefs({ id: 'a', text: '', useAssetRefs: false })).toBe(false);
  });
});

describe('createGenPromptSlot — 新建条默认值', () => {
  it('开关默认全开、上传图为空', () => {
    const created = createGenPromptSlot('id-1', '正文');
    expect(created).toEqual({ id: 'id-1', text: '正文', attachShared: true, useAssetRefs: true, uploadedRefs: [] });
  });
});

describe('normalizeGenPromptSlot — 旧/中间态数据的空值保护', () => {
  it('text 为 null 时归一成空串（否则模板里的 .trim() 会抛错、整个右栏空白）', () => {
    const broken = { id: 'a', text: null as unknown as string, attachShared: true };
    expect(normalizeGenPromptSlot(broken).text).toBe('');
  });

  it('text 缺失 / 非字符串也归一成空串', () => {
    expect(normalizeGenPromptSlot({ id: 'a' } as unknown as GenPromptSlot).text).toBe('');
    expect(normalizeGenPromptSlot({ id: 'a', text: 123 as unknown as string }).text).toBe('');
  });

  it('开关缺省补成 true，上传图补成空数组', () => {
    const normalized = normalizeGenPromptSlot({ id: 'a', text: 'x' } as GenPromptSlot);
    expect(normalized.attachShared).toBe(true);
    expect(normalized.useAssetRefs).toBe(true);
    expect(normalized.uploadedRefs).toEqual([]);
  });

  it('resolveActiveGenSlot 读到的 text 一定可安全 .trim()', () => {
    const resolved = resolveActiveGenSlot({
      genPrompts: [{ id: 'a', text: null as unknown as string, attachShared: true }],
      activeGenPromptId: 'a',
    });
    expect(() => resolved.text.trim()).not.toThrow();
    expect(resolved.text).toBe('');
  });
});
