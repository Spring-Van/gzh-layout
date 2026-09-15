import { describe, expect, it } from 'vitest';
import {
  LONG_STORY_TEMPLATE_TYPES,
  OUTPUT_FORMAT_SPECS,
  RECOMMENDED_TEMPLATES,
  findUnknownVariables,
  getTemplateVariables,
  migrateTemplateContent,
  normalizeTemplateVariables,
  outputFormatSpec,
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
    // 渲染不再追加任何协议段（返回格式约定写在模板内容里）
    expect(prompt).toBe('请分析：\n第一章……');
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

describe('promptTemplateRegistry · 返回格式（写在模板内容里）', () => {
  it('渲染不再追加任何协议段：模板内容就是最终提示词', () => {
    const prompt = renderPromptTemplate({
      type: 'panel-prompt',
      content: '内容',
      values: {},
    });
    expect(prompt).toBe('内容');
    expect(prompt).not.toContain('【返回格式】');
    expect(prompt).not.toContain('【内容要求】');
  });

  it('需要解析的环节：推荐模板内容自带【返回格式】段', () => {
    for (const type of ['storyboard', 'extract', 'asset-prompt'] as const) {
      const content = RECOMMENDED_TEMPLATES[type]!.content;
      expect(content, `${type} 推荐模板缺少格式约定`).toContain('【返回格式】');
      expect(content).toContain(outputFormatSpec(type));
    }
  });

  it('六个长篇类型的格式说明都要求 Markdown；style/story 无', () => {
    for (const type of ['analysis', 'script', 'storyboard', 'extract', 'asset-prompt', 'panel-prompt'] as const) {
      expect(outputFormatSpec(type).length).toBeGreaterThan(0);
      expect(outputFormatSpec(type), `${type} 应明确要求 Markdown 返回`).toContain('Markdown');
    }
    expect(outputFormatSpec('style')).toBe('');
    expect(OUTPUT_FORMAT_SPECS.story).toBeUndefined();
  });

  it('asset-prompt 返回格式只有一份：批量与逐条同格式（逐条只解析一条）', () => {
    const format = outputFormatSpec('asset-prompt');
    expect(format).toContain('Markdown');
    expect(format).toContain('【资产名｜状态名】');
  });

  it('分镜格式说明：符号规则（格用【第X格】、标题用「」、冒号后写内容）', () => {
    const spec = outputFormatSpec('storyboard');
    expect(spec).toContain('符号规则：分镜格用【第X格】；内容标题用「XXX」；冒号后写具体内容。');
    expect(spec).toContain('【第X格】');
    expect(spec).toContain('「字段名」：内容');
  });

  it('分镜格式说明：列出 13 个字段，台词类字段四选一且带说话人', () => {
    const spec = outputFormatSpec('storyboard');
    expect(spec).toContain('景别 / 镜头 / 画面 / 人物 / 动作 / 表情 / 台词 / 心声 / 画外 / 旁白 / 音效 / 光效 / 备注');
    expect(spec).toContain('说话人：“台词”');
    expect(spec).toContain('「旁白」不带说话人');
    // 【】不再用于台词包装（旧 v3 协议已废弃）
    expect(spec).not.toContain('说话人：【台词】');
  });

  it('资产提取格式说明：三级标题结构与解析器对齐', () => {
    const spec = outputFormatSpec('extract');
    expect(spec).toContain('# 人物、# 场景、# 道具');
    expect(spec).toContain('## 资产名称');
    expect(spec).toContain('### 视觉状态：状态名');
  });
});
