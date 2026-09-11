import type { ModelConfig } from '@comic/types'
import { llmService } from './llmService'
import { defaultTemplateContent, renderPromptTemplate } from './promptTemplateRegistry'

/**
 * 章节级 AI 文档服务：原文分析 / 漫画剧本两个管线环节的提示词拼装与执行。
 * 产物为可编辑 Markdown（LongProjectChapterDoc），不做结构化解析；
 * 作为后续环节（剧本 → 分镜 → 资产提取）的上下文输入。
 * 变量与输出协议统一由 promptTemplateRegistry 渲染引擎处理；
 * 模板里没写的变量不会进入提示词（无自动追加兜底）。
 */

/**
 * 组装"原文分析"提示词：模板（{{章节原文}}）+ 章节原文。
 * 未选/未配模板时用内置默认模板（与推荐模板同源，自带全部变量）。
 * 产物回答"这本小说这一章到底有什么"（人物/场景/道具/事件/时间线/关系/对白/情绪/重要视觉信息）。
 */
export function buildAnalysisPrompt(templateContent: string, chapterContent: string): string {
  return renderPromptTemplate({
    type: 'analysis',
    content: templateContent.trim() || defaultTemplateContent('analysis'),
    values: { 章节原文: chapterContent },
  })
}

/**
 * 组装"漫画剧本"提示词：模板（{{章节原文}} / {{原文分析}}）+ 章节原文 + 原文分析。
 * 未选/未配模板时用内置默认模板（与推荐模板同源，自带全部变量）。
 * 产物回答"这一章改成漫画后要讲什么"（场景/剧情/人物/动作/情绪/对白/剧情目的）。
 */
export function buildScriptPrompt(templateContent: string, chapterContent: string, analysis?: string): string {
  return renderPromptTemplate({
    type: 'script',
    content: templateContent.trim() || defaultTemplateContent('script'),
    values: { 章节原文: chapterContent, 原文分析: analysis },
  })
}

/** 执行章节文档生成（原文分析 / 漫画剧本共用）：返回模型输出的 Markdown 全文。 */
export async function runChapterDoc(options: { model: ModelConfig; prompt: string }): Promise<string> {
  const result = await llmService.call({ modelConfig: options.model, userMessage: options.prompt })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  return result.content.trim()
}
