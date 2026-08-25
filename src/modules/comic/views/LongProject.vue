<template>
  <div class="flex h-screen overflow-hidden bg-app-bg text-text-primary" @click="contextMenu = null; formatMenuOpen = false">
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
            <p class="mt-2 text-sm text-text-secondary">从章节原文开始，逐步确认内容和视觉资产</p>
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

      <section v-else-if="activeExtractionRun" class="flex h-full flex-col">
        <LongProjectAssetExtractionReview
          v-if="activeExtractionRun.status === 'completed'"
          :chapter-name="selectedChapter.name"
          :source-word-count="activeExtractionRun.sourceWordCount"
          :candidates="activeExtractionRun.candidates"
          :assets="projectAssets"
          @update="updateExtractionCandidate"
          @add="addExtractionCandidate"
          @back="activeExtractionRunId = null"
          @confirm="confirmAssetExtraction"
        />
        <div v-else class="flex flex-1 items-center justify-center p-8 text-center">
          <div v-if="activeExtractionRun.status === 'running'" class="w-full max-w-sm">
            <div class="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10">
              <span class="absolute inset-0 rounded-lg border border-cyan-400/40 extraction-ring" />
              <LoaderCircle :size="26" class="animate-spin text-cyan-400" />
            </div>
            <h2 class="text-base font-medium text-text-primary">正在提取章节资产</h2>
            <p class="mt-2 text-sm text-text-secondary">正在读取原文并识别需要保持一致的人物、场景和道具。</p>
            <div class="mt-7 grid grid-cols-3 gap-2 text-left">
              <div v-for="step in extractionLoadingSteps" :key="step.label" class="rounded-md border border-border-subtle bg-surface px-3 py-3">
                <component :is="step.icon" :size="16" class="mb-2 text-cyan-400 extraction-step-icon" />
                <p class="text-xs text-text-primary">{{ step.label }}</p>
                <p class="mt-1 text-[11px] text-text-muted">处理中</p>
              </div>
            </div>
            <div class="mx-auto mt-5 flex items-center justify-center gap-1.5 text-xs text-text-muted"><span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" /><span class="ml-1">大模型生成中</span></div>
          </div>
          <div v-else>
            <ScanText :size="28" class="mx-auto mb-4 text-red-400" />
            <h2 class="text-base font-medium text-text-primary">资产提取失败</h2>
            <p class="mx-auto mt-2 max-w-lg text-sm text-text-secondary">{{ activeExtractionRun.error || '请求未能完成，请检查模型配置与提示词后重试。' }}</p>
            <div class="mt-5 flex justify-center gap-3"><button class="secondary-button" @click="activeExtractionRunId = null">返回原文</button><button class="primary-button" @click="runAiTask">重新提取</button></div>
          </div>
        </div>
      </section>

      <section v-else class="flex h-full flex-col">
        <div class="shrink-0 border-b border-border-subtle bg-surface px-6 pt-4">
          <div class="flex items-center justify-between gap-4 pb-3">
            <h1 class="min-w-0 truncate text-base font-semibold text-text-primary">{{ selectedChapter.name }}</h1>
            <p class="shrink-0 text-xs text-text-muted">{{ wordCount(draftContent) }} 字 · {{ saveStatus }}</p>
          </div>
          <nav class="flex gap-6" aria-label="章节创作阶段">
            <button v-for="tab in chapterTabs" :key="tab.key" class="border-b-2 px-0.5 pb-2.5 text-sm transition-colors" :class="activeTab === tab.key ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-text-muted hover:text-text-primary'" @click="activeTab = tab.key">{{ tab.label }}</button>
          </nav>
        </div>

        <div v-if="activeTab === 'source'" class="flex min-h-0 flex-1 flex-col p-6">
          <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface focus-within:border-cyan-500/50">
            <div class="flex shrink-0 items-center justify-between border-b border-border-subtle px-3 py-2">
              <div class="flex items-center gap-1">
                <button class="editor-tool" title="清理空行" @click="formatContent('empty-lines')"><Rows3 :size="15" /><span>清理空行</span></button>
                <button class="editor-tool" title="去除行首序号" @click="formatContent('line-numbers')"><ListX :size="15" /><span>去序号</span></button>
                <button class="editor-tool" title="合并碎行" @click="formatContent('merge-lines')"><AlignJustify :size="15" /><span>合并碎行</span></button>
                <button class="editor-tool" title="撤销文本整理" :disabled="!contentHistory.length" @click="undoFormat"><Undo2 :size="15" /><span>撤销</span></button>
                <div class="relative">
                  <button class="editor-tool" title="更多文本整理操作" @click.stop="formatMenuOpen = !formatMenuOpen"><Ellipsis :size="16" /><span>更多</span></button>
                  <div v-if="formatMenuOpen" class="absolute left-0 top-9 z-10 min-w-32 rounded-md border border-border-subtle bg-surface p-1 shadow-xl" @click.stop>
                    <button class="format-menu-action" @click="formatContent('indent'); formatMenuOpen = false"><TextAlignStart :size="14" />去除缩进</button>
                    <button class="format-menu-action" @click="formatContent('trim-lines'); formatMenuOpen = false"><Eraser :size="14" />清理行尾空格</button>
                  </div>
                </div>
              </div>
              <p class="text-xs text-text-muted">{{ wordCount(draftContent) }} 字 · {{ paragraphCount }} 段 · {{ saveStatus }}</p>
            </div>
            <div v-if="sourceExtractionStatus" class="flex shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-app-bg/40 px-4 py-2">
              <div class="flex min-w-0 items-center gap-2 text-xs">
                <ScanText :size="14" :class="sourceExtractionStatus.tone" />
                <span class="shrink-0 text-text-secondary">资产提取</span>
                <span class="truncate" :class="sourceExtractionStatus.tone">{{ sourceExtractionStatus.message }}</span>
              </div>
              <button v-if="sourceExtractionStatus.actionLabel" class="shrink-0 text-xs text-cyan-400 hover:text-cyan-300" @click="handleSourceExtractionAction(sourceExtractionStatus.run)">{{ sourceExtractionStatus.actionLabel }}</button>
            </div>
            <textarea v-model="draftContent" class="custom-scrollbar min-h-0 flex-1 resize-none bg-transparent p-5 text-sm leading-7 text-text-primary outline-none placeholder:text-text-muted" placeholder="粘贴或输入当前小说章节内容..." />
            <div class="flex shrink-0 items-center gap-3 border-t border-border-subtle px-4 py-3">
              <div class="inline-flex h-9 shrink-0 rounded-md border border-border-subtle bg-app-bg p-0.5">
                <button v-for="task in aiTasks" :key="task.key" class="rounded px-3 text-xs transition-colors" :class="aiTask === task.key ? 'bg-elevated text-cyan-400 shadow-sm' : 'text-text-muted hover:text-text-primary'" @click="aiTask = task.key">{{ task.label }}</button>
              </div>
              <label class="w-44 shrink-0">
                <span class="sr-only">选择模型</span>
                <select v-model="selectedModelByTask[aiTask]" class="task-select">
                  <option value="" disabled>选择模型</option>
                  <option v-for="model in llmModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
              </label>
              <label class="w-44 shrink-0">
                <span class="sr-only">选择提示词模板</span>
                <select v-model="selectedTemplateByTask[aiTask]" class="task-select">
                  <option value="" disabled>选择提示词模板</option>
                  <option v-for="template in templatesForCurrentTask" :key="template.id" :value="template.id">{{ template.name }}</option>
                </select>
              </label>
              <label class="flex h-9 shrink-0 cursor-pointer items-center gap-2 px-1 text-xs text-text-secondary" title="执行前查看并编辑最终发送给模型的提示词">
                <input v-model="confirmPromptBeforeRun" type="checkbox" class="h-3.5 w-3.5 accent-cyan-400" @change="saveConfirmPromptPreference" />
                发送前确认
              </label>
              <button class="primary-button task-run-button ml-auto shrink-0 px-4" :disabled="!canRunAiTask" @click="runAiTask">{{ currentAiTask.label }}<ArrowRight :size="16" /></button>
            </div>
          </div>
        </div>

        <LongProjectChapterAssets v-else-if="activeTab === 'assets'" :entries="selectedChapterAssets" :assets="projectAssets" @merge-variants="mergeAssetVariants" @split-variant="splitAssetVariant" />

        <div v-else-if="activeTab === 'storyboard'" class="custom-scrollbar flex-1 overflow-y-auto p-6">
          <div class="mx-auto max-w-4xl">
            <div v-if="latestStoryboardRun?.status === 'running'" class="flex min-h-64 flex-col items-center justify-center text-center"><LoaderCircle :size="28" class="animate-spin text-cyan-400" /><h2 class="mt-4 text-base font-medium text-text-primary">正在生成分镜</h2><p class="mt-2 text-sm text-text-secondary">正在结合当前章节与项目资产库匹配视觉状态。</p></div>
            <div v-else-if="latestStoryboardRun?.status === 'completed'" class="space-y-3"><div class="flex items-center justify-between"><p class="text-sm text-text-secondary">{{ latestStoryboardRun.panels.length }} 个分镜 · 已按项目资产库匹配</p><button class="secondary-button text-xs" @click="activeTab = 'source'">返回原文</button></div><article v-for="panel in latestStoryboardRun.panels" :key="panel.id" class="rounded-lg border border-border-subtle bg-surface p-4"><div class="flex items-center justify-between gap-4"><span class="text-xs font-medium text-cyan-400">分镜 {{ panel.order }}</span><span v-if="panel.shot" class="text-xs text-text-muted">{{ panel.shot }}</span></div><p class="mt-3 text-sm leading-6 text-text-primary">{{ panel.content }}</p><div v-if="panel.assetBindings.length" class="mt-3 flex flex-wrap gap-2"><span v-for="binding in panel.assetBindings" :key="`${binding.assetName}-${binding.visualVersionName}`" class="rounded border px-2 py-1 text-[11px]" :class="binding.assetId ? 'border-violet-400/25 bg-violet-400/10 text-violet-200' : 'border-amber-400/25 bg-amber-400/10 text-amber-200'">{{ binding.assetName }}<template v-if="binding.visualVersionName"> · {{ binding.visualVersionName }}</template></span></div><p v-if="panel.imagePrompt" class="mt-3 border-t border-border-subtle pt-3 text-xs leading-5 text-text-secondary">{{ panel.imagePrompt }}</p></article></div>
            <div v-else-if="latestStoryboardRun?.status === 'failed'" class="flex min-h-64 flex-col items-center justify-center text-center"><ScanText :size="28" class="text-red-400" /><h2 class="mt-4 text-base font-medium text-text-primary">分镜生成失败</h2><p class="mt-2 text-sm text-text-secondary">{{ latestStoryboardRun.error }}</p></div>
            <div v-else class="flex min-h-64 flex-col items-center justify-center text-center"><ListTree :size="28" class="text-text-muted" /><h2 class="mt-4 text-base font-medium text-text-primary">尚未生成分镜</h2><p class="mt-2 text-sm text-text-secondary">在原文底部选择“生成分镜”，系统会根据当前章节和项目资产库推荐视觉状态。</p></div>
          </div>
        </div>
        <div v-else class="flex flex-1 items-center justify-center p-8 text-center">
          <div>
            <component :is="activeTabInfo.icon" :size="26" class="mx-auto mb-3 text-text-muted" />
            <h2 class="text-base font-medium text-text-primary">{{ activeTabInfo.label }}</h2>
            <p class="mt-2 text-sm text-text-secondary">基于章节原文和项目资产梳理关键画面</p>
          </div>
        </div>
      </section>
    </main>

    <div v-if="promptPreviewVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" @click.self="closePromptPreview">
      <section class="flex h-[min(720px,calc(100vh-3rem))] w-[min(860px,100%)] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-2xl">
        <header class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
          <div><h2 class="text-base font-semibold text-text-primary">确认发送内容</h2><p class="mt-1 text-xs text-text-muted">可在本次执行前修改，修改不会覆盖系统提示词模板。</p></div>
          <button class="icon-button" title="关闭" @click="closePromptPreview"><X :size="18" /></button>
        </header>
        <div class="min-h-0 flex-1 p-5">
          <textarea v-model="promptPreviewContent" class="custom-scrollbar h-full w-full resize-none rounded-md border border-border-subtle bg-app-bg p-4 font-mono text-xs leading-6 text-text-primary outline-none focus:border-cyan-500/50" aria-label="最终发送提示词" />
        </div>
        <footer class="flex shrink-0 items-center justify-between border-t border-border-subtle px-5 py-3">
          <p class="text-xs text-text-muted">{{ promptPreviewContent.length.toLocaleString() }} 个字符</p>
          <div class="flex items-center gap-3"><button class="secondary-button" @click="closePromptPreview">取消</button><button class="primary-button h-9 px-4 text-xs" :disabled="!promptPreviewContent.trim()" @click="sendPromptPreview">确认发送<ArrowRight :size="15" /></button></div>
        </footer>
      </section>
    </div>

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
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import { AlignJustify, ArrowLeft, ArrowRight, Boxes, Ellipsis, Eraser, FileImage, FilePlus2, FileText, FolderPlus, ListTree, ListX, LoaderCircle, MapPin, Package, PanelLeftClose, PanelLeftOpen, Pencil, Rows3, ScanText, TextAlignStart, Trash2, Undo2, UserRound, Workflow, X } from "lucide-vue-next";
import { comicDb } from "@/api/comic";
import ConfirmDialog from "@comic/components/ConfirmDialog.vue";
import LongProjectNodeDialog from "@comic/components/LongProjectNodeDialog.vue";
import LongProjectTree from "@comic/components/LongProjectTree.vue";
import LongProjectAssetLibraryTree, { type AssetLibraryCategory } from "@comic/components/LongProjectAssetLibraryTree.vue";
import LongProjectAssetExtractionReview from "@comic/components/LongProjectAssetExtractionReview.vue";
import LongProjectAssetLibrary from "@comic/components/LongProjectAssetLibrary.vue";
import LongProjectChapterAssets from "@comic/components/LongProjectChapterAssets.vue";
import { useToast } from "@comic/composables/useToast";
import { buildAssetExtractionPrompt, extractChapterAssets } from "@comic/services/assetExtractionService";
import { buildStoryboardPrompt, generateStoryboard } from "@comic/services/storyboardService";
import type { ComicProject, LongProjectAsset, LongProjectAssetExtractionCandidate, LongProjectAssetExtractionRun, LongProjectNode, LongProjectNodeType, LongProjectStoryboardRun, ModelConfig, PromptTemplate } from "@comic/types";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const projectId = String(route.params.projectId);
const project = ref<ComicProject | null>(null);
const loading = ref(true);
const saving = ref(false);
let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
const sidebarCollapsed = ref(localStorage.getItem("comic-long-sidebar-collapsed") === "true");
const expandedFolders = ref(new Set<string>());
const selectedChapterId = ref<string | null>(null);
const selectedAssetCategory = ref<AssetLibraryCategory | null>(null);
const draftContent = ref("");
const activeTab = ref("source");
const contentHistory = ref<string[]>([]);
const formatMenuOpen = ref(false);
const aiTask = ref<"assets" | "storyboard">("assets");
const selectedModelByTask = ref<Record<"assets" | "storyboard", string>>({ assets: "", storyboard: "" });
const selectedTemplateByTask = ref<Record<"assets" | "storyboard", string>>({ assets: "", storyboard: "" });
const models = ref<ModelConfig[]>([]);
const promptTemplates = ref<PromptTemplate[]>([]);
const activeExtractionRunId = ref<string | null>(null);
const confirmPromptBeforeRun = ref(localStorage.getItem("comic-long-confirm-prompt") !== "false");
const promptPreviewVisible = ref(false);
const promptPreviewContent = ref("");
const promptPreviewTask = ref<"assets" | "storyboard">("assets");
const nodeDialogVisible = ref(false);
const nodeDialogType = ref<LongProjectNodeType>("chapter");
const nodeDialogParentId = ref<string | null>(null);
const editingNode = ref<LongProjectNode | null>(null);
const deleteDialogVisible = ref(false);
const deletingNode = ref<LongProjectNode | null>(null);
const contextMenu = ref<{ x: number; y: number; node: LongProjectNode | null } | null>(null);

