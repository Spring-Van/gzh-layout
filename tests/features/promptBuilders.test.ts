import { describe, expect, it } from 'vitest';
import { buildAnalysisPrompt, buildScriptPrompt } from '../../src/modules/comic/services/chapterDocService';
import { buildStoryboardPrompt, buildPanelPolishPrompt } from '../../src/modules/comic/services/storyboardService';
import { buildAssetExtractionPrompt } from '../../src/modules/comic/services/assetExtractionService';
import { buildSingleAssetPrompt } from '../../src/modules/comic/services/assetPromptService';
import { buildPanelPromptPrompt } from '../../src/modules/comic/services/panelPromptService';
import type { LongProjectAsset, LongProjectAssetVariant } from '../../src/modules/comic/types';

const asset = (overrides: Partial<LongProjectAsset> = {}): LongProjectAsset => ({
  id: 'a1',
  type: 'character',
  name: '角色C',
  aliases: [],
  importance: 'major',
  description: '主角',
  fixedTraits: ['黑色长发'],
  attributes: {},
  variants: [],
  sourceChapterIds: [],
  scope: 'project',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
} as LongProjectAsset);

const variant = (overrides: Partial<LongProjectAssetVariant> = {}): LongProjectAssetVariant => ({
  id: 'v1',
  name: '阶段一',
  referenceImageIds: [],
  sourceChapterIds: [],
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
} as LongProjectAssetVariant);

