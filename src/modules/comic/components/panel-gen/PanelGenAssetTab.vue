<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <!-- 资产子 tab：信息 | 图片 | 生图工作台；右侧由父组件注入操作按钮（#actions） -->
    <nav class="flex h-12 shrink-0 items-center gap-1 border-b border-border-subtle bg-surface px-4">
      <button
        v-for="tab in assetTabs"
        :key="tab.id"
        class="flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs transition-colors"
        :class="view === tab.id ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-muted hover:bg-app-bg hover:text-text-secondary'"
        @click="emit('update:view', tab.id)"
      >
        <component :is="tab.icon" :size="13" />
        {{ tab.label }}
        <!-- 工作台进度提示（原有右侧两枚 chips 收纳到 tab 标签上） -->
        <span
          v-if="tab.id === 'workbench' && totalVariants"
          class="text-[10px] text-text-muted"
          :title="`已有绘画提示词的视觉状态 ${promptProgress}，已生成参考图的视觉状态 ${imageProgress}`"
        >提示词 {{ promptProgress }} · 生成图 {{ imageProgress }}</span>
      </button>

      <div class="ml-auto flex min-w-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </nav>

    <!-- 信息 tab：提取结果独立成页（主体：审核 / 提取中 / 失败 / 空态） -->
    <div v-if="view === 'info'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <!-- 无分镜提示（新管线下资产先于分镜提取，属正常路径）：出现次数按剧本文本统计 -->
      <div v-if="!panels.length" class="flex shrink-0 items-start gap-2 border-b border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-300">
        <Info :size="14" class="mt-0.5 shrink-0" />
        <p>资产在分镜之前提取（新管线正常顺序）：基于原文（或剧本兜底）、分析与剧本上下文提取；候选出现次数按剧本文本统计，生成资产参考图后进入分镜。</p>
      </div>

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
        <p class="mt-2 max-w-sm text-xs leading-5 text-text-secondary">在页面顶部选择模型与模板执行「提取资产」，结合原文分析、剧本与分镜，识别需要固定长相的人物、场景和道具。也可在执行栏「发送前确认」弹窗内复制提示词到外部 AI，再把结果导入进来。</p>
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
      :all-assets="assets"
      :llm-models="llmModels"
      :image-models="imageModels"
      :templates="templates"
      :asset-gen-config="assetGenConfig"
      :painting-style="paintingStyle"
      :shared-blocks="sharedBlocks"
      :orphan-count="orphanCount"
      :usage="assetUsage"
      @update:asset="updateAssetVariant"
      @update:gen-config="updateAssetGenConfig"
      @clear-orphans="clearOrphans"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 生图工作台「资产」页签容器：三子 tab「信息 | 图片 | 生图工作台」。
 * - 信息：资产提取结果独立成页（主体为提取审核/加载/失败/空态）；
 *   提取操作区（PromptRunBar）与「确认本章资产」按钮经 #actions 插槽注入子 tab 行右侧，重试通过 retry-extraction 事件回调页面。
 * - 图片：本章资产浏览（LongProjectChapterAssets）。
 * - 生图工作台：资产视觉状态的提示词/参考图生产，批量操作按钮经 #actions 插槽注入子 tab 行右侧。
 * 工作台进度（提示词/生成图）以小字收纳在「生图工作台」tab 标签上。
 * 提取底稿 = 章节原文（无原文时以漫画剧本兜底，页面顶栏提示）；
 * 提取上下文 = 原文分析 + 漫画剧本 + 已有资产（分镜仅用于候选出现次数统计）；
 * 确认后写回资产与章节引用，并按文本自动回填本章分镜绑定。
 * 确认只有唯一行为：本次结果为准 —— 同名视觉状态复用原 id（保住已生成的参考图/生成图与分镜绑定），
 * 本次未出现的旧状态删除；删除后额外修复分镜上指向已删状态的悬空绑定（全项目范围）。
 * 生图工作台额外显示引用情况（状态级「被 N 章 · M 镜引用」+ 图片级「N 镜」在用标记），数据由 buildAssetUsageIndex 统一算出。
 */
