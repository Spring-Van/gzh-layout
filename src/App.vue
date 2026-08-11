<script setup lang="ts">
/* eslint-disable vue/no-unused-properties */
import { ref, computed, onMounted, defineAsyncComponent } from "vue";
import { useRoute } from "vue-router";
import AppHeader from "./components/layout/AppHeader.vue";
// 全局弹窗按需异步加载，避免首屏同步挂载 4 个重组件
const ModalTemplate = defineAsyncComponent(() => import("./components/layout/ModalTemplate.vue"));
const ModalCoverTemplate = defineAsyncComponent(() => import("./components/layout/ModalCoverTemplate.vue"));
const ModalStyleTemplate = defineAsyncComponent(() => import("./components/layout/ModalStyleTemplate.vue"));
const ModalAccount = defineAsyncComponent(() => import("./components/layout/ModalAccount.vue"));
import Toast from "./components/common/Toast.vue";
import { useToastProvider } from "./hooks/useToast";
import { useTemplateStore } from "./stores/template";
import { useCoverTemplateStore } from "./stores/coverTemplate";
import { useStyleTemplateStore } from "./stores/styleTemplate";
import { useProjectStore } from "./stores/project";
import { useWechatAccountStore } from "./stores/wechatAccount";

const toastRef = ref<InstanceType<typeof Toast> | null>(null);
/* eslint-enable vue/no-unused-properties */
const setToastInstance = useToastProvider();
const templateStore = useTemplateStore();
const coverTemplateStore = useCoverTemplateStore();
const styleTemplateStore = useStyleTemplateStore();
const projectStore = useProjectStore();
const wechatAccountStore = useWechatAccountStore();

// 提供Toast实例给所有子组件
onMounted(async () => {
  if (toastRef.value) {
    setToastInstance({
      addToast: (...args) => toastRef.value!.addToast(...args),
      removeToast: (...args) => toastRef.value!.removeToast(...args),
    });
  }

  // 加载数据
  await Promise.all([
    templateStore.loadTemplates(),
    coverTemplateStore.loadCoverTemplates(),
    styleTemplateStore.loadCustomTemplates(),
    projectStore.loadProjectList(),
    wechatAccountStore.loadAccounts(),
  ]);
});

const route = useRoute();

const currentStep = computed(() => {
  if (route.path === "/setup") return "setup";
  if (route.path === "/typeset") return "typeset";
  if (route.path === "/sync") return "sync";
  return "home";
});

const isHomePage = computed(() => route.path === '/');
const isExtractPage = computed(() => route.path === '/extract');
const isSettingsPage = computed(() => route.path === '/settings');
const isComicModule = computed(() => route.meta.module === 'comic');
const isImageStudio = computed(() => route.path === '/image-studio');
const isGallery = computed(() => route.path === '/gallery');
const isPromptTemplates = computed(() => route.path === '/prompt-templates');

const showTemplateModal = ref(false);
const showCoverTemplateModal = ref(false);
const showStyleTemplateModal = ref(false);
const showAccountModal = ref(false);

function openModal(type: string) {
  if (type === "template") {
    showTemplateModal.value = true;
  } else if (type === "coverTemplate") {
    showCoverTemplateModal.value = true;
  } else if (type === "styleTemplate") {
    showStyleTemplateModal.value = true;
  } else if (type === "account") {
    showAccountModal.value = true;
  }
}
</script>

<template>
  <div id="app-shell" class="h-screen flex flex-col overflow-hidden">
    <AppHeader
      v-if="!isHomePage && !isExtractPage && !isSettingsPage && !isComicModule && !isImageStudio && !isGallery && !isPromptTemplates"
      :current-step="currentStep"
      @go-to-step="
        (step: string) => $router.push(`/${step === 'home' ? '' : step}`)
      "
      @open-modal="openModal"
    />

    <main class="flex-1 overflow-hidden relative">
      <router-view v-slot="{ Component }" @open-modal="openModal">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <ModalTemplate
      :visible="showTemplateModal"
      @close="showTemplateModal = false"
    />

    <ModalCoverTemplate
      :visible="showCoverTemplateModal"
      @close="showCoverTemplateModal = false"
    />

    <ModalStyleTemplate
      :visible="showStyleTemplateModal"
      @close="showStyleTemplateModal = false"
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
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
}
</style>
