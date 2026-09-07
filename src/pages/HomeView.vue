<!--
  首页 Dashboard
  - 紧凑问候条
  - 继续创作:最近漫画项目 + 最近生图记录
  - 全部工具:紧凑网格(与 TabBar "+" 菜单共用 LAUNCHERS 配置)
-->
<template>
  <section class="w-full h-full overflow-y-auto bg-app-bg relative">
    <div class="max-w-5xl mx-auto px-6 py-8">
      <!-- 问候条 -->
      <div class="flex items-end justify-between mb-8">
        <div>
          <h1 class="text-xl font-bold text-text-primary">{{ greeting }}，创作者</h1>
          <p class="text-sm text-text-secondary mt-1">从下方发起任务，或点页签栏右侧 + 快速打开</p>
        </div>
        <span class="text-xs text-text-muted shrink-0">{{ today }}</span>
      </div>

      <!-- 继续创作 -->
      <div v-if="recentProjects.length || recentImages.length" class="mb-8">
        <h2 class="text-sm font-semibold text-text-primary mb-3">继续创作</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            v-for="p in recentProjects"
            :key="p.id"
            class="text-left bg-surface rounded-xl border border-border-subtle p-4 hover:shadow-md hover:border-teal-300 transition-[border-color,box-shadow]"
            @click="openProject(p)"
          >
            <div class="flex items-center gap-2 mb-1.5">
              <span class="w-2 h-2 rounded-sm bg-teal-500 shrink-0"></span>
              <span class="text-[11px] text-text-muted">{{ p.projectType === 'long' ? '长篇漫画' : '短篇漫画' }}</span>
            </div>
            <div class="text-sm font-medium text-text-primary truncate">{{ p.name }}</div>
            <div class="text-xs text-text-muted mt-1">漫画 · {{ formatTime(p.updatedAt) }}</div>
          </button>

          <button
            v-for="img in recentImages"
            :key="img.id"
            class="text-left bg-surface rounded-xl border border-border-subtle p-4 hover:shadow-md hover:border-purple-300 transition-[border-color,box-shadow]"
            title="打开生图工作台"
            @click="$router.push('/image-studio')"
          >
            <div class="flex items-center gap-2 mb-1.5">
              <span class="w-2 h-2 rounded-sm bg-purple-500 shrink-0"></span>
              <span class="text-[11px] text-text-muted">生图记录</span>
            </div>
            <div class="text-sm font-medium text-text-primary truncate">{{ img.prompt }}</div>
            <div class="text-xs text-text-muted mt-1">{{ img.modelName }} · {{ formatTime(img.createdAt) }}</div>
          </button>
        </div>
      </div>

      <!-- 全部工具 -->
      <div>
        <h2 class="text-sm font-semibold text-text-primary mb-3">全部工具</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            v-for="item in LAUNCHERS"
            :key="item.key"
            class="text-left bg-surface rounded-xl border border-border-subtle p-4 hover:shadow-md hover:border-border-default transition-[border-color,box-shadow]"
            @click="$router.push(item.path)"
          >
            <component :is="iconOf(item.icon)" class="w-5 h-5 text-text-secondary mb-2.5" />
            <div class="text-sm font-medium text-text-primary">{{ item.title }}</div>
            <div class="text-xs text-text-muted mt-0.5">{{ item.desc }}</div>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  Bookmark,
  Download,
  Globe,
  Image as ImageIcon,
  Images,
  Palette,
  Settings as SettingsIcon,
  Zap,
  type LucideIcon,
} from "lucide-vue-next";
import { LAUNCHERS } from "@/config/launchers";
import { useImageStudioStore } from "@/stores/imageStudio";
import { useTabStore } from "@/stores/tab";
import { useProjectStore as useComicProjectStore } from "@/modules/comic/stores/project";
import type { ComicProject } from "@comic/types";

defineOptions({ name: "HomeView" });

const router = useRouter();
const comicStore = useComicProjectStore();
const imageStore = useImageStudioStore();
const tabStore = useTabStore();

const iconMap: Record<string, LucideIcon> = {
  home: Bookmark,
  "image-studio": ImageIcon,
  comic: Zap,
  "wechat-flow": Globe,
  extract: Download,
  gallery: Images,
  "prompt-templates": Bookmark,
  "style-templates": Palette,
  settings: SettingsIcon,
};

function iconOf(icon: string): LucideIcon {
  return iconMap[icon] ?? Bookmark;
}

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return "早上好";
  if (hour >= 8 && hour < 12) return "上午好";
  if (hour >= 12 && hour < 14) return "中午好";
  if (hour >= 14 && hour < 18) return "下午好";
  if (hour >= 18 && hour < 22) return "晚上好";
  return "夜深了";
});

const today = computed(() =>
  new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })
);

/** 最近 3 个漫画项目(按更新时间倒序) */
const recentProjects = computed<ComicProject[]>(() =>
  [...comicStore.projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3)
);

/** 最近 2 条生图记录(按创建时间倒序) */
const recentImages = computed(() =>
  [...imageStore.history].sort((a, b) => b.createdAt - a.createdAt).slice(0, 2)
);

function openProject(p: ComicProject) {
  // 该项目 Tab 已打开时回到当时的页面,否则打开默认入口
  const existing = tabStore.tabs.find(t => t.matchKey === `comic:p:${p.id}`);
  if (existing) {
    router.push(existing.fullPath);
    return;
  }
  if (p.projectType === "long") {
    router.push(`/comic/long-project/${p.id}`);
  } else {
    router.push(`/comic/project-editor/${p.id}`);
  }
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

onMounted(async () => {
  // 加载最近项目与生图历史(失败不阻塞首页)
  try {
    await comicStore.loadProjects();
  } catch {
    /* ignore */
  }
  try {
    await imageStore.loadHistory();
  } catch {
    /* ignore */
  }
});
</script>
