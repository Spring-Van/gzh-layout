/**
 * 下载服务
 * 提供单张和批量下载功能
 * 改造为通过 Electron IPC 调用主进程，替代原 fetch('http://localhost:3001')
 */

import { comicDownload } from '@/api/comic';

export interface DownloadResult {
  success: boolean
  filename?: string
  filePath?: string
  downloadUrl?: string
  error?: string
  securedCount?: number
}

/**
 * 下载单个图片
 * @param url - 图片 URL
 * @param filename - 可选的文件名
 * @param showInFolder - 是否在完成后打开文件夹（默认 true）
 */
export const downloadSingle = async (
  url: string,
  filename?: string,
  showInFolder = true
): Promise<DownloadResult> => {
  try {
    const result = await comicDownload.downloadSingle(url, filename, showInFolder);
    return result as DownloadResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '下载失败'
    }
  }
}

/**
 * 网感滤镜预设类型
 */
export type VibePreset = 'natural' | 'clean' | 'film' | 'ios' | 'android' | 'none'

/**
 * 网感滤镜自定义配置
 */
export interface VibeOptions {
  medianSize?: number
  blurSigma?: number
  sharpenSigma?: number
  brightness?: number
  saturation?: number
  contrast?: number
  normalise?: boolean
  tintEnabled?: boolean
  tintRGB?: { r: number; g: number; b: number }
}

/**
 * 批量下载图片并打包成 ZIP
 * @param urls - 图片 URL 数组
 * @param folderName - 可选的文件夹名称
 * @param secureIndices - 需要脱敏处理的图片索引数组
 * @param vibePreset - 网感滤镜预设类型
 * @param vibeOptions - 网感滤镜自定义配置
 */
export const downloadBatch = async (
  urls: string[],
  folderName?: string,
  secureIndices?: number[],
  vibePreset?: VibePreset,
  vibeOptions?: VibeOptions
): Promise<DownloadResult> => {
  if (urls.length === 0) {
    return { success: false, error: '没有可下载的图片' }
  }

  try {
    // 深拷贝为纯数据：urls / vibeOptions 来自 Vue ref/computed，是 reactive proxy，
    // 传入 ipcRenderer.invoke 会触发 "An object could not be cloned."（结构化克隆不支持 Proxy）
    const payload = JSON.parse(JSON.stringify({
      urls,
      folderName,
      secureIndices,
      vibePreset,
      vibeOptions,
      showInFolder: true,
    }));
    const result = await comicDownload.downloadBatch(payload);
    return result as DownloadResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '批量下载失败'
    }
  }
}

/**
 * 直接使用浏览器下载（无需服务器）
 * 适用于同源或支持 CORS 的图片（如 app-image:// 已开放 CORS）
 *
 * 为什么必须先 fetch 成 blob：app-image:// 是应用私有协议，与页面不同源。
 * 不同源地址交给 <a download> 时 download 属性会被忽略，浏览器会直接导航到该地址，
 * 整个窗口变成一张脱离应用的图片（且无法返回），这正是「点下载却把图片放大、退不出去」的原因。
 * 取回 blob 换成同源的 blob URL，download 才会真正生效。
 *
 * @param url - 图片 URL
 * @param filename - 文件名
 */
export const downloadDirect = async (url: string, filename: string) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 立即 revoke 会让大图来不及读取，等下载启动后再释放
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch (error) {
    console.error('直接下载失败:', error)
  }
}
