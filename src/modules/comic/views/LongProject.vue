<template>
  <div class="flex h-full overflow-hidden bg-app-bg text-text-primary" @click="contextMenu = null">
    <aside class="flex shrink-0 flex-col border-r border-border-subtle bg-surface transition-[width] duration-200" :class="sidebarCollapsed ? 'w-14' : 'w-72'">
      <template v-if="!sidebarCollapsed">
        <div class="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
          <button class="icon-button" title="返回项目列表" @click="router.push('/comic/projects')"><ArrowLeft :size="18" /></button>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-text-primary">{{ project?.name || "长篇项目" }}</p>
            <p class="text-[11px] text-text-muted">{{ chapterCount }} 个章节</p>
          </div>
          <button class="icon-button" title="收起章节栏" @click="setSidebarCollapsed(true)"><PanelLeftClose :size="18" /></button>
        </div>

        <div class="custom-scrollbar flex-1 overflow-y-auto p-2">
          <LongProjectTree
            :project-name="project?.name || '长篇项目'"
            :nodes="nodes"
            :selected-id="selectedChapterId"
            :expanded-ids="expandedFolders"
            @select="selectChapter"
            @toggle="toggleFolder"
            @contextmenu="openContextMenu($event.event, $event.node)"
            @update:nodes="persistNodes"
          />
          <LongProjectAssetLibraryTree :selected-category="selectedAssetCategory" class="mt-3" @select="selectAssetCategory" />
        </div>
      </template>

      <template v-else>
        <div class="flex h-full flex-col items-center gap-2 py-3">
          <button class="sidebar-icon" title="展开章节栏" @click="setSidebarCollapsed(false)"><PanelLeftOpen :size="19" /></button>
          <div class="my-1 h-px w-7 bg-border-subtle" />
          <button v-for="chapter in chapters.slice(0, 8)" :key="chapter.id" class="sidebar-icon" :class="selectedChapterId === chapter.id ? 'bg-cyan-500/15 text-cyan-400' : ''" :title="chapter.name" @click="selectChapter(chapter)"><FileText :size="17" /></button>
          <button class="sidebar-icon" :class="selectedAssetCategory ? 'bg-violet-500/15 text-violet-300' : ''" title="资产库" @click="selectAssetCategory('character')"><Boxes :size="18" /></button>
          <div class="flex-1" />
          <button class="sidebar-icon" title="返回项目列表" @click="router.push('/comic/projects')"><ArrowLeft :size="18" /></button>
        </div>
      </template>
    </aside>

    <main class="min-w-0 flex-1 overflow-hidden">
      <div v-if="loading" class="flex h-full items-center justify-center text-sm text-text-secondary">正在加载项目...</div>

      <section v-else-if="selectedAssetCategory" class="custom-scrollbar h-full overflow-y-auto">
        <LongProjectAssetLibrary :category="selectedAssetCategory" :assets="assetsForSelectedCategory" />
      </section>

      <section v-else-if="!selectedChapter" class="custom-scrollbar h-full overflow-y-auto">
        <div class="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-8 py-12">
          <div class="mb-10 text-center">
            <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border-subtle bg-surface text-cyan-400 shadow-card"><Workflow :size="24" /></div>
            <h1 class="text-xl font-semibold text-text-primary">小说转漫画创作流程</h1>
            <p class="mt-2 text-sm text-text-secondary">原文 → 分析 → 剧本 → 分镜 → 资产 → 生图</p>
          </div>

          <div class="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] items-center">
            <template v-for="(step, index) in workflowSteps" :key="step.title">
              <div class="flex min-w-0 flex-col items-center text-center">
                <div class="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle bg-surface text-text-secondary"><component :is="step.icon" :size="20" /></div>
                <p class="text-sm font-medium text-text-primary">{{ step.title }}</p>
                <p class="mt-1 text-xs text-text-muted">{{ step.description }}</p>
              </div>
              <ArrowRight v-if="index < workflowSteps.length - 1" :size="17" class="mx-3 text-cyan-500/60" />
            </template>
          </div>

          <div class="mt-12 flex flex-col items-center">
            <template v-if="chapterCount === 0">
              <p class="mb-4 text-sm text-text-secondary">项目中还没有章节，先添加小说内容</p>
              <button class="primary-button" @click="openCreateDialog('chapter', null)"><FilePlus2 :size="17" />创建第一个章节</button>
            </template>
            <template v-else>
              <div class="mb-4 flex items-center gap-5 text-sm text-text-secondary"><span>共 {{ chapterCount }} 章</span><span>{{ readyChapterCount }} 章已添加正文</span></div>
              <button class="primary-button" @click="selectChapter(chapters[0])">继续创作<ArrowRight :size="17" /></button>
            </template>
          </div>
        </div>
      </section>

      <section v-else class="flex h-full flex-col">
        <!-- 顶栏：左侧三个按钮页签（原文/剧本/分镜）；右侧为当前 tab 的操作按钮区：
             原文/剧本的执行栏直接渲染（状态在父级），分镜的操作按钮由分镜 tab Teleport 注入 #storyboard-actions -->
        <div class="shrink-0 border-b border-border-subtle bg-surface px-6">
          <div class="flex h-12 items-center justify-between gap-4">
            <nav class="flex shrink-0 gap-1" aria-label="章节创作阶段">
              <button v-for="tab in chapterTabs" :key="tab.key" class="flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs transition-colors" :class="activeTab === tab.key ? 'bg-cyan-500/15 text-cyan-400' : 'text-text-muted hover:bg-app-bg hover:text-text-secondary'" @click="setActiveTab(tab.key)">
                <component :is="tab.icon" :size="13" />{{ tab.label }}
              </button>
            </nav>
            <div v-show="activeTab === 'source'" class="flex min-w-0 items-center gap-2">
              <div class="min-w-0 max-w-2xl">
                <PromptRunBar
                  v-model:model-id="selectedModelByKind.analysis"
                  v-model:template-id="selectedTemplateByKind.analysis"
                  :models="llmModels"
                  :templates="analysisTemplates"
                  :action-label="analysisDoc ? '重新分析' : '分析原文'"
                  :disabled="!draftContent.trim() || !selectedModelByKind.analysis || !selectedTemplateByKind.analysis"
                  :busy="analysisDoc?.status === 'running'"
                  confirm-storage-key="comic-long-analysis-confirm"
                  :build-prompt="buildAnalysisRunPrompt"
                  @run="runAnalysis"
                />
              </div>
            </div>
            <div v-show="activeTab === 'script'" class="flex min-w-0 items-center gap-2">
              <div class="min-w-0 max-w-2xl">
                <PromptRunBar
                  v-model:model-id="selectedModelByKind.script"
                  v-model:template-id="selectedTemplateByKind.script"
                  :models="llmModels"
                  :templates="scriptTemplates"
                  :action-label="scriptDoc ? '重新生成' : '生成剧本'"
                  :disabled="!draftContent.trim() || !selectedModelByKind.script || !selectedTemplateByKind.script"
                  :busy="scriptDoc?.status === 'running'"
                  confirm-storage-key="comic-long-script-confirm"
                  :build-prompt="buildScriptRunPrompt"
                  @run="runScript"
                />
              </div>
            </div>
            <div v-show="activeTab === 'storyboard'" id="storyboard-actions" class="flex min-w-0 items-center gap-2" />
          </div>
        </div>

        <LongProjectSourceTab
          v-show="activeTab === 'source'"
          v-model:draft="draftContent"
          :save-status="saveStatus"
          :analysis-doc="analysisDoc"
          :source-changed="analysisSourceChanged"
          @save-analysis="saveAnalysis"
        />

        <LongProjectScriptTab
          v-show="activeTab === 'script'"
          :source-content="draftContent"
          :analysis-content="analysisDoc?.content ?? ''"
          :script-doc="scriptDoc"
          :source-changed="scriptSourceChanged"
          @save-script="saveScript"
        />

        <!-- 分镜 tab：首次进入时挂载，之后常驻（批量推导/生图切页签不中断） -->
        <LongProjectStoryboardTab
          v-if="storyboardOpened"
          v-show="activeTab === 'storyboard'"
          :project-id="projectId"
          :chapter-id="selectedChapterId ?? ''"
          :project="project"
          :models="models"
          :templates="promptTemplates"
          :mutate-long-project-data="mutateLongProjectData"
          @image-config-saved="loadProject"
        />
      </section>
    </main>

    <div v-if="contextMenu" class="fixed z-40 min-w-40 rounded-lg border border-border-subtle bg-surface p-1 shadow-xl" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }" @click.stop>
      <template v-if="!contextMenu.node || contextMenu.node.type === 'folder'">
        <button type="button" class="context-action" @click.stop="openFromContext('chapter')"><FilePlus2 :size="15" />新建章节</button>
        <button v-if="!contextMenu.node" type="button" class="context-action" @click.stop="openFromContext('folder')"><FolderPlus :size="15" />新建文件夹</button>
      </template>
      <div v-if="contextMenu.node" class="my-1 h-px bg-border-subtle" />
      <button v-if="contextMenu.node" type="button" class="context-action" @click.stop="openRenameDialog(contextMenu.node)"><Pencil :size="15" />重命名</button>
      <button v-if="contextMenu.node" type="button" class="context-action text-red-400 hover:text-red-300" @click.stop="requestDelete(contextMenu.node)"><Trash2 :size="15" />删除</button>
    </div>

    <LongProjectNodeDialog v-model="nodeDialogVisible" :node-type="nodeDialogType" :rename-mode="Boolean(editingNode)" :initial-name="editingNode?.name" :parent-name="nodeDialogParentName" @submit="handleNodeDialogSubmit" />
    <ConfirmDialog v-model="deleteDialogVisible" title="删除内容" :content="deleteDialogContent" confirm-text="确认删除" @confirm="confirmDelete" />
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇项目主页面：侧栏章节树 + 资产库树；正文区「原文｜剧本｜分镜」三个页签。
 * 原文页签 = 原文编辑 + AI 原文分析；剧本页签 = 原文只读 + AI 漫画剧本；
 * 原文/剧本的执行栏（模型/模板/发送前确认/执行）直接渲染在页签行右侧；
 * 分镜页签 = 分镜生图工作台（含资产），由 LongProjectStoryboardTab 承载，
 * 其顶部操作按钮经 Teleport 注入页签行右侧 #storyboard-actions 容器。
 */