import { computed, ref } from "vue";
import { FileText, Images, Info, LoaderCircle, MapPin, Package, Palette, ScanText, UserRound } from "lucide-vue-next";
import LongProjectAssetExtractionReview from "@comic/components/LongProjectAssetExtractionReview.vue";
import LongProjectChapterAssets from "@comic/components/LongProjectChapterAssets.vue";
import LongProjectAssetWorkbench from "@comic/components/LongProjectAssetWorkbench.vue";
import { useToast } from "@comic/composables/useToast";
import { countCandidatesAppearances, sortAssetsByExtractionOrder } from "@comic/services/assetExtractionService";
import { backfillPanelAutoBindings, buildExtractionConfirmResult, findOrphanEntries, pruneOrphanEntries, repairDanglingBindings } from "@comic/services/assetExtractionConfirm";
import { buildAssetUsageIndex } from "@comic/services/assetUsageService";
import { LONG_CHAPTER_STAGE_ORDER } from "@comic/types";
import type {
  AssetGenConfig,
  ComicProject,
  LongProjectAsset,
  LongProjectAssetExtractionRun,
  LongProjectAssetVariant,
  LongProjectChapterAsset,
  LongProjectNode,
  LongProjectStoryboardPanel,
  LongProjectStoryboardRun,
  ModelConfig,
  PromptTemplate,
  SharedPromptBlock,
} from "@comic/types";

/** 资产子 tab 类型。 */
export type AssetView = "info" | "images" | "workbench";

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
  /** 项目全部章节分镜（引用统计用：哪个视觉状态的哪张图被哪些分镜在用）。 */
  storyboardRuns?: LongProjectStoryboardRun[];
  /** 章节 id → 章节名（引用文案展示用）。 */
  chapterNames?: Record<string, string>;
  assetGenConfig?: AssetGenConfig;
  paintingStyle?: string;
  sharedBlocks?: SharedPromptBlock[];
  /** 资产接力定位目标（透传给生图工作台，选中具体资产/视觉状态）。 */
  focusTarget?: { assetId: string; variantId?: string } | null;
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

/**
 * 工作台资产：按章节引用过滤出本章相关的 variants（与分镜生成同一口径），
 * 顺序对齐「信息」审核页左列（人物 → 场景 → 道具，组内按本次提取的候选顺序）。
 */
const workbenchAssets = computed(() => {
  if (!selectedChapterAssets.value.length) return sortAssetsByExtractionOrder(props.assets, latestRun.value);
  const filtered = props.assets.flatMap((asset) => {
    const entries = selectedChapterAssets.value.filter((entry) => entry.assetId === asset.id);
    if (!entries.length) return [];
    const variantIds = new Set(entries.map((entry) => entry.variantId).filter((id): id is string => Boolean(id)));
    return [{ ...asset, variants: variantIds.size ? asset.variants.filter((variant) => variantIds.has(variant.id)) : asset.variants }];
  });
  return sortAssetsByExtractionOrder(filtered, latestRun.value);
});

const totalVariants = computed(() => workbenchAssets.value.reduce((count, asset) => count + asset.variants.length, 0));
const promptProgress = computed(() => `${workbenchAssets.value.reduce((count, asset) => count + asset.variants.filter((v) => v.imagePrompt?.trim()).length, 0)}/${totalVariants.value}`);
const imageProgress = computed(() => `${workbenchAssets.value.reduce((count, asset) => count + asset.variants.filter((v) => (v.generatedImageIds ?? []).length).length, 0)}/${totalVariants.value}`);

/**
 * 资产引用索引（variantId → 被哪些章节引用 / 被多少个分镜用 / 每张参考图被多少个分镜取到）。
 * 生图工作台用它显示「被 N 章 · M 镜引用」与每张图的在用标记，避免用户凭感觉猜哪张图正在被分镜使用。
 */
const assetUsage = computed(() => buildAssetUsageIndex({
  assets: props.assets,
  chapterAssets: props.chapterAssets,
  storyboardRuns: props.storyboardRuns ?? [],
  chapterNameOf: (id) => props.chapterNames?.[id] ?? id,
}));

// ========== 审核与确认 ==========

/** 项目范围孤儿数据：没有任何章节引用（且资产仍在用）的视觉状态、以及无引用的章节范围资产。 */
const orphanScan = computed(() => findOrphanEntries(props.assets, props.chapterAssets));
const orphanCount = computed(() => orphanScan.value.variants.length + orphanScan.value.assets.length);

