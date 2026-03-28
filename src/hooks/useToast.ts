import type { InjectionKey } from 'vue';
import { inject, provide, ref } from 'vue';
import type { ToastType } from '../components/common/Toast.vue';

interface ToastInstance {
  addToast: (message: string, type?: ToastType, duration?: number) => number;
  removeToast: (id: number) => void;
}

const toastKey: InjectionKey<ToastInstance> = Symbol('toast');

export function useToastProvider(instance: ToastInstance) {
  provide(toastKey, instance);
}

export function useToast() {
  const toast = inject(toastKey);

  if (!toast) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return {
    /**
     * 通用提示
     * @param message 提示内容
     * @param type 提示类型 success | error | warning | info
     * @param duration 显示时长，默认3000ms
     */
    toast: (message: string, type: ToastType = 'info', duration: number = 3000) => {
      return toast.addToast(message, type, duration);
    },

    /**
     * 成功提示
     * @param message 提示内容
     * @param duration 显示时长
     */
    success: (message: string, duration?: number) => {
      return toast.addToast(message, 'success', duration);
    },

    /**
     * 错误提示
     * @param message 提示内容
     * @param duration 显示时长
     */
    error: (message: string, duration?: number) => {
      return toast.addToast(message, 'error', duration);
    },

    /**
     * 警告提示
     * @param message 提示内容
     * @param duration 显示时长
     */
    warning: (message: string, duration?: number) => {
      return toast.addToast(message, 'warning', duration);
    },

    /**
     * 信息提示
     * @param message 提示内容
     * @param duration 显示时长
     */
    info: (message: string, duration?: number) => {
      return toast.addToast(message, 'info', duration);
    },

    /**
     * 手动关闭提示
     * @param id 提示id
     */
    remove: (id: number) => {
      toast.removeToast(id);
    }
  };
}
