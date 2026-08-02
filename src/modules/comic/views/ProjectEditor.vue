<template>
  <div
    class="h-screen flex flex-col overflow-hidden relative bg-app-bg"
  >
    <!-- 背景装饰 -->
    <div
      class="absolute top-10 right-1/4 w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none"
    />
    <div
      class="absolute bottom-10 left-1/3 w-80 h-80 bg-blue-600/8 rounded-full blur-[100px] pointer-events-none"
    />

    <!-- 顶部 Header -->
    <header
      class="h-16 bg-surface border-b border-border-subtle flex items-center justify-between px-6 flex-shrink-0 z-20 shadow-sm"
    >
      <!-- 左：返回 + Logo + 标题 -->
      <div class="flex items-center gap-3 min-w-0">
        <button
          class="p-2 rounded-lg hover:bg-elevated transition-colors"
          @click="router.push('/')"
          title="返回首页"
        >
          <svg
            class="w-5 h-5 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <div
          class="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded flex items-center justify-center text-white font-bold shadow"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div class="min-w-0">
          <h1 class="text-base font-bold text-text-primary leading-tight">
            漫画工作台
          </h1>
          <p class="text-xs text-text-secondary leading-tight hidden md:block">
            AI 驱动的一站式漫画创作工作流
          </p>
        </div>
      </div>

      <!-- 右：主题切换 -->
      <button
        class="flex items-center justify-center w-9 h-9 text-text-secondary hover:text-text-primary hover:bg-elevated rounded-lg transition"
        :title="theme === 'dark' ? '切换到浅色' : '切换到深色'"
        @click="toggleTheme"
      >
        <svg v-if="theme === 'dark'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
      </button>
    </header>

    <!-- 主内容区 -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <!-- 固定顶部 -->
      <div class="shrink-0 px-8 pt-6 pb-4 border-b border-border-subtle">
        <div class="max-w-5xl mx-auto flex items-center gap-4">
          <!-- 返回 -->
          <button
            class="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
            @click="router.push('/comic/projects')"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            项目
          </button>

          <div class="w-px h-4 bg-border-subtle" />

          <!-- 项目名称：可双击编辑 -->
          <div class="flex items-center gap-2 flex-1 h-7">
            <template v-if="!isEditingName">
              <h1
                class="text-base font-semibold text-text-primary cursor-pointer hover:text-cyan-400 transition-colors leading-7"
                @dblclick="startEditName"
                :title="'双击编辑名称'"
              >
                {{ projectName }}
              </h1>
              <button
                class="text-text-secondary hover:text-cyan-400 transition-colors h-7 flex items-center"
                @click="startEditName"
              >
                <svg
                  class="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </template>
            <template v-else>
              <input
                ref="nameInputRef"
                v-model="editingName"
                type="text"
                class="bg-transparent border-b border-cyan-500/50 text-base font-semibold text-text-primary focus:outline-none px-0 w-80 h-7 leading-7"
                @blur="saveName"
                @keydown.enter="saveName"
                @keydown.esc="cancelEditName"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- 步骤进度条 -->
      <div class="shrink-0 px-8 py-5">
        <div class="max-w-3xl mx-auto">
          <div class="flex items-center justify-between">
            <div
              v-for="(step, idx) in steps"
              :key="step.key"
              class="flex items-center gap-2"
            >
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
                :class="
                  currentStep >= idx
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-elevated text-text-secondary border border-border-subtle'
                "
              >
                {{ idx + 1 }}
              </div>
              <span
                class="text-xs transition-colors"
                :class="currentStep >= idx ? 'text-cyan-400' : 'text-text-secondary'"
              >
                {{ step.label }}
              </span>
              <div
                v-if="idx < steps.length - 1"
                class="w-12 h-px mx-1"
                :class="currentStep > idx ? 'bg-cyan-500/30' : 'bg-border-subtle'"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 可滚动内容 -->
      <div class="flex-1 overflow-auto px-8 pb-8">
        <div class="max-w-5xl mx-auto">
          <!-- 输入故事区域 -->
          <div
            class="rounded-xl bg-surface border border-border-subtle backdrop-blur-sm shadow-lg shadow-black/20 p-5"
          >
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold text-text-primary">输入故事</h2>
                <p class="text-xs text-text-secondary mt-0.5">
                  粘贴你的小说或故事内容，选择故事模板后点击自动分析，AI
                  将为你创作漫画脚本
                </p>
              </div>

              <!-- 故事模板 + LLM 模型下拉框 -->
              <div class="flex items-center gap-3">
                <!-- 故事模板 -->
                <div class="flex flex-col items-end gap-1">
                  <label class="text-[11px] text-text-secondary">故事模板</label>
                  <div class="relative">
                    <select
                      v-model="selectedTemplateId"
                      class="appearance-none bg-surface border border-border-subtle rounded-lg pl-3 pr-8 py-1.5 text-xs text-text-primary focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer min-w-[140px]"
                    >
                      <option value="" class="bg-surface">请选择模板</option>
                      <option
                        v-for="tmpl in storyTemplates"
                        :key="tmpl.id"
                        :value="tmpl.id"
                        class="bg-surface"
                      >
                        {{ tmpl.name }}
                      </option>
                    </select>
                    <svg
                      class="w-3 h-3 text-text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                <!-- LLM 模型 -->
                <div class="flex flex-col items-end gap-1">
                  <label class="text-[11px] text-text-secondary">LLM模型</label>
                  <div class="relative">
                    <select
                      v-model="selectedModelId"
                      class="appearance-none bg-surface border border-border-subtle rounded-lg pl-3 pr-8 py-1.5 text-xs text-text-primary focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer min-w-[140px]"
                    >
                      <option value="" class="bg-surface">请选择模型</option>
                      <option
                        v-for="model in llmModels"
                        :key="model.id"
                        :value="model.id"
                        class="bg-surface"
                      >
                        {{ model.name }}
                      </option>
                    </select>
                    <svg
                      class="w-3 h-3 text-text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- 文本输入框 -->
            <div class="relative">
              <textarea
                v-model="storyContent"
                class="w-full h-[50vh] bg-input-bg border border-border-subtle rounded-xl p-4 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/30 transition-colors resize-none leading-relaxed"
                placeholder="在这里粘贴你的小说或故事内容..."
              />
              <div class="absolute bottom-3 right-3 text-[11px] text-text-muted">
                {{ storyContent.length }} / 50000
              </div>
            </div>

            <!-- 底部操作按钮 -->
            <div class="flex items-center justify-end gap-3 mt-5">
              <button
                v-if="hasExistingAssets"
                class="px-4 py-2 rounded-lg text-sm text-emerald-400 hover:text-text-primary transition-colors flex items-center gap-1.5 border border-emerald-500/20 hover:bg-emerald-500/10"
                @click="goToAssets"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                进入项目资产
              </button>
              <button
                class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 border border-border-subtle hover:bg-surface"
                @click="handleManualParse"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                手动解析
              </button>
              <button
                class="px-5 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20"
                :class="{ 'opacity-50 pointer-events-none': isAnalyzing }"
                @click="handleAutoAnalyze"
              >
                自动分析
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 全屏分析 Loading -->
    <Transition name="fade">
      <div
        v-if="isAnalyzing"
        class="fixed inset-0 z-[100] bg-app-bg flex flex-col items-center justify-center"
      >
        <!-- 旋转动画 -->
        <div class="relative w-20 h-20 mb-8">
          <div
            class="absolute inset-0 rounded-full border-2 border-cyan-500/20"
          />
          <div
            class="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <svg
              class="w-8 h-8 text-cyan-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
        </div>

        <!-- 标题 -->
        <h2 class="text-xl font-semibold text-text-primary mb-2">正在分析创作</h2>
        <p class="text-sm text-text-secondary mb-6">
          AI 正在根据故事模板分析您的故事内容，请稍候...
        </p>

        <!-- 时间进度 -->
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-1.5 text-text-secondary">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            已用时
            <span class="text-cyan-400 font-mono">{{
              formatDuration(analyzeElapsed)
            }}</span>
          </div>
          <div v-if="streamingText" class="text-text-secondary">
            已接收 {{ streamingText.length }} 字
          </div>
        </div>

        <!-- 流式输出预览 -->
        <div
          v-if="streamingText"
          class="mt-6 max-w-2xl w-full mx-4 max-h-32 overflow-y-auto rounded-lg bg-surface border border-border-subtle p-3"
        >
          <p class="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
            {{ streamingText.slice(-500) }}
          </p>
        </div>
      </div>
    </Transition>

    <ConfirmDialog
      v-model="showOverwriteDialog"
      title="覆盖确认"
      content="该项目已有解析过的资产数据，继续解析将覆盖所有现有资产，是否继续？"
      confirm-text="继续解析"
      cancel-text="取消"
      @confirm="confirmOverwrite"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import { comicDb } from "@/api/comic";
