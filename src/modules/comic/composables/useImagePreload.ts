/**
 * 图片预加载与缓存
 *
 * 解决多张远程大图同时加载导致的卡顿问题：
 * - 限制并发下载数（默认 3 个），避免网络拥塞
 * - 预加载完成后图片进入浏览器 HTTP 缓存，后续渲染直接复用
 * - 提供 isLoading/progress 给 UI 显示加载状态
 */
import { ref, type Ref } from 'vue'

interface PreloadOptions {
  /** 最大并发下载数，默认 3 */
  concurrency?: number
}

interface PreloadState {
  isLoading: Ref<boolean>
  loadedCount: Ref<number>
  totalCount: Ref<number>
  progress: Ref<number>
}

/**
 * 预加载图片列表，限制并发数
 * @param urls 图片 URL 列表
 * @param options 配置项
 * @returns 加载状态
 */
export function useImagePreload(options: PreloadOptions = {}): PreloadState & {
  preload: (urls: string[]) => Promise<void>
} {
  const concurrency = options.concurrency ?? 3
  const isLoading = ref(false)
  const loadedCount = ref(0)
  const totalCount = ref(0)
  const progress = ref(0)

  /** 单张图片加载，超时自动跳过（15s） */
  function loadSingle(url: string): Promise<void> {
    return new Promise((resolve) => {
      if (!url) {
        resolve()
        return
      }
      const img = new Image()
      img.decoding = 'async'
      let settled = false

      const done = () => {
        if (settled) return
        settled = true
        loadedCount.value++
        progress.value = totalCount.value > 0 ? loadedCount.value / totalCount.value : 0
        resolve()
      }

      img.onload = done
      img.onerror = done

      // 超时保护：15s 未完成视为失败
      const timer = setTimeout(done, 15000)

      img.src = url

      // 原始清理
      const originalDone = done
      const cleanup = () => {
        clearTimeout(timer)
      }
      img.onload = () => { cleanup(); originalDone() }
      img.onerror = () => { cleanup(); originalDone() }
    })
  }

  /** 批量预加载，控制并发 */
  async function preload(urls: string[]): Promise<void> {
    const validUrls = urls.filter((u) => !!u)
    if (validUrls.length === 0) return

    // 去重
    const uniqueUrls = [...new Set(validUrls)]

    isLoading.value = true
    loadedCount.value = 0
    totalCount.value = uniqueUrls.length
    progress.value = 0

    // 分批并发
    const queue = [...uniqueUrls]
    const workers: Promise<void>[] = []

    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      workers.push((async () => {
        while (queue.length > 0) {
          const url = queue.shift()
          if (url) await loadSingle(url)
        }
      })())
    }

    await Promise.all(workers)

    isLoading.value = false
  }

  return {
    isLoading,
    loadedCount,
    totalCount,
    progress,
    preload,
  }
}
