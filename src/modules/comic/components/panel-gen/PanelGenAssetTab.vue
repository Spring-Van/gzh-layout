<template>
  <div class="flex h-full min-h-0 flex-col gap-3 p-3">
    <!-- 提取入口卡：状态条 + 执行栏 -->
    <section class="shrink-0 space-y-2.5 rounded-xl border border-border-subtle bg-surface px-4 py-3 shadow-lg shadow-black/20">
      <div class="flex items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-2 text-xs">
          <ScanText :size="14" :class="extractionStatus?.tone" />
          <span class="shrink-0 text-text-secondary">资产提取</span>
          <span class="truncate" :class="extractionStatus?.tone">{{ extractionStatus?.message ?? '尚未提取' }}</span>
        </div>
        <button v-if="continueEditingRun" class="shrink-0 text-xs text-cyan-400 hover:text-cyan-300" title="继续编辑最近一次资产提取结果" @click="openRun(continueEditingRun)">继续编辑</button>
      </div>
      <PromptRunBar
        v-model:model-id="modelId"
        v-model:template-id="templateId"
        :models="llmModels"
        :templates="extractTemplates"
        :action-label="chapterRuns.length ? '重新提取' : '提取资产'"
        :disabled="!chapterContent.trim() || !modelId || !templateId"
        :busy="activeRun?.status === 'running'"
        confirm-storage-key="comic-long-extract-confirm"
        :build-prompt="buildPrompt"
        @run="runExtraction"
      />
    </section>

    <!-- 主体：审核区（运行/失败/审核）或资产生图工作台 -->
    <section class="min-h-0 flex-1 overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg shadow-black/20">
      <!-- 审核页 -->
      <LongProjectAssetExtractionReview
        v-if="activeRun && (activeRun.status === 'completed' || activeRun.status === 'confirmed')"
        :chapter-name="chapter.name"
        :source-word-count="activeRun.sourceWordCount"
        :candidates="activeRun.candidates"
        :assets="assets"
        @update="updateExtractionCandidate"
        @back="activeRunId = null"
        @confirm="confirmExtraction"
      />

      <!-- 提取中 -->
      <div v-else-if="activeRun?.status === 'running'" class="flex h-full items-center justify-center p-8 text-center">
        <div class="w-full max-w-sm">
          <div class="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10">
            <span class="absolute inset-0 rounded-lg border border-cyan-400/40 extraction-ring" />
            <LoaderCircle :size="26" class="animate-spin text-cyan-400" />
          </div>
          <h2 class="text-base font-medium text-text-primary">正在提取章节资产</h2>
          <p class="mt-2 text-sm text-text-secondary">结合原文分析、剧本与分镜，识别需要保持一致的人物、场景和道具。</p>
          <div class="mt-7 grid grid-cols-3 gap-2 text-left">
            <div v-for="step in loadingSteps" :key="step.label" class="rounded-md border border-border-subtle bg-surface px-3 py-3">
              <component :is="step.icon" :size="16" class="mb-2 text-cyan-400 extraction-step-icon" />
              <p class="text-xs text-text-primary">{{ step.label }}</p>
              <p class="mt-1 text-[11px] text-text-muted">处理中</p>
            </div>
          </div>
          <div class="mx-auto mt-5 flex items-center justify-center gap-1.5 text-xs text-text-muted"><span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" /><span class="ml-1">大模型生成中</span></div>
        </div>
      </div>

      <!-- 提取失败 -->
      <div v-else-if="activeRun?.status === 'failed'" class="flex h-full items-center justify-center p-8 text-center">
        <div>
          <ScanText :size="28" class="mx-auto mb-4 text-red-400" />
          <h2 class="text-base font-medium text-text-primary">资产提取失败</h2>
          <p class="mx-auto mt-2 max-w-lg text-sm text-text-secondary">{{ activeRun.error || '请求未能完成，请检查模型配置与提示词后重试。' }}</p>
          <div class="mt-5 flex justify-center gap-3">
            <button class="secondary-button" @click="activeRunId = null">返回工作台</button>
            <button class="primary-button h-9 px-4 text-xs" @click="retryExtraction">重新提取</button>
          </div>
        </div>
      </div>

      <!-- 资产生图工作台 -->
      <LongProjectAssetTab
        v-else
        :entries="selectedChapterAssets"
        :assets="assets"
        :chapter-id="chapter.id"
        :llm-models="llmModels"
        :image-models="imageModels"
        :templates="templates"
        :asset-gen-config="assetGenConfig"
        :painting-style="paintingStyle"
        :shared-blocks="sharedBlocks"
        @update:asset="updateAssetVariant"
        @update:gen-config="updateAssetGenConfig"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 生图工作台「资产」页签容器：
 * 顶部提取入口卡（状态条 + PromptRunBar），主体按提取状态切换
 * 审核页 / 加载态 / 失败重试 / 资产生图工作台。
 * 提取输入 = 原文 + 原文分析 + 剧本 + 分镜概要 + 已有资产；
 * 确认后写回资产与章节引用，并按文本自动回填本章分镜绑定。
 */
