import { ref } from 'vue'
import Toast from '@comic/components/Toast.vue'

const toastInstance = ref<InstanceType<typeof Toast> | null>(null)

export const registerToast = (instance: InstanceType<typeof Toast>) => {
  toastInstance.value = instance
}

export const useToast = () => {
  const success = (message: string, duration?: number) => {
    if (toastInstance.value) {
      toastInstance.value.success(message, duration)
    } else {
      console.log(`[Toast Success] ${message}`)
    }
  }

  const error = (message: string, duration?: number) => {
    if (toastInstance.value) {
      toastInstance.value.error(message, duration)
    } else {
      console.error(`[Toast Error] ${message}`)
    }
  }

  const warning = (message: string, duration?: number) => {
    if (toastInstance.value) {
      toastInstance.value.warning(message, duration)
    } else {
      console.warn(`[Toast Warning] ${message}`)
    }
  }

  const info = (message: string, duration?: number) => {
    if (toastInstance.value) {
      toastInstance.value.info(message, duration)
    } else {
      console.info(`[Toast Info] ${message}`)
    }
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
