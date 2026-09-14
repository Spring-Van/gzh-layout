<template>
  <div class="h-full flex flex-col overflow-hidden relative bg-app-bg">
    <div class="absolute top-10 right-1/4 w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none" />
    <div class="absolute bottom-10 left-1/3 w-80 h-80 bg-blue-600/8 rounded-full blur-[100px] pointer-events-none" />

    <main class="flex-1 flex flex-col overflow-hidden relative">
      <header class="shrink-0 px-6 pt-5">
        <h1 class="mb-3 text-lg font-bold text-text-primary">系统设置</h1>
        <SettingsCategoryBar :tabs="categoryTabs" :model-value="activeTab" @select="onTabSelect" />
      </header>

      <div class="min-h-0 flex-1 flex gap-3 px-6 py-4">
        <SettingsResourceList
          v-if="activeTab !== 'paths'"
          class="w-56 shrink-0"
          :group="currentGroup"
          :active-item-id="activeItemId"
          :creating="creating"
          :search="searchKeyword"
          :status-map="llmStatusMap"
          :filter-options="templateFilterOptions"
          :filter-value="templateTypeFilter"
          @update:search="searchKeyword = $event"
          @update:filter-value="templateTypeFilter = $event"
          @select="onSelectFromList"
          @add="startCreate"
          @remove="removeItem"
          @duplicate="duplicateItem"
          @reorder="reorderItems"
        />

        <div class="flex min-w-0 flex-1 flex-col gap-2.5">
          <SettingsItemChips
            v-if="activeTab !== 'paths'"
            :items="currentItems"
            :active-id="activeItemId"
            :creating="creating"
            @select="onChipSelect"
            @add="startCreate"
          />

          <section class="min-h-0 flex-1 overflow-hidden rounded-lg border border-border-subtle bg-surface">
            <StorageSettingsPanel v-if="activeTab === 'paths'" class="h-full overflow-y-auto p-5" />

            <ModelEditorForm
              v-else-if="isModelCategory(activeTab) && (creating || activeModel)"
              :category="activeTab"
              :model="creating ? null : activeModel"
              @save="saveModel"
              @dirty-change="dirty = $event"
              @test-result="onTestResult"
            />

            <TemplateEditorForm
              v-else-if="activeTab === 'template' && (creating || activeTemplate)"
              :template="creating ? null : activeTemplate"
              @save="saveTemplate"
              @dirty-change="dirty = $event"
            />

            <WechatEditorForm
              v-else-if="activeTab === 'wechat' && (creating || activeAccount)"
              :account="creating ? null : activeAccount"
              @saved="onWechatSaved"
              @dirty-change="dirty = $event"
            />

            <div v-else class="flex h-full flex-col items-center justify-center gap-3 text-text-muted">
              <component :is="activeTabMeta.icon" class="h-10 w-10 opacity-30" />
              <p class="text-sm">暂无{{ activeTabMeta.label }}</p>
              <button
                type="button"
                class="rounded-md bg-accent-gradient px-4 py-1.5 text-xs font-medium text-white hover:opacity-90"
                @click="startCreate"
              >
                ＋ 添加
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SettingsView' });
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import { BotMessageSquare, FileText, FolderOpen, Image, MessageCircle, Video } from 'lucide-vue-next';
import { comicDb } from '@/api/comic';
import { useToast } from '@/hooks/useToast';
import type { TestConnectionResult } from '@comic/services/llmService';
import { LONG_STORY_TEMPLATE_TYPES, migrateTemplateContent } from '@comic/services/promptTemplateRegistry';
import type { ModelCategory, ModelConfig, PromptTemplate } from '@comic/types';
import { useWechatAccountStore } from '@/stores/wechatAccount';
import SettingsCategoryBar, { type CategoryTabItem } from '@/features/settings/components/SettingsCategoryBar.vue';
import SettingsItemChips from '@/features/settings/components/SettingsItemChips.vue';
import SettingsResourceList, { type ResourceGroup, type ResourceItem } from '@/features/settings/components/SettingsResourceList.vue';
import ModelEditorForm, { type ModelEditorValue } from '@/features/settings/components/ModelEditorForm.vue';
import TemplateEditorForm, { type TemplateEditorValue } from '@/features/settings/components/TemplateEditorForm.vue';
import WechatEditorForm from '@/features/settings/components/WechatEditorForm.vue';
import StorageSettingsPanel from '@/features/settings/components/StorageSettingsPanel.vue';