import type {
  PromptTemplate,
  ModelConfig,
  ProjectAsset,
  Outfit,
} from "@comic/types";
import { llmService } from "@comic/services/llmService";
import { useToast } from "@comic/composables/useToast";
import ConfirmDialog from "@comic/components/ConfirmDialog.vue";
import { useTheme } from "@/theme/useTheme";

const toast = useToast();
const route = useRoute();
const router = useRouter();
const { theme, toggle: toggleTheme } = useTheme();

const projectId = route.params.projectId as string;
const projectName = ref("");
const storyContent = ref("");
const isEditingName = ref(false);
const editingName = ref("");
const nameInputRef = ref<HTMLInputElement | null>(null);
const isAnalyzing = ref(false);
const showOverwriteDialog = ref(false);
const existingAssetCount = ref(0);
const pendingParseData = ref<Record<string, any> | null>(null);
const analyzeElapsed = ref(0);
const streamingText = ref("");
let analyzeTimer: ReturnType<typeof setInterval> | null = null;

const hasExistingAssets = computed(() => existingAssetCount.value > 0);

const templates = ref<PromptTemplate[]>([]);
const models = ref<ModelConfig[]>([]);
const selectedTemplateId = ref("");
const selectedModelId = ref("");

/** 故事模板：筛选 type=story 的模板 */
const storyTemplates = computed(() =>
  templates.value.filter((t) => t.type === "story"),
);

