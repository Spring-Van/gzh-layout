import { describe, expect, it } from 'vitest';
import { parseStoryboardResponse, parsePanelBlock, serializePanelBlock, summarizeCells } from '../../src/modules/comic/services/storyboardService';
import { parseAssetExtractionResponse, countCandidatesAppearances } from '../../src/modules/comic/services/assetExtractionService';

describe('手动导入：解析函数复用（外部 AI 代跑）', () => {
  it('分镜：解析标准 Markdown 为结构化分镜（与 LLM 路径同解析器）', () => {
    const content = [
      '## 分镜 1',
      '- 画面：清晨，角色D推开房门',
      '- 镜头：中景',
      '- 对白：早',
      '## 分镜 2',
      '- 画面：窗外雨落',
      '- 镜头：远景',
      '- 旁白：夜雨滂沱',
    ].join('\n');
    const panels = parseStoryboardResponse(content, [], 'c1', {});
    expect(panels).toHaveLength(2);
    expect(panels[0].content).toBe('清晨，角色D推开房门');
    expect(panels[0].shot).toBe('中景');
    expect(panels[0].dialogue).toBe('早');
    expect(panels[1].narration).toBe('夜雨滂沱');
  });

  it('分镜：无有效分镜结构时抛错（导入弹窗据此红字提示）', () => {
    expect(() => parseStoryboardResponse('这是一段没有任何分镜标题的文本', [], 'c1', {})).toThrow();
  });

  it('分镜：解析页块格式（一页一块、一格一行、台词带说话人）', () => {
    const content = [
      '## 分镜 1 · 单格',
      '①【中景】角色A把关键道具护到身后，冷脸盯着角色B。',
      '角色A：角色B，你怎么能那么残忍？',
      '## 分镜 2 · 双格',
      '①【近景】角色A指节收紧，关键道具缠上小臂。',
      '角色A：破坏了它的关键部分，跟要了它的命有什么区别？',
      '②【中景】角色B站在沙发边，眉头拧起。',
    ].join('\n');
    const panels = parseStoryboardResponse(content, [], 'c1', {});
    expect(panels).toHaveLength(2);
    expect(panels[0].cells).toHaveLength(1);
    expect(panels[0].cells?.[0]).toMatchObject({ shot: '中景', content: '角色A把关键道具护到身后，冷脸盯着角色B。', speaker: '角色A' });
    expect(panels[0].dialogue).toBe('角色A：角色B，你怎么能那么残忍？');
    expect(panels[1].cells).toHaveLength(2);
    expect(panels[1].shot).toBe('近景/中景');
    expect(panels[1].cells?.[0].dialogue).toBe('破坏了它的关键部分，跟要了它的命有什么区别？');
    expect(panels[1].cells?.[1]).toMatchObject({ shot: '中景', content: '角色B站在沙发边，眉头拧起。' });
    expect(panels[1].cells?.[1].dialogue).toBeUndefined();
  });

  it('分镜：识别心声 / 画外音 / 无人称旁白', () => {
    const content = [
      '## 分镜 4 · 单格',
      '①【特写】角色B睫毛低垂，张了张嘴又把话咽回去。',
      '角色A（画外）：你怎么能说出这种话？',
      '## 分镜 5 · 单格',
      '①【特写】关键道具昂起一端，表面弯成月牙。',
      '关键道具（心声）：果然，角色A最爱的是我！',
      '旁白：三年后，一切都不一样了。',
    ].join('\n');
    const panels = parseStoryboardResponse(content, [], 'c1', {});
    expect(panels[0].cells?.[0]).toMatchObject({ speaker: '角色A', delivery: '画外', dialogue: '你怎么能说出这种话？' });
    expect(panels[1].cells?.[0]).toMatchObject({ speaker: '关键道具', delivery: '心声', dialogue: '果然，角色A最爱的是我！' });
    expect(panels[1].cells?.[0].narration).toBe('三年后，一切都不一样了。');
  });

  it('分镜：兼容 v2 行内分格（‖ 分格、｜ 分字段）', () => {
    const panels = parseStoryboardResponse('## 分镜 1\n近景｜角色A指节收紧 ‖ 中景｜角色B皱眉｜角色B：你怎么能那么残忍？', [], 'c1', {});
    expect(panels[0].cells).toHaveLength(2);
    expect(panels[0].cells?.[0]).toMatchObject({ shot: '近景', content: '角色A指节收紧' });
    expect(panels[0].cells?.[1]).toMatchObject({ shot: '中景', speaker: '角色B', dialogue: '你怎么能那么残忍？' });
  });

  it('分镜：页块文本 ⇄ 格列表往返一致（台词 / 旁白正文带【】，入库去括）', () => {
    const text = [
      '①【近景】角色A指节收紧，关键道具缠上小臂。',
      '角色A：【破坏了它的关键部分，跟要了它的命有什么区别？】',
      '②【中景】角色B站在沙发边，眉头拧起。',
      '旁白：【空气安静了一分钟。】',
    ].join('\n');
    const cells = parsePanelBlock(text);
    expect(cells).toHaveLength(2);
    // 入库去括：cell.dialogue / cell.narration 为干净文本
    expect(cells[0]).toMatchObject({ shot: '近景', speaker: '角色A', dialogue: '破坏了它的关键部分，跟要了它的命有什么区别？' });
    expect(cells[1]).toMatchObject({ shot: '中景', narration: '空气安静了一分钟。' });
    // 页级汇总不带【】——该字段会喂给下一环节的画面描述提示词
    const summary = summarizeCells(cells);
    expect(summary.dialogue).toBe('角色A：破坏了它的关键部分，跟要了它的命有什么区别？');
    expect(summary.narration).toBe('空气安静了一分钟。');
    // 序列化补回【】→ 与输入逐字一致
    expect(serializePanelBlock({ id: 'p1', order: 1, content: '', cells, assetBindings: [] })).toBe(text);
  });

  it('分镜：兼容无【】的旧台词行，解析结果与带【】一致', () => {
    const plain = [
      '①【近景】角色A指节收紧，关键道具缠上小臂。',
      '角色A：破坏了它的关键部分，跟要了它的命有什么区别？',
      '②【中景】角色B站在沙发边，眉头拧起。',
      '旁白：空气安静了一分钟。',
    ].join('\n');
    const cells = parsePanelBlock(plain);
    expect(cells[0]).toMatchObject({ speaker: '角色A', dialogue: '破坏了它的关键部分，跟要了它的命有什么区别？' });
    expect(cells[1].narration).toBe('空气安静了一分钟。');
    // 旧文本序列化时自动补上【】（打开即升级）
    expect(serializePanelBlock({ id: 'p1', order: 1, content: '', cells, assetBindings: [] }))
      .toContain('角色A：【破坏了它的关键部分，跟要了它的命有什么区别？】');
  });

  it('分镜：旧数据（无 cells）也能序列化为页块文本，页级对白/旁白拆回格内', () => {
    const legacy = {
      id: 'p1', order: 1, content: '两人对峙', shot: '中景',
      dialogue: '角色A：放它走吧', narration: '夜深了', assetBindings: [],
    };
    const text = serializePanelBlock(legacy as any);
    expect(text).toBe('①【中景】两人对峙\n角色A：【放它走吧】\n旁白：【夜深了】');
    expect(parsePanelBlock(text)).toHaveLength(1);
  });

  it('分镜：页块文本为空 / 无格标记时兜底，不丢内容', () => {
    expect(parsePanelBlock('')).toEqual([]);
    expect(parsePanelBlock('随便一段没有格标记的文字')).toEqual([{ content: '随便一段没有格标记的文字' }]);
  });

  it('资产：解析中文报告为候选（# 人物 / ## 名称 / 字段 / 视觉状态）', () => {
    const content = [
      '# 人物',
      '## 角色C',
      '- 别名：别称',
      '- 重要性：主要',
      '- 描述：主角',
      '### 视觉状态：阶段一',
      '- 视觉描述：外观描述',
      '# 场景',
      '## 示例地点',
      '- 描述：主角的家',
    ].join('\n');
    const candidates = parseAssetExtractionResponse(content, []);
    expect(candidates).toHaveLength(2);
    expect(candidates[0].name).toBe('角色C');
    expect(candidates[0].type).toBe('character');
    expect(candidates[0].importance).toBe('major');
    expect(candidates[0].states?.[0]?.name).toBe('阶段一');
    expect(candidates[1].type).toBe('scene');
  });

  it('资产：无有效资产结构时抛错（导入弹窗据此红字提示格式不符）', () => {
    // parseAssetExtractionResponse 中文解析失败后回退 legacy JSON，仍失败则抛错
    expect(() => parseAssetExtractionResponse('完全没有资产结构的文本', [])).toThrow();
  });

  it('资产出现次数：确定性统计候选在分镜文本中的出现数', () => {
    const candidates = parseAssetExtractionResponse('# 人物\n## 角色C\n- 描述：主角', []);
    const counts = countCandidatesAppearances(candidates, [
      { id: 'p1', order: 1, content: '角色C推门而入', assetBindings: [] },
      { id: 'p2', order: 2, content: '角色C离开', assetBindings: [] },
      { id: 'p3', order: 3, content: '空镜', assetBindings: [] },
    ] as any);
    expect(counts[candidates[0].id]).toBe(2);
  });
});