import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import { ArrowLeft, ArrowRight, Boxes, Clapperboard, FileImage, FilePlus2, FileText, FolderPlus, ListTree, PanelLeftClose, PanelLeftOpen, Pencil, ScanText, ScrollText, Trash2, Workflow } from "lucide-vue-next";
import { comicDb } from "@/api/comic";
import { useTabStore, resolveMatchKey } from "@/stores/tab";
import ConfirmDialog from "@comic/components/ConfirmDialog.vue";
import PromptRunBar from "@comic/components/common/PromptRunBar.vue";
import LongProjectNodeDialog from "@comic/components/LongProjectNodeDialog.vue";
import LongProjectTree from "@comic/components/LongProjectTree.vue";
import LongProjectAssetLibraryTree, { type AssetLibraryCategory } from "@comic/components/LongProjectAssetLibraryTree.vue";
import LongProjectAssetLibrary from "@comic/components/LongProjectAssetLibrary.vue";
import LongProjectSourceTab from "@comic/components/LongProjectSourceTab.vue";
import LongProjectScriptTab from "@comic/components/LongProjectScriptTab.vue";
import LongProjectStoryboardTab from "@comic/components/LongProjectStoryboardTab.vue";
import { useToast } from "@comic/composables/useToast";
import { useLongProjectPersistence } from "@comic/composables/useLongProjectPersistence";
import { useChapterDocRun } from "@comic/composables/useChapterDocRun";
import { buildAnalysisPrompt, buildScriptPrompt } from "@comic/services/chapterDocService";
import type { LongProjectNode, LongProjectNodeType, ModelConfig, PromptTemplate } from "@comic/types";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const projectId = String(route.params.projectId);
const tabStore = useTabStore();
const tabKey = resolveMatchKey(route);
const { project, loading, loadProject, mutateLongProjectData } = useLongProjectPersistence(projectId);
watch(
  () => project.value?.name,
  (name) => {
    if (name) tabStore.setLabel(tabKey, name);
  },
  { immediate: true }
);
const { selectedModelByKind, selectedTemplateByKind, initDefaults, getDoc, saveDocContent, runDoc, recoverInterrupted } = useChapterDocRun({ project, mutateLongProjectData });

