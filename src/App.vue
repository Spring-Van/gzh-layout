<script setup lang="ts">
/* eslint-disable vue/no-unused-properties */
import { ref, computed, watch, onMounted, defineAsyncComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppShell from "./components/shell/AppShell.vue";
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
import { useTabStore, resolveMatchKey } from "./stores/tab";
import { getTabComponent } from "./utils/tabComponent";

const toastRef = ref<InstanceType<typeof Toast> | null>(null);
/* eslint-enable vue/no-unused-properties */
const setToastInstance = useToastProvider();
const templateStore = useTemplateStore();
const coverTemplateStore = useCoverTemplateStore();
const styleTemplateStore = useStyleTemplateStore();
const projectStore = useProjectStore();
const wechatAccountStore = useWechatAccountStore();
const tabStore = useTabStore();

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

  // 恢复上次打开的 Tab(失效路由兜底回首页)
  const initial = tabStore.initialFullPath();
  if (initial) {
    try {
      await router.replace(initial);
    } catch {
      tabStore.closeTab(tabStore.activeTabId);
      router.replace("/");
    }
  }
});

const route = useRoute();
const router = useRouter();

// 当前路由的 Tab 归并键;空表示未知路由(不缓存,直接渲染原始组件)
const currentMatchKey = computed(() => resolveMatchKey(route));

const currentStep = computed(() => {
  if (route.path === "/setup") return "setup";
  if (route.path === "/typeset") return "typeset";
  if (route.path === "/sync") return "sync";
  return "home";
});

// 仅公众号向导三步显示步骤条(作为 TabBar 下方的二级工具条)
const showWizardHeader = computed(() => route.meta.wizard === true);

// 路由变化同步 Tab 状态;超过 Tab 上限时回退到当前激活 Tab
watch(
  () => route.fullPath,
  () => {
    const ok = tabStore.syncWithRoute(route);
    if (!ok) router.replace(tabStore.activeTab.fullPath);
  }
);

// 激活 Tab 变化时跟随导航(快捷键/关闭页签/菜单点击统一走这里)
watch(
  () => tabStore.activeTabId,
  (id) => {
    const tab = tabStore.tabs.find(t => t.id === id);
    if (tab && route.fullPath !== tab.fullPath) {
      router.push(tab.fullPath).catch(() => {});
    }
  }
);

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
    <AppShell>
      <template #sub-header>
        <AppHeader
          v-if="showWizardHeader"
          :current-step="currentStep"
          @go-to-step="
            (step: string) => $router.push(`/${step === 'home' ? '' : step}`)
          "
          @open-modal="openModal"
        />
      </template>

      <router-view v-slot="{ Component }">
        <keep-alive :include="tabStore.cachedViews">
          <component
            :is="currentMatchKey ? getTabComponent(Component, currentMatchKey) : Component"
          />
        </keep-alive>
      </router-view>
    </AppShell>

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