const nodes = computed(() => project.value?.longProjectData?.nodes ?? []);
const projectAssets = computed(() => project.value?.longProjectData?.assets ?? []);
const chapterAssets = computed(() => project.value?.longProjectData?.chapterAssets ?? []);
const selectedChapterAssets = computed(() => selectedChapter.value ? chapterAssets.value.filter((entry) => entry.chapterId === selectedChapter.value?.id) : []);
const storyboardAssetsForChapter = computed(() => {
  if (!selectedChapterAssets.value.length) return projectAssets.value;
  return projectAssets.value.flatMap((asset) => {
    const entries = selectedChapterAssets.value.filter((entry) => entry.assetId === asset.id);
    if (!entries.length) return [];
    const variantIds = new Set(entries.map((entry) => entry.variantId).filter((id): id is string => Boolean(id)));
    return [{ ...asset, variants: variantIds.size ? asset.variants.filter((variant) => variantIds.has(variant.id)) : asset.variants }];
  });
});
const assetsForSelectedCategory = computed(() => selectedAssetCategory.value ? projectAssets.value.filter((asset) => asset.type === selectedAssetCategory.value && asset.scope !== "chapter") : []);
const assetExtractionRuns = computed(() => project.value?.longProjectData?.assetExtractionRuns ?? []);
const storyboardRuns = computed(() => project.value?.longProjectData?.storyboardRuns ?? []);
const latestStoryboardRun = computed(() => selectedChapter.value ? storyboardRuns.value.filter((run) => run.chapterId === selectedChapter.value!.id).sort((a, b) => b.updatedAt - a.updatedAt)[0] : undefined);
const activeExtractionRun = computed(() => assetExtractionRuns.value.find((run) => run.id === activeExtractionRunId.value) ?? null);
const chapterExtractionRuns = computed(() => selectedChapter.value
  ? assetExtractionRuns.value.filter((run) => run.chapterId === selectedChapter.value?.id).sort((a, b) => b.updatedAt - a.updatedAt)
  : []);