type SettingsTab = ModelCategory | 'template' | 'wechat' | 'paths';

const categoryTabs: CategoryTabItem[] = [
  { key: 'llm', label: 'LLM 模型', icon: BotMessageSquare },
  { key: 'image', label: '图片模型', icon: Image },
  { key: 'video', label: '视频模型', icon: Video },
  { key: 'template', label: '提示词模板', icon: FileText },
  { key: 'wechat', label: '微信公众号', icon: MessageCircle },
  { key: 'paths', label: '存储与上传', icon: FolderOpen },
];

const validTabs: string[] = ['llm', 'image', 'video', 'template', 'wechat', 'paths'];

function normalizeTab(value: unknown): SettingsTab | null {
  return typeof value === 'string' && validTabs.includes(value) ? (value as SettingsTab) : null;
}

function isModelCategory(tab: SettingsTab): tab is ModelCategory {
  return tab === 'llm' || tab === 'image' || tab === 'video';
}

const route = useRoute();
const router = useRouter();
const { success: toastSuccess } = useToast();
const wechatStore = useWechatAccountStore();

// ── 状态中枢 ────────────────────────────────────────────────
const activeTab = ref<SettingsTab>(normalizeTab(route.query.tab) ?? 'llm');
const activeItemId = ref<string | null>(typeof route.query.id === 'string' ? route.query.id : null);
const creating = ref(route.query.create === '1');
const dirty = ref(false);
const searchKeyword = ref('');

const models = ref<ModelConfig[]>([]);
const templates = ref<PromptTemplate[]>([]);
const testResults = reactive<Record<string, TestConnectionResult | null>>({});

// ── 数据加载 ────────────────────────────────────────────────
async function loadModels() {
  const all = await comicDb.getAllModelConfigs();
  all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  models.value = all;
}

async function loadTemplates() {
  const all = await comicDb.getAllPromptTemplates();
  all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  // 存量模板一次性迁移：旧英文占位符（如 {{chapter_content}}）归一化为中文变量，无损确定性替换
  for (const template of all) {
    const migrated = migrateTemplateContent(template.content, template.type);
    if (migrated !== null) {
      const next = { ...template, content: migrated, updatedAt: Date.now() };
      await comicDb.savePromptTemplate(next);
      Object.assign(template, next);
    }
  }
  templates.value = all;
}

onMounted(async () => {
  await Promise.all([loadModels(), loadTemplates(), wechatStore.loadAccounts()]);
  if (activeTab.value !== 'paths' && !creating.value) {
    const items = currentItems.value;
    if (!items.some(item => item.id === activeItemId.value)) {
      activeItemId.value = items[0]?.id ?? null;
      syncQuery();
    }
  }
});

// ── 资源分组（左栏 / 条目切换条共用） ──────────────────────
const resourceGroups = computed<ResourceGroup[]>(() => [
  {
    tab: 'llm', label: 'LLM 模型', sortable: true, duplicable: true,
    items: models.value.filter(model => model.category === 'llm').map(model => ({ id: model.id, tab: 'llm', name: model.name })),
  },
  {
    tab: 'image', label: '图片模型', sortable: true, duplicable: true,
    items: models.value.filter(model => model.category === 'image').map(model => ({ id: model.id, tab: 'image', name: model.name })),
  },
  {
    tab: 'video', label: '视频模型', sortable: true, duplicable: true,
    items: models.value.filter(model => model.category === 'video').map(model => ({ id: model.id, tab: 'video', name: model.name })),
  },
  {
    tab: 'template', label: '提示词模板', sortable: true, duplicable: true,
    items: templates.value.map(template => ({ id: template.id, tab: 'template', name: template.name })),
  },
  {
    tab: 'wechat', label: '微信公众号', sortable: false, duplicable: false,
    items: wechatStore.accounts.map(account => ({ id: account.id, tab: 'wechat', name: account.nickname || '未命名账号' })),
  },
]);