const llmModels = computed(() =>
  models.value.filter((m) => m.category === "llm"),
);

const currentStep = ref(0);
const steps = [
  { key: "story", label: "输入故事" },
  { key: "assets", label: "项目资产" },
  { key: "generate", label: "页面生成" },
];

/** 格式化耗时 */
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
  return `${secs}s`;
};

/** 构建发送给 LLM 的提示词 */
const buildLlmPrompt = (
  template: PromptTemplate,
  userInput: string,
): string => {
  const templateContent = template.content;

  if (templateContent.includes("{user_input}")) {
    return templateContent.replace("{user_input}", userInput);
  }

  return `${templateContent}\n下面是主题/故事：\n${userInput}`;
};

/** 尝试将故事内容解析为JSON */
const tryParseJson = (): Record<string, any> | null => {
  const content = storyContent.value.trim();
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
};

/** 从 LLM 返回的文本中提取 JSON */
const extractJsonFromLlmResponse = (
  text: string,
): Record<string, any> | null => {
  // 尝试提取 ```json ... ``` 代码块（贪婪匹配，防止长JSON被截断）
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*)\n?\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim());
    } catch {
      // 继续尝试其他方式
    }
  }

  // 尝试找到最外层的 { } （贪婪匹配）
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // 继续尝试
    }
  }

  // 直接尝试解析整段文本
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
};

/**
 * 从JSON中提取人物及服装并保存为资产
 * 新逻辑：从顶层"人物资源库"对象解析每个人物及其"服装"列表
 * 结构示例：
 * {
 *   "我": {
 *     "描述1": "二十多岁男性...",
 *     "服装": { "服装1": "黄色外卖骑手夹克..." }
 *   }
 * }
 */
