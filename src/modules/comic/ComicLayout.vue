/**
 * Comic 模块布局组件
 * 包含浮动侧边栏 + Toast 注册 + 路由出口
 * 所有 comic 模块的子路由都在此布局下渲染
 */
<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <main class="flex-1 overflow-hidden relative">
      <router-view />
    </main>
    <Toast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Toast from './components/Toast.vue';
import { registerToast } from './composables/useToast';

const toastRef = ref<InstanceType<typeof Toast> | null>(null);

onMounted(() => {
  if (toastRef.value) {
    registerToast(toastRef.value);
  }
});
</script>