describe('builder 关键行为（切换渲染引擎后）', () => {
  it('原文分析：旧英文模板自动归一化后注入章节原文', () => {
    const prompt = buildAnalysisPrompt('【章节原文】\n{{chapter_content}}', '第一章正文');
    expect(prompt).toContain('【章节原文】\n第一章正文');
    expect(prompt).not.toContain('{{');
    // 渲染不再追加任何协议段：返回格式约定由模板内容自带
    expect(prompt).not.toContain('【返回格式】');
    expect(prompt).toBe('【章节原文】\n第一章正文');
  });

  it('漫画剧本：原文分析缺失时替换为占位提示', () => {
    const prompt = buildScriptPrompt('{{章节原文}}\n{{原文分析}}', '原文', undefined);
    expect(prompt).toContain('原文');
    expect(prompt).toContain('（本章尚未生成原文分析）');
  });

  it('分镜：模板未插入的变量不再追加，未注册占位符被清理', () => {
    // 旧推荐分镜模板错误地使用 {{chapter_content}}，且不含 {{漫画剧本}} / {{原文分析}}
    const prompt = buildStoryboardPrompt('请拆分分镜。\n【章节原文】\n{{chapter_content}}', '第一场：……', '分析内容');
    expect(prompt).not.toContain('{{');
    expect(prompt).toContain('请拆分分镜。');
    expect(prompt).not.toContain('第一场：……');
    expect(prompt).not.toContain('分析内容');
  });

  it('分镜：推荐中文模板（{{漫画剧本}}/{{原文分析}}）原地替换', () => {
    const prompt = buildStoryboardPrompt('【剧本】\n{{漫画剧本}}\n【分析】\n{{原文分析}}', '剧本正文', '分析正文');
    expect(prompt).toContain('【剧本】\n剧本正文');
    expect(prompt).toContain('【分析】\n分析正文');
    expect(prompt).not.toContain('【漫画剧本】\n【');
  });

  it('分镜：章节原文可插入；有剧本时按原文渲染', () => {
    const template = '【剧本】\n{{漫画剧本}}\n【原文】\n{{章节原文}}';
    const prompt = buildStoryboardPrompt(template, '剧本正文', undefined, '第一章原文');
    expect(prompt).toContain('【剧本】\n剧本正文');
    expect(prompt).toContain('【原文】\n第一章原文');
  });

  it('分镜：剧本缺失时原文已作为剧本底稿，不再重复渲染章节原文', () => {
    const template = '【剧本】\n{{漫画剧本}}\n【原文】\n{{章节原文}}';
    const prompt = buildStoryboardPrompt(template, '第一章原文', undefined, '第一章原文');
    // 原文只出现一次（在剧本槽位）
    expect(prompt.match(/第一章原文/g)?.length).toBe(1);
    expect(prompt).toContain('（本章无独立原文）');
  });

  it('资产提取：只有模板插入了的变量才进入提示词', () => {
    const template = '提取资产。\n【章节原文】\n{{章节原文}}\n【原文分析】\n{{原文分析}}';
    const prompt = buildAssetExtractionPrompt(template, '第一章正文', {
      analysis: '分析正文AAA',
      script: '剧本正文BBB',
      existingAssets: [asset()],
    });
    // 插入的变量：原文 + 分析
    expect(prompt).toContain('第一章正文');
    expect(prompt).toContain('分析正文AAA');
    // 没插入的变量：即使有值也不出现
    expect(prompt).not.toContain('剧本正文BBB');
    expect(prompt).not.toContain('已有视觉状态');
  });

  it('资产单条：逐条路径支持 {{目标生图模型}}，运行时不追加协议段', () => {
    const prompt = buildSingleAssetPrompt({
      asset: asset(),
      variant: variant({ description: '外观描述' }),
      styleContext: '整体画风：国风',
      targetImageModel: '即梦 v3',
      templateContent: '模型：{{目标生图模型}}\n状态：{{状态清单}}',
    });
    expect(prompt).toContain('模型：即梦 v3');
    expect(prompt).toContain('状态：- 资产：角色C');
    // 模板内容就是最终提示词：系统不再另附【返回格式】段
    expect(prompt.startsWith('模型：即梦 v3\n状态：- 资产：角色C（人物）')).toBe(true);
    expect(prompt).not.toContain('【返回格式】');
  });

  it('资产单条：无模板时内置兜底自带【返回格式】逐条约定', () => {
    const prompt = buildSingleAssetPrompt({
      asset: asset(),
      variant: variant({ description: '外观描述' }),
    });
    expect(prompt).toContain('【返回格式】');
    expect(prompt).toContain('## 资产名｜状态名');
  });

  it('分镜单页 AI 优化：携带本页页块文本与剧本上下文，并复用分镜输出协议', () => {
    const block = [
      '【第1格】',
      '「景别」：近景',
      '「画面」：角色A指节收紧，关键道具缠上小臂。',
      '「台词」：角色A：“破坏了它的关键部分，跟要了它的命有什么区别？”',
    ].join('\n');
    const prompt = buildPanelPolishPrompt(block, '第一场 室内·夜：两方对峙');
    // 本页原文与剧本上下文都要给到模型
    expect(prompt).toContain(block);
    expect(prompt).toContain('【当前这一页分镜】');
    expect(prompt).toContain('第一场 室内·夜：两方对峙');
    // 输出仍走页块协议（解析器据此回填格列表）
    expect(prompt).toContain('## 分镜 N');
    expect(prompt).toContain('### 第X格');
    expect(prompt).toContain('- 字段名：内容');
    // 校正说明与新符号规则一致
    expect(prompt).toContain('「景别」');
    expect(prompt).toContain('说话人：“台词”');
    // 未提供剧本时给出占位，避免指令空洞
    expect(buildPanelPolishPrompt(block)).toContain('（本章尚未生成剧本）');
  });

  it('画面描述：多格页把每格字段（景别/镜头/画面/人物/动作/表情/光效）一并交给模型', () => {
    const panel = {
      id: 'p1', order: 1, content: '汇总画面', shot: '近景/中景',
      assetBindings: [],
      cells: [
        { shot: '近景', camera: '从侧脸下摇至小臂', content: '手臂占前景，指节收紧。', cast: '角色A', action: '指节收紧', expression: '侧脸冷硬', lighting: '暖黄顶灯' },
        { shot: '中景', content: '角色B站在室内。', cast: '角色B' },
      ],
    };
    const prompt = buildPanelPromptPrompt({
      templateContent: '{{当前分镜}}',
      panel: panel as any,
      chapterOutline: '',
      prevEntries: [],
    });
    expect(prompt).toContain('分格详情：');
    expect(prompt).toContain('### 第1格');
    expect(prompt).toContain('景别：近景');
    expect(prompt).toContain('镜头：从侧脸下摇至小臂');
    expect(prompt).toContain('人物：角色A');
    expect(prompt).toContain('动作：指节收紧');
    expect(prompt).toContain('表情：侧脸冷硬');
    expect(prompt).toContain('光效：暖黄顶灯');
    expect(prompt).toContain('### 第2格');
    // 无 cells 的旧数据不出现分格详情，保持既有行为
    const legacy = buildPanelPromptPrompt({
      templateContent: '{{当前分镜}}',
      panel: { id: 'p2', order: 2, content: '两人对峙', assetBindings: [] } as any,
      chapterOutline: '',
      prevEntries: [],
    });
    expect(legacy).not.toContain('分格详情：');
  });
});
