<script setup lang="ts">
/* eslint-disable vue/no-unused-properties */
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import AppHeader from "./components/layout/AppHeader.vue";
import ModalTemplate from "./components/layout/ModalTemplate.vue";
import ModalCoverTemplate from "./components/layout/ModalCoverTemplate.vue";
import ModalAccount from "./components/layout/ModalAccount.vue";
import Toast from "./components/common/Toast.vue";
import { useToastProvider } from "./hooks/useToast";
import { useTemplateStore } from "./stores/template";
import { useCoverTemplateStore } from "./stores/coverTemplate";
import { useProjectStore } from "./stores/project";
import { useWechatAccountStore } from "./stores/wechatAccount";

const toastRef = ref<InstanceType<typeof Toast> | null>(null);
/* eslint-enable vue/no-unused-properties */
const setToastInstance = useToastProvider();
const templateStore = useTemplateStore();
const coverTemplateStore = useCoverTemplateStore();
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

const isHomePage = computed(() => route.path === "/");

const showTemplateModal = ref(false);
const showCoverTemplateModal = ref(false);
const showAccountModal = ref(false);

function openModal(type: string) {
  if (type === "template") {
    showTemplateModal.value = true;
  } else if (type === "coverTemplate") {
    showCoverTemplateModal.value = true;
  } else if (type === "account") {
    showAccountModal.value = true;
  }
}
</script>

<template>
  <div id="app" class="h-screen flex flex-col overflow-hidden">
    <AppHeader
      v-if="!isHomePage"
      :current-step="currentStep"
      @go-to-step="
        (step: string) => $router.push(`/${step === 'home' ? '' : step}`)
      "
      @open-modal="openModal"
    />

    <main class="flex-1 overflow-hidden relative">
      <router-view @open-modal="openModal" />
    </main>

    <!-- 底部返回首页导航 -->
    <footer
      v-if="!isHomePage"
      class="h-12 bg-white border-t border-slate-200 flex items-center justify-center flex-shrink-0"
    >
      <button
        class="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition"
        @click="$router.push('/')"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        返回工具箱首页
      </button>
    </footer>

    <ModalTemplate
      :visible="showTemplateModal"
      @close="showTemplateModal = false"
    />

    <ModalCoverTemplate
      :visible="showCoverTemplateModal"
      @close="showCoverTemplateModal = false"
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