const sourceExtractionStatus = computed(() => {
  const runs = chapterExtractionRuns.value;
  const latestRunning = runs.find((run) => run.status === "running");
  if (latestRunning) return { run: latestRunning, tone: "text-cyan-400", message: "正在提取中", actionLabel: "查看进度" };
  const latestPending = runs.find((run) => run.status === "completed");
  if (latestPending) {
    const outdated = latestPending.sourceContent !== draftContent.value;
    return { run: latestPending, tone: outdated ? "text-amber-300" : "text-cyan-400", message: outdated ? `待审核 ${latestPending.candidates.length} 项 · 原文已变更` : `待审核 ${latestPending.candidates.length} 项`, actionLabel: "继续审核" };
  }
  const latestConfirmed = runs.find((run) => run.status === "confirmed");
  if (latestConfirmed) return { run: latestConfirmed, tone: "text-emerald-400", message: `已确认 ${latestConfirmed.candidates.length} 项资产`, actionLabel: "查看章节资产" };
  const latestFailed = runs.find((run) => run.status === "failed");
  if (latestFailed) return { run: latestFailed, tone: "text-red-400", message: "上次提取失败", actionLabel: "查看原因" };
  return null;
});
const chapters = computed(() => nodes.value.filter((node) => node.type === "chapter").sort(sortNodes));
const chapterOrders = computed(() => Object.fromEntries(chapters.value.map((chapter, index) => [chapter.id, index])));
const chapterCount = computed(() => chapters.value.length);
const readyChapterCount = computed(() => chapters.value.filter((node) => Boolean(node.content?.trim())).length);
const selectedChapter = computed(() => chapters.value.find((node) => node.id === selectedChapterId.value) ?? null);
const isDirty = computed(() => draftContent.value !== (selectedChapter.value?.content ?? ""));
const paragraphCount = computed(() => draftContent.value.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).length);
const saveStatus = computed(() => saving.value ? "正在自动保存" : isDirty.value ? "正在编辑" : "已自动保存");
const llmModels = computed(() => models.value.filter((model) => model.category === "llm"));
const aiTasks = [
  { key: "assets" as const, label: "提取资产", templateType: "extract" as const },
  { key: "storyboard" as const, label: "生成分镜", templateType: "storyboard" as const },
];
const currentAiTask = computed(() => aiTasks.find((task) => task.key === aiTask.value) ?? aiTasks[0]);
const templatesForCurrentTask = computed(() => promptTemplates.value
  .filter((template) => template.type === currentAiTask.value.templateType)
  .sort((a, b) => a.sortOrder - b.sortOrder));
