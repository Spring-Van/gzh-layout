import { ref } from 'vue'
import Toast from '@comic/components/Toast.vue'

const toastInstance = ref<InstanceType<typeof Toast> | null>(null)

export const registerToast = (instance: InstanceType<typeof Toast>) => {
  toastInstance.value = instance
}

export const useToast = () => {
  /**
   * 四个提示方法都返回 toast id（实例未就绪时返回 0）。
   * 返回值用于「进行中 → 完成」的替换式提示：先 info(msg, 0) 常驻，
   * 任务结束后 remove(id) 再给成功/失败结果，避免用户点了没反应。
   */
  const success = (message: string, duration?: number): number => {
    if (toastInstance.value) return toastInstance.value.success(message, duration)
    console.log(`[Toast Success] ${message}`)
    return 0
  }

  const error = (message: string, duration?: number): number => {
    if (toastInstance.value) return toastInstance.value.error(message, duration)
    console.error(`[Toast Error] ${message}`)
    return 0
  }

  const warning = (message: string, duration?: number): number => {
    if (toastInstance.value) return toastInstance.value.warning(message, duration)
    console.warn(`[Toast Warning] ${message}`)
    return 0
  }

  const info = (message: string, duration?: number): number => {
    if (toastInstance.value) return toastInstance.value.info(message, duration)
    console.info(`[Toast Info] ${message}`)
    return 0
  }

  const remove = (id: number) => {
    if (toastInstance.value) {
      toastInstance.value.removeToast(id)
    }
  }

  return {
    success,
    error,
    warning,
    info,
    remove
  }
}