const parseAndSaveAssets = async (data: Record<string, any>) => {
  const now = Date.now();
  await comicDb.deleteProjectAssetsByProjectId(projectId);

  const library = data["人物资源库"];
  if (!library || typeof library !== "object") return;

  let sortOrder = 0;
  for (const [name, info] of Object.entries(library)) {
    if (!name?.trim() || !info || typeof info !== "object") continue;
    const infoObj = info as Record<string, any>;

    // 解析人物描述：兼容 "人物描述" 和 "描述1/描述2/..." 两种键名
    // 优先取 "人物描述"；否则取第一个 "描述*" 键
    let description = "";
    if (
      typeof infoObj["人物描述"] === "string" &&
      infoObj["人物描述"].trim()
    ) {
      description = infoObj["人物描述"].trim();
    } else {
      const descKeys = Object.keys(infoObj)
        .filter((k) => k.startsWith("描述"))
        .sort();
      for (const key of descKeys) {
        const v = infoObj[key];
        if (typeof v === "string" && v.trim()) {
          description = v.trim();
          break;
        }
      }
    }

    // 解析服装列表
    const outfits: Outfit[] = [];
    const clothingObj = infoObj["服装"];
    if (clothingObj && typeof clothingObj === "object") {
      for (const [cname, cdesc] of Object.entries(clothingObj)) {
        if (typeof cdesc === "string" && cdesc.trim()) {
          outfits.push({
            id: uuidv4(),
            name: cname.trim(),
            description: cdesc.trim(),
            referenceImage: "",
            referenceImageDesc: "",
            syncedToLibrary: false,
          });
        }
      }
    }

    const asset: ProjectAsset = {
      id: uuidv4(),
      projectId,
      type: "character",
      code: "",
      name: name.trim(),
      description,
      prompt: "",
      referenceImages: [],
      referenceImageDescs: [],
      generatedImages: [],
      aiGenerated: false,
      outfits,
      // 默认不插入人物描述；仅当用户在资产页手动开启后才写入提示词
      insertCharacterDescription: false,
      sortOrder: sortOrder++,
      createdAt: now,
      updatedAt: now,
    };
    await comicDb.saveProjectAsset(asset);
  }
};

