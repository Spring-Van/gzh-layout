<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <!-- 资产子 tab：信息 | 图片 | 生图工作台（右侧进度概览；提取操作区在页面顶栏） -->
    <nav class="flex h-10 shrink-0 items-center gap-1 border-b border-border-subtle bg-surface px-4">
      <button
        v-for="tab in assetTabs"
        :key="tab.id"
        class="flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs transition-colors"
        :class="view === tab.id ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-muted hover:bg-app-bg hover:text-text-secondary'"
        @click="emit('update:view', tab.id)"
      >
        <component :is="tab.icon" :size="13" />
        {{ tab.label }}
      </button>

      <div class="ml-auto flex items-center gap-2">
        <span class="rounded border border-border-subtle bg-app-bg px-1.5 py-0.5 text-[11px] text-text-secondary" title="已有绘画提示词的视觉状态数">提示词 {{ promptProgress }}</span>
        <span class="rounded border border-border-subtle bg-app-bg px-1.5 py-0.5 text-[11px] text-text-secondary" title="已生成参考图的视觉状态数">生成图 {{ imageProgress }}</span>
      </div>
    </nav>

    <!-- 信息 tab：提取结果独立成页（主体：审核 / 提取中 / 失败 / 空态） -->
    <div v-if="view === 'info'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <LongProjectAssetExtractionReview
        v-if="latestRun && (latestRun.status === 'completed' || latestRun.status === 'confirmed')"
        :candidates="latestRun.candidates"
        :assets="assets"
        @update="updateExtractionCandidate"
      />

      <!-- 提取中 -->
      <div v-else-if="latestRun?.status === 'running'" class="flex flex-1 items-center justify-center p-8 text-center">
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
      <div v-else-if="latestRun?.status === 'failed'" class="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <ScanText :size="28" class="mx-auto mb-4 text-red-400" />
          <h2 class="text-base font-medium text-text-primary">资产提取失败</h2>
          <p class="mx-auto mt-2 max-w-lg text-sm text-text-secondary">{{ latestRun.error || '请求未能完成，请检查模型配置与提示词后重试。' }}</p>
          <div class="mt-5 flex justify-center gap-3">
            <button class="primary-button h-9 px-4 text-xs" @click="emit('retry-extraction')">重新提取</button>
          </div>
        </div>
      </div>

      <!-- 空态 -->
      <div v-else class="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-lg border border-border-subtle bg-surface"><ScanText :size="24" class="text-text-muted" /></div>
        <h3 class="mt-4 text-sm font-medium text-text-primary">本章尚未提取资产</h3>
        <p class="mt-2 max-w-sm text-xs leading-5 text-text-secondary">在页面顶部选择模型与模板执行「提取资产」，结合原文分析、剧本与分镜，识别需要固定长相的人物、场景和道具。</p>
      </div>
    </div>

    <!-- 图片 tab：本章资产浏览 -->
    <div v-else-if="view === 'images'" class="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
      <LongProjectChapterAssets :entries="selectedChapterAssets" :assets="assets" />
    </div>

    <!-- 生图工作台 tab -->
    <LongProjectAssetWorkbench
      v-else
      ref="workbenchRef"
      :assets="workbenchAssets"
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
  </div>
</template>

<script setup lang="ts">
/**
 * 生图工作台「资产」页签容器：三子 tab「信息 | 图片 | 生图工作台」。
 * - 信息：资产提取结果独立成页（主体为提取审核/加载/失败/空态）；
 *   提取操作区（PromptRunBar）与「确认本章资产」按钮在页面顶栏，重试通过 retry-extraction 事件回调页面。
 * - 图片：本章资产浏览（LongProjectChapterAssets）。
 * - 生图工作台：资产视觉状态的提示词/参考图生产，批量操作按钮由页面顶栏承载。
 * 提取输入 = 原文 + 原文分析 + 剧本 + 分镜概要 + 已有资产；
 * 确认后写回资产与章节引用，并按文本自动回填本章分镜绑定。
 */
import { computed, ref } from "vue";
import { FileText, Images, LoaderCircle, MapPin, Package, Palette, ScanText, UserRound } from "lucide-vue-next";
import LongProjectAssetExtractionReview from "@comic/components/LongProjectAssetExtractionReview.vue";
import LongProjectChapterAssets from "@comic/components/LongProjectChapterAssets.vue";
import LongProjectAssetWorkbench from "@comic/components/LongProjectAssetWorkbench.vue";
import { useToast } from "@comic/composables/useToast";
import { countCandidatesAppearances } from "@comic/services/assetExtractionService";
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

/** 资产子 tab 类型。 */
export type AssetView = "info" | "images" | "workbench";

/** 阶段推进顺序：确认资产只升不降，避免把已到分镜/成图阶段的章节打回。 */
const stageOrder: LongChapterStage[] = ["empty", "source-ready", "analysis-ready", "script-ready", "assets-ready", "storyboard-ready", "prompts-ready", "completed"];