const saving = ref(false);
let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
const sidebarCollapsed = ref(localStorage.getItem("comic-long-sidebar-collapsed") === "true");
const expandedFolders = ref(new Set<string>());
const selectedChapterId = ref<string | null>(null);
const selectedAssetCategory = ref<AssetLibraryCategory | null>(null);
const draftContent = ref("");
const activeTab = ref<"source" | "script" | "storyboard">("source");
/** 分镜 tab 首次进入时才挂载（挂载后常驻，批量任务切页签不中断）。 */
const storyboardOpened = ref(false);
const models = ref<ModelConfig[]>([]);
const promptTemplates = ref<PromptTemplate[]>([]);
const nodeDialogVisible = ref(false);
const nodeDialogType = ref<LongProjectNodeType>("chapter");
const nodeDialogParentId = ref<string | null>(null);
const editingNode = ref<LongProjectNode | null>(null);
const deleteDialogVisible = ref(false);
const deletingNode = ref<LongProjectNode | null>(null);
const contextMenu = ref<{ x: number; y: number; node: LongProjectNode | null } | null>(null);

const nodes = computed(() => project.value?.longProjectData?.nodes ?? []);
const projectAssets = computed(() => project.value?.longProjectData?.assets ?? []);
const assetsForSelectedCategory = computed(() => selectedAssetCategory.value ? projectAssets.value.filter((asset) => asset.type === selectedAssetCategory.value && asset.scope !== "chapter") : []);
const chapters = computed(() => nodes.value.filter((node) => node.type === "chapter").sort(sortNodes));
const chapterCount = computed(() => chapters.value.length);
const readyChapterCount = computed(() => chapters.value.filter((node) => Boolean(node.content?.trim())).length);
const selectedChapter = computed(() => chapters.value.find((node) => node.id === selectedChapterId.value) ?? null);
const isDirty = computed(() => draftContent.value !== (selectedChapter.value?.content ?? ""));
const saveStatus = computed(() => saving.value ? "正在自动保存" : isDirty.value ? "正在编辑" : "已自动保存");
const llmModels = computed(() => models.value.filter((model) => model.category === "llm"));
const analysisTemplates = computed(() => promptTemplates.value.filter((template) => template.type === "analysis").sort((a, b) => a.sortOrder - b.sortOrder));
const scriptTemplates = computed(() => promptTemplates.value.filter((template) => template.type === "script").sort((a, b) => a.sortOrder - b.sortOrder));
const analysisDoc = computed(() => selectedChapter.value ? getDoc("analysis", selectedChapter.value.id) : undefined);
const scriptDoc = computed(() => selectedChapter.value ? getDoc("script", selectedChapter.value.id) : undefined);
/** 分析生成后原文已变更（与当前草稿比对，用于"原文已变更"徽标）。 */
const analysisSourceChanged = computed(() => Boolean(analysisDoc.value && analysisDoc.value.status === "completed" && analysisDoc.value.sourceContent !== draftContent.value));
const scriptSourceChanged = computed(() => Boolean(scriptDoc.value && scriptDoc.value.status === "completed" && scriptDoc.value.sourceContent !== draftContent.value));
const nodeDialogParentName = computed(() => nodeDialogParentId.value ? nodes.value.find((node) => node.id === nodeDialogParentId.value)?.name ?? "" : project.value?.name ?? "");
const deleteDialogContent = computed(() => {
  if (!deletingNode.value) return "删除后无法恢复，是否确认删除？";
  if (deletingNode.value.type === "folder") return `确定删除文件夹「${deletingNode.value.name}」吗？其中的 ${descendantsOf(deletingNode.value.id).filter((node) => node.type === "chapter").length} 个章节也会一并删除。`;
  return `确定删除章节「${deletingNode.value.name}」吗？章节正文和后续创作数据将一并删除。`;
});