/** 从JSON中提取所有页面并保存到数据库 */
const parseAndSavePages = async (data: Record<string, any>) => {
  const pagesKey = Object.keys(data).find((key) => key.includes("页面"));
  const allPages: any[] =
    pagesKey && Array.isArray(data[pagesKey]) ? data[pagesKey] : [];

  const pagesData = allPages.map((page: any) => ({ ...page }));

  const pageData = {
    pages: pagesData,
  };

  const serializable = JSON.parse(JSON.stringify(pageData));

  // 提取发布页数据（标题、标签、创作备注）
  const rawTitle = data["标题"] || "";
  const rawTags = data["标签"] || "";
  const tags =
    typeof rawTags === "string"
      ? rawTags
          .split(/[,，、]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      : Array.isArray(rawTags)
        ? rawTags.map(String)
        : [];
  const rawNotes = data["创作备注"] || {};
  const creativeNotes: Record<string, string> = {};
  if (typeof rawNotes === "object" && rawNotes !== null) {
    for (const [k, v] of Object.entries(rawNotes)) {
      creativeNotes[k] = String(v);
    }
  }

  const publishData = {
    title: String(rawTitle),
    tags,
    creativeNotes,
  };

  // 重新解析 JSON 时清空所有与页面相关的派生数据
  // - generatedImages：每页生图结果（页面内容变化后旧图无效）
  // - pageModelOverrides：单页模型覆盖（页面内容已变）
  // - pageRefImages：每页参考图（按页面索引重新生成）
  // - generationTasks（DB）：生图任务记录（旧任务已无意义）
  await comicDb.deleteGenerationTasksByProjectId(projectId);
  sessionStorage.removeItem(`pending-gen-tasks-${projectId}`);
  sessionStorage.removeItem(`page-editor-original-${projectId}`);

  const p = await comicDb.getProject(projectId);
  if (p) {
    await comicDb.saveProject({
      ...p,
      pageData: serializable,
      publishData,
      generatedImages: {},
      pageModelOverrides: {},
      pageRefImages: {},
      updatedAt: Date.now(),
    });
  }
  sessionStorage.setItem(
    `page-editor-data-${projectId}`,
    JSON.stringify(serializable),
  );
};

/** 检查项目是否已有资产 */
const checkExistingAssets = async () => {
  const list = await comicDb.getProjectAssetsByProjectId(projectId);
  existingAssetCount.value = list.length;
};

/** 执行解析和保存逻辑 */
const executeParse = async (data: Record<string, any>) => {
  await parseAndSaveAssets(data);
  await parseAndSavePages(data);
  const list = await comicDb.getProjectAssetsByProjectId(projectId);
  existingAssetCount.value = list.length;
  router.push(`/comic/project-assets/${projectId}`);
};

/** 手动解析：解析JSON → 检查已有资产 → 确认后覆盖/跳转 */
const handleManualParse = async () => {
  const data = tryParseJson();
  if (!data) {
    toast.warning("请输入有效的JSON内容后再进行手动解析");
    return;
  }
  await checkExistingAssets();
  if (hasExistingAssets.value) {
    pendingParseData.value = data;
    showOverwriteDialog.value = true;
  } else {
    await executeParse(data);
  }
};

/** 自动分析：调用 LLM → 解析 JSON → 跳转 */
const handleAutoAnalyze = async () => {
  // 校验：必须输入内容
  if (!storyContent.value.trim()) {
    toast.warning("请先输入故事内容");
    return;
  }

  // 校验：必须选择故事模板
  if (!selectedTemplateId.value) {
    toast.warning("请先选择故事模板");
    return;
  }

  // 校验：必须选择LLM模型
  if (!selectedModelId.value) {
    toast.warning("请先选择LLM模型");
    return;
  }

  const template = templates.value.find(
    (t) => t.id === selectedTemplateId.value,
  );
  const model = models.value.find((m) => m.id === selectedModelId.value);

  if (!template || !model) {
    toast.error("模板或模型配置异常");
    return;
  }

  // 拼接提示词
  const prompt = buildLlmPrompt(template, storyContent.value.trim());

  // 启动全屏 loading
  isAnalyzing.value = true;
  analyzeElapsed.value = 0;
  streamingText.value = "";

  analyzeTimer = setInterval(() => {
    analyzeElapsed.value += 1000;
  }, 1000);

  try {
    const result = await llmService.call({
      modelConfig: model,
      userMessage: prompt,
      onChunk: (text) => {
        streamingText.value += text;
      },
    });

    // 停止计时
    if (analyzeTimer) {
      clearInterval(analyzeTimer);
      analyzeTimer = null;
    }

    if (!result.success || !result.content) {
      toast.error(result.error || "AI 分析失败，请重试");
      return;
    }

    // 从 LLM 返回中提取 JSON
    const data = extractJsonFromLlmResponse(result.content);
    if (!data) {
      toast.error("AI 返回的内容无法解析为有效的 JSON，请检查模板或重试");
      return;
    }

    // 检查已有资产
    await checkExistingAssets();
    if (hasExistingAssets.value) {
      pendingParseData.value = data;
      showOverwriteDialog.value = true;
    } else {
      await executeParse(data);
    }
  } catch (error) {
    toast.error("分析过程出错，请重试");
    console.error("自动分析错误:", error);
  } finally {
    isAnalyzing.value = false;
    if (analyzeTimer) {
      clearInterval(analyzeTimer);
      analyzeTimer = null;
    }
  }
};

/** 确认覆盖现有资产并继续解析 */
const confirmOverwrite = async () => {
  if (!pendingParseData.value) return;
  const data = pendingParseData.value;
  pendingParseData.value = null;
  await executeParse(data);
};

/** 直接进入项目资产页面 */
const goToAssets = () => {
  router.push(`/comic/project-assets/${projectId}`);
};

const loadProject = async () => {
  const project = await comicDb.getProject(projectId);
  if (project) {
    projectName.value = project.name;
  }
};

const loadTemplates = async () => {
  templates.value = await comicDb.getAllPromptTemplates();
  // 自动选中第一个故事模板
  if (!selectedTemplateId.value && storyTemplates.value.length > 0) {
    selectedTemplateId.value = storyTemplates.value[0].id;
  }
};

const loadModels = async () => {
  models.value = await comicDb.getAllModelConfigs();
  // 自动选中第一个 LLM 模型
  if (!selectedModelId.value && llmModels.value.length > 0) {
    selectedModelId.value = llmModels.value[0].id;
  }
};

const startEditName = () => {
  editingName.value = projectName.value;
  isEditingName.value = true;
  nextTick(() => {
    nameInputRef.value?.focus();
    nameInputRef.value?.select();
  });
};

const saveName = async () => {
  const trimmed = editingName.value.trim();
  if (trimmed && trimmed !== projectName.value) {
    projectName.value = trimmed;
    const p = await comicDb.getProject(projectId);
    if (p) {
      await comicDb.saveProject({ ...p, name: trimmed, updatedAt: Date.now() });
    }
  }
  isEditingName.value = false;
};

const cancelEditName = () => {
  isEditingName.value = false;
};

onMounted(() => {
  loadProject();
  loadTemplates();
  loadModels();
  checkExistingAssets();
});

onUnmounted(() => {
  if (analyzeTimer) {
    clearInterval(analyzeTimer);
    analyzeTimer = null;
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
