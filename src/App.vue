<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppHeader from './components/layout/AppHeader.vue';
import ModalTemplate from './components/layout/ModalTemplate.vue';
import ModalAccount from './components/layout/ModalAccount.vue';
import Toast from './components/common/Toast.vue';
import { useToastProvider } from './hooks/useToast';

const toastRef = ref<InstanceType<typeof Toast> | null>(null);
const setToastInstance = useToastProvider();

// 提供Toast实例给所有子组件
onMounted(() => {
  if (toastRef.value) {
    setToastInstance({
      addToast: (...args) => toastRef.value!.addToast(...args),
      removeToast: (...args) => toastRef.value!.removeToast(...args)
    });
  }
});

const route = useRoute();

const currentStep = computed(() => {
  if (route.path === '/setup') return 'setup';
  if (route.path === '/typeset') return 'typeset';
  if (route.path === '/sync') return 'sync';
  return 'home';
});

const showTemplateModal = ref(false);
const showAccountModal = ref(false);

function openModal(type: string) {
  if (type === 'template') {
    showTemplateModal.value = true;
  } else if (type === 'account') {
    showAccountModal.value = true;
  }
}
</script>

<template>
  <div id="app" class="h-screen flex flex-col overflow-hidden">
    <AppHeader
      :current-step="currentStep"
      @go-to-step="(step: string) => $router.push(`/${step === 'home' ? '' : step}`)"
      @open-modal="openModal"
    />

    <main class="flex-1 overflow-hidden relative">
      <router-view @open-modal="openModal" />
    </main>

    <ModalTemplate
      :visible="showTemplateModal"
      @close="showTemplateModal = false"
    />

    <ModalAccount
      :visible="showAccountModal"
      @close="showAccountModal = false"
    />

    <Toast ref="toastRef" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  width: 100%;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