import { computed, ref } from "vue";
import { v4 as uuidv4 } from "uuid";
import { LoaderCircle, MapPin, Package, ScanText, UserRound } from "lucide-vue-next";
import PromptRunBar from "@comic/components/common/PromptRunBar.vue";
import LongProjectAssetExtractionReview from "@comic/components/LongProjectAssetExtractionReview.vue";
import LongProjectAssetTab from "@comic/components/LongProjectAssetTab.vue";
import { useToast } from "@comic/composables/useToast";
import { buildAssetExtractionPrompt, countCandidatesAppearances, extractChapterAssets } from "@comic/services/assetExtractionService";
import { backfillPanelAutoBindings, buildExtractionConfirmResult } from "@comic/services/assetExtractionConfirm";
import type {
  AssetGenConfig,
  ComicProject,
  LongChapterStage,
  LongProjectAsset,
  LongProjectAssetExtractionRun,
  LongProjectAssetVariant,
  LongProjectChapterAsset,
  LongProjectNode,
  LongProjectStoryboardPanel,
  ModelConfig,
  PromptTemplate,
  SharedPromptBlock,
} from "@comic/types";

/** 阶段推进顺序：确认资产只升不降，避免把已到分镜/成图阶段的章节打回。 */
const stageOrder: LongChapterStage[] = ["empty", "source-ready", "analysis-ready", "script-ready", "assets-ready", "storyboard-ready", "prompts-ready", "completed"];

const props = defineProps<{
  chapter: LongProjectNode;
  /** 本章分镜（用于提取上下文与出现次数统计）。 */
  panels: LongProjectStoryboardPanel[];
  analysisContent: string;
  scriptContent: string;
  models: ModelConfig[];
  templates: PromptTemplate[];
  assets: LongProjectAsset[];
  chapterAssets: LongProjectChapterAsset[];
  assetExtractionRuns: LongProjectAssetExtractionRun[];
  assetGenConfig?: AssetGenConfig;
  paintingStyle?: string;
  sharedBlocks?: SharedPromptBlock[];
  mutateLongProjectData: (mutate: (data: NonNullable<ComicProject["longProjectData"]>) => void) => Promise<void>;
}>();

const toast = useToast();
const activeRunId = ref<string | null>(null);
const modelId = ref("");
const templateId = ref("");

const chapterContent = computed(() => props.chapter.content ?? "");
const llmModels = computed(() => props.models.filter((model) => model.category === "llm"));
const imageModels = computed(() => props.models.filter((model) => model.category === "image"));
const extractTemplates = computed(() => props.templates.filter((template) => template.type === "extract").sort((a, b) => a.sortOrder - b.sortOrder));

/** 初始化提取环节的模型/模板默认选择。 */
function initDefaults() {
  modelId.value = llmModels.value[0]?.id ?? "";
  templateId.value = extractTemplates.value[0]?.id ?? "";
}
initDefaults();

const chapterRuns = computed(() =>
  props.assetExtractionRuns
    .filter((run) => run.chapterId === props.chapter.id)
    .sort((a, b) => b.updatedAt - a.updatedAt));
const activeRun = computed(() => chapterRuns.value.find((run) => run.id === activeRunId.value) ?? null);
const continueEditingRun = computed(() => chapterRuns.value.find((run) => run.status === "completed" || run.status === "confirmed") ?? null);
const selectedChapterAssets = computed(() => props.chapterAssets.filter((entry) => entry.chapterId === props.chapter.id));

