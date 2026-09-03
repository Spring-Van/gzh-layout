/**
 * 轻量 Markdown 渲染工具：标题（#~###）/ 无序列表 / 段落 三种形态，输出安全 HTML。
 * 用于原文分析、漫画剧本、资产信息等 AI 产物的只读预览。
 */

/** HTML 特殊字符转义，防止模型输出注入标签。 */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** 空内容占位文案，可由调用方覆盖。 */
export function renderMarkdown(value: string, emptyText = '暂无内容'): string {
  if (!value.trim()) return `<p class="empty-preview">${emptyText}</p>`
  const html: string[] = []
  let list = false
  const close = () => { if (list) { html.push('</ul>'); list = false } }
  for (const rawLine of value.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    if (!line) { close(); continue }
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) { close(); html.push(`<h${heading[1].length}>${escapeHtml(heading[2])}</h${heading[1].length}>`); continue }
    const bullet = line.match(/^[-*]\s+(.+)$/)
    if (bullet) { if (!list) { html.push('<ul>'); list = true }; html.push(`<li>${escapeHtml(bullet[1])}</li>`); continue }
    close(); html.push(`<p>${escapeHtml(line)}</p>`)
  }
  close()
  return html.join('')
}
