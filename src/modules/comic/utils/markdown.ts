/**
 * 轻量 Markdown 渲染工具：块级（标题 #~### / 无序列表 / 有序列表 / 段落）+ 行内（粗体 / 斜体 / 行内代码）
 * 输出安全 HTML，用于原文分析、漫画剧本、资产信息等 AI 产物的只读预览。
 *
 * 设计口径：不引第三方依赖，只覆盖 AI 产物实际会出现的语法。
 * 安全前提：**先转义再插标签** —— 所有用户文本一律 escapeHtml，标签由本文件自己拼，
 * 因此模型输出的 <script> 之类无法穿透。
 */

/** HTML 特殊字符转义，防止模型输出注入标签。 */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * 行内 Markdown → HTML。**入参必须是已转义的文本**（本函数只负责插标签，不再转义）。
 * 顺序有讲究：
 * 1. 行内代码先抠出来占位 —— 代码里的 * 和 _ 是字面量，不能被后面的斜体规则吃掉；
 * 2. 粗体先于斜体 —— 否则 `**x**` 会被斜体规则先匹配掉前一个 `*`，只剩半截；
 * 3. 下划线斜体的边界号不匹配数字/字符，避免 `snake_case_name` 被误伤。
 */
function renderInline(escaped: string): string {
  const codeSpans: string[] = []
  let out = escaped.replace(/`([^`]+)`/g, (_, code: string) => {
    codeSpans.push(code)
    return `\u0000${codeSpans.length - 1}\u0000`
  })
  out = out
    .replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^\n]+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^\n*]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_([^\n_]+?)_(?![\w])/g, '$1<em>$2</em>')
    .replace(/\u0000(\d+)\u0000/g, (_, index: string) => `<code>${codeSpans[Number(index)]}</code>`)
  return out
}

/** 列表项内容 = 去掉行首标记后的原文，交给行内渲染。 */
const inline = (text: string) => renderInline(escapeHtml(text))

/** 空内容占位文案，可由调用方覆盖。 */
export function renderMarkdown(value: string, emptyText = '暂无内容'): string {
  if (!value.trim()) return `<p class="empty-preview">${emptyText}</p>`
  const html: string[] = []
  let list: 'ul' | 'ol' | null = null
  const close = () => { if (list) { html.push(`</${list}>`); list = null } }
  const open = (kind: 'ul' | 'ol') => { if (list !== kind) { close(); html.push(`<${kind}>`); list = kind } }
  for (const rawLine of value.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    if (!line) { close(); continue }
    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) { close(); html.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue }
    const bullet = line.match(/^[-*+]\s+(.+)$/)
    if (bullet) { open('ul'); html.push(`<li>${inline(bullet[1])}</li>`); continue }
    const ordered = line.match(/^\d+[.)]\s+(.+)$/)
    if (ordered) { open('ol'); html.push(`<li>${inline(ordered[1])}</li>`); continue }
    close(); html.push(`<p>${inline(line)}</p>`)
  }
  close()
  return html.join('')
}
