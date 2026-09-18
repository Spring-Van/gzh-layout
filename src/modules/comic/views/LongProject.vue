<template>
  <div class="flex h-full overflow-hidden bg-app-bg text-text-primary" @click="closeOverlays">
    <aside class="relative flex shrink-0 flex-col border-r border-border-subtle bg-surface transition-[width] duration-200" :class="sidebarCollapsed ? 'w-14' : 'w-72'">
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
        <div class="flex h-full flex-col items-center gap-2 py-3" @mouseleave="onRailMouseleave">
          <button class="sidebar-icon" title="展开章节栏" @click="setSidebarCollapsed(false)"><PanelLeftOpen :size="19" /></button>
          <div class="my-1 h-px w-7 bg-border-subtle" />
          <!-- 章节浮层入口：hover/click 弹出分组章节列表（替代原 slice(0,8) 图标堆叠） -->
          <button class="sidebar-icon relative" title="章节列表" @mouseenter="hoverChapterFlyout($event)" @mouseleave="flyoutRef?.triggerLeave()" @click="flyoutRef?.triggerClick(triggerTop($event))">
            <ListTree :size="18" />
            <span v-if="chapterCount" class="absolute -right-1 -top-1 min-w-[15px] rounded-full bg-violet-500 px-1 text-center text-[10px] leading-[15px] text-white">{{ chapterCount }}</span>
          </button>
          <button v-if="selectedChapter" class="sidebar-icon" :class="selectedChapterId ? 'bg-cyan-500/15 text-cyan-400' : ''" :title="selectedChapter.name" @mouseenter="hoverChapterFlyout($event)" @mouseleave="flyoutRef?.triggerLeave()" @click="flyoutRef?.triggerClick(triggerTop($event))"><FileText :size="18" /></button>
          <button class="sidebar-icon" :class="selectedAssetCategory ? 'bg-violet-500/15 text-violet-300' : ''" title="资产库" @mouseenter="hoverAssetFlyout($event)" @mouseleave="assetFlyoutRef?.triggerLeave()" @click="assetFlyoutRef?.triggerClick(triggerTop($event))"><Boxes :size="18" /></button>
          <div class="flex-1" />
          <button class="sidebar-icon" title="返回项目列表" @click="router.push('/comic/projects')"><ArrowLeft :size="18" /></button>
        </div>
        <LongProjectChapterFlyout ref="flyoutRef" :nodes="nodes" :selected-chapter-id="selectedChapterId" @select="selectChapter" />
        <LongProjectAssetFlyout ref="assetFlyoutRef" :assets="projectAssets" :selected-category="selectedAssetCategory" @select="selectAssetCategory" />
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
            <p class="mt-2 text-sm text-text-secondary">原文 → 分析 → 剧本 → 资产 → 分镜 → 生图</p>
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
        <!-- 顶栏：左侧页签（原文/剧本/分镜）；右侧为当前 tab 的操作按钮区。
             分镜页签做成「按钮 + 下拉」：默认分镜，可下拉切到绘图（切换内容阶段，
             同时决定分镜 tab 内的顶栏动作组与右栏内容）；其操作按钮由分镜 tab Teleport 注入 #storyboard-actions -->
        <div class="relative z-30 shrink-0 border-b border-border-subtle bg-surface px-6">
          <div class="flex h-12 items-center justify-between gap-4">
            <nav class="flex shrink-0 gap-1" aria-label="章节创作阶段">
              <template v-for="tab in chapterTabs" :key="tab.key">
                <!-- 分镜：左半 = 进入分镜创作台；右半 = 下拉切换 分镜 / 绘图 -->
                <div v-if="tab.key === 'storyboard'" class="relative flex items-center" @click.stop>
                  <button
                    class="flex h-7 items-center gap-1.5 rounded-l-lg py-0 pl-3 pr-1.5 text-xs transition-colors"
                    :class="tabClass('storyboard')"
                    :title="storyboardStage === 'draw' ? '分镜创作台 · 当前：绘图' : '分镜创作台 · 当前：分镜'"
                    @click="setActiveTab('storyboard')"
                  >
                    <component :is="storyboardStage === 'draw' ? Palette : Clapperboard" :size="13" />
                    {{ storyboardStage === 'draw' ? '绘图' : '分镜' }}
                  </button>
                  <button
                    class="flex h-7 items-center rounded-r-lg py-0 pl-0.5 pr-2 transition-colors"
                    :class="tabClass('storyboard')"
                    title="切换分镜 / 绘图"
                    @click="stageMenuOpen = !stageMenuOpen"
                  >
                    <ChevronDown :size="13" class="transition-transform duration-150" :class="stageMenuOpen ? 'rotate-180' : ''" />
                  </button>
                  <Transition name="tab-menu">
                    <div v-if="stageMenuOpen" class="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-lg border border-border-subtle bg-elevated py-1 text-text-primary shadow-xl shadow-black/40">
                      <button
                        v-for="item in storyboardStageItems"
                        :key="item.id"
                        class="flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors"
                        :class="storyboardStage === item.id ? 'bg-cyan-500/15' : 'hover:bg-cyan-500/10'"
                        @click="pickStoryboardStage(item.id)"
                      >
                        <component :is="item.icon" :size="14" class="mt-0.5 shrink-0" :class="storyboardStage === item.id ? 'text-cyan-400' : 'text-text-muted'" />
                        <span class="min-w-0">
                          <span class="block text-xs" :class="storyboardStage === item.id ? 'text-cyan-300' : 'text-text-primary'">{{ item.label }}</span>
                          <span class="mt-0.5 block text-[11px] leading-snug text-text-muted">{{ item.hint }}</span>
                        </span>
                      </button>
                    </div>
                  </Transition>
                </div>
                <button v-else class="flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs transition-colors" :class="tabClass(tab.key)" @click="setActiveTab(tab.key)">
                  <component :is="tab.icon" :size="13" />{{ tab.label }}
                </button>
              </template>
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
              <button class="secondary-button h-9 shrink-0 px-2.5 text-xs" title="粘贴外部 AI 生成的原文分析结果，跳过内置大模型调用" @click="openManualImport('analysis')"><ClipboardPaste :size="14" />手动写入</button>
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
              <button class="secondary-button h-9 shrink-0 px-2.5 text-xs" title="粘贴外部 AI 生成的漫画剧本结果，跳过内置大模型调用" @click="openManualImport('script')"><ClipboardPaste :size="14" />手动写入</button>
            </div>
            <div v-show="activeTab === 'storyboard'" id="storyboard-actions" class="flex min-w-0 flex-1 items-center justify-end gap-2" />
          </div>
        </div>

        <LongProjectSourceTab
          v-show="activeTab === 'source'"
          v-model:draft="draftContent"
          :save-status="saveStatus"
          :analysis-doc="analysisDoc"
          :source-changed="analysisSourceChanged"
          @save-analysis="saveAnalysis"
          @import-analysis="openManualImport('analysis')"
        />

        <LongProjectScriptTab
          v-show="activeTab === 'script'"
          :source-content="draftContent"
          :analysis-content="analysisDoc?.content ?? ''"
          :script-doc="scriptDoc"
          :source-changed="scriptSourceChanged"
          :script-only="selectedChapter?.startMode === 'script'"
          @save-script="saveScript"
          @import-script="openManualImport('script')"
        />

        <!-- 资产 tab：先于分镜确认本章资产（提取/审核/生图工作台），首次进入挂载后常驻（提取任务切页签不中断） -->
        <LongProjectAssetTab
          v-if="assetsOpened"
          v-show="activeTab === 'assets'"
          :project-id="projectId"
          :chapter-id="selectedChapterId ?? ''"
          :project="project"
          :models="models"
          :templates="promptTemplates"
          :focus-target="assetFocusTarget"
          :mutate-long-project-data="mutateLongProjectData"
        />

        <!-- 分镜 tab：首次进入时挂载，之后常驻（批量推导/生图切页签不中断） -->
        <LongProjectStoryboardTab
          v-if="storyboardOpened"
          v-show="activeTab === 'storyboard'"
          v-model:stage="storyboardStage"
          :project-id="projectId"
          :chapter-id="selectedChapterId ?? ''"
          :project="project"
          :models="models"
          :templates="promptTemplates"
          :mutate-long-project-data="mutateLongProjectData"
          @image-config-saved="loadProject"
          @templates-changed="reloadTemplates"
          @go-assets="goAssets"
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

    <!-- 手动导入结果（外部 AI 代跑）：分析/剧本共用 -->
    <ManualResultImportDialog
      :visible="Boolean(importKind)"
      :title="importDialogConfig.title"
      :placeholder="importDialogConfig.placeholder"
      @confirm="confirmManualImport"
      @close="importKind = null"
    />

    <!-- 导入覆盖确认：层级高于手动导入弹窗，避免被其遮罩盖住 -->
    <ConfirmDialog
      v-model="importConfirmVisible"
      z-index-class="z-[120]"
      title="覆盖已有内容"
      :content="importConfirmContent"
      confirm-text="覆盖导入"
      @confirm="handleImportConfirm"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇项目主页面：侧栏章节树 + 资产库树；正文区「原文｜剧本｜分镜」三个页签。
 * 原文页签 = 原文编辑 + AI 原文分析；剧本页签 = 原文只读 + AI 漫画剧本；
 * 原文/剧本的执行栏（模型/模板/发送前确认/执行）直接渲染在页签行右侧；
 * 分镜页签 = 分镜生图工作台（含资产），由 LongProjectStoryboardTab 承载：
 *   页签本体做成「按钮 + 下拉」——默认分镜，可下拉切到绘图（`storyboardStage`，v-model:stage 注入），
 *   该状态同时决定分镜 tab 内的顶栏动作组、右栏内容与底部操作；
 *   其顶部操作按钮经 Teleport 注入页签行右侧 #storyboard-actions 容器。
 */
