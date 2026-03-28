<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="min-w-[300px] p-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in transition-all duration-300"
        :class="toastClass(toast.type)"
      >
        <svg class="w-5 h-5 flex-shrink-0" :class="iconClass(toast.type)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="toast.type === 'success'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          <path v-else-if="toast.type === 'error'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          <path v-else-if="toast.type === 'warning'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="flex-1 text-sm font-medium">{{ toast.message }}</span>
        <button class="text-slate-400 hover:text-slate-600" @click="removeToast(toast.id)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

const toasts = ref<Toast[]>([]);
let toastId = 0;

function addToast(message: string, type: ToastType = 'info', duration: number = 3000) {
  const id = ++toastId;
  toasts.value.push({ id, message, type, duration });

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

function removeToast(id: number) {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.value.splice(index, 1);
  }
}

function toastClass(type: ToastType) {
  switch (type) {
    case 'success': return 'bg-green-50 border border-green-200 text-green-800';
    case 'error': return 'bg-red-50 border border-red-200 text-red-800';
    case 'warning': return 'bg-yellow-50 border border-yellow-200 text-yellow-800';
    case 'info': return 'bg-blue-50 border border-blue-200 text-blue-800';
    default: return 'bg-blue-50 border border-blue-200 text-blue-800';
  }
}

function iconClass(type: ToastType) {
  switch (type) {
    case 'success': return 'text-green-500';
    case 'error': return 'text-red-500';
    case 'warning': return 'text-yellow-500';
    case 'info': return 'text-blue-500';
    default: return 'text-blue-500';
  }
}

// 暴露给全局
defineExpose({
  addToast,
  removeToast
});
</script>

<style>
@keyframes toast-animation {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: toast-animation 0.3s ease-out forwards !important;
}
</style>