const workflowSteps = [
  { title: "添加章节", description: "录入小说原文", icon: FileText },
  { title: "原文分析", description: "人物场景与时间线", icon: ScanText },
  { title: "漫画剧本", description: "按场景改编剧情", icon: ScrollText },
  { title: "分镜", description: "拆解每格画面", icon: ListTree },
  { title: "资产与生图", description: "固定视觉并绘制", icon: FileImage },
];
const chapterTabs = [
  { key: "source" as const, label: "原文", icon: FileText },
  { key: "script" as const, label: "剧本", icon: ScrollText },
  { key: "storyboard" as const, label: "分镜", icon: Clapperboard },
];

/** 切换创作阶段页签（分镜页签首次进入时挂载其组件）。 */
const setActiveTab = (key: "source" | "script" | "storyboard") => {
  activeTab.value = key;
  if (key === "storyboard") storyboardOpened.value = true;
};

function sortNodes(a: LongProjectNode, b: LongProjectNode) { return a.order - b.order || a.createdAt - b.createdAt; }

function descendantsOf(parentId: string) {
  const result: LongProjectNode[] = [];
  const pending = [parentId];
  while (pending.length) {
    const current = pending.shift()!;
    nodes.value.filter((node) => node.parentId === current).forEach((node) => {
      result.push(node);
      if (node.type === "folder") pending.push(node.id);
    });
  }
  return result;
}

