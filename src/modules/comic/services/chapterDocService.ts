import type { ModelConfig } from '@comic/types'
import { llmService } from './llmService'

/**
 * 章节级 AI 文档服务：原文分析 / 漫画剧本两个管线环节的提示词拼装与执行。
 * 产物为可编辑 Markdown（LongProjectChapterDoc），不做结构化解析；
 * 作为后续环节（剧本 → 分镜 → 资产提取）的上下文输入。
 */

/** 模板变量替换：模板含变量时原地替换，否则把上下文追加到模板末尾。 */
function applyVariables(templateContent: string, sections: Array<{ pattern: RegExp; value: string; label: string; content: string }>): string {
  let result = templateContent
  const appended: string[] = []
  for (const section of sections) {
    if (section.pattern.test(result)) result = result.replace(section.pattern, section.value)
    else if (section.content.trim()) appended.push(`【${section.label}】\n${section.content}`)
  }
  return appended.length ? `${result}\n\n${appended.join('\n\n')}` : result
}

/**
 * 组装"原文分析"提示词：模板 + 章节原文。
 * 产物回答"这本小说这一章到底有什么"（人物/场景/道具/事件/时间线/关系/对白/情绪/重要视觉信息）。
 */
export function buildAnalysisPrompt(templateContent: string, chapterContent: string): string {
  const prompt = applyVariables(templateContent, [
    { pattern: /\{\{chapter_content\}\}/g, value: chapterContent, label: '章节原文', content: chapterContent },
  ])
  return `${prompt}\n\n【系统固定输出协议】\n只输出中文 Markdown，不要解释、代码块或 JSON。用 ## 小节标题组织（如 ## 人物、## 场景、## 道具、## 事件与时间线、## 人物关系、## 对白、## 情绪、## 重要视觉信息），每条信息写为「- 名称：描述」列表项。`
}

/**
 * 组装"漫画剧本"提示词：模板 + 章节原文 + 原文分析。
 * 产物回答"这一章改成漫画后要讲什么"（场景/剧情/人物/动作/情绪/对白/剧情目的）。
 */
export function buildScriptPrompt(templateContent: string, chapterContent: string, analysis?: string): string {
  const prompt = applyVariables(templateContent, [
    { pattern: /\{\{chapter_content\}\}/g, value: chapterContent, label: '章节原文', content: chapterContent },
    { pattern: /\{\{analysis\}\}/g, value: analysis ?? '（本章尚未生成原文分析）', label: '原文分析', content: analysis ?? '' },
  ])
  return `${prompt}\n\n【系统固定输出协议】\n只输出中文 Markdown，不要解释、代码块或 JSON。用 ## 场景 N 组织每个剧本场景，场景内用「- 属性名：内容」列表项写明场景、剧情、人物、动作、情绪、对白与剧情目的。`
}

/** 执行章节文档生成（原文分析 / 漫画剧本共用）：返回模型输出的 Markdown 全文。 */
export async function runChapterDoc(options: { model: ModelConfig; prompt: string }): Promise<string> {
  const result = await llmService.call({ modelConfig: options.model, userMessage: options.prompt })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  return result.content.trim()
}

/** 推荐原文分析模板：供设置页一键填充。 */
export const DEFAULT_ANALYSIS_TEMPLATE = `你是一名专业的小说解读者。请通读当前章节，输出一份结构化的原文分析，回答"这一章到底有什么"，为后续漫画剧本、分镜与资产提取提供依据。

【分析范围】
- 人物：有姓名或明确身份的全部角色，含身份、关系、当前状态。
- 场景：出现过的全部地点，含空间特征与氛围。
- 道具：推动剧情或反复出现的物品。
- 事件与时间线：按发生顺序列出本章事件。
- 人物关系：角色之间的称呼、立场、情感变化。
- 对白：关键台词与说话人。
- 情绪：主要角色的情绪变化轨迹。
- 重要视觉信息：原文明确写出的外貌、服装、环境、光线等可直接入画的信息。

【写作要求】
- 只归纳原文已经明确的信息，不要推测、补写。
- 每条信息标注出处要点（第几段/关键句），便于核对。
- 语言精炼，直接服务于后续漫画改编。

【章节原文】
{{chapter_content}}`

/** 推荐漫画剧本模板：供设置页一键填充。 */
export const DEFAULT_SCRIPT_TEMPLATE = `你是一名资深的漫画编剧。请基于章节原文与原文分析，把这一章改编成漫画剧本，回答"这一章改成漫画后要讲什么"。

【改编要求】
- 按场景组织：每个场景写明地点、出场人物、剧情推进。
- 每个场景包含：剧情概要、人物动作、情绪基调、关键对白、剧情目的（本场景为什么存在）。
- 删减不能画面化的纯心理描写与重复叙述；关键转折必须保留。
- 对白精炼口语化，符合角色身份。
- 剧情目的写清该场景在全章中的作用（铺垫/推进/转折/收束）。

【章节原文】
{{chapter_content}}

【原文分析】
{{analysis}}`
