<template>
  <section class="w-full h-full p-6 md:p-10 flex flex-col overflow-y-auto">
    <div class="max-w-4xl mx-auto w-full">
      <button
        class="text-sm text-slate-500 flex items-center gap-1 mb-6 hover:text-slate-800 transition"
        @click="$router.push('/')"
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
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          ></path>
        </svg>
        返回主页
      </button>

      <h2 class="text-2xl font-bold mb-8 text-slate-800">
        步骤 1：素材装载与自动化清洗配置
      </h2>

      <!-- 文件夹选择 -->
      <div
        id="step-upload"
        class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between"
      >
        <div class="flex items-center gap-4">
          <div
            class="w-12 h-12 bg-blue-50 text-primary rounded-lg flex items-center justify-center"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
              ></path>
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-slate-800 text-sm">选择本地包</h3>
            <p class="text-xs text-slate-500 block" id="path-display">
              {{ selectedFolder || "尚未选择文件夹..." }}
            </p>
            <p
              v-if="scannedImages > 0"
              class="text-xs text-green-600 block mt-1"
            >
              ✓ 已扫描 {{ scannedImages }} 张图片
            </p>
          </div>
        </div>
        <button
          class="px-5 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition"
          @click="selectFolder"
        >
          浏览并选择
        </button>
      </div>

      <!-- 核心参数配置面板 -->
      <div
        id="step-config"
        class="bg-white border border-slate-200 rounded-xl p-8 shadow-sm mb-8 transition duration-300"
        :class="[!selectedFolder ? 'opacity-50 pointer-events-none' : '']"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
          <!-- 去重策略 -->
          <div class="space-y-5">
            <h3 class="font-bold text-slate-800 border-b pb-2">
              数据清洗与追溯
            </h3>
            <label class="flex justify-between items-center cursor-pointer">
              <div>
                <span class="text-sm font-medium text-slate-700 block"
                  >素材安全备份</span
                >
                <span class="text-[10px] text-slate-400"
                  >处理前保留原始数据副本至 _backup</span
                >
              </div>
              <input
                type="checkbox"
                v-model="config.backupEnabled"
                class="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                checked
              />
            </label>
            <div>
              <span class="text-sm font-medium text-slate-700 block mb-2"
                >排重过滤级</span
              >
              <select
                v-model="config.dedupMode"
                class="w-full text-sm border-slate-200 rounded-lg shadow-sm focus:border-primary focus:ring-primary text-slate-600 bg-slate-50 px-3 py-2 border outline-none"
              >
                <option value="hash">严格过滤 (完全一致的文件)</option>
                <option value="phash">
                  感知过滤 (智能识别相似度较高的素材)
                </option>
                <option value="none">不过滤 (保留所有)</option>
              </select>
            </div>
          </div>

          <!-- 拆分策略 -->
          <div class="space-y-5">
            <h3 class="font-bold text-slate-800 border-b pb-2">矩阵拆分规则</h3>
            <div>
              <span class="text-sm font-medium text-slate-700 block mb-2"
                >处理模式</span
              >
              <select
                v-model="config.splitMode"
                class="w-full text-sm border-slate-200 rounded-lg shadow-sm focus:border-primary focus:ring-primary text-slate-600 bg-slate-50 px-3 py-2 border outline-none"
              >
                <option value="count">
                  定量切片 (按张数均匀拆分成多篇草稿)
                </option>
                <option value="folder">
                  按目录结构拆分 (每个分类子文件夹一篇)
                </option>
              </select>
            </div>
            <div v-if="config.splitMode === 'count'">
              <span class="text-sm font-medium text-slate-700 block mb-2"
                >触发阈值（定量切片参数）</span
              >
              <div class="flex items-center gap-3 mb-3">
                <input
                  type="number"
                  v-model.number="config.splitCount"
                  min="1"
                  max="50"
                  class="w-24 text-center text-sm border-slate-200 rounded-lg shadow-sm focus:border-primary focus:ring-primary bg-slate-50 px-2 py-2 border outline-none"
                />
                <span class="text-sm text-slate-500">张图片 / 每篇文章</span>
              </div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="config.createFolders"
                  class="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                />
                <span class="text-sm text-slate-700">拆分后创建独立文件夹</span>
              </label>
              <div v-if="config.createFolders" class="mt-3">
                <span class="text-sm font-medium text-slate-700 block mb-2"
                  >文件夹命名日期</span
                >
                <input
                  type="date"
                  v-model="config.folderDate"
                  class="w-full text-sm border-slate-200 rounded-lg shadow-sm focus:border-primary focus:ring-primary bg-slate-50 px-3 py-2 border outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 处理按钮 -->
        <div class="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button
            id="btn-process"
            class="bg-primary text-white px-8 py-3 rounded-xl text-sm font-medium shadow-md hover:bg-primary-hover transition flex items-center gap-2"
            :disabled="processing"
            @click="executeProcessing"
          >
            <svg
              v-if="processing"
              class="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{{
              processing ? "清洗拆分中..." : "执行自动化清洗并生成矩阵"
            }}</span>
            <svg
              v-if="!processing"
              class="w-4 h-4 relative top-px"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- 结果面板 -->
      <div
        id="step-result"
        v-if="processResult"
        class="bg-green-50 border border-green-200 p-5 rounded-xl flex items-center justify-between mb-6 shadow-sm"
      >
        <div>
          <div class="flex items-center gap-2 mb-1">
            <div
              class="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs"
            >
              ✓
            </div>
            <h3 class="font-bold text-green-800 text-sm">清洗拆分完成</h3>
          </div>
          <p class="text-xs text-green-600 pl-7">
            共录入 {{ processResult.totalImages }} 张素材，拦截重复
            {{ processResult.duplicateCount }} 张，根据参数拆分出
            <span class="font-bold text-sm">{{
              processResult.groupCount
            }}</span>
            篇文章组待定排版。
          </p>
        </div>
        <button
          class="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-6 py-2 rounded-lg shadow transition"
          @click="$router.push('/typeset')"
        >
          前往批量排版
        </button>
      </div>
    </div>

    <DuplicateImageModal
      :visible="showDuplicateModal"
      :duplicates="duplicatePairs"
      @close="showDuplicateModal = false"
      @confirm="handleDuplicateConfirm"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useProjectStore } from "../stores/project";
