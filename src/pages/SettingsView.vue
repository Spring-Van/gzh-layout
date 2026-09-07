<template>
  <div class="h-full flex flex-col overflow-hidden relative bg-app-bg">
    <div class="absolute top-10 right-1/4 w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none" />
    <div class="absolute bottom-10 left-1/3 w-80 h-80 bg-blue-600/8 rounded-full blur-[100px] pointer-events-none" />

    <main class="flex-1 flex flex-col overflow-hidden relative">
      <div class="shrink-0 px-8 pt-8 max-w-5xl mx-auto w-full">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-text-primary mb-1">系统设置</h1>
          <p class="text-sm text-text-secondary">配置模型、账号、存储与上传参数</p>
        </div>

        <div class="flex items-center gap-1 mb-6 border-b border-border-subtle overflow-x-auto">
          <button
            v-for="tab in categoryTabs"
            :key="tab.key"
            class="px-4 py-2.5 text-sm font-medium transition-colors relative -mb-px shrink-0"
            :class="activeCategory === tab.key ? 'text-accent border-b-2 border-cyan-400' : 'text-text-secondary hover:text-text-primary'"
            @click="activeCategory = tab.key"
          >
            <span class="flex items-center gap-1.5">
              <component :is="tab.icon" class="w-4 h-4" />
              {{ tab.label }}
            </span>
          </button>
        </div>

        <div class="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 class="text-base font-semibold text-text-primary">{{ categoryLabel }}配置</h2>
            <p class="text-xs text-text-secondary mt-0.5">{{ categoryDesc }}</p>
          </div>
          <button
            v-if="activeCategory !== 'paths'"
            class="px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 shadow-lg shadow-cyan-500/20 shrink-0"
            @click="openAddModal"
          >
            <Plus class="w-4 h-4" />
            {{ addButtonText }}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto px-8 pb-8">
        <div class="max-w-5xl mx-auto">
          <WechatAccountSettings
            v-if="activeCategory === 'wechat'"
            ref="wechatSettingsRef"
          />
          <ModelSettings
            v-else-if="isModelCategory(activeCategory)"
            ref="modelSettingsRef"
            :category="activeCategory"
          />
          <PromptTemplateSettings
            v-else-if="activeCategory === 'template'"
            ref="templateSettingsRef"
          />
          <StorageSettingsPanel v-else />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SettingsView' });
import { computed, ref, watch, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  BotMessageSquare,
  FileText,
  FolderOpen,
  Image,
  MessageCircle,
  Plus,
  Video,
} from 'lucide-vue-next';
import type { ModelCategory } from '@comic/types';
import ModelSettings from '@/features/settings/components/ModelSettings.vue';
import PromptTemplateSettings from '@/features/settings/components/PromptTemplateSettings.vue';
import StorageSettingsPanel from '@/features/settings/components/StorageSettingsPanel.vue';
import WechatAccountSettings from '@/features/settings/components/WechatAccountSettings.vue';

type SettingsTab = ModelCategory | 'template' | 'wechat' | 'paths';

interface TabItem {
  key: SettingsTab;
  label: string;
  icon: Component;
}

const activeCategory = ref<SettingsTab>('llm');

// ?tab= 直达与同步(如 #/settings?tab=image 直达图片模型)
const route = useRoute();
const router = useRouter();
const validTabs: string[] = ['llm', 'image', 'video', 'template', 'wechat', 'paths'];

function normalizeTab(v: unknown): SettingsTab | null {
  return typeof v === 'string' && validTabs.includes(v) ? (v as SettingsTab) : null;
}

const initialTab = normalizeTab(route.query.tab);
if (initialTab) activeCategory.value = initialTab;

watch(activeCategory, (v) => {
  if (route.query.tab !== v) {
    router.replace({ query: { tab: v } });
  }
});

watch(
  () => route.query.tab,
  (v) => {
    const t = normalizeTab(v);
    if (t && t !== activeCategory.value) activeCategory.value = t;
  }
);

const modelSettingsRef = ref<InstanceType<typeof ModelSettings> | null>(null);
const templateSettingsRef = ref<InstanceType<typeof PromptTemplateSettings> | null>(null);
const wechatSettingsRef = ref<InstanceType<typeof WechatAccountSettings> | null>(null);

const categoryTabs: TabItem[] = [
  { key: 'llm', label: 'LLM模型', icon: BotMessageSquare },
  { key: 'image', label: '图片模型', icon: Image },
  { key: 'video', label: '视频模型', icon: Video },
  { key: 'template', label: '提示词模板', icon: FileText },
  { key: 'wechat', label: '微信公众号', icon: MessageCircle },
  { key: 'paths', label: '存储与上传', icon: FolderOpen },
];

const categoryLabel = computed(() => ({
  llm: 'LLM',
  image: '图片',
  video: '视频',
  template: '提示词模板',
  wechat: '微信公众号',
  paths: '存储与上传',
})[activeCategory.value]);

const categoryDesc = computed(() => ({
  llm: '配置用于文本生成和对话的LLM模型',
  image: '配置用于图像生成的AI模型',
  video: '配置用于视频生成的AI模型',
  template: '配置用于AI处理的提示词模板',
  wechat: '管理微信公众号账号，用于草稿同步',
  paths: '配置导出路径和 PicGo 图片上传凭据',
})[activeCategory.value]);

const addButtonText = computed(() => {
  if (activeCategory.value === 'template') return '添加模板';
  if (activeCategory.value === 'wechat') return '添加账号';
  return '添加模型';
});

function isModelCategory(category: SettingsTab): category is ModelCategory {
  return category === 'llm' || category === 'image' || category === 'video';
}

function openAddModal() {
  if (activeCategory.value === 'template') templateSettingsRef.value?.openCreate();
  else if (activeCategory.value === 'wechat') wechatSettingsRef.value?.openCreate();
  else if (isModelCategory(activeCategory.value)) modelSettingsRef.value?.openCreate();
}
</script>