/** 提取状态条（参考重要性：运行/待审核/已确认/失败）。 */
const extractionStatus = computed(() => {
  const runs = chapterRuns.value;
  const running = runs.find((run) => run.status === "running");
  if (running) return { tone: "text-cyan-400", message: "正在提取中" };
  const pending = runs.find((run) => run.status === "completed");
  if (pending) {
    const outdated = pending.sourceContent !== chapterContent.value;
    return { tone: outdated ? "text-amber-300" : "text-cyan-400", message: outdated ? `待审核 ${pending.candidates.length} 项 · 原文已变更` : `待审核 ${pending.candidates.length} 项` };
  }
  const confirmed = runs.find((run) => run.status === "confirmed");
  if (confirmed) return { tone: "text-emerald-400", message: `已确认 ${confirmed.candidates.length} 项资产` };
  const failed = runs.find((run) => run.status === "failed");
  if (failed) return { tone: "text-red-400", message: "上次提取失败" };
  return null;
});

const loadingSteps = [
  { label: "人物", icon: UserRound },
  { label: "场景", icon: MapPin },
  { label: "道具", icon: Package },
];

/** 打开某个提取 run 的审核页。 */
function openRun(run: LongProjectAssetExtractionRun) {
  activeRunId.value = run.id;
}

/** 生成最终发送提示词：原文 + 分析 + 剧本 + 分镜概要 + 已有资产。 */
function buildPrompt(): string {
  const template = extractTemplates.value.find((item) => item.id === templateId.value);
  return buildAssetExtractionPrompt(template?.content ?? "", chapterContent.value, {
    analysis: props.analysisContent,
    script: props.scriptContent,
    panelsOutline: props.panels.length ? props.panels.map((panel) => `分镜${panel.order}：${panel.content}`).join("\n") : undefined,
    existingAssets: props.assets,
  });
}

/** 持久化更新提取 run 的部分字段。 */
function updateRun(runId: string, changes: Partial<LongProjectAssetExtractionRun>) {
  return props.mutateLongProjectData((data) => {
    data.assetExtractionRuns = (data.assetExtractionRuns ?? []).map((run) => run.id === runId ? { ...run, ...changes, updatedAt: Date.now() } : run);
  });
}

