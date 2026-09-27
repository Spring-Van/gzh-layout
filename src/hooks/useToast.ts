import type { InjectionKey, Ref } from 'vue';
import { inject, provide, ref } from 'vue';
import type { ToastType } from '../components/common/Toast.vue';

interface ToastInstance {
  addToast: (message: string, type?: ToastType, duration?: number) => number;
  removeToast: (id: number) => void;
}

interface ToastContext {
  /**
   * 必须持有 ref 本身（而不是 ref.value 的快照）。
   * 提供者注册实例发生在 onMounted，晚于子组件的 setup，
   * 只有共享同一个 ref，消费方才能读到注册后的最新值。
   */
  instance: Ref<ToastInstance | null>;
}

const toastKey: InjectionKey<ToastContext> = Symbol('toast');

export function useToastProvider() {
  const instance = ref<ToastInstance | null>(null);

  // 注意：曾经误写成 { instance: instance.value }，注入到的是当时求值的 null 快照，
  // 之后 setToastInstance 只更新了本函数的 ref，消费方永远读到 null，
  // 导致全站提示被静默丢弃（保存成功、失败报错都毫无反馈）。
  provide(toastKey, { instance });

  return (val: ToastInstance) => {
    instance.value = val;
  };
}

export function useToast() {
  const toastCtx = inject(toastKey);

  if (!toastCtx) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const getInstance = () => {
    const instance = toastCtx.instance.value;
    if (!instance) {
      console.warn('Toast instance not initialized yet');
      // 返回空方法避免报错
      return {
        addToast: () => 0,
        removeToast: () => { }
      };
    }
    return instance;
  };

  return {
    /**
     * 通用提示
     * @param message 提示内容
     * @param type 提示类型 success | error | warning | info
     * @param duration 显示时长，默认3000ms
     */
    toast: (message: string, type: ToastType = 'info', duration: number = 3000) => {
      return getInstance().addToast(message, type, duration);
    },

    /**
     * 成功提示
     * @param message 提示内容
     * @param duration 显示时长
     */
    success: (message: string, duration?: number) => {
      return getInstance().addToast(message, 'success', duration);
    },

    /**
     * 错误提示
     * @param message 提示内容
     * @param duration 显示时长
     */
    error: (message: string, duration?: number) => {
      return getInstance().addToast(message, 'error', duration);
    },

    /**
     * 警告提示
     * @param message 提示内容
     * @param duration 显示时长
     */
    warning: (message: string, duration?: number) => {
      return getInstance().addToast(message, 'warning', duration);
    },

    /**
     * 信息提示
     * @param message 提示内容
     * @param duration 显示时长
     */
    info: (message: string, duration?: number) => {
      return getInstance().addToast(message, 'info', duration);
    },

    /**
     * 手动关闭提示
     * @param id 提示id
     */
    remove: (id: number) => {
      getInstance().removeToast(id);
    }
  };
}
