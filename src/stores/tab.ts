import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { tabCacheName } from '@/utils/tabComponent';

/**
 * Tab 页签状态管理
 * - 首页为固定 Tab(第一位,不可关闭)
 * - 其余为任务 Tab,按 matchKey 归并(Tab 内导航复用同一 Tab):
 *   - 普通工具页:matchKey = meta.tab.key(单例)
 *   - 漫画项目页(meta.tab.dk = 'comic-project'):matchKey = comic:p:{projectId},按项目多开
 * - cachedViews 由各 Tab 的包装组件名推导,驱动 keep-alive include:
 *   关闭 Tab → 名字移出 include → 该 Tab 的组件实例被精确驱逐(内存即释放)
 * - label 存放动态标题前缀(漫画项目名),随 localStorage 持久化,
 *   重启恢复时无需等异步加载即可显示"项目名 · 子页面名"
 */

export interface TabMetaConfig {
  key: string;
  title: string;
  icon: string;
  /** keep-alive 归并用的父布局组件名(嵌套路由填父布局) */
  component: string;
  /** 动态归并键标记:'comic-project' 表示按 route.params.projectId 归并 */
  dk?: string;
}

export interface TabItem {
  id: string;
  /** 归并键:同 matchKey 的路由在同一个 Tab 内导航 */
  matchKey: string;
  fullPath: string;
  /** 展示标题 = label ? `${label} · ${baseTitle}` : baseTitle */
  title: string;
  /** 标题基础部分(子页面名,来自 meta.tab.title) */
  baseTitle: string;
  /** 动态标题前缀(如漫画项目名) */
  label: string;
  icon: string;
  closable: boolean;
}

export const MAX_TASK_TABS = 8;
const STORAGE_KEY = 'gzh-layout-open-tabs';

export function composeTitle(label: string, baseTitle: string): string {
  return label ? `${label} · ${baseTitle}` : baseTitle;
}

/** 路由 → Tab 归并键(需在 setup 阶段同步捕获,避免异步加载后路由已变) */
export function resolveMatchKey(
  route: Pick<RouteLocationNormalizedLoaded, 'meta' | 'params'>
): string {
  const meta = route.meta?.tab as TabMetaConfig | undefined;
  if (!meta || !meta.key) return '';
  if (meta.dk === 'comic-project') {
    const projectId = (route.params as Record<string, string>).projectId;
    if (projectId) return `comic:p:${projectId}`;
  }
  return meta.key;
}

function createHomeTab(): TabItem {
  return {
    id: 'home',
    matchKey: 'home',
    fullPath: '/',
    title: '首页',
    baseTitle: '首页',
    label: '',
    icon: 'home',
    closable: false,
  };
}