import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import { ArrowLeft, ArrowRight, Boxes, ChevronDown, Clapperboard, ClipboardPaste, FileImage, FilePlus2, FileText, FolderPlus, ListTree, Palette, PanelLeftClose, PanelLeftOpen, Pencil, ScanText, ScrollText, Trash2, Workflow } from "lucide-vue-next";
import { comicDb } from "@/api/comic";
import { useTabStore, resolveMatchKey } from "@/stores/tab";
import ConfirmDialog from "@comic/components/ConfirmDialog.vue";
import PromptRunBar from "@comic/components/common/PromptRunBar.vue";
import ManualResultImportDialog from "@comic/components/common/ManualResultImportDialog.vue";
import LongProjectNodeDialog from "@comic/components/LongProjectNodeDialog.vue";
import LongProjectTree from "@comic/components/LongProjectTree.vue";
import LongProjectChapterFlyout from "@comic/components/LongProjectChapterFlyout.vue";
import LongProjectAssetFlyout from "@comic/components/LongProjectAssetFlyout.vue";
import LongProjectAssetLibraryTree, { type AssetLibraryCategory } from "@comic/components/LongProjectAssetLibraryTree.vue";
import LongProjectAssetLibrary from "@comic/components/LongProjectAssetLibrary.vue";
import LongProjectSourceTab from "@comic/components/LongProjectSourceTab.vue";
import LongProjectScriptTab from "@comic/components/LongProjectScriptTab.vue";
import LongProjectAssetTab from "@comic/components/LongProjectAssetTab.vue";
import LongProjectStoryboardTab from "@comic/components/LongProjectStoryboardTab.vue";
import { useToast } from "@comic/composables/useToast";
import { useLongProjectPersistence } from "@comic/composables/useLongProjectPersistence";
import { useChapterDocRun } from "@comic/composables/useChapterDocRun";
import { buildAnalysisPrompt, buildScriptPrompt } from "@comic/services/chapterDocService";
import { stageAfterSourceEdit } from "@comic/utils/chapterStage";
import type { LongChapterStartMode, LongProjectNode, LongProjectNodeType, ModelConfig, PromptTemplate } from "@comic/types";

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
const { selectedModelByKind, selectedTemplateByKind, initDefaults, getDoc, saveDocContent, runDoc, importDoc, recoverInterrupted } = useChapterDocRun({ project, mutateLongProjectData });

