/**
 * 清理外部 AI 复制结果中混入的思考内容。
 *
 * 外部模型常把 `<think>...</think>`、`<analysis>...</analysis>` 或「思考过程：」
 * 放在正式 Markdown 前面。导入流程只需要最终正文，因此这里在解析和落库前统一清理。
 */
export interface SanitizedExternalResult {
  content: string
  removedThinking: boolean
}

const THINK_BLOCK = /<(think|thinking|analysis|reasoning)>[\s\S]*?<\/\1>/gi
const THINK_START = /^\s*(?:思考过程|思考|推理过程|分析过程|reasoning|analysis|thinking)\s*[:：]?\s*$/i
const STRUCTURE_START = /^\s*(?:#{1,6}\s+|【(?:分镜|第\s*\d+\s*镜|人物|场景|道具)|(?:分镜\s*\d+)|(?:第\s*\d+\s*格)|[-*]\s*(?:画面|镜头|描述|人物|动作|视觉描述)\s*[:：])/i

/** 清理思考块和位于正式结构前的思考前缀；正文内容保持原样。 */
export function sanitizeExternalAiResult(raw: string): SanitizedExternalResult {
  let content = raw.replace(/\r\n?/g, '\n')
  const beforeBlocks = content
  content = content.replace(THINK_BLOCK, '')
  let removedThinking = content !== beforeBlocks

  const lines = content.split('\n')
  const firstStructureIndex = lines.findIndex((line) => STRUCTURE_START.test(line))
  if (firstStructureIndex > 0 && lines.slice(0, firstStructureIndex).some((line) => THINK_START.test(line) || line.trim())) {
    const prefix = lines.slice(0, firstStructureIndex).join('\n').trim()
    if (prefix && (prefix.split('\n').some((line) => THINK_START.test(line)) || /(?:思考|推理|reasoning|analysis|thinking)/i.test(prefix))) {
      content = lines.slice(firstStructureIndex).join('\n')
      removedThinking = true
    }
  }

  // 清理思考块后可能留下多余空行，但不改动正文内部排版。
  content = content.replace(/^\n+|\n+$/g, '').trim()
  return { content, removedThinking }
}