const props = defineProps<{
  chapter: LongProjectNode;
  /** 当前资产子 tab（v-model:view）。 */
  view: AssetView;
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

const emit = defineEmits<{
  (e: "update:view", value: AssetView): void;
  /** 失败视图「重新提取」：由页面沿用上次提示词重跑。 */
  (e: "retry-extraction"): void;
}>();

const toast = useToast();
const workbenchRef = ref<InstanceType<typeof LongProjectAssetWorkbench> | null>(null);

const assetTabs: Array<{ id: AssetView; label: string; icon: typeof FileText }> = [
  { id: "info", label: "信息", icon: FileText },
  { id: "workbench", label: "生图工作台", icon: Palette },
  { id: "images", label: "图片", icon: Images },
];

const loadingSteps = [
  { label: "人物", icon: UserRound },
  { label: "场景", icon: MapPin },
  { label: "道具", icon: Package },
];

const llmModels = computed(() => props.models.filter((model) => model.category === "llm"));
const imageModels = computed(() => props.models.filter((model) => model.category === "image"));

const chapterRuns = computed(() =>
  props.assetExtractionRuns
    .filter((run) => run.chapterId === props.chapter.id)
    .sort((a, b) => b.updatedAt - a.updatedAt));
/** 信息 tab 固定展示本章最近一次提取 run（无需手动打开）。 */
const latestRun = computed(() => chapterRuns.value[0] ?? null);
const selectedChapterAssets = computed(() => props.chapterAssets.filter((entry) => entry.chapterId === props.chapter.id));

// ========== 进度概览（tab 栏右侧 chips） ==========

/** 工作台资产：按章节引用过滤出本章相关的 variants（与分镜生成同一口径）。 */
const workbenchAssets = computed(() => {
  if (!selectedChapterAssets.value.length) return props.assets;
  return props.assets.flatMap((asset) => {
    const entries = selectedChapterAssets.value.filter((entry) => entry.assetId === asset.id);
    if (!entries.length) return [];
    const variantIds = new Set(entries.map((entry) => entry.variantId).filter((id): id is string => Boolean(id)));
    return [{ ...asset, variants: variantIds.size ? asset.variants.filter((variant) => variantIds.has(variant.id)) : asset.variants }];
  });
});

const totalVariants = computed(() => workbenchAssets.value.reduce((count, asset) => count + asset.variants.length, 0));
const promptProgress = computed(() => `${workbenchAssets.value.reduce((count, asset) => count + asset.variants.filter((v) => v.imagePrompt?.trim()).length, 0)}/${totalVariants.value}`);
const imageProgress = computed(() => `${workbenchAssets.value.reduce((count, asset) => count + asset.variants.filter((v) => (v.generatedImageIds ?? []).length).length, 0)}/${totalVariants.value}`);

// ========== 审核与确认 ==========

/** 持久化更新提取 run 的部分字段。 */
function updateRun(runId: string, changes: Partial<LongProjectAssetExtractionRun>) {
  return props.mutateLongProjectData((data) => {
    data.assetExtractionRuns = (data.assetExtractionRuns ?? []).map((run) => run.id === runId ? { ...run, ...changes, updatedAt: Date.now() } : run);
  });
}

/** 审核页编辑候选：名称/别名变化时重算分镜出现次数。 */
function updateExtractionCandidate(candidate: LongProjectAssetExtractionRun["candidates"][number]) {
  const run = latestRun.value;
  if (!run) return;
  const candidates = run.candidates.map((item) => item.id === candidate.id ? candidate : item);
  const counts = countCandidatesAppearances(candidates, props.panels);
  void updateRun(run.id, {
    candidates: candidates.map((item) => ({ ...item, panelAppearances: counts[item.id] ?? 0 })),
  });
}

/** 确认提取结果：写回资产/章节引用，回填分镜绑定，推进章节阶段（由页面顶栏触发）。 */
async function confirmExtraction() {
  const run = latestRun.value;
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
  toast.success("已确认本章资产，分镜绑定已自动回填");
}

// ========== 生图工作台回写 ==========

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

// ========== 暴露给页面顶栏：按子 tab 切换的操作按钮所需状态与方法 ==========

defineExpose({
  /** 信息 tab：是否存在待确认的提取结果（最近一次 run 已完成未确认）。 */
  canConfirmReview: computed(() => latestRun.value?.status === "completed"),
  /** 信息 tab：确认本章资产。 */
  confirmReview: () => { void confirmExtraction(); },
  /** 生图工作台 tab：工作台实例（批量操作按钮转发；非工作台 tab 时为 null）。 */
  workbench: computed(() => (props.view === "workbench" ? workbenchRef.value : null)),
});
</script>

<style scoped>
.primary-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.5rem; background: #06b6d4; padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 500; color: #020617; transition: background-color 0.15s ease; }
.primary-button:hover { background: #22d3ee; }
.extraction-ring { animation: extraction-ring 1.8s ease-out infinite; }
.extraction-step-icon { animation: extraction-step 1.5s ease-in-out infinite; }
.loading-dot { width: 0.3rem; height: 0.3rem; border-radius: 999px; background: #22d3ee; animation: extraction-loading-dot 1.2s ease-in-out infinite; }
.loading-dot:nth-child(2) { animation-delay: 0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes extraction-ring { 0% { opacity: 0.8; transform: scale(0.88); } 100% { opacity: 0; transform: scale(1.28); } }
@keyframes extraction-step { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
@keyframes extraction-loading-dot { 0%, 100% { transform: translateY(0); opacity: 0.35; } 50% { transform: translateY(-0.2rem); opacity: 1; } }
</style>