/** 统一计算章节顺序表：分镜绑定的默认视觉状态按章节先后取值。 */
function chapterOrderMap(data: NonNullable<ComicProject["longProjectData"]>): Record<string, number> {
  return Object.fromEntries(
    (data.nodes ?? []).filter((node) => node.type === "chapter")
      .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      .map((node, index) => [node.id, index]),
  );
}

/** 清理孤儿数据：删除无人引用的视觉状态与章节资产，随后全项目范围修复悬空绑定。 */
async function clearOrphans() {
  const scan = orphanScan.value;
  if (!scan.variants.length && !scan.assets.length) {
    toast.success("没有需要清理的孤儿数据");
    return;
  }
  const withImages = scan.variants.filter((item) => item.hasImages).length;
  const lines = [
    scan.variants.length ? `· 删除 ${scan.variants.length} 个没有任何章节引用的视觉状态${withImages ? `（其中 ${withImages} 个已有参考图/生成图）` : ""}` : "",
    scan.assets.length ? `· 删除 ${scan.assets.length} 条没有任何章节引用的章节资产` : "",
  ].filter(Boolean);
  if (!window.confirm(`即将清理孤儿数据：\n${lines.join("\n")}\n此操作不可撤销，是否继续？`)) return;
  const removedVariants = scan.variants.length;
  const removedAssets = scan.assets.length;
  await props.mutateLongProjectData((data) => {
    // 以队列内的最新数据重算，避免用弹窗打开前的快照误删
    const latest = findOrphanEntries(data.assets ?? [], data.chapterAssets ?? []);
    data.assets = pruneOrphanEntries(data.assets ?? [], latest);
    const chapterOrders = chapterOrderMap(data);
    data.storyboardRuns = (data.storyboardRuns ?? []).map((item) => {
      const repaired = repairDanglingBindings(item.panels, data.assets ?? [], item.chapterId, chapterOrders);
      return repaired === item.panels ? item : { ...item, panels: repaired, updatedAt: Date.now() };
    });
  });
  toast.success(`已清理 ${removedVariants} 个孤儿状态、${removedAssets} 条孤儿资产`);
}

/** 持久化更新提取 run 的部分字段。 */
function updateRun(runId: string, changes: Partial<LongProjectAssetExtractionRun>) {
  return props.mutateLongProjectData((data) => {
    data.assetExtractionRuns = (data.assetExtractionRuns ?? []).map((run) => run.id === runId ? { ...run, ...changes, updatedAt: Date.now() } : run);
  });
}

/** 审核页编辑候选：名称/别名变化时重算出现次数（有分镜按分镜、无分镜按剧本行）。 */
function updateExtractionCandidate(candidate: LongProjectAssetExtractionRun["candidates"][number]) {
  const run = latestRun.value;
  if (!run) return;
  const candidates = run.candidates.map((item) => item.id === candidate.id ? candidate : item);
  const counts = countCandidatesAppearances(candidates, props.panels, props.scriptContent);
  void updateRun(run.id, {
    candidates: candidates.map((item) => ({ ...item, panelAppearances: counts[item.id] ?? 0 })),
  });
}

/** 确认提取结果：写回资产/章节引用，回填分镜绑定，推进章节阶段（由页面顶栏触发）。
 * 唯一行为：本次结果为准 —— 同名状态复用原 id（保住已生成的图），本次未出现的旧状态删除，随后全项目修复悬空绑定。 */
