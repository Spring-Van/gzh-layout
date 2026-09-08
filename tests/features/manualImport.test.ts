import { describe, expect, it } from 'vitest';
import { parseStoryboardResponse } from '../../src/modules/comic/services/storyboardService';
import { parseAssetExtractionResponse, countCandidatesAppearances } from '../../src/modules/comic/services/assetExtractionService';

describe('手动导入：解析函数复用（外部 AI 代跑）', () => {
  it('分镜：解析标准 Markdown 为结构化分镜（与 LLM 路径同解析器）', () => {
    const content = [
      '## 分镜 1',
      '- 画面：清晨，李明推开房门',
      '- 镜头：中景',
      '- 对白：早',
      '## 分镜 2',
      '- 画面：窗外雨落',
      '- 镜头：远景',
      '- 旁白：夜雨滂沱',
    ].join('\n');
    const panels = parseStoryboardResponse(content, [], 'c1', {});
    expect(panels).toHaveLength(2);
    expect(panels[0].content).toBe('清晨，李明推开房门');
    expect(panels[0].shot).toBe('中景');
    expect(panels[0].dialogue).toBe('早');
    expect(panels[1].narration).toBe('夜雨滂沱');
  });

  it('分镜：无有效分镜结构时抛错（导入弹窗据此红字提示）', () => {
    expect(() => parseStoryboardResponse('这是一段没有任何分镜标题的文本', [], 'c1', {})).toThrow();
  });

  it('资产：解析中文报告为候选（# 人物 / ## 名称 / 字段 / 视觉状态）', () => {
    const content = [
      '# 人物',
      '## 林小雨',
      '- 别名：小雨',
      '- 重要性：主要',
      '- 描述：主角',
      '### 视觉状态：少年期',
      '- 视觉描述：布衣少年',
      '# 场景',
      '## 城郊旧宅',
      '- 描述：主角的家',
    ].join('\n');
    const candidates = parseAssetExtractionResponse(content, []);
    expect(candidates).toHaveLength(2);
    expect(candidates[0].name).toBe('林小雨');
    expect(candidates[0].type).toBe('character');
    expect(candidates[0].importance).toBe('major');
    expect(candidates[0].states?.[0]?.name).toBe('少年期');
    expect(candidates[1].type).toBe('scene');
  });

  it('资产：无有效资产结构时抛错（导入弹窗据此红字提示格式不符）', () => {
    // parseAssetExtractionResponse 中文解析失败后回退 legacy JSON，仍失败则抛错
    expect(() => parseAssetExtractionResponse('完全没有资产结构的文本', [])).toThrow();
  });

  it('资产出现次数：确定性统计候选在分镜文本中的出现数', () => {
    const candidates = parseAssetExtractionResponse('# 人物\n## 林小雨\n- 描述：主角', []);
    const counts = countCandidatesAppearances(candidates, [
      { id: 'p1', order: 1, content: '林小雨推门而入', assetBindings: [] },
      { id: 'p2', order: 2, content: '林小雨离开', assetBindings: [] },
      { id: 'p3', order: 3, content: '空镜', assetBindings: [] },
    ] as any);
    expect(counts[candidates[0].id]).toBe(2);
  });
});
