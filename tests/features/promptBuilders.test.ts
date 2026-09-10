import { describe, expect, it } from 'vitest';
import { buildAnalysisPrompt, buildScriptPrompt } from '../../src/modules/comic/services/chapterDocService';
import { buildStoryboardPrompt, buildPanelPolishPrompt } from '../../src/modules/comic/services/storyboardService';
import { buildAssetExtractionPrompt } from '../../src/modules/comic/services/assetExtractionService';
import { buildSingleAssetPrompt } from '../../src/modules/comic/services/assetPromptService';
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
    expect(prompt).toContain('【输出要求】');
  });

  it('漫画剧本：原文分析缺失时替换为占位提示', () => {
    const prompt = buildScriptPrompt('{{章节原文}}\n{{原文分析}}', '原文', undefined);
    expect(prompt).toContain('原文');
    expect(prompt).toContain('（本章尚未生成原文分析）');
  });

  it('分镜：旧错误模板（{{chapter_content}}）不再残留占位符，剧本以【漫画剧本】追加', () => {
    // 旧推荐分镜模板错误地使用 {{chapter_content}}，且不含 {{script_content}}
    const prompt = buildStoryboardPrompt('请拆分分镜。\n【章节原文】\n{{chapter_content}}', '第一场：……', '分析内容');
    expect(prompt).not.toContain('{{chapter_content}}');
    expect(prompt).not.toContain('{{');
    // 漫画剧本为 always 策略：追加兜底块
    expect(prompt).toContain('【漫画剧本】\n第一场：……');
    expect(prompt).toContain('【原文分析（辅助上下文）】\n分析内容');
  });

  it('分镜：推荐中文模板（{{漫画剧本}}/{{原文分析}}）原地替换', () => {
    const prompt = buildStoryboardPrompt('【剧本】\n{{漫画剧本}}\n【分析】\n{{原文分析}}', '剧本正文', '分析正文');
    expect(prompt).toContain('【剧本】\n剧本正文');
    expect(prompt).toContain('【分析】\n分析正文');
    expect(prompt).not.toContain('【漫画剧本】\n【');
  });

  it('资产提取：分析/剧本/概要/已有资产未插入时按 if-nonempty 追加', () => {
    const prompt = buildAssetExtractionPrompt('提取资产。', '第一章正文', {
      analysis: '分析',
      script: '',
      panelsOutline: '分镜1：开场',
      existingAssets: [asset()],
    });
    expect(prompt).toContain('【章节原文】\n第一章正文');
    expect(prompt).toContain('【原文分析】\n分析');
    expect(prompt).not.toContain('【漫画剧本】');
    expect(prompt).toContain('【本章分镜概要（已确定会被绘制的画面）】\n分镜1：开场');
    expect(prompt).toContain('【项目已有资产】\n- 角色C（人物；已有视觉状态：无）');
  });

  it('资产单条：逐条路径支持 {{目标生图模型}}，协议为逐条默认', () => {
    const prompt = buildSingleAssetPrompt({
      asset: asset(),
      variant: variant({ description: '外观描述' }),
      styleContext: '整体画风：国风',
      targetImageModel: '即梦 v3',
      templateContent: '模型：{{目标生图模型}}\n状态：{{状态清单}}',
    });
    expect(prompt).toContain('模型：即梦 v3');
    expect(prompt).toContain('状态：- 资产：角色C');
    expect(prompt).toContain('【输出要求】');
    expect(prompt).toContain('只输出一段完整的中文提示词正文');
  });

  it('分镜单页 AI 优化：携带本页页块文本与剧本上下文，并复用分镜输出协议', () => {
    const block = '①【近景】角色A指节收紧，关键道具缠上小臂。\n角色A：破坏了它的关键部分，跟要了它的命有什么区别？';
    const prompt = buildPanelPolishPrompt(block, '第一场 室内·夜：两方对峙');
    // 本页原文与剧本上下文都要给到模型
    expect(prompt).toContain(block);
    expect(prompt).toContain('【当前这一页分镜】');
    expect(prompt).toContain('第一场 室内·夜：两方对峙');
    // 输出仍走页块协议（解析器据此回填格列表）
    expect(prompt).toContain('## 分镜 N');
    expect(prompt).toContain('① ② ③ ④');
    // 新协议：台词 / 旁白正文用【】括起，说话人在【】外
    expect(prompt).toContain('说话人：【台词】');
    expect(prompt).toContain('旁白：【文字】');
    // 未提供剧本时给出占位，避免指令空洞
    expect(buildPanelPolishPrompt(block)).toContain('（本章尚未生成剧本）');
  });
});