const currentGroup = computed<ResourceGroup | null>(() => {
  const group = resourceGroups.value.find(group => group.tab === activeTab.value) ?? null;
  if (!group) return null;
  // 模板分类下按类型筛选（左栏下拉框）
  if (activeTab.value === 'template' && templateTypeFilter.value !== 'all') {
    const allowed = new Set(templates.value.filter(t => t.type === templateTypeFilter.value).map(t => t.id));
    return { ...group, items: group.items.filter(item => allowed.has(item.id)) };
  }
  return group;
});
const currentItems = computed(() => currentGroup.value?.items ?? []);

// 模板类型筛选（仅 template 分类显示）
const templateTypeFilter = ref('all');
const TEMPLATE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'style', label: '风格模板' },
  { value: 'extract', label: '资产提取模板' },
  { value: 'analysis', label: '原文分析模板' },
  { value: 'script', label: '漫画剧本模板' },
  { value: 'story', label: '故事模板' },
  { value: 'storyboard', label: '分镜模板' },
  { value: 'asset-prompt', label: '资产绘画提示词模板' },
  { value: 'panel-prompt', label: '分镜画面描述模板' },
];
const templateFilterOptions = computed(() => {
  if (activeTab.value !== 'template') return undefined;
  const options = [{ value: 'all', label: '全部类型', count: templates.value.length }];
  for (const option of TEMPLATE_TYPE_OPTIONS) {
    options.push({
      value: option.value,
      label: option.label,
      count: templates.value.filter(template => template.type === option.value).length,
    });
  }
  return options;
});

const activeModel = computed(() =>
  isModelCategory(activeTab.value) ? models.value.find(model => model.id === activeItemId.value) ?? null : null);
const activeTemplate = computed(() =>
  activeTab.value === 'template' ? templates.value.find(template => template.id === activeItemId.value) ?? null : null);
const activeAccount = computed(() =>
  activeTab.value === 'wechat' ? wechatStore.accounts.find(account => account.id === activeItemId.value) ?? null : null);

const activeTabMeta = computed(() => categoryTabs.find(tab => tab.key === activeTab.value) ?? categoryTabs[0]);

const llmStatusMap = computed<Record<string, 'ok' | 'error'>>(() => {
  const map: Record<string, 'ok' | 'error'> = {};
  for (const [id, result] of Object.entries(testResults)) {
    if (!result) continue;
    map[id] = result.success ? 'ok' : 'error';
  }
  return map;
});

// ── 选中与路由同步 ─────────────────────────────────────────
function syncQuery() {
  const query: Record<string, string> = { tab: activeTab.value };
  if (activeItemId.value) query.id = activeItemId.value;
  if (creating.value) query.create = '1';
  router.replace({ query });
}

function confirmLeave(): boolean {
  if (!dirty.value) return true;
  return window.confirm('当前有未保存的修改，确定放弃并离开吗？');
}

function applySelection(tab: SettingsTab, id: string | null, isCreating = false) {
  activeTab.value = tab;
  activeItemId.value = id;
  creating.value = isCreating;
  dirty.value = false;
  syncQuery();
}

function firstItemIdOf(tab: SettingsTab): string | null {
  return resourceGroups.value.find(group => group.tab === tab)?.items[0]?.id ?? null;
}