import { useToast } from "../hooks/useToast";
import {
  createProjectFromFolder,
  deduplicateImages,
  splitIntoFolders,
  findDuplicateImages,
} from "../api/native";
import type { DedupMode, SplitRule, ImageFile } from "../types";
import DuplicateImageModal from "../components/common/DuplicateImageModal.vue";

const { success, error } = useToast();

const projectStore = useProjectStore();
const router = useRouter();

const selectedFolder = ref<string | null>(null);
const processing = ref(false);
const scannedImages = ref(0);
const processResult = ref<{
  totalImages: number;
  duplicateCount: number;
  groupCount: number;
} | null>(null);

const showDuplicateModal = ref(false);
const duplicatePairs = ref<
  Array<{ original: ImageFile; duplicate: ImageFile }>
>([]);
let pendingWorkingImages: ImageFile[] = [];

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const config = ref({
  backupEnabled: true,
  dedupMode: "hash" as DedupMode | "none",
  splitMode: "count" as SplitRule,
  splitCount: 9,
  createFolders: false,
  folderDate: getTodayDate(),
});

async function selectFolder() {
  try {
    const result = await createProjectFromFolder();
    if (!result) return;

    selectedFolder.value = result.project.sourceFolder;
    scannedImages.value = result.images.length;
    projectStore.setCurrentProject(result.project);
    success(`成功扫描 ${result.images.length} 张图片`);
  } catch (e) {
    console.error("选择文件夹失败:", e);
    error("文件夹选择失败");
  }
}

async function executeProcessing() {
  if (!projectStore.currentProject) {
    error("请先选择文件夹");
    return;
  }

  processing.value = true;
  processResult.value = null;

  try {
    const project = projectStore.currentProject;
    const totalImages = project.images.length;
    let workingImages = [...project.images];
    let duplicateCount = 0;

    if (config.value.dedupMode === "hash") {
      const result = await findDuplicateImages(workingImages);
      if (result.duplicates.length > 0) {
        showDuplicateModal.value = true;
        duplicatePairs.value = result.duplicates;
        pendingWorkingImages = workingImages;
        processing.value = false;
        return;
      }
    }

    await completeProcessing(workingImages, totalImages, duplicateCount);
  } catch (e) {
    console.error("处理失败:", e);
    error("处理失败，请重试");
    processing.value = false;
  }
}

async function handleDuplicateConfirm(imagesToRemove: string[]) {
  showDuplicateModal.value = false;
  processing.value = true;

  try {
    const project = projectStore.currentProject!;
    const totalImages = project.images.length;

    const result = await deduplicateImages(
      pendingWorkingImages,
      imagesToRemove,
    );
    const workingImages = result.uniqueImages;
    const duplicateCount = result.duplicateCount;

    projectStore.updateImages(workingImages);

    await completeProcessing(workingImages, totalImages, duplicateCount);
  } catch (e) {
    console.error("处理失败:", e);
    error("处理失败，请重试");
    processing.value = false;
  }
}

async function completeProcessing(
  workingImages: ImageFile[],
  totalImages: number,
  duplicateCount: number,
) {
  const project = projectStore.currentProject!;

  if (config.value.createFolders && config.value.splitMode === "count") {
    const imagesForSplit = workingImages.map((img) => ({
      path: img.path,
      name: img.name,
    }));
    await splitIntoFolders(
      project.sourceFolder,
      imagesForSplit,
      config.value.splitCount,
      config.value.folderDate,
    );
  }

  const validImages = totalImages - duplicateCount;
  const groupCount = Math.ceil(validImages / config.value.splitCount);

  processResult.value = {
    totalImages,
    duplicateCount,
    groupCount,
  };

  projectStore.createGroups(workingImages, config.value.splitCount);
  success("处理完成");
  setTimeout(() => {
    router.push("/typeset");
  }, 500);
  processing.value = false;
}
</script>