const setSidebarCollapsed = (value: boolean) => { sidebarCollapsed.value = value; localStorage.setItem("comic-long-sidebar-collapsed", String(value)); };

/** 持久化节点列表（剥离 reactive proxy 后写库）。 */
const persistNodes = async (nextNodes: LongProjectNode[]) => {
  const serializableNodes = nextNodes.map((node) => ({ ...node }));
  await mutateLongProjectData((data) => { data.nodes = serializableNodes; });
};

/** 组装原文分析的最终发送提示词（分析模板 + 章节原文），供页签行执行栏使用。 */
const buildAnalysisRunPrompt = (): string => {
  const template = analysisTemplates.value.find((item) => item.id === selectedTemplateByKind.value.analysis);
  return buildAnalysisPrompt(template?.content ?? "", draftContent.value);
};

/** 组装漫画剧本的最终发送提示词（剧本模板 + 章节原文 + 原文分析）。 */
const buildScriptRunPrompt = (): string => {
  const template = scriptTemplates.value.find((item) => item.id === selectedTemplateByKind.value.script);
  return buildScriptPrompt(template?.content ?? "", draftContent.value, analysisDoc.value?.content ?? "");
};

/** 执行原文分析（PromptRunBar 已完成发送前确认，prompt 为最终版）。 */
const runAnalysis = async (prompt: string) => {
  const chapter = selectedChapter.value;
  const model = llmModels.value.find((item) => item.id === selectedModelByKind.value.analysis);
  if (!chapter || !model) return;
  if (isDirty.value) await saveCurrentChapter(false);
  try {
    await runDoc("analysis", { chapterId: chapter.id, model, templateId: selectedTemplateByKind.value.analysis, prompt, sourceContent: draftContent.value });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "分析失败，请重试");
  }
};