const canRunAiTask = computed(() => Boolean(
  draftContent.value.trim()
  && selectedModelByTask.value[aiTask.value]
  && selectedTemplateByTask.value[aiTask.value],
));
const nodeDialogParentName = computed(() => nodeDialogParentId.value ? nodes.value.find((node) => node.id === nodeDialogParentId.value)?.name ?? "" : project.value?.name ?? "");
const deleteDialogContent = computed(() => {
  if (!deletingNode.value) return "删除后无法恢复，是否确认删除？";
  if (deletingNode.value.type === "folder") return `确定删除文件夹「${deletingNode.value.name}」吗？其中的 ${descendantsOf(deletingNode.value.id).filter((node) => node.type === "chapter").length} 个章节也会一并删除。`;
  return `确定删除章节「${deletingNode.value.name}」吗？章节正文和后续创作数据将一并删除。`;
});

const workflowSteps = [
  { title: "添加章节", description: "录入小说原文", icon: FileText }, { title: "解析内容", description: "拆分章节结构", icon: ScanText },
  { title: "提取资产", description: "人物、场景、道具", icon: Boxes }, { title: "生成分镜", description: "保留关键剧情", icon: ListTree },
  { title: "制作漫画", description: "提示词与画面", icon: FileImage },
];
const extractionLoadingSteps = [
  { label: "人物", icon: UserRound },
  { label: "场景", icon: MapPin },
  { label: "道具", icon: Package },
];
const chapterTabs = [
  { key: "source", label: "原文", icon: FileText },
  { key: "assets", label: "章节资产", icon: Boxes },
  { key: "storyboard", label: "分镜", icon: ListTree },
];
const activeTabInfo = computed(() => chapterTabs.find((tab) => tab.key === activeTab.value) ?? chapterTabs[0]);
function sortNodes(a: LongProjectNode, b: LongProjectNode) { return a.order - b.order || a.createdAt - b.createdAt; }
function wordCount(content: string) { return content.replace(/\s/g, "").length; }
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
const saveConfirmPromptPreference = () => localStorage.setItem("comic-long-confirm-prompt", String(confirmPromptBeforeRun.value));
const openExtractionRun = (run: LongProjectAssetExtractionRun) => {
  activeTab.value = "source";
  activeExtractionRunId.value = run.id;
};
const handleSourceExtractionAction = (run: LongProjectAssetExtractionRun) => {
  if (run.status === "confirmed") { activeTab.value = "assets"; return; }
  openExtractionRun(run);
};
const runAiTask = async () => {
  if (!canRunAiTask.value) return;
  if (isDirty.value) await saveCurrentChapter(false);
  if (aiTask.value === "storyboard") {
    const model = llmModels.value.find((item) => item.id === selectedModelByTask.value.storyboard);
    const template = promptTemplates.value.find((item) => item.id === selectedTemplateByTask.value.storyboard);
    if (!model || !template) return;
    const prompt = buildStoryboardPrompt(template.content, draftContent.value, storyboardAssetsForChapter.value);
    if (confirmPromptBeforeRun.value) { promptPreviewTask.value = "storyboard"; promptPreviewContent.value = prompt; promptPreviewVisible.value = true; return; }
    await runStoryboard(prompt); return;
  }
  const model = llmModels.value.find((item) => item.id === selectedModelByTask.value.assets);
  const template = promptTemplates.value.find((item) => item.id === selectedTemplateByTask.value.assets);
  if (!model || !template || !selectedChapter.value || !project.value) return;
  const prompt = buildAssetExtractionPrompt(template.content, draftContent.value);
  if (confirmPromptBeforeRun.value) {
    promptPreviewTask.value = "assets";
    promptPreviewContent.value = prompt;
    promptPreviewVisible.value = true;
    return;
  }
  await sendAssetExtraction(prompt);
};
const runStoryboard = async (customPrompt?: string) => {
  const model = llmModels.value.find((item) => item.id === selectedModelByTask.value.storyboard);
  const template = promptTemplates.value.find((item) => item.id === selectedTemplateByTask.value.storyboard);
  if (!model || !template || !selectedChapter.value || !project.value) return;
  const storyboardAssets = storyboardAssetsForChapter.value;
  const prompt = customPrompt ?? buildStoryboardPrompt(template.content, draftContent.value, storyboardAssets);
  const now = Date.now();
  const run: LongProjectStoryboardRun = { id: uuidv4(), chapterId: selectedChapter.value.id, sourceContent: draftContent.value, modelId: model.id, templateId: template.id, prompt, status: 'running', panels: [], createdAt: now, updatedAt: now };
  await persistLongProjectData({ storyboardRuns: [...storyboardRuns.value, run] });
  activeTab.value = 'storyboard';
  try {
    const result = await generateStoryboard({ model, template, chapterContent: draftContent.value, assets: storyboardAssets, chapterId: selectedChapter.value.id, chapterOrders: chapterOrders.value, prompt });
    const nextRuns = storyboardRuns.value.map((item) => item.id === run.id ? { ...item, status: 'completed' as const, panels: result.panels, rawResponse: result.rawResponse, updatedAt: Date.now() } : item);
    const nextNodes = nodes.value.map((node) => node.id === selectedChapter.value?.id ? { ...node, stage: 'storyboard-ready' as const, updatedAt: Date.now() } : node);
    await persistLongProjectData({ storyboardRuns: nextRuns, nodes: nextNodes });
  } catch (error) {
    const message = error instanceof Error ? error.message : '分镜生成失败，请重试';
    await persistLongProjectData({ storyboardRuns: storyboardRuns.value.map((item) => item.id === run.id ? { ...item, status: 'failed' as const, error: message, updatedAt: Date.now() } : item) });
    toast.error(message);
  }
};
const closePromptPreview = () => {
  promptPreviewVisible.value = false;
  promptPreviewContent.value = "";
};
const sendPromptPreview = async () => {
  if (promptPreviewTask.value === "storyboard") await runStoryboard(promptPreviewContent.value);
  else await sendAssetExtraction(promptPreviewContent.value);
};
const sendAssetExtraction = async (prompt: string) => {
  const model = llmModels.value.find((item) => item.id === selectedModelByTask.value.assets);
  const template = promptTemplates.value.find((item) => item.id === selectedTemplateByTask.value.assets);
  if (!model || !template || !selectedChapter.value || !project.value || !prompt.trim()) return;
  closePromptPreview();

  const now = Date.now();
  const run: LongProjectAssetExtractionRun = {
    id: uuidv4(), chapterId: selectedChapter.value.id, sourceContent: draftContent.value,
    sourceWordCount: wordCount(draftContent.value), modelId: model.id, templateId: template.id,
    extractionConfig: template.assetExtractionConfig,
    prompt,
    status: "running", candidates: [], createdAt: now, updatedAt: now,
  };
  await persistLongProjectData({ assetExtractionRuns: [...assetExtractionRuns.value, run] });
  activeExtractionRunId.value = run.id;
  try {
    // 章节提取先保存为本章资产，不在提取阶段自动匹配或写入项目公共资产库。
    const result = await extractChapterAssets({ model, template, chapterContent: draftContent.value, existingAssets: [], prompt });
    await updateExtractionRun(run.id, { status: "completed", candidates: result.candidates, rawResponse: result.rawResponse, error: undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "资产提取失败，请重试";
    await updateExtractionRun(run.id, { status: "failed", error: message });
    toast.error(message);
  }
};
const persistLongProjectData = async (changes: Partial<NonNullable<ComicProject["longProjectData"]>>) => {
  if (!project.value) return;
  const current = project.value.longProjectData ?? { nodes: [] };
  const updated: ComicProject = {
    ...project.value,
    // Vue reactive proxies cannot cross Electron IPC. Long-project data is JSON-only.
    longProjectData: JSON.parse(JSON.stringify({ ...current, ...changes })),
    updatedAt: Date.now(),
  };
  await comicDb.saveProject(updated);
  project.value = updated;
};
const persistNodes = async (nextNodes: LongProjectNode[]) => {
  // Computed nodes are Vue reactive proxies; strip them before crossing Electron IPC.
  const serializableNodes = nextNodes.map((node) => ({ ...node }));
  await persistLongProjectData({ nodes: serializableNodes });
};
const toggleFolder = (folderId: string) => { const next = new Set(expandedFolders.value); next.has(folderId) ? next.delete(folderId) : next.add(folderId); expandedFolders.value = next; };
const selectChapter = async (chapter: LongProjectNode) => { if (isDirty.value) await saveCurrentChapter(false); activeExtractionRunId.value = null; selectedAssetCategory.value = null; selectedChapterId.value = chapter.id; draftContent.value = chapter.content ?? ""; contentHistory.value = []; activeTab.value = "source"; };
const selectAssetCategory = async (category: AssetLibraryCategory) => { if (isDirty.value) await saveCurrentChapter(false); activeExtractionRunId.value = null; selectedChapterId.value = null; selectedAssetCategory.value = category; };
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

const updateExtractionRun = async (runId: string, changes: Partial<LongProjectAssetExtractionRun>) => {
  const nextRuns = assetExtractionRuns.value.map((run) => run.id === runId ? { ...run, ...changes, updatedAt: Date.now() } : run);
  await persistLongProjectData({ assetExtractionRuns: nextRuns });
};
const updateExtractionCandidate = (candidate: LongProjectAssetExtractionCandidate) => {
  if (!activeExtractionRun.value) return;
  void updateExtractionRun(activeExtractionRun.value.id, {
    candidates: activeExtractionRun.value.candidates.map((item) => item.id === candidate.id ? candidate : item),
  });
};
const addExtractionCandidate = (candidate: LongProjectAssetExtractionCandidate) => {
  if (!activeExtractionRun.value) return;
  void updateExtractionRun(activeExtractionRun.value.id, { candidates: [...activeExtractionRun.value.candidates, candidate] });
};
const mergeAssetVariants = async ({ assetId, sourceVariantIds, targetVariantId }: { assetId: string; sourceVariantIds: string[]; targetVariantId: string }) => {
  const sourceIds = new Set(sourceVariantIds.filter((id) => id !== targetVariantId));
  if (!sourceIds.size) return;
  const asset = projectAssets.value.find((item) => item.id === assetId);
  const target = asset?.variants.find((item) => item.id === targetVariantId);
  const sources = asset?.variants.filter((item) => sourceIds.has(item.id)) ?? [];
  if (!asset || !sources.length || !target) return;
  const now = Date.now();
  const sourceReferenceIds = sources.flatMap((source) => source.referenceImageIds); const sourceChapterIds = sources.flatMap((source) => source.sourceChapterIds);
  const nextAssets = projectAssets.value.map((item) => item.id !== assetId ? item : { ...item, variants: item.variants.filter((variant) => !sourceIds.has(variant.id)).map((variant) => variant.id !== targetVariantId ? variant : { ...variant, referenceImageIds: uniqueStrings([...variant.referenceImageIds, ...sourceReferenceIds]), sourceChapterIds: uniqueStrings([...variant.sourceChapterIds, ...sourceChapterIds]), updatedAt: now }), updatedAt: now });
  const nextChapterAssets = chapterAssets.value.map((entry) => entry.assetId === assetId && entry.variantId && sourceIds.has(entry.variantId) ? { ...entry, variantId: targetVariantId, appearance: "changed" as const, updatedAt: now } : entry);
  const nextRuns = storyboardRuns.value.map((run) => ({ ...run, panels: run.panels.map((panel) => ({ ...panel, assetBindings: panel.assetBindings.map((binding) => binding.assetId === assetId && binding.visualVersionId && sourceIds.has(binding.visualVersionId) ? { ...binding, visualVersionId: targetVariantId, visualVersionName: target.name, referenceImageIds: uniqueStrings([...target.referenceImageIds, ...sourceReferenceIds]), matchSource: "manual" as const } : binding) })) }));
  await persistLongProjectData({ assets: nextAssets, chapterAssets: nextChapterAssets, storyboardRuns: nextRuns });
  toast.success(`已合并到「${target.name}」`);
};
const splitAssetVariant = async ({ assetId, variantId, name, description, imagePrompt }: { assetId: string; variantId: string; name: string; description: string; imagePrompt: string }) => {
  const asset = projectAssets.value.find((item) => item.id === assetId);
  const variant = asset?.variants.find((item) => item.id === variantId);
  if (!asset || !variant || !selectedChapter.value) return;
  const now = Date.now(); const split = { ...variant, id: uuidv4(), name, description, imagePrompt, firstAppearanceChapterId: selectedChapter.value.id, chapterRange: { startChapterId: selectedChapter.value.id }, sourceChapterIds: uniqueStrings([...variant.sourceChapterIds, selectedChapter.value.id]), createdAt: now, updatedAt: now };
  await persistLongProjectData({ assets: projectAssets.value.map((item) => item.id === assetId ? { ...item, variants: [...item.variants, split], updatedAt: now } : item) });
  toast.success(`已创建状态「${name}」`);
};
const uniqueStrings = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];
const createAssetFromCandidate = (candidate: LongProjectAssetExtractionCandidate, chapterId: string): LongProjectAsset => {
  const now = Date.now();
  return {
    id: uuidv4(), type: candidate.type, name: candidate.name, aliases: uniqueStrings(candidate.aliases),
    description: candidate.description, fixedTraits: [], attributes: candidate.attributes,
    sourceChapterIds: [chapterId], status: "confirmed", scope: "chapter",
    variants: candidate.visualVersion?.name.trim() ? [{
      id: uuidv4(), name: candidate.visualVersion.name.trim(), description: candidate.visualVersion.description,
      firstAppearanceChapterId: chapterId, chapterRange: { startChapterId: chapterId }, tags: candidate.visualVersion.tags, imagePrompt: candidate.visualVersion.imagePrompt,
      referenceImageIds: [], sourceChapterIds: [chapterId], createdAt: now, updatedAt: now,
    }] : [],
    createdAt: now, updatedAt: now,
  };
};
const mergeCandidateIntoAsset = (asset: LongProjectAsset, candidate: LongProjectAssetExtractionCandidate, chapterId: string): LongProjectAsset => {
  const now = Date.now();
  const variants = [...asset.variants];
  const versionName = candidate.visualVersion?.name.trim();
  if (versionName && !variants.some((variant) => variant.name.trim() === versionName)) {
    variants.push({ id: uuidv4(), name: versionName, description: candidate.visualVersion?.description, firstAppearanceChapterId: chapterId, chapterRange: { startChapterId: chapterId }, tags: candidate.visualVersion?.tags, imagePrompt: candidate.visualVersion?.imagePrompt, referenceImageIds: [], sourceChapterIds: [chapterId], createdAt: now, updatedAt: now });
  }
  return {
    ...asset,
    aliases: uniqueStrings([...asset.aliases, ...candidate.aliases]),
    description: asset.description || candidate.description,
    attributes: { ...candidate.attributes, ...asset.attributes },
    sourceChapterIds: uniqueStrings([...asset.sourceChapterIds, chapterId]),
    variants,
    updatedAt: now,
  };
};
const confirmAssetExtraction = async () => {
  const run = activeExtractionRun.value;
  const chapter = selectedChapter.value;
  if (!run || !chapter) return;
  if (run.candidates.some((candidate) => candidate.decision === "merge" && !candidate.suggestedAssetId)) {
    toast.error("请为所有“合并已有资产”的候选项选择目标资产");
    return;
  }
  let nextAssets = projectAssets.value.map((asset) => ({ ...asset, variants: [...asset.variants] }));
  const nextChapterAssets = chapterAssets.value.filter((entry) => entry.sourceExtractionRunId !== run.id);
  const resolvedAssetIds = new Map<string, string>();
  for (const candidate of run.candidates) {
    if (candidate.decision === "ignore" || candidate.decision === "pending") continue;
    const parent = candidate.stateParentCandidateId ? run.candidates.find((item) => item.id === candidate.stateParentCandidateId) : undefined;
    const parentAssetId = parent ? (resolvedAssetIds.get(parent.id) ?? parent.suggestedAssetId) : undefined;
    if (candidate.decision === "create" && !parentAssetId) {
      const asset = createAssetFromCandidate(candidate, chapter.id);
      nextAssets.push(asset);
      resolvedAssetIds.set(candidate.id, asset.id);
    } else {
      const assetId = parentAssetId ?? candidate.suggestedAssetId;
      const previous = nextAssets.find((asset) => asset.id === assetId);
      if (!assetId || !previous) continue;
      const stateMergeTarget = candidate.stateMergeTargetCandidateId ? run.candidates.find((item) => item.id === candidate.stateMergeTargetCandidateId) : undefined;
      const candidateToMerge = stateMergeTarget ? { ...candidate, visualVersion: undefined } : candidate;
      nextAssets = nextAssets.map((asset) => asset.id === assetId ? mergeCandidateIntoAsset(asset, candidateToMerge, chapter.id) : asset);
      resolvedAssetIds.set(candidate.id, assetId);
    }
    const assetId = resolvedAssetIds.get(candidate.id)!;
    const asset = nextAssets.find((item) => item.id === assetId);
    const stateMergeTarget = candidate.stateMergeTargetCandidateId ? run.candidates.find((item) => item.id === candidate.stateMergeTargetCandidateId) : undefined;
    const variantName = stateMergeTarget?.visualVersion?.name.trim() || candidate.visualVersion?.name.trim();
    const variant = variantName ? asset?.variants.find((item) => item.name.trim() === variantName) : undefined;
    nextChapterAssets.push({ id: uuidv4(), chapterId: chapter.id, assetId, variantId: variant?.id, appearance: candidate.stateParentCandidateId || candidate.decision === "merge" ? "reused" : "introduced", evidence: candidate.evidence, sourceExtractionRunId: run.id, createdAt: Date.now(), updatedAt: Date.now() });
  }
  const nextRuns = assetExtractionRuns.value.map((item) => item.id === run.id ? { ...item, status: "confirmed" as const, updatedAt: Date.now() } : item);
  const nextNodes = nodes.value.map((node) => node.id === chapter.id ? { ...node, stage: "assets-ready" as const, updatedAt: Date.now() } : node);
  await persistLongProjectData({ assets: nextAssets, chapterAssets: nextChapterAssets, assetExtractionRuns: nextRuns, nodes: nextNodes });
  activeExtractionRunId.value = null;
  activeTab.value = "assets";
  toast.success("已写入项目资产库，并建立本章引用");
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

const formatContent = (operation: "empty-lines" | "line-numbers" | "merge-lines" | "indent" | "trim-lines") => {
  const source = draftContent.value;
  let formatted = source;
  if (operation === "empty-lines") formatted = source.replace(/\n[\t \u3000]*\n(?:[\t \u3000]*\n)+/g, "\n\n");
  if (operation === "line-numbers") formatted = source.replace(/^[\t \u3000 ]*(?:\d+[.、)]|[（(]\d+[）)]|[一二三四五六七八九十]+[、.])[\t \u3000 ]*/gm, "");
  if (operation === "indent") formatted = source.replace(/^[\t \u3000 ]+/gm, "");
  if (operation === "trim-lines") formatted = source.replace(/[\t \u3000 ]+$/gm, "");
  if (operation === "merge-lines") {
    formatted = source.split(/\r?\n/).reduce<string[]>((paragraphs, line) => {
      const text = line.trim();
      if (!text) { if (paragraphs.at(-1) !== "") paragraphs.push(""); return paragraphs; }
      if (!paragraphs.length || paragraphs.at(-1) === "") paragraphs.push(text);
      else paragraphs[paragraphs.length - 1] += text;
      return paragraphs;
    }, []).join("\n");
  }
  if (formatted === source) return;
  contentHistory.value = [...contentHistory.value.slice(-19), source];
  draftContent.value = formatted;
};

const undoFormat = () => {
  const previous = contentHistory.value.at(-1);
  if (previous === undefined) return;
  contentHistory.value = contentHistory.value.slice(0, -1);
  draftContent.value = previous;
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
    project.value = await comicDb.getProject(projectId);
    if (!project.value || project.value.projectType !== "long") { await router.replace("/comic/projects"); return; }
    expandedFolders.value = new Set(nodes.value.filter((node) => node.type === "folder").map((node) => node.id));
    [models.value, promptTemplates.value] = await Promise.all([
      comicDb.getAllModelConfigs(),
      comicDb.getAllPromptTemplates(),
    ]);
    const defaultModelId = llmModels.value[0]?.id ?? "";
    const defaultAssetTemplateId = promptTemplates.value.find((template) => template.type === "extract")?.id ?? "";
    const defaultStoryboardTemplateId = promptTemplates.value.find((template) => template.type === "storyboard")?.id ?? "";
    selectedModelByTask.value = { assets: defaultModelId, storyboard: defaultModelId };
    selectedTemplateByTask.value = { assets: defaultAssetTemplateId, storyboard: defaultStoryboardTemplateId };
  } finally { loading.value = false; }
});
</script>

