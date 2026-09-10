import { describe, expect, it } from 'vitest';
import {
  applyOutputProtocol,
  defaultOutputProtocol,
  findUnknownVariables,
  migrateTemplateContent,
  normalizeTemplateVariables,
  renderPromptTemplate,
} from '../../src/modules/comic/services/promptTemplateRegistry';

describe('promptTemplateRegistry · 变量归一化与检测', () => {
  it('旧英文占位符归一化为中文占位符', () => {
    expect(normalizeTemplateVariables('【章节原文】\n{{chapter_content}}', 'analysis')).toBe('【章节原文】\n{{章节原文}}');
    expect(normalizeTemplateVariables('{{script_content}}+{{analysis}}', 'storyboard')).toBe('{{漫画剧本}}+{{原文分析}}');
    expect(normalizeTemplateVariables('{{assets}}/{{style}}/{{target_model}}', 'asset-prompt')).toBe('{{状态清单}}/{{风格上下文}}/{{目标生图模型}}');
  });

  it('归一化按类型生效：chapter_content 在分镜模板中不识别', () => {
    // storyboard 无 chapter_content 变量（旧推荐模板错误用法），保持原样 → 会被 findUnknownVariables 检出
    expect(normalizeTemplateVariables('{{chapter_content}}', 'storyboard')).toBe('{{chapter_content}}');
    expect(findUnknownVariables('{{chapter_content}}', 'storyboard')).toEqual(['chapter_content']);
  });

  it('findUnknownVariables 检出未注册占位符（含中文误插）', () => {
    expect(findUnknownVariables('{{章节原文}} {{画风}}', 'analysis')).toEqual(['画风']);
    expect(findUnknownVariables('{{章节原文}}', 'analysis')).toEqual([]);
  });

  it('migrateTemplateContent：需要迁移返回新内容，否则返回 null', () => {
    expect(migrateTemplateContent('{{chapter_content}}', 'script')).toBe('{{章节原文}}');
    expect(migrateTemplateContent('{{章节原文}}', 'script')).toBeNull();
  });
});