/** 执行漫画剧本生成。 */
const runScript = async (prompt: string) => {
  const chapter = selectedChapter.value;
  const model = llmModels.value.find((item) => item.id === selectedModelByKind.value.script);
  if (!chapter || !model) return;
  if (isDirty.value) await saveCurrentChapter(false);
  try {
    await runDoc("script", { chapterId: chapter.id, model, templateId: selectedTemplateByKind.value.script, prompt, sourceContent: draftContent.value });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "剧本生成失败，请重试");
  }
};

/** 保存原文分析编辑内容。 */
const saveAnalysis = (content: string) => {
  if (selectedChapter.value) void saveDocContent("analysis", selectedChapter.value.id, content);
};

/** 保存漫画剧本编辑内容。 */
const saveScript = (content: string) => {
  if (selectedChapter.value) void saveDocContent("script", selectedChapter.value.id, content);
};

const toggleFolder = (folderId: string) => { const next = new Set(expandedFolders.value); next.has(folderId) ? next.delete(folderId) : next.add(folderId); expandedFolders.value = next; };
const selectChapter = async (chapter: LongProjectNode) => {
  if (isDirty.value) await saveCurrentChapter(false);
  selectedAssetCategory.value = null;
  selectedChapterId.value = chapter.id;
  draftContent.value = chapter.content ?? "";
  // 分镜页签内切换章节时保持页签，其余页签回到原文
  if (activeTab.value !== "storyboard") activeTab.value = "source";
};
const selectAssetCategory = async (category: AssetLibraryCategory) => { if (isDirty.value) await saveCurrentChapter(false); selectedChapterId.value = null; selectedAssetCategory.value = category; };
const openCreateDialog = (type: LongProjectNodeType, parentId: string | null) => { editingNode.value = null; nodeDialogType.value = type; nodeDialogParentId.value = parentId; nodeDialogVisible.value = true; contextMenu.value = null; };
const openRenameDialog = (node: LongProjectNode) => { editingNode.value = node; nodeDialogType.value = node.type; nodeDialogParentId.value = node.parentId; contextMenu.value = null; nodeDialogVisible.value = true; };
const openContextMenu = (event: MouseEvent, node: LongProjectNode | null) => {
  contextMenu.value = { x: Math.min(event.clientX, window.innerWidth - 190), y: Math.min(event.clientY, window.innerHeight - 150), node };
};
const openFromContext = (type: LongProjectNodeType) => {
  const target = contextMenu.value;
  const parentId = target?.node?.type === "folder" ? target.node.id : null;
  editingNode.value = null;
  nodeDialogType.value = type;
  nodeDialogParentId.value = parentId;
  contextMenu.value = null;
  nodeDialogVisible.value = true;
};

const handleNodeDialogSubmit = async ({ name, content }: { name: string; content: string }) => {
  if (editingNode.value) {
    const editingId = editingNode.value.id;
    await persistNodes(nodes.value.map((node) => node.id === editingId ? { ...node, name, updatedAt: Date.now() } : node));
    nodeDialogVisible.value = false; editingNode.value = null; contextMenu.value = null; return;
  }
  const now = Date.now();
  const newNode: LongProjectNode = {
    id: uuidv4(), type: nodeDialogType.value, name, parentId: nodeDialogParentId.value,
    order: nodes.value.filter((node) => node.parentId === nodeDialogParentId.value).length,
    createdAt: now, updatedAt: now,
  };
  if (nodeDialogType.value === "chapter") {
    newNode.content = content;
    newNode.stage = content ? "source-ready" : "empty";
  }
  await persistNodes([...nodes.value, newNode]);
  nodeDialogVisible.value = false;
  contextMenu.value = null;
  if (newNode.type === "folder") expandedFolders.value = new Set([...expandedFolders.value, newNode.id]);
  else {
    if (newNode.parentId) expandedFolders.value = new Set([...expandedFolders.value, newNode.parentId]);
    selectedChapterId.value = newNode.id;
    draftContent.value = "";
    activeTab.value = "source";
  }
};