/** 兼容旧版持久化数据:visited 字段废弃;旧 comic 单例 Tab 携带项目路径时拆出项目 matchKey */
function normalizeTab(raw: unknown): TabItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.matchKey !== 'string' || typeof r.fullPath !== 'string') return null;
  let matchKey = r.matchKey;
  if (matchKey === 'comic') {
    const m = r.fullPath.match(/^\/comic\/(?!projects\b)[^/]+\/([^/?#]+)/);
    if (m) matchKey = `comic:p:${m[1]}`;
  }
  const baseTitle =
    typeof r.baseTitle === 'string' && r.baseTitle
      ? r.baseTitle
      : typeof r.title === 'string' && r.title
        ? r.title
        : matchKey;
  const label = typeof r.label === 'string' ? r.label : '';
  return {
    id: typeof r.id === 'string' ? r.id : `${matchKey}-${Date.now()}`,
    matchKey,
    fullPath: r.fullPath,
    title: composeTitle(label, baseTitle),
    baseTitle,
    label,
    icon: typeof r.icon === 'string' ? r.icon : 'app',
    closable: r.closable !== false,
  };
}

function loadPersisted(): { tabs: TabItem[]; activeTabId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { tabs?: unknown[]; activeTabId?: unknown };
    if (!Array.isArray(data.tabs) || data.tabs.length === 0) return null;
    const rest = data.tabs
      .map(normalizeTab)
      .filter((t): t is TabItem => t !== null && t.matchKey !== 'home');
    // 迁移/异常可能产生重复 matchKey,保留最后一个(与最近访问一致)
    const seen = new Set<string>();
    const deduped = rest.reverse().filter(t => {
      if (seen.has(t.matchKey)) return false;
      seen.add(t.matchKey);
      return true;
    });
    return {
      tabs: [createHomeTab(), ...deduped.reverse()],
      activeTabId:
        typeof data.activeTabId === 'string' ? data.activeTabId : 'home',
    };
  } catch {
    return null;
  }
}

export const useTabStore = defineStore('tab', () => {
  const persisted = loadPersisted();
  const tabs = ref<TabItem[]>(persisted ? persisted.tabs : [createHomeTab()]);
  const activeTabId = ref<string>(persisted?.activeTabId ?? 'home');
  let seq = 1;

  const activeTab = computed(
    () => tabs.value.find(t => t.id === activeTabId.value) ?? tabs.value[0]
  );

  /** 当前打开 Tab 的包装组件名集合,供 keep-alive :include 使用 */
  const cachedViews = computed(() => tabs.value.map(t => tabCacheName(t.matchKey)));

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabs: tabs.value, activeTabId: activeTabId.value })
      );
    } catch {
      /* 存储异常时静默降级为不持久化 */
    }
  }

  watch([tabs, activeTabId], persist, { deep: true });

  /**
   * 路由变化时同步 Tab:命中已有 Tab 则激活并更新路径/标题,否则新建。
   * @returns 是否成功归并(超过上限时返回 false,由调用方回退路由)
   */
  function syncWithRoute(route: RouteLocationNormalizedLoaded): boolean {
    const meta = route.meta?.tab as TabMetaConfig | undefined;
    if (!meta || !meta.key) return true; // 未知路由不干预 Tab 状态
    const matchKey = resolveMatchKey(route);
    const existing = tabs.value.find(t => t.matchKey === matchKey);
    if (existing) {
      existing.fullPath = route.fullPath;
      existing.baseTitle = meta.title;
      existing.title = composeTitle(existing.label, meta.title);
      activeTabId.value = existing.id;
      persist();
      return true;
    }
    const taskCount = tabs.value.filter(t => t.closable).length;
    if (taskCount >= MAX_TASK_TABS) return false;
    const tab: TabItem = {
      id: `${matchKey}-${seq++}`,
      matchKey,
      fullPath: route.fullPath,
      title: meta.title,
      baseTitle: meta.title,
      label: '',
      icon: meta.icon,
      closable: true,
    };
    tabs.value.push(tab);
    activeTabId.value = tab.id;
    persist();
    return true;
  }

  /** 设置 Tab 的动态标题前缀(如漫画项目名),按 matchKey 定位 Tab */
  function setLabel(matchKey: string, label: string) {
    if (!matchKey || !label) return;
    const tab = tabs.value.find(t => t.matchKey === matchKey);
    if (!tab || tab.label === label) return;
    tab.label = label;
    tab.title = composeTitle(label, tab.baseTitle);
    persist();
  }

  function activate(id: string) {
    if (!tabs.value.some(t => t.id === id)) return;
    activeTabId.value = id;
    persist();
  }

  function closeTab(id: string) {
    const index = tabs.value.findIndex(t => t.id === id);
    if (index === -1) return;
    if (!tabs.value[index].closable) return;
    tabs.value.splice(index, 1);
    if (activeTabId.value === id) {
      const next = tabs.value[index] ?? tabs.value[index - 1];
      activeTabId.value = next?.id ?? 'home';
    }
    persist();
  }

  function closeOthers(id: string) {
    tabs.value = tabs.value.filter(t => !t.closable || t.id === id);
    if (!tabs.value.some(t => t.id === activeTabId.value)) {
      activeTabId.value = id;
    }
    persist();
  }

  function closeAll() {
    tabs.value = tabs.value.filter(t => !t.closable);
    if (!tabs.value.some(t => t.id === activeTabId.value)) {
      activeTabId.value = 'home';
    }
    persist();
  }

  function cycle(step: number) {
    const index = tabs.value.findIndex(t => t.id === activeTabId.value);
    const next = tabs.value[(index + step + tabs.value.length) % tabs.value.length];
    if (next) activeTabId.value = next.id;
  }

  function activateByIndex(index: number) {
    const tab = tabs.value[index];
    if (tab) activeTabId.value = tab.id;
  }

  /** 启动恢复:返回应恢复的路径;首页或无持久化时返回 null */
  function initialFullPath(): string | null {
    const active = activeTab.value;
    return active && active.fullPath && active.fullPath !== '/'
      ? active.fullPath
      : null;
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    cachedViews,
    syncWithRoute,
    setLabel,
    activate,
    closeTab,
    closeOthers,
    closeAll,
    cycle,
    activateByIndex,
    initialFullPath,
  };
});