describe('promptTemplateRegistry · 渲染引擎', () => {
  it('变量在模板中：原地替换', () => {
    const prompt = renderPromptTemplate({
      type: 'analysis',
      content: '请分析：\n{{章节原文}}',
      values: { 章节原文: '第一章……' },
    });
    expect(prompt).toContain('请分析：\n第一章……');
    expect(prompt).not.toContain('{{');
    expect(prompt).toContain('【输出要求】');
  });

  it('变量在模板中但值为空：替换为 emptyText', () => {
    const prompt = renderPromptTemplate({
      type: 'script',
      content: '【原文分析】\n{{原文分析}}',
      values: { 章节原文: 'x', 原文分析: '' },
    });
    expect(prompt).toContain('（本章尚未生成原文分析）');
  });

  it('变量不在模板中：always 策略追加块；值为空则不追加', () => {
    const prompt = renderPromptTemplate({
      type: 'analysis',
      content: '只做人物梳理。',
      values: { 章节原文: '第一章……' },
    });
    expect(prompt).toContain('【章节原文】\n第一章……');
    expect(prompt.startsWith('只做人物梳理。')).toBe(true);

    const empty = renderPromptTemplate({
      type: 'analysis',
      content: '只做人物梳理。',
      values: { 章节原文: '   ' },
    });
    expect(empty).not.toContain('【章节原文】');
  });

  it('if-nonempty 策略：值非空追加、为空不追加；drop 策略不追加', () => {
    const withStyle = renderPromptTemplate({
      type: 'panel-prompt',
      content: '描述画面：{{当前分镜}}',
      values: { 当前分镜: '分镜序号：1', 风格上下文: '整体画风：日漫' },
    });
    expect(withStyle).toContain('【风格上下文】\n整体画风：日漫');

    const noStyle = renderPromptTemplate({
      type: 'panel-prompt',
      content: '描述画面：{{当前分镜}}',
      values: { 当前分镜: '分镜序号：1', 风格上下文: '' },
    });
    expect(noStyle).not.toContain('【风格上下文】');

    const outline = renderPromptTemplate({
      type: 'panel-prompt',
      content: '描述画面：{{当前分镜}}',
      values: { 当前分镜: '分镜序号：1', 本章分镜概要: '分镜1：开场' },
    });
    // 本章分镜概要为 drop 策略：未插入则不追加
    expect(outline).not.toContain('【本章分镜概要】');
  });

  it('修复：风格上下文已插入时只替换、不再重复追加', () => {
    const prompt = renderPromptTemplate({
      type: 'asset-prompt',
      content: '【风格上下文】\n{{风格上下文}}\n请生成提示词。',
      values: { 状态清单: '- 状态1', 风格上下文: '整体画风：国风' },
    });
    expect(prompt.match(/整体画风：国风/g)?.length).toBe(1);
    expect(prompt).not.toContain('【风格上下文】\n【风格上下文】');
  });

  it('状态清单（always）在模板未插入时追加兜底块', () => {
    const prompt = renderPromptTemplate({
      type: 'asset-prompt',
      content: '请为每个状态生成绘画提示词。',
      values: { 状态清单: '- 状态1｜资产：角色C', 风格上下文: '' },
    });
    expect(prompt).toContain('【待生成状态清单】\n- 状态1｜资产：角色C');
  });

  it('未注册占位符构建时被清理', () => {
    const prompt = renderPromptTemplate({
      type: 'analysis',
      content: '分析 {{章节原文}}，风格参考 {{画风}}',
      values: { 章节原文: 'x' },
    });
    expect(prompt).not.toContain('{{画风}}');
    expect(prompt).not.toContain('{{');
  });

  it('允许占位符两侧带空白：{{ 章节原文 }}', () => {
    const prompt = renderPromptTemplate({
      type: 'analysis',
      content: '{{ 章节原文 }}',
      values: { 章节原文: 'x' },
    });
    expect(prompt).toContain('x');
  });
});

describe('promptTemplateRegistry · 输出协议', () => {
  it('自定义协议优先于默认协议', () => {
    const prompt = renderPromptTemplate({
      type: 'panel-prompt',
      content: '内容',
      values: {},
      customProtocol: '自定义要求',
    });
    expect(prompt).toContain('【输出要求】\n自定义要求');
    expect(prompt).not.toContain(defaultOutputProtocol('panel-prompt'));
  });

  it('未自定义时落到类型默认协议', () => {
    const prompt = applyOutputProtocol('正文', undefined, 'panel-prompt');
    expect(prompt).toBe(`正文\n\n【输出要求】\n${defaultOutputProtocol('panel-prompt')}`);
  });

  it('asset-prompt 默认协议按发送模式区分', () => {
    const batch = defaultOutputProtocol('asset-prompt', 'batch-once');
    const perItem = defaultOutputProtocol('asset-prompt', 'per-item');
    expect(batch).toContain('【资产名｜状态名】');
    expect(perItem).toContain('只输出一段完整的中文提示词正文');
    expect(batch).not.toBe(perItem);
  });

  it('六个长篇类型均有默认协议；style/story 无', () => {
    for (const type of ['analysis', 'script', 'storyboard', 'extract', 'asset-prompt', 'panel-prompt'] as const) {
      expect(defaultOutputProtocol(type).length).toBeGreaterThan(0);
    }
    expect(defaultOutputProtocol('style')).toBe('');
    expect(defaultOutputProtocol('story')).toBe('');
  });

  it('分镜默认协议：台词 / 旁白正文用【】括起，说话人在【】外', () => {
    const protocol = defaultOutputProtocol('storyboard');
    expect(protocol).toContain('说话人：【台词】');
    expect(protocol).toContain('说话人（心声）：【台词】');
    expect(protocol).toContain('说话人（画外）：【台词】');
    expect(protocol).toContain('旁白：【文字】');
  });
});