/** 执行资产提取（PromptRunBar 已完成发送前确认，prompt 为最终版）。 */
async function runExtraction(prompt: string) {
  const model = llmModels.value.find((item) => item.id === modelId.value);
  const template = extractTemplates.value.find((item) => item.id === templateId.value);
  if (!model || !template || !prompt.trim()) return;
  const now = Date.now();
  const run: LongProjectAssetExtractionRun = {
    id: uuidv4(), chapterId: props.chapter.id, sourceContent: chapterContent.value,
    sourceWordCount: chapterContent.value.replace(/\s/g, "").length,
    modelId: model.id, templateId: template.id, extractionConfig: template.assetExtractionConfig,
    prompt, status: "running", candidates: [], createdAt: now, updatedAt: now,
  };
  await props.mutateLongProjectData((data) => {
    data.assetExtractionRuns = [...(data.assetExtractionRuns ?? []), run];
  });
  activeRunId.value = run.id;
  try {
    const result = await extractChapterAssets({
      model, template, chapterContent: chapterContent.value,
      existingAssets: props.assets,
      analysis: props.analysisContent, script: props.scriptContent,
      panels: props.panels, prompt,
    });
    await updateRun(run.id, { status: "completed", candidates: result.candidates, rawResponse: result.rawResponse, error: undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "资产提取失败，请重试";
    await updateRun(run.id, { status: "failed", error: message });
    toast.error(message);
  }
}

/** 失败态的「重新提取」：沿用上次发送的最终提示词。 */
function retryExtraction() {
  const run = activeRun.value;
  if (!run?.prompt) return;
  void runExtraction(run.prompt);
}

/** 审核页编辑候选：名称/别名变化时重算分镜出现次数。 */
function updateExtractionCandidate(candidate: LongProjectAssetExtractionRun["candidates"][number]) {
  const run = activeRun.value;
  if (!run) return;
  const candidates = run.candidates.map((item) => item.id === candidate.id ? candidate : item);
  const counts = countCandidatesAppearances(candidates, props.panels);
  void updateRun(run.id, {
    candidates: candidates.map((item) => ({ ...item, panelAppearances: counts[item.id] ?? 0 })),
  });
}

/** 确认提取结果：写回资产/章节引用，回填分镜绑定，推进章节阶段。 */
async function confirmExtraction() {
  const run = activeRun.value;
  if (!run) return;
  if (run.candidates.some((candidate) => candidate.decision === "merge" && !candidate.suggestedAssetId)) {
    toast.error("请为所有“合并已有资产”的候选项选择目标资产");
    return;
  }
  const chapterId = props.chapter.id;
  await props.mutateLongProjectData((data) => {
    const result = buildExtractionConfirmResult(run, chapterId, data.assets ?? [], data.chapterAssets ?? []);
    data.assets = result.assets;
    data.chapterAssets = result.chapterAssets;
    data.assetExtractionRuns = (data.assetExtractionRuns ?? []).map((item) => item.id === run.id ? { ...item, status: "confirmed" as const, updatedAt: Date.now() } : item);
    data.nodes = (data.nodes ?? []).map((node) => {
      if (node.id !== chapterId) return node;
      const current = stageOrder.indexOf(node.stage ?? "empty");
      return current < stageOrder.indexOf("assets-ready")
        ? { ...node, stage: "assets-ready" as const, updatedAt: Date.now() }
        : { ...node, updatedAt: Date.now() };
    });
    // 按文本自动回填本章已完成分镜的资产绑定
    const chapterOrders = Object.fromEntries(
      (data.nodes ?? []).filter((node) => node.type === "chapter")
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
        .map((node, index) => [node.id, index]),
    );
    data.storyboardRuns = (data.storyboardRuns ?? []).map((item) =>
      item.chapterId === chapterId && item.status === "completed"
        ? { ...item, panels: backfillPanelAutoBindings(item.panels, result.assets, chapterId, chapterOrders), updatedAt: Date.now() }
        : item)
  });
  activeRunId.value = null;
  toast.success("已确认本章资产，分镜绑定已自动回填");
}

/** 资产工作台回写：在持久化队列内基于最新数据 patch 视觉状态。 */
function updateAssetVariant(payload: { assetId: string; variantId: string; patch: Partial<LongProjectAssetVariant> }) {
  void props.mutateLongProjectData((data) => {
    data.assets = (data.assets ?? []).map((asset) => {
      if (asset.id !== payload.assetId) return asset;
      if (!asset.variants.some((item) => item.id === payload.variantId)) return asset;
      return {
        ...asset,
        variants: asset.variants.map((item) => item.id === payload.variantId ? { ...item, ...payload.patch, updatedAt: Date.now() } : item),
        updatedAt: Date.now(),
      };
    });
  });
}

/** 保存资产生图配置（项目级默认）。 */
function updateAssetGenConfig(config: AssetGenConfig) {
  void props.mutateLongProjectData((data) => {
    data.assetGenConfig = JSON.parse(JSON.stringify(config));
  });
}
</script>

<style scoped>
.primary-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.5rem; background: #06b6d4; padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 500; color: #020617; transition: background-color 0.15s ease; }
.primary-button:hover { background: #22d3ee; }
.secondary-button { display: flex; height: 2.25rem; align-items: center; justify-content: center; gap: 0.4rem; border-radius: 0.5rem; border: 1px solid var(--border-default); padding: 0 1rem; font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary); transition: color 0.15s ease, border-color 0.15s ease; background: transparent; }
.secondary-button:hover { color: var(--text-primary); border-color: var(--border-strong); }
.extraction-ring { animation: extraction-ring 1.8s ease-out infinite; }
.extraction-step-icon { animation: extraction-step 1.5s ease-in-out infinite; }
.loading-dot { width: 0.3rem; height: 0.3rem; border-radius: 999px; background: #22d3ee; animation: extraction-loading-dot 1.2s ease-in-out infinite; }
.loading-dot:nth-child(2) { animation-delay: 0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes extraction-ring { 0% { opacity: 0.8; transform: scale(0.88); } 100% { opacity: 0; transform: scale(1.28); } }
@keyframes extraction-step { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
@keyframes extraction-loading-dot { 0%, 100% { transform: translateY(0); opacity: 0.35; } 50% { transform: translateY(-0.2rem); opacity: 1; } }
</style>