<style scoped>
.icon-button, .sidebar-icon { display: flex; width: 2rem; height: 2rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 0.5rem; color: var(--text-secondary); transition: color 0.15s ease, background-color 0.15s ease; }
.sidebar-icon { width: 2.25rem; height: 2.25rem; }
.icon-button:hover, .sidebar-icon:hover { color: var(--text-primary); background: var(--bg-elevated); }
.primary-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.5rem; background: #06b6d4; padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 500; color: #020617; transition: background-color 0.15s ease; }
.primary-button:hover { background: #22d3ee; }
.primary-button:disabled { cursor: not-allowed; opacity: 0.4; }
.editor-tool { display: flex; height: 1.875rem; align-items: center; gap: 0.3125rem; justify-content: center; border-radius: 0.375rem; padding: 0 0.5rem; color: var(--text-secondary); font-size: 0.75rem; transition: color 0.15s ease, background-color 0.15s ease; }
.editor-tool:hover:not(:disabled) { background: var(--bg-elevated); color: #67e8f9; }
.editor-tool:disabled { cursor: not-allowed; opacity: 0.35; }
.task-select { width: 100%; height: 2.25rem; border: 1px solid var(--border-subtle); border-radius: 0.375rem; background: var(--bg-app); padding: 0 0.625rem; color: var(--text-secondary); font-size: 0.75rem; outline: none; }
.task-select:focus { border-color: rgba(34, 211, 238, 0.55); color: var(--text-primary); }
.task-run-button { height: 2.25rem; padding-top: 0; padding-bottom: 0; }
.format-menu-action { display: flex; width: 100%; align-items: center; gap: 0.5rem; border-radius: 0.25rem; padding: 0.5rem 0.625rem; text-align: left; font-size: 0.75rem; color: var(--text-secondary); }
.format-menu-action:hover { background: var(--bg-elevated); color: var(--text-primary); }
.context-action { display: flex; width: 100%; align-items: center; gap: 0.5rem; border-radius: 0.375rem; padding: 0.5rem 0.625rem; text-align: left; font-size: 0.75rem; color: var(--text-secondary); transition: color 0.15s ease, background-color 0.15s ease; }
.context-action:hover { background: var(--bg-elevated); color: var(--text-primary); }
.extraction-ring { animation: extraction-ring 1.8s ease-out infinite; }
.extraction-step-icon { animation: extraction-step 1.5s ease-in-out infinite; }
.extraction-step-icon:nth-child(1) { animation-delay: 0.2s; }
.loading-dot { width: 0.3rem; height: 0.3rem; border-radius: 999px; background: #22d3ee; animation: loading-dot 1.2s ease-in-out infinite; }
.loading-dot:nth-child(2) { animation-delay: 0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes extraction-ring { 0% { opacity: 0.8; transform: scale(0.88); } 100% { opacity: 0; transform: scale(1.28); } }
@keyframes extraction-step { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
@keyframes loading-dot { 0%, 100% { transform: translateY(0); opacity: 0.35; } 50% { transform: translateY(-0.2rem); opacity: 1; } }
</style>
