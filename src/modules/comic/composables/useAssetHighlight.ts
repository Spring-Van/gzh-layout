import { computed, onBeforeUnmount, ref, type Ref } from 'vue'
import type { LongProjectAsset } from '@comic/types'
import { buildAssetNameIndex, detectAssetSpans } from '@comic/services/promptAssetService'

/**
 * 输入框内资产名高亮 + 悬停查看资产的公共逻辑。
 *
 * 分镜页有两个地方要用同一套效果（「分镜内容」与「绘画提示词」输入框），
 * 两处都是「textarea 文字透明 + 底层高亮层渲染」的叠层结构：
 * - 高亮层与 textarea 必须**逐像素同排版**（同一套字体/字号/行高/内边距/断行规则），
 *   否则文字会错位；调用方负责保证这一点。
 * - textarea 压在高亮层之上，所以拿不到 span 的 hover 事件，只能用光标坐标反查命中。
 *
 * 判定口径（2026-09-17 决策）：**文本里的名字能匹配到资产库即高亮**，不额外要求
 * 「已写进 assetBindings」。理由是绑定本身就是扫名字产生的，稳定分镜下两者结果一致，
 * 而按绑定过滤会让高亮要等保存回流才出现（分镜内容框只在失焦保存，延迟很直观）。
 */
export interface HighlightSegment {
  text: string
  asset?: LongProjectAsset
}

export interface UseAssetHighlightOptions {
  /** 当前文本（响应式取值函数，随输入实时变化）。 */
  text: () => string
  /** 可命中的资产库。 */
  assets: () => LongProjectAsset[]
  /** 点击命中资产名时的回调（通常是打开大图预览）。 */
  onPick?: (asset: LongProjectAsset) => void
}

/** 悬停卡宽度（与 AssetHoverCard 的固定宽度保持一致，用于视口内收边）。 */
const HOVER_CARD_WIDTH = 216
const HOVER_CARD_HEIGHT = 200

export function useAssetHighlight(options: UseAssetHighlightOptions) {
  /** 高亮层元素（与 textarea 同排版的绝对定位层）。 */
  const layerEl: Ref<HTMLElement | null> = ref(null)

  const nameIndex = computed(() => buildAssetNameIndex(options.assets()))
  /** 文本中的资产名命中区间（长名优先、区间消费，避免短名嵌在长名里重复命中）。 */
  const spans = computed(() => detectAssetSpans(options.text(), nameIndex.value))

  /** 高亮分片：普通文本与资产名交替，供高亮层逐段渲染。 */
  const segments = computed<HighlightSegment[]>(() => {
    const text = options.text()
    const result: HighlightSegment[] = []
    let cursor = 0
    for (const span of spans.value) {
      if (span.start > cursor) result.push({ text: text.slice(cursor, span.start) })
      result.push({ text: text.slice(span.start, span.end), asset: span.asset })
      cursor = span.end
    }
    if (cursor < text.length) result.push({ text: text.slice(cursor) })
    return result
  })

  // ========== 坐标命中（textarea 上的文字是透明的，只能反查） ==========

  /** 整块粗筛 + 逐字矩形精判；资产名通常 2-6 字，逐字成本可接受。 */
  function hitAssetAt(clientX: number, clientY: number): LongProjectAsset | null {
    const layer = layerEl.value
    if (!layer) return null
    for (const node of layer.querySelectorAll<HTMLElement>('[data-asset-id]')) {
      const box = node.getBoundingClientRect()
      if (clientX < box.left || clientX > box.right || clientY < box.top || clientY > box.bottom) continue
      const asset = options.assets().find((item) => item.id === node.dataset.assetId)
      if (!asset) continue
      const textNode = node.firstChild
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return asset
      const range = document.createRange()
      const total = textNode.textContent?.length ?? 0
      for (let i = 0; i < total; i += 1) {
        range.setStart(textNode, i)
        range.setEnd(textNode, i + 1)
        const rect = range.getBoundingClientRect()
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return asset
      }
    }
    return null
  }

  /** 同步高亮层滚动位置，保证与 textarea 视觉一致。 */
  function syncScroll(event: Event) {
    const layer = layerEl.value
    if (!layer) return
    const textarea = event.target as HTMLTextAreaElement
    layer.scrollTop = textarea.scrollTop
    layer.scrollLeft = textarea.scrollLeft
  }

  /** 点击 textarea：光标落在资产名区间内则触发 onPick（textarea 原生单击会定位 selectionStart）。 */
  function handleClick(event: MouseEvent) {
    const textarea = event.target as HTMLTextAreaElement
    const pos = textarea.selectionStart
    const span = spans.value.find((item) => pos >= item.start && pos < item.end)
    if (span) options.onPick?.(span.asset)
  }

  // ========== 悬停卡状态机 ==========

  const hoveredAsset = ref<LongProjectAsset | null>(null)
  const hoverPos = ref({ x: 0, y: 0 })
  let hoverRaf = 0
  let hoverPoint: { x: number; y: number } | null = null
  let hoverCloseTimer: number | undefined

  /** 悬停卡定位：跟随鼠标但不越出视口。 */
  const hoverCardStyle = computed(() => {
    const vw = typeof window === 'undefined' ? 1280 : window.innerWidth
    const vh = typeof window === 'undefined' ? 800 : window.innerHeight
    return {
      left: `${Math.max(8, Math.min(hoverPos.value.x + 16, vw - HOVER_CARD_WIDTH - 12))}px`,
      top: `${Math.max(8, Math.min(hoverPos.value.y + 16, vh - HOVER_CARD_HEIGHT))}px`,
      width: `${HOVER_CARD_WIDTH}px`,
    }
  })

  /** textarea mousemove：rAF 节流后做命中测算，命中则显示悬停卡。 */
  function handleMove(event: MouseEvent) {
    hoverPoint = { x: event.clientX, y: event.clientY }
    if (hoverRaf) return
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0
      const point = hoverPoint
      if (!point) return
      const asset = hitAssetAt(point.x, point.y)
      if (asset) {
        cancelHoverClose()
        hoveredAsset.value = asset
        hoverPos.value = { ...point }
      } else if (hoveredAsset.value) {
        scheduleHoverClose()
      }
    })
  }

  /** 底部「识别资产」标签悬停：直接用标签位置定位（真实 DOM，无需测算）。 */
  function showCardAt(assetId: string, event: MouseEvent) {
    const asset = options.assets().find((item) => item.id === assetId)
    if (!asset) return
    cancelHoverClose()
    hoveredAsset.value = asset
    hoverPos.value = { x: event.clientX, y: event.clientY }
  }

  /** 延迟关闭：留出鼠标从文字/标签移到卡片上的时间，否则卡片一移就消失。 */
  function scheduleHoverClose() {
    if (hoverCloseTimer) window.clearTimeout(hoverCloseTimer)
    hoverCloseTimer = window.setTimeout(() => { hoveredAsset.value = null }, 160)
  }

  function cancelHoverClose() {
    if (!hoverCloseTimer) return
    window.clearTimeout(hoverCloseTimer)
    hoverCloseTimer = undefined
  }

  onBeforeUnmount(() => {
    if (hoverRaf) cancelAnimationFrame(hoverRaf)
    if (hoverCloseTimer) window.clearTimeout(hoverCloseTimer)
  })

  return {
    layerEl,
    segments,
    syncScroll,
    handleClick,
    handleMove,
    handleLeave: scheduleHoverClose,
    hoveredAsset,
    hoverCardStyle,
    showCardAt,
    cancelHoverClose,
  }
}
