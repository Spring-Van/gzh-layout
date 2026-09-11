import { describe, expect, it } from 'vitest';
import { parseStoryboardResponse, parsePanelBlock, serializePanelBlock, summarizeCells, cellCountLabel, resolvePanelCellLabel } from '../../src/modules/comic/services/storyboardService';
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

  it('分镜：v4 页块格式（【第X格】+「字段名」：内容，符号规则）逐字段解析', () => {
    const content = [
      '## 分镜 1 · 双格',
      '【第1格】',
      '「景别」：近景转特写',
      '「镜头」：从角色A侧脸下摇至小臂',
      '「画面」：角色A的手臂占前景，指节收紧，青筋凸起。',
      '「人物」：角色A',
      '「动作」：指节收紧，手臂绷紧。',
      '「表情」：侧脸冷硬，眼神压着怒意。',
      '「台词」：角色A：“破坏了它的关键部分，跟要了它的命有什么区别？”',
      '「音效」：沙沙——鳞片摩擦。',
      '「光效」：暖黄顶灯，背景压暗。',
      '【第2格】',
      '「景别」：中景',
      '「画面」：角色B一手扶住室内靠背，身体微僵。',
      '「人物」：角色B',
      '「心声」：角色B：“他到底想干什么……”',
      '「旁白」：夜色压下来，屋里的灯忽然灭了。',
      '「备注」：灯灭必须画出来。',
    ].join('\n');
    const panels = parseStoryboardResponse(content, [], 'c1', {});
    expect(panels).toHaveLength(1);
    expect(panels[0].cellLabel).toBe('双格');
    expect(panels[0].cells).toHaveLength(2);
    expect(panels[0].cells?.[0]).toMatchObject({
      shot: '近景转特写', camera: '从角色A侧脸下摇至小臂', cast: '角色A',
      action: '指节收紧，手臂绷紧。', expression: '侧脸冷硬，眼神压着怒意。',
      speaker: '角色A', dialogue: '破坏了它的关键部分，跟要了它的命有什么区别？',
      sfx: '沙沙——鳞片摩擦。', lighting: '暖黄顶灯，背景压暗。',
    });
    expect(panels[0].cells?.[1]).toMatchObject({
      shot: '中景', cast: '角色B', delivery: '心声', speaker: '角色B',
      narration: '夜色压下来，屋里的灯忽然灭了。', note: '灯灭必须画出来。',
    });
    // 页级字段照旧汇总（生图推导 / 概览 / 资产计数等消费方无需改造）
    expect(panels[0].shot).toBe('近景转特写/中景');
    expect(panels[0].dialogue).toContain('角色B（心声）：他到底想干什么……');
  });

  it('分镜：v4 页块文本 ⇄ 格列表往返一致（台词正文入库去引号，出库补回）', () => {
    const text = [
      '【第1格】',
      '「景别」：近景转特写',
      '「镜头」：从角色A侧脸下摇至小臂',
      '「画面」：角色A的手臂占前景，指节收紧，青筋凸起。',
      '「人物」：角色A',
      '「动作」：指节收紧，手臂绷紧。',
      '「表情」：侧脸冷硬，眼神压着怒意。',
      '「台词」：角色A：“破坏了它的关键部分，跟要了它的命有什么区别？”',
      '「音效」：沙沙——鳞片摩擦。',
      '「光效」：暖黄顶灯，背景压暗。',
      '【第2格】',
      '「景别」：中景',
      '「画面」：角色B一手扶住室内靠背，身体微僵。',
      '「人物」：角色B',
      '「心声」：角色B：“他到底想干什么……”',
      '「旁白」：夜色压下来，屋里的灯忽然灭了。',
      '「备注」：灯灭必须画出来。',
    ].join('\n');
    const cells = parsePanelBlock(text);
    expect(cells).toHaveLength(2);
    // 页级汇总保持裸文本——这两个字段会喂给下一环节的画面描述提示词
    const summary = summarizeCells(cells);
    expect(summary.dialogue).toBe('角色A：破坏了它的关键部分，跟要了它的命有什么区别？\n角色B（心声）：他到底想干什么……');
    expect(summary.narration).toBe('夜色压下来，屋里的灯忽然灭了。');
    // 序列化与输入逐字一致
    expect(serializePanelBlock({ id: 'p1', order: 1, content: '', cells, assetBindings: [] })).toBe(text);
  });

  it('分镜：兼容旧 v3 页块（①【镜头】画面 + 说话人：【台词】），序列化升级为 v4', () => {
    const v3 = [
      '①【近景】角色A指节收紧，关键道具缠上小臂。',
      '角色A：【破坏了它的关键部分，跟要了它的命有什么区别？】',
      '②【中景】角色B站在沙发边，眉头拧起。',
      '旁白：【空气安静了一分钟。】',
    ].join('\n');
    const cells = parsePanelBlock(v3);
    expect(cells).toHaveLength(2);
    expect(cells[0]).toMatchObject({ shot: '近景', speaker: '角色A', dialogue: '破坏了它的关键部分，跟要了它的命有什么区别？' });
    expect(cells[1]).toMatchObject({ shot: '中景', narration: '空气安静了一分钟。' });
    // 打开即升级：旧文本重新序列化为 v4
    const upgraded = serializePanelBlock({ id: 'p1', order: 1, content: '', cells, assetBindings: [] });
    expect(upgraded).toContain('【第1格】');
    expect(upgraded).toContain('「景别」：近景');
    expect(upgraded).toContain('「台词」：角色A：“破坏了它的关键部分，跟要了它的命有什么区别？”');
    expect(upgraded).toContain('「旁白」：空气安静了一分钟。');
    // 升级后再解析仍是同一份格列表（幂等）
    expect(parsePanelBlock(upgraded)).toEqual(cells);
  });

  it('分镜：旧数据（无 cells）序列化为 v4 页块，页级对白/旁白拆回格内', () => {
    const legacy = {
      id: 'p1', order: 1, content: '两人对峙', shot: '中景',
      dialogue: '角色A：放它走吧', narration: '夜深了', assetBindings: [],
    };
    const text = serializePanelBlock(legacy as any);
    expect(text).toBe([
      '【第1格】',
      '「景别」：中景',
      '「画面」：两人对峙',
      '「台词」：角色A：“放它走吧”',
      '「旁白」：夜深了',
    ].join('\n'));
    expect(parsePanelBlock(text)).toHaveLength(1);
  });

  it('分镜：完全空白页不给格块（不产生空的【第1格】）', () => {
    expect(serializePanelBlock({ id: 'p1', order: 1, content: '', assetBindings: [] } as any)).toBe('');
  });

  it('分镜：格数标签取页头声明，缺省按实际格数推导', () => {
    expect(cellCountLabel(1)).toBe('单格');
    expect(cellCountLabel(2)).toBe('双格');
    expect(cellCountLabel(5)).toBe('5 格');
    const [declared] = parseStoryboardResponse('## 分镜 1 · 三格\n【第1格】\n「画面」：只有一格。', [], 'c1', {});
    expect(resolvePanelCellLabel(declared)).toBe('三格');
    // 旧数据无 cellLabel：按实际格数推导
    expect(resolvePanelCellLabel({ id: 'p2', order: 2, content: 'x', cells: [{ content: 'a' }, { content: 'b' }], assetBindings: [] } as any)).toBe('双格');
    expect(resolvePanelCellLabel({ id: 'p3', order: 3, content: 'x', assetBindings: [] } as any)).toBe('单格');
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