function onTabSelect(key: string) {
  const tab = key as SettingsTab;
  if (tab === activeTab.value) return;
  if (!confirmLeave()) return;
  applySelection(tab, firstItemIdOf(tab));
}

function onChipSelect(id: string) {
  if (id === activeItemId.value && !creating.value) return;
  if (!confirmLeave()) return;
  applySelection(activeTab.value, id);
}

function onSelectFromList(item: ResourceItem) {
  if (item.tab === activeTab.value && item.id === activeItemId.value && !creating.value) return;
  if (!confirmLeave()) return;
  applySelection(item.tab as SettingsTab, item.id);
}

function startCreate() {
  if (activeTab.value === 'paths') return;
  if (!confirmLeave()) return;
  applySelection(activeTab.value, null, true);
}

watch(() => route.query, (query) => {
  const tab = normalizeTab(query.tab);
  if (!tab) return;
  const id = typeof query.id === 'string' ? query.id : null;
  const create = query.create === '1';
  if (tab === activeTab.value && id === activeItemId.value && create === creating.value) return;
  activeTab.value = tab;
  activeItemId.value = id;
  creating.value = create;
  dirty.value = false;
});

// ── 增删改（逻辑自旧组件上移） ─────────────────────────────
async function saveModel(value: ModelEditorValue) {
  const category = activeTab.value as ModelCategory;
  const isImage = category === 'image';
  const existing = creating.value ? null : models.value.find(model => model.id === activeItemId.value) ?? null;
  const modelFields = {
    name: value.name,
    ...(isImage ? { apiSource: value.apiSource } : { apiFormat: value.apiFormat }),
    model: value.model,
    baseUrl: value.baseUrl,
    apiKey: value.apiKey,
    // LLM 专属：绕过系统代理直连（见 ModelConfig.bypassProxy 的说明）
    ...(category === 'llm' ? { bypassProxy: value.bypassProxy } : {}),
    ...(isImage ? {
      aspectRatios: value.aspectRatios,
      resolutions: value.resolutions,
      qualities: value.qualities,
    } : {}),
    openaiExtraParams: value.openaiExtraParams,
  };

  if (existing) {
    await comicDb.saveModelConfig({ ...existing, ...modelFields, updatedAt: Date.now() });
    await loadModels();
  } else {
    const newId = uuidv4();
    const groupItems = models.value.filter(model => model.category === category);
    const maxOrder = groupItems.length ? Math.max(...groupItems.map(model => model.sortOrder ?? 0)) : 0;
    const now = Date.now();
    await comicDb.saveModelConfig({
      id: newId,
      ...modelFields,
      category,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
    await loadModels();
    applySelection(category, newId);
  }
}

async function saveTemplate(value: TemplateEditorValue) {
  const existing = creating.value ? null : templates.value.find(template => template.id === activeItemId.value) ?? null;
  const now = Date.now();

  if (existing) {
    await comicDb.savePromptTemplate({
      id: existing.id,
      name: value.name.trim(),
      type: value.type,
      description: value.description.trim(),
      content: value.content,
      outputProtocol: LONG_STORY_TEMPLATE_TYPES.includes(value.type) && value.outputProtocol.trim() ? value.outputProtocol.trim() : undefined,
      // 解析方式只对资产绘画提示词生效（批量·一次性发送才有回填解析）
      outputParser: value.type === 'asset-prompt' ? value.outputParser : undefined,
      sortOrder: existing.sortOrder,
      createdAt: existing.createdAt,
      updatedAt: now,
    });
    await loadTemplates();
  } else {
    const newId = uuidv4();
    const maxOrder = templates.value.length ? Math.max(...templates.value.map(template => template.sortOrder ?? 0)) : 0;
    await comicDb.savePromptTemplate({
      id: newId,
      name: value.name.trim(),
      type: value.type,
      description: value.description.trim(),
      content: value.content,
      outputProtocol: LONG_STORY_TEMPLATE_TYPES.includes(value.type) && value.outputProtocol.trim() ? value.outputProtocol.trim() : undefined,
      // 解析方式只对资产绘画提示词生效（批量·一次性发送才有回填解析）
      outputParser: value.type === 'asset-prompt' ? value.outputParser : undefined,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
    await loadTemplates();
    applySelection('template', newId);
  }
}

async function onWechatSaved(accountId: string) {
  await wechatStore.loadAccounts();
  applySelection('wechat', accountId);
}

const deleteNouns: Record<string, string> = { llm: '模型', image: '模型', video: '模型', template: '提示词模板', wechat: '账号' };

async function removeItem(item: ResourceItem) {
  if (item.id === activeItemId.value && !creating.value && !confirmLeave()) return;
  if (!window.confirm(`确定要删除这个${deleteNouns[item.tab] ?? '条目'}吗？`)) return;

  if (item.tab === 'wechat') {
    await wechatStore.deleteAccount(item.id);
    toastSuccess('账号已删除');
  } else if (item.tab === 'template') {
    await comicDb.deletePromptTemplate(item.id);
    await loadTemplates();
  } else {
    await comicDb.deleteModelConfig(item.id);
    await loadModels();
  }

  if (activeItemId.value === item.id && activeTab.value === item.tab) {
    applySelection(item.tab as SettingsTab, currentItems.value[0]?.id ?? null);
  }
}

async function duplicateItem(item: ResourceItem) {
  const now = Date.now();

  if (isModelCategory(item.tab as SettingsTab)) {
    const source = models.value.find(model => model.id === item.id);
    if (!source) return;
    const groupItems = models.value.filter(model => model.category === source.category);
    const maxOrder = groupItems.length ? Math.max(...groupItems.map(model => model.sortOrder ?? 0)) : 0;
    const newId = uuidv4();
    await comicDb.saveModelConfig({ ...source, id: newId, name: `${source.name} (副本)`, sortOrder: maxOrder + 1, createdAt: now, updatedAt: now });
    await loadModels();
    applySelection(item.tab as SettingsTab, newId);
  } else if (item.tab === 'template') {
    const source = templates.value.find(template => template.id === item.id);
    if (!source) return;
    const maxOrder = templates.value.length ? Math.max(...templates.value.map(template => template.sortOrder ?? 0)) : 0;
    const newId = uuidv4();
    await comicDb.savePromptTemplate({ ...source, id: newId, name: `${source.name} (副本)`, sortOrder: maxOrder + 1, createdAt: now, updatedAt: now });
    await loadTemplates();
    applySelection('template', newId);
  }
}

async function reorderItems({ sourceId, targetId }: { sourceId: string; targetId: string }) {
  if (!confirmLeave()) return;
  const tab = activeTab.value;
  const now = Date.now();

  if (isModelCategory(tab as SettingsTab)) {
    const source = models.value.find(model => model.id === sourceId);
    const target = models.value.find(model => model.id === targetId);
    if (!source || !target || source.category !== target.category) return;
    await comicDb.saveModelConfig({ ...source, sortOrder: target.sortOrder ?? 0, updatedAt: now });
    await comicDb.saveModelConfig({ ...target, sortOrder: source.sortOrder ?? 0, updatedAt: now });
    await loadModels();
  } else if (tab === 'template') {
    const source = templates.value.find(template => template.id === sourceId);
    const target = templates.value.find(template => template.id === targetId);
    if (!source || !target) return;
    await Promise.all([
      comicDb.savePromptTemplate({ ...source, sortOrder: target.sortOrder ?? 0, updatedAt: now }),
      comicDb.savePromptTemplate({ ...target, sortOrder: source.sortOrder ?? 0, updatedAt: now }),
    ]);
    await loadTemplates();
  }
}

function onTestResult(result: TestConnectionResult | null) {
  if (!activeItemId.value || creating.value) return;
  testResults[activeItemId.value] = result;
}
</script>
