import { describe, expect, it } from 'vitest';
import {
  LONG_STORY_TEMPLATE_TYPES,
  RECOMMENDED_TEMPLATES,
  applyOutputProtocol,
  defaultOutputProtocol,
  findUnknownVariables,
  getTemplateVariables,
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
    // storyboard 的「章节原文」刻意不注册 legacy 别名：旧模板误用的 {{chapter_content}} 保持原样，
    // 会被 findUnknownVariables 检出并在渲染时清理，避免存量模板被灌进整章原文
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

  it('变量不在模板中：一律不出现（无自动追加兜底）', () => {
    const prompt = renderPromptTemplate({
      type: 'analysis',
      content: '只做人物梳理。',
      values: { 章节原文: '第一章……' },
    });
    expect(prompt.startsWith('只做人物梳理。')).toBe(true);
    expect(prompt).not.toContain('第一章……');
    expect(prompt).not.toContain('【章节原文】');
  });

  it('未插入的变量即使有值也不出现（关键输入与辅助上下文一视同仁）', () => {
    const prompt = renderPromptTemplate({
      type: 'panel-prompt',
      content: '描述画面：{{当前分镜}}',
      values: { 当前分镜: '分镜序号：1', 风格上下文: '整体画风：日漫', 本章分镜概要: '分镜1：开场' },
    });
    expect(prompt).toContain('分镜序号：1');
    expect(prompt).not.toContain('整体画风：日漫');
    expect(prompt).not.toContain('分镜1：开场');
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

describe('promptTemplateRegistry · 推荐模板', () => {
  it('六个长篇类型的推荐模板都显式插入了该类型的全部变量（不再依赖兜底）', () => {
    for (const type of LONG_STORY_TEMPLATE_TYPES) {
      const template = RECOMMENDED_TEMPLATES[type];
      expect(template, `缺少推荐模板：${type}`).toBeTruthy();
      for (const spec of getTemplateVariables(type)) {
        expect(template!.content, `${type} 推荐模板缺少 {{${spec.name}}}`).toContain(`{{${spec.name}}}`);
      }
    }
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

  it('分镜默认协议：符号规则（格用【第X格】、标题用「」、冒号后写内容）', () => {
    const protocol = defaultOutputProtocol('storyboard');
    expect(protocol).toContain('符号规则：分镜格用【第X格】；内容标题用「XXX」；冒号后写具体内容。');
    expect(protocol).toContain('【第X格】');
    expect(protocol).toContain('「字段名」：内容');
  });

  it('分镜默认协议：列出 13 个字段，台词类字段四选一且带说话人', () => {
    const protocol = defaultOutputProtocol('storyboard');
    expect(protocol).toContain('景别 / 镜头 / 画面 / 人物 / 动作 / 表情 / 台词 / 心声 / 画外 / 旁白 / 音效 / 光效 / 备注');
    expect(protocol).toContain('说话人：“台词”');
    expect(protocol).toContain('「旁白」不带说话人');
    // 【】不再用于台词包装（旧 v3 协议已废弃）
    expect(protocol).not.toContain('说话人：【台词】');
  });
});