const saving = ref(false);
let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
const sidebarCollapsed = ref(localStorage.getItem("comic-long-sidebar-collapsed") === "true");
/** 收缩态章节/资产浮层实例（触发按钮 hover/click 转发给浮层管理显隐时机）。 */
const flyoutRef = ref<InstanceType<typeof LongProjectChapterFlyout> | null>(null);
const assetFlyoutRef = ref<InstanceType<typeof LongProjectAssetFlyout> | null>(null);
/** hover 触发某浮层时先立即收起另一个（避免同位叠放），并把触发按钮的垂直位置作为浮层锚点。 */
const triggerTop = (event: MouseEvent) => (event.currentTarget instanceof HTMLElement ? event.currentTarget.offsetTop : undefined);
const hoverChapterFlyout = (event: MouseEvent) => { assetFlyoutRef.value?.close(); flyoutRef.value?.triggerEnter(triggerTop(event)); };
const hoverAssetFlyout = (event: MouseEvent) => { flyoutRef.value?.close(); assetFlyoutRef.value?.triggerEnter(triggerTop(event)); };
/** 鼠标离开收缩侧栏时，两个浮层都进入延迟收起。 */
const onRailMouseleave = () => { flyoutRef.value?.triggerLeave(); assetFlyoutRef.value?.triggerLeave(); };

