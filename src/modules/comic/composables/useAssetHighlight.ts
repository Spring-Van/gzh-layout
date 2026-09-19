import { computed, ref, type Ref } from 'vue'
import type { LongProjectAsset } from '@comic/types'
import { buildAssetNameIndex, detectAssetSpans } from '@comic/services/promptAssetService'

/**
 * 输入框内资产名高亮的公共逻辑（2026-09-19 简化：**只做高亮着色，不再有悬停卡**）。
 *
 * 分镜页两个输入框（「分镜内容」与「绘画提示词」）共用同一套叠层结构：
 * textarea 文字透明 + 底层高亮层按资产类型着色渲染。
 * - 高亮层与 textarea 必须**逐像素同排版**（同一套字体/字号/行高/内边距/断行规则），
 *   否则文字会错位；调用方负责保证这一点。
 * - 高亮的价值 = 命名校对探针：没高亮 = 这个名字资产库里没有，绑定会丢。
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
  /** 点击命中资产名时的回调（提示词框用于打开大图预览）。 */
  onPick?: (asset: LongProjectAsset) => void
}

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

  return {
    layerEl,
    segments,
    syncScroll,
    handleClick,
  }
}
