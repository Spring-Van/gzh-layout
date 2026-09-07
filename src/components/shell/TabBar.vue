<!--
  全局 Tab 页签条
  - 首页固定 Tab(第一位,不可关闭)
  - 任务 Tab:点击切换,悬停显示关闭按钮,右键弹出关闭菜单
  - "+"菜单:一层平铺全部工具入口(含系统设置)
  - 右端:主题切换(全局唯一)
-->
<template>
  <div
    class="h-10 bg-surface border-b border-border-subtle flex items-stretch pl-2 pr-3 shrink-0 relative z-30 select-none"
  >
    <!-- Tab 列表 -->
    <button
      v-for="tab in tabStore.tabs"
      :key="tab.id"
      class="group flex items-center gap-2 pl-3 pr-2 my-1.5 mr-1 rounded-lg text-xs font-medium transition-colors border max-w-56"
      :class="
        tab.id === tabStore.activeTabId
          ? 'bg-app-bg border-border-subtle text-text-primary'
          : 'bg-transparent border-transparent text-text-secondary hover:bg-elevated hover:text-text-primary'
      "
      :title="tab.title"
      @click="tabStore.activate(tab.id)"
      @contextmenu.prevent="openContextMenu($event, tab)"
    >
      <component :is="iconOf(tab.icon)" class="w-3.5 h-3.5 shrink-0" :class="tab.id === tabStore.activeTabId ? 'text-accent' : 'text-text-muted'" />
      <span class="truncate">{{ tab.title }}</span>
      <span
        v-if="tab.closable"
        class="flex items-center justify-center w-4 h-4 rounded shrink-0 text-text-muted hover:bg-border-subtle hover:text-text-primary transition-colors"
        title="关闭页签"
        @click.stop="closeTab(tab.id)"
      >
        <X :size="11" />
      </span>
    </button>

    <!-- 新建菜单 -->
    <div class="relative flex items-center" ref="menuRef">
      <button
        class="flex items-center justify-center w-7 h-7 self-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
        :title="`打开新任务(最多 ${MAX_TASK_TABS} 个)`"
        @click="menuOpen = !menuOpen"
      >
        <Plus :size="15" />
      </button>

      <div
        v-if="menuOpen"
        class="absolute left-0 top-9 w-48 bg-surface rounded-xl border border-border-subtle py-1.5 z-50 shadow-lg"
      >
        <div class="px-3 py-1 text-[11px] text-text-muted">打开新任务</div>
        <button
          v-for="item in LAUNCHERS"
          :key="item.key"
          class="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-primary hover:bg-elevated transition-colors text-left"
          @click="openLauncher(item)"
        >
          <component :is="iconOf(item.icon)" class="w-4 h-4 text-text-secondary shrink-0" />
          <span class="flex-1 min-w-0">
            <span class="block truncate">{{ item.title }}</span>
          </span>
        </button>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextTab"
      class="fixed bg-surface rounded-lg border border-border-subtle py-1 z-50 shadow-lg w-36"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
    >
      <button
        class="w-full px-3 py-1.5 text-xs text-text-primary hover:bg-elevated transition-colors text-left"
        @click="closeTab(contextTab.id)"
      >
        关闭页签
      </button>
      <button
        class="w-full px-3 py-1.5 text-xs text-text-primary hover:bg-elevated transition-colors text-left"
        @click="closeOthers(contextTab.id)"
      >
        关闭其他页签
      </button>
      <button
        class="w-full px-3 py-1.5 text-xs text-text-primary hover:bg-elevated transition-colors text-left"
        @click="closeAll()"
      >
        关闭全部页签
      </button>
    </div>

    <!-- 主题切换(全局唯一入口) -->
    <button
      class="ml-auto self-center flex items-center justify-center w-7 h-7 text-text-secondary hover:text-text-primary hover:bg-elevated rounded-lg transition-colors"
      :title="theme === 'dark' ? '切换到浅色' : '切换到深色'"
      @click="toggleTheme"
    >
      <Sun v-if="theme === 'dark'" :size="15" />
      <Moon v-else :size="15" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Bookmark,
  Download,
  Globe,
  Home,
  Image as ImageIcon,
  Images,
  Moon,
  Palette,
  Plus,
  Settings as SettingsIcon,
  Sun,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-vue-next';
import { LAUNCHERS, type LauncherItem } from '@/config/launchers';
import { MAX_TASK_TABS, useTabStore, type TabItem } from '@/stores/tab';
import { useTheme } from '@/theme/useTheme';

defineOptions({ name: 'TabBar' });

const tabStore = useTabStore();
const router = useRouter();
const { theme, toggle: toggleTheme } = useTheme();

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  'image-studio': ImageIcon,
  comic: Zap,
  'wechat-flow': Globe,
  extract: Download,
  gallery: Images,
  'prompt-templates': Bookmark,
  'style-templates': Palette,
  settings: SettingsIcon,
};

function iconOf(icon: string): LucideIcon {
  return iconMap[icon] ?? Home;
}

const menuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const contextTab = ref<TabItem | null>(null);
const contextMenu = ref({ x: 0, y: 0 });

function openLauncher(item: LauncherItem) {
  menuOpen.value = false;
  const existing = tabStore.tabs.find(t => t.matchKey === item.key);
  if (existing) {
    tabStore.activate(existing.id);
  } else {
    router.push(item.path);
  }
}

function closeTab(id: string) {
  contextTab.value = null;
  tabStore.closeTab(id);
}

function closeOthers(id: string) {
  contextTab.value = null;
  tabStore.closeOthers(id);
}

function closeAll() {
  contextTab.value = null;
  tabStore.closeAll();
}

function openContextMenu(event: MouseEvent, tab: TabItem) {
  if (!tab.closable) return;
  contextMenu.value = { x: event.clientX, y: event.clientY + 4 };
  contextTab.value = tab;
}

function handleDocClick(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    menuOpen.value = false;
  }
  if (contextTab.value) {
    contextTab.value = null;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.ctrlKey && event.key === 'Tab') {
    event.preventDefault();
    tabStore.cycle(1);
  } else if (event.ctrlKey && event.shiftKey && (event.key === 'W' || event.key === 'w')) {
    event.preventDefault();
    if (tabStore.activeTab?.closable) {
      tabStore.closeTab(tabStore.activeTab.id);
    }
  } else if (event.ctrlKey && /^[1-8]$/.test(event.key)) {
    event.preventDefault();
    tabStore.activateByIndex(Number(event.key) - 1);
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocClick);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocClick);
  window.removeEventListener('keydown', handleKeydown);
});
</script>