const requestDelete = (node: LongProjectNode) => { deletingNode.value = node; deleteDialogVisible.value = true; contextMenu.value = null; };
const confirmDelete = async () => {
  if (!deletingNode.value) return;
  const ids = new Set([deletingNode.value.id]);
  if (deletingNode.value.type === "folder") descendantsOf(deletingNode.value.id).forEach((node) => ids.add(node.id));
  if (selectedChapterId.value && ids.has(selectedChapterId.value)) { selectedChapterId.value = null; draftContent.value = ""; }
  await persistNodes(nodes.value.filter((node) => !ids.has(node.id))); deletingNode.value = null;
};

/** 自动保存当前章节正文（含 stage 维护）。 */
const saveCurrentChapter = async (notify: boolean) => {
  if (!selectedChapter.value || !isDirty.value || saving.value) return;
  saving.value = true;
  try {
    const content = draftContent.value;
    await persistNodes(nodes.value.map((node) => node.id === selectedChapterId.value ? { ...node, content, stage: content.trim() ? "source-ready" as const : "empty" as const, updatedAt: Date.now() } : node));
    if (notify) toast.success("章节已保存");
  } catch (error) { console.error("保存章节失败", error); toast.error("章节保存失败，请重试"); }
  finally { saving.value = false; }
};

watch(draftContent, () => {
  if (!selectedChapter.value || !isDirty.value) return;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => { void saveCurrentChapter(false); }, 900);
});

onBeforeUnmount(() => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
});

onMounted(async () => {
  try {
    await loadProject();
    if (!project.value || project.value.projectType !== "long") { await router.replace("/comic/projects"); return; }
    expandedFolders.value = new Set(nodes.value.filter((node) => node.type === "folder").map((node) => node.id));
    [models.value, promptTemplates.value] = await Promise.all([
      comicDb.getAllModelConfigs(),
      comicDb.getAllPromptTemplates(),
    ]);
    initDefaults(models.value, promptTemplates.value);
    // 异常恢复：页面刚加载时不可能有进行中的文档任务，残留 running 标记为失败
    await recoverInterrupted();
  } finally { loading.value = false; }
});

/**
 * keep-alive 激活（从其他应用页面返回）时重载项目，
 * 合并持久化队列之外可能产生的数据变更（如绘图配置直写）。
 */
onActivated(async () => {
  if (loading.value) return;
  if (isDirty.value) await saveCurrentChapter(false);
  await loadProject();
});
</script>

<style scoped>
.icon-button, .sidebar-icon { display: flex; width: 2rem; height: 2rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 0.5rem; color: var(--text-secondary); transition: color 0.15s ease, background-color 0.15s ease; }
.sidebar-icon { width: 2.25rem; height: 2.25rem; }
.icon-button:hover, .sidebar-icon:hover { color: var(--text-primary); background: var(--bg-elevated); }
.primary-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.5rem; background: #06b6d4; padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 500; color: #020617; transition: background-color 0.15s ease; }
.primary-button:hover { background: #22d3ee; }
.context-action { display: flex; width: 100%; align-items: center; gap: 0.5rem; border-radius: 0.375rem; padding: 0.5rem 0.625rem; text-align: left; font-size: 0.75rem; color: var(--text-secondary); transition: color 0.15s ease, background-color 0.15s ease; }
.context-action:hover { background: var(--bg-elevated); color: var(--text-primary); }
</style>