/**
 * 「记住上次选中的章节／资产分类」的本地存档。
 * 作用：切到其他菜单 tab 再切回、或关闭页签后重开、乃至重启应用，
 * 都能回到上次正在编辑的章节（而不是空白）。
 * 按项目隔离，避免多项目多开时互相覆盖。
 * 存两类：chapter = 选中的章节 id；asset = 选中的资产分类。
 */
const LAST_SELECTION_PREFIX = "comic-long-last-selection:";
type LastSelection = { chapterId?: string | null; assetCategory?: AssetLibraryCategory | null };

function readLastSelection(): LastSelection {
  try {
    const raw = localStorage.getItem(LAST_SELECTION_PREFIX + projectId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LastSelection;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function persistLastSelection(patch: LastSelection) {
  try {
    const next = { ...readLastSelection(), ...patch };
    localStorage.setItem(LAST_SELECTION_PREFIX + projectId, JSON.stringify(next));
  } catch {
    /* 存储异常时静默降级为不记忆 */
  }
}

const expandedFolders = ref(new Set<string>());
const selectedChapterId = ref<string | null>(null);
const selectedAssetCategory = ref<AssetLibraryCategory | null>(null);
const draftContent = ref("");
/** 章节创作阶段页签 key（资产在分镜之前：原文 → 剧本 → 资产 → 分镜）。 */
type ChapterTabKey = "source" | "script" | "assets" | "storyboard";
const activeTab = ref<ChapterTabKey>("source");
/** 分镜 tab 首次进入时才挂载（挂载后常驻，批量任务切页签不中断）。 */
const storyboardOpened = ref(false);
/** 资产 tab 首次进入时才挂载（挂载后常驻，提取/批量生图任务切页签不中断）。 */
const assetsOpened = ref(false);
/** 资产接力定位目标（分镜 tab「无参考图」等入口跳转资产 tab 时携带，直达工作台具体资产/视觉状态）。 */
const assetFocusTarget = ref<{ assetId: string; variantId?: string } | null>(null);
/**
 * 分镜 tab 内的「内容阶段」：分镜（剧本 → 分镜）| 绘图（分镜 → 画面描述、生图）。
 * 由页签行的「分镜」下拉持有，通过 v-model:stage 注入 LongProjectStoryboardTab；
 * 右栏标题栏的「分镜内容 | 提示词」按钮写的是同一个状态，两处入口永远一致。
 */
const storyboardStage = ref<"storyboard" | "draw">("storyboard");
const stageMenuOpen = ref(false);
const storyboardStageItems = [
  { id: "storyboard" as const, label: "分镜", hint: "剧本 → 分镜 · 逐页编辑", icon: Clapperboard },
  { id: "draw" as const, label: "绘图", hint: "分镜 → 画面描述 · 生成画面", icon: Palette },
];
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
/** 章节创作阶段页签：资产先于分镜（新管线：资产提取 → 分镜生成注入本章资产清单）；「从剧本开始」的章节隐藏原文页签。 */
const chapterTabs = computed(() => {
  const tabs = [
    { key: "source" as const, label: "原文", icon: FileText },
    { key: "script" as const, label: "剧本", icon: ScrollText },
    { key: "assets" as const, label: "资产", icon: Boxes },
    { key: "storyboard" as const, label: "分镜", icon: Clapperboard },
  ];
  return selectedChapter.value?.startMode === "script" ? tabs.filter((tab) => tab.key !== "source") : tabs;
});

/** 切换创作阶段页签（分镜/资产页签首次进入时挂载其组件）。 */
const setActiveTab = (key: ChapterTabKey) => {
  activeTab.value = key;
  if (key === "storyboard") storyboardOpened.value = true;
  if (key === "assets") assetsOpened.value = true;
};

/** 跳转资产 tab（分镜 tab 引导条 /「无参考图」等入口）：可携带定位目标直达生图工作台。payload 每次为新对象，确保重复点击同一目标也能触发 watch。 */
function goAssets(payload?: { assetId: string; variantId?: string }) {
  assetFocusTarget.value = payload ? { ...payload } : null;
  assetsOpened.value = true;
  activeTab.value = "assets";
}

/** 页签样式（选中 = 青色高亮）；分镜页签的按钮半与下拉半共用同一套。 */
const tabClass = (key: ChapterTabKey) => activeTab.value === key ? "bg-cyan-500/15 text-cyan-400" : "text-text-muted hover:bg-app-bg hover:text-text-secondary";

/** 页签下拉选定内容阶段：切到分镜页签并写入 stage（右栏「分镜内容 | 提示词」同步）。 */
const pickStoryboardStage = (id: "storyboard" | "draw") => {
  storyboardStage.value = id;
  stageMenuOpen.value = false;
  setActiveTab("storyboard");
};

/** 点击空白处关闭浮层（右键菜单 + 页签下拉）。 */
const closeOverlays = () => { contextMenu.value = null; stageMenuOpen.value = false; };

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

// ========== 手动导入（外部 AI 代跑） ==========

type ImportKind = 'analysis' | 'script' | null
const importKind = ref<ImportKind>(null)

/** 手动导入弹窗标题与占位文案。 */
const importDialogConfig = computed(() => {
  if (importKind.value === 'analysis') return { title: '手动导入原文分析', placeholder: '粘贴外部 AI 生成的原文分析结果…' }
  if (importKind.value === 'script') return { title: '手动导入漫画剧本', placeholder: '粘贴外部 AI 生成的漫画剧本结果…' }
  return { title: '', placeholder: '' }
})

/** 打开手动导入弹窗（kind 决定写入目标）。 */
function openManualImport(kind: Exclude<ImportKind, null>) {
  importKind.value = kind
}

// ========== 导入覆盖确认（破坏性：覆盖本章已有文档，统一走系统确认弹窗） ==========

const importConfirmVisible = ref(false);
const importConfirmContent = ref("");
const pendingImport = ref<{ kind: Exclude<ImportKind, null>; chapterId: string; content: string } | null>(null);

/** 真正写入导入结果（与内置大模型路径共用落库逻辑）。 */
async function applyManualImport(kind: Exclude<ImportKind, null>, chapterId: string, content: string) {
  await importDoc(kind, { chapterId, content: content.trim(), sourceContent: draftContent.value });
  importKind.value = null;
  toast.success(`已导入${kind === 'analysis' ? '原文分析' : '漫画剧本'}`);
}

/** 确认导入分析/剧本：本章已有文档时先弹系统确认弹窗，避免直接覆盖。 */
async function confirmManualImport(content: string) {
  const chapter = selectedChapter.value;
  const kind = importKind.value;
  if (!chapter || !kind || !content.trim()) return;
  if (isDirty.value) await saveCurrentChapter(false);
  const existing = getDoc(kind, chapter.id);
  if (existing) {
    pendingImport.value = { kind, chapterId: chapter.id, content };
    importConfirmContent.value = `本章已有${kind === 'analysis' ? '原文分析' : '漫画剧本'}，导入将覆盖原内容，是否继续？`;
    importConfirmVisible.value = true;
    return;
  }
  await applyManualImport(kind, chapter.id, content);
}

/** 确认覆盖导入。 */
async function handleImportConfirm() {
  const pending = pendingImport.value;
  pendingImport.value = null;
  if (!pending) return;
  await applyManualImport(pending.kind, pending.chapterId, pending.content);
}

const toggleFolder = (folderId: string) => { const next = new Set(expandedFolders.value); next.has(folderId) ? next.delete(folderId) : next.add(folderId); expandedFolders.value = next; };
const selectChapter = async (chapter: LongProjectNode) => {
  if (isDirty.value) await saveCurrentChapter(false);
  selectedAssetCategory.value = null;
  selectedChapterId.value = chapter.id;
  draftContent.value = chapter.content ?? "";
  persistLastSelection({ chapterId: chapter.id, assetCategory: null });
  // 分镜/资产页签内切换章节时保持页签（资产工作台与分镜常驻挂载，切章不中断）；其余回到本章首个可用页签（剧本起稿章节无原文页签）
  if (activeTab.value !== "storyboard" && activeTab.value !== "assets") {
    activeTab.value = chapter.startMode === "script" ? "script" : "source";
  }
};
const selectAssetCategory = async (category: AssetLibraryCategory) => { if (isDirty.value) await saveCurrentChapter(false); selectedChapterId.value = null; selectedAssetCategory.value = category; persistLastSelection({ chapterId: null, assetCategory: category }); };
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

const handleNodeDialogSubmit = async ({ name, content, startMode }: { name: string; content: string; startMode: LongChapterStartMode }) => {
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
    newNode.stage = stageAfterSourceEdit(undefined, Boolean(content.trim()));
    // 「从剧本开始」的章节：记录起笔模式（隐藏原文页签，提取/生成分镜时以剧本为主输入）
    if (startMode === "script") newNode.startMode = "script";
  }
  await persistNodes([...nodes.value, newNode]);
  nodeDialogVisible.value = false;
  contextMenu.value = null;
  if (newNode.type === "folder") expandedFolders.value = new Set([...expandedFolders.value, newNode.id]);
  else {
    if (newNode.parentId) expandedFolders.value = new Set([...expandedFolders.value, newNode.parentId]);
    selectedChapterId.value = newNode.id;
    draftContent.value = "";
    persistLastSelection({ chapterId: newNode.id, assetCategory: null });
    // 剧本起稿章节直接落到剧本页签
    activeTab.value = newNode.startMode === "script" ? "script" : "source";
  }
};

const requestDelete = (node: LongProjectNode) => { deletingNode.value = node; deleteDialogVisible.value = true; contextMenu.value = null; };
const confirmDelete = async () => {
  if (!deletingNode.value) return;
  const ids = new Set([deletingNode.value.id]);
  if (deletingNode.value.type === "folder") descendantsOf(deletingNode.value.id).forEach((node) => ids.add(node.id));
  if (selectedChapterId.value && ids.has(selectedChapterId.value)) { selectedChapterId.value = null; draftContent.value = ""; persistLastSelection({ chapterId: null }); }
  await persistNodes(nodes.value.filter((node) => !ids.has(node.id))); deletingNode.value = null;
};

/** 自动保存当前章节正文（stage 只升不降，见 utils/chapterStage）。 */
const saveCurrentChapter = async (notify: boolean) => {
  if (!selectedChapter.value || !isDirty.value || saving.value) return;
  saving.value = true;
  try {
    const content = draftContent.value;
    await persistNodes(nodes.value.map((node) => node.id === selectedChapterId.value ? { ...node, content, stage: stageAfterSourceEdit(node.stage, Boolean(content.trim())), updatedAt: Date.now() } : node));
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

/**
 * 恢复上次选中的章节／资产分类（来自本地存档）。
 * - 章节：仅当该 id 在当前节点中真实存在时才恢复（防已删除/换项目后的悬空 id）；
 * - 资产分类：无选中章节时按存档恢复；若既无章节也无存档则保持空白。
 * 进入时同步 draftContent，避免正文区与选中章节错位。
 */
function restoreLastSelection() {
  const saved = readLastSelection();
  const savedChapterId = saved.chapterId;
  if (savedChapterId && chapters.value.some((node) => node.id === savedChapterId)) {
    selectedChapterId.value = savedChapterId;
    selectedAssetCategory.value = null;
    draftContent.value = selectedChapter.value?.content ?? "";
    // 页签落到该章节的首个可用页签（「从剧本开始」的章节没有原文页签）；资产/分镜页签挂载后保持
    if (activeTab.value !== "storyboard" && activeTab.value !== "assets") {
      activeTab.value = selectedChapter.value?.startMode === "script" ? "script" : "source";
    }
    return;
  }
  if (saved.assetCategory) {
    selectedChapterId.value = null;
    selectedAssetCategory.value = saved.assetCategory;
  }
}

/** 重载提示词模板列表（子页签直接写库后回调，如分镜页一键新建画面描述模板）。 */
async function reloadTemplates() {
  promptTemplates.value = await comicDb.getAllPromptTemplates();
}

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
    // 恢复上次选中的章节／资产分类（关闭页签后重开、重启应用均生效）
    restoreLastSelection();
  } finally { loading.value = false; }
});

/**
 * keep-alive 激活（从其他应用页面返回）时重载项目，
 * 合并持久化队列之外可能产生的数据变更（如绘图配置直写）。
 * 若当前没有选中章节（实例被重建/首次进入），按本地存档恢复上次选中。
 */
onActivated(async () => {
  if (loading.value) return;
  if (isDirty.value) await saveCurrentChapter(false);
  await loadProject();
  if (!selectedChapter.value && !selectedAssetCategory.value) restoreLastSelection();
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
.tab-menu-enter-active, .tab-menu-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.tab-menu-enter-from, .tab-menu-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
