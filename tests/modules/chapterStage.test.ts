import { describe, expect, it } from 'vitest';
import { LONG_CHAPTER_STAGE_ORDER, type LongChapterStage } from '../../src/modules/comic/types';
import {
  chapterStageAtLeast,
  chapterStageIndex,
  stageAfterSourceEdit,
} from '../../src/modules/comic/utils/chapterStage';

describe('chapterStageIndex / chapterStageAtLeast', () => {
  it('缺省与未知阶段按 empty 处理', () => {
    expect(chapterStageIndex(undefined)).toBe(0);
    expect(chapterStageIndex(null)).toBe(0);
    expect(chapterStageIndex('empty')).toBe(0);
  });

  it('atLeast 含等于', () => {
    expect(chapterStageAtLeast('storyboard-ready', 'storyboard-ready')).toBe(true);
    expect(chapterStageAtLeast('completed', 'storyboard-ready')).toBe(true);
    expect(chapterStageAtLeast('script-ready', 'storyboard-ready')).toBe(false);
    expect(chapterStageAtLeast(undefined, 'source-ready')).toBe(false);
  });

  it('阶段顺序：资产在分镜之前（新管线的前置依赖）', () => {
    expect(chapterStageIndex('assets-ready')).toBeLessThan(chapterStageIndex('storyboard-ready'));
    expect(chapterStageIndex('script-ready')).toBeLessThan(chapterStageIndex('assets-ready'));
  });
});

describe('stageAfterSourceEdit：正文编辑后只升不降', () => {
  it('新建章节：有正文 → source-ready，无正文 → empty', () => {
    expect(stageAfterSourceEdit(undefined, true)).toBe('source-ready');
    expect(stageAfterSourceEdit(undefined, false)).toBe('empty');
  });

  it('有正文时向上补齐到 source-ready，但绝不越过已有进度', () => {
    expect(stageAfterSourceEdit('empty', true)).toBe('source-ready');
    expect(stageAfterSourceEdit('source-ready', true)).toBe('source-ready');
  });

  it('已生成分镜/提示词/完成的章节改正文不回退（回归：原实现会打回 source-ready）', () => {
    const advanced: LongChapterStage[] = ['analysis-ready', 'script-ready', 'assets-ready', 'storyboard-ready', 'prompts-ready', 'completed'];
    for (const stage of advanced) {
      expect(stageAfterSourceEdit(stage, true)).toBe(stage);
    }
  });

  it('清空正文：只在未越过 source-ready 时退回 empty', () => {
    expect(stageAfterSourceEdit(undefined, false)).toBe('empty');
    expect(stageAfterSourceEdit('empty', false)).toBe('empty');
    expect(stageAfterSourceEdit('source-ready', false)).toBe('empty');
  });

  it('清空正文：已有后续产物（剧本起）时阶段保持不动', () => {
    const beyond: LongChapterStage[] = ['script-ready', 'assets-ready', 'storyboard-ready', 'prompts-ready', 'completed'];
    for (const stage of beyond) {
      expect(stageAfterSourceEdit(stage, false)).toBe(stage);
    }
  });

  it('反复编辑同一章节，阶段单调不减', () => {
    let stage: LongChapterStage = 'empty';
    for (const hasContent of [true, true, true]) {
      stage = stageAfterSourceEdit(stage, hasContent);
    }
    expect(stage).toBe('source-ready');
    stage = 'storyboard-ready';
    for (const hasContent of [true, true, false, true]) {
      stage = stageAfterSourceEdit(stage, hasContent);
    }
    expect(stage).toBe('storyboard-ready');
    expect(LONG_CHAPTER_STAGE_ORDER.indexOf(stage)).toBeGreaterThan(0);
  });
});