async function confirmExtraction() {
  const run = latestRun.value;
  if (!run) return;
  if (run.candidates.some((candidate) => candidate.decision === "merge" && !candidate.suggestedAssetId)) {
    toast.error("请为所有标记“沿用已有资产”的候选项指定目标资产");
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
      // 阶段只升不降（共享顺序表），避免把已到分镜/生图阶段的章节打回
      const current = LONG_CHAPTER_STAGE_ORDER.indexOf(node.stage ?? "empty");
      return current < LONG_CHAPTER_STAGE_ORDER.indexOf("assets-ready")
        ? { ...node, stage: "assets-ready" as const, updatedAt: Date.now() }
        : { ...node, updatedAt: Date.now() };
    });
    const chapterOrders = chapterOrderMap(data);
    data.storyboardRuns = (data.storyboardRuns ?? []).map((item) => {
      // 本章已完成分镜：按文本重算 auto-text 绑定
      const panels = item.chapterId === chapterId && item.status === "completed"
        ? backfillPanelAutoBindings(item.panels, result.assets, chapterId, chapterOrders)
        : item.panels;
      // 覆盖会删除视觉状态，分镜上指向已删状态的绑定会悬空 → 全项目范围兜底修复
      const repaired = repairDanglingBindings(panels, result.assets, item.chapterId, chapterOrders);
      return repaired === item.panels ? item : { ...item, panels: repaired, updatedAt: Date.now() };
    });
  });
  toast.success("已确认本章资产，分镜绑定已重算");
}

// ========== 生图工作台回写 ==========

/**
 * 资产工作台回写：在持久化队列内基于最新数据 patch 视觉状态。
 *
 * patch 移除了图片（生成图 / 参考图删除）时，同步清扫 storyboardRuns 里所有分镜
 * 绑定 `selectedImageIds` 对这些图的引用 —— `resolvePanelRefImage` 虽然对悬空选中
 * 自愈（回落第一张），但数据里不留死引用才是真正的「删除无残留」。
 */
function updateAssetVariant(payload: { assetId: string; variantId: string; patch: Partial<LongProjectAssetVariant> }) {
  void props.mutateLongProjectData((data) => {
    let removedImages: string[] = [];
    data.assets = (data.assets ?? []).map((asset) => {
      if (asset.id !== payload.assetId) return asset;
      const oldVariant = asset.variants.find((item) => item.id === payload.variantId);
      if (!oldVariant) return asset;
      // 差集 = 本次被删掉的图 id（仅删除类 patch 会产生，追加/重排时为空）
      removedImages = [
        ...(oldVariant.generatedImageIds ?? []),
        ...(oldVariant.referenceImageIds ?? []),
      ].filter((id) =>
        !(payload.patch.generatedImageIds ?? oldVariant.generatedImageIds ?? []).includes(id)
        && !(payload.patch.referenceImageIds ?? oldVariant.referenceImageIds ?? []).includes(id),
      );
      return {
        ...asset,
        variants: asset.variants.map((item) => item.id === payload.variantId ? { ...item, ...payload.patch, updatedAt: Date.now() } : item),
        updatedAt: Date.now(),
      };
    });
    // 清扫分镜绑定里指向已删图片的单选引用（页级 + 格级绑定）
    if (removedImages.length) {
      const removed = new Set(removedImages);
      data.storyboardRuns = (data.storyboardRuns ?? []).map((run) => ({
        ...run,
        panels: run.panels.map((panel) => ({
          ...panel,
          assetBindings: panel.assetBindings.map((binding) => {
            if (!binding.selectedImageIds?.some((id) => removed.has(id))) return binding;
            return { ...binding, selectedImageIds: binding.selectedImageIds.filter((id) => !removed.has(id)) };
          }),
          cells: panel.cells?.map((cell) => ({
            ...cell,
            assetBindings: (cell.assetBindings ?? []).map((binding) => {
              if (!binding.selectedImageIds?.some((id) => removed.has(id))) return binding;
              return { ...binding, selectedImageIds: binding.selectedImageIds.filter((id) => !removed.has(id)) };
            }),
          })),
        })),
        updatedAt: Date.now(),
      }));
    }
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
  /** 信息 tab：确认本章资产（本次结果为准，唯一行为；调用方 await 后即可认为已写回）。 */
  confirmReview: () => confirmExtraction(),
  /** 生图工作台 tab：工作台实例（批量操作按钮转发；非工作台 tab 时为 null）。 */
  workbench: computed(() => (props.view === "workbench" ? workbenchRef.value : null)),
});
</script>

<style scoped>
.primary-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.5rem; background: #06b6d4; padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 500; color: #020617; transition: background-color 0.15s ease; }
.primary-button:hover { background: #22d3ee; }
.secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.5rem; border: 1px solid var(--border-default); color: var(--text-secondary); font-weight: 500; transition: color 0.15s ease, border-color 0.15s ease; background: transparent; }
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
