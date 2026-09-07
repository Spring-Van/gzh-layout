<template>
  <div
    class="h-full flex flex-col overflow-hidden relative bg-app-bg"
  >
    <!-- 背景装饰 -->
    <div
      class="absolute top-10 right-1/4 w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none"
    />
    <div
      class="absolute bottom-10 left-1/3 w-80 h-80 bg-blue-600/8 rounded-full blur-[100px] pointer-events-none"
    />

    <!-- 主内容区 -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <!-- 固定头部 -->
      <div class="shrink-0 px-8 pt-8 pb-0 max-w-6xl mx-auto w-full">
        <div class="flex items-end justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-text-primary mb-1">创作工坊</h1>
            <p class="text-sm text-text-secondary">按步骤引导式创作，更简单直观</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              class="px-4 py-2 rounded-lg bg-surface border border-border-subtle text-text-secondary text-sm font-medium flex items-center gap-1.5 hover:bg-elevated transition-colors"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              导入 JSON
            </button>
            <div class="relative">
              <svg
                class="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                v-model="searchKeyword"
                type="text"
                class="w-64 bg-input-bg border border-border-subtle rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="搜索项目..."
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 可滚动内容 -->
      <div class="flex-1 overflow-auto px-8 pb-8">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- 新建项目卡片 -->
            <div
              class="group bg-surface border border-dashed border-border-default rounded-xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/8 hover:border-cyan-500/30 transition-colors min-h-[200px]"
              @click="showCreateDialog = true"
            >
              <div
                class="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors"
              >
                <svg
                  class="w-5 h-5 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div class="text-center">
                <p class="text-sm font-medium text-text-primary">新建项目</p>
                <p class="text-xs text-text-secondary mt-0.5">创建一个新的创作项目</p>
              </div>
            </div>

            <!-- 项目卡片 -->
            <div
              v-for="project in filteredProjects"
              :key="project.id"
              class="group bg-surface border border-border-subtle rounded-xl p-5 flex flex-col cursor-pointer hover:bg-elevated hover:border-border-default hover:shadow-lg hover:shadow-cyan-500/5 transition-[background-color,border-color,box-shadow] duration-300 min-h-[200px] relative"
              @click="openProject(project)"
            >
              <!-- 删除按钮：hover 显示 -->
              <button
                class="absolute top-3 right-3 w-7 h-7 rounded-lg bg-surface border border-border-subtle flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:border-red-500/30 z-10"
                @click.stop="handleDeleteClick(project)"
              >
                <svg
                  class="w-3.5 h-3.5 text-text-secondary group-hover:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>

              <!-- 步骤指示 -->
              <div
                class="flex-1 flex flex-col items-center justify-center mb-3"
              >
                <div
                  class="w-8 h-8 rounded-full bg-surface flex items-center justify-center mb-2"
                >
                  <BookOpen v-if="getProjectType(project) === 'long'" :size="16" class="text-text-secondary" />
                  <svg v-else class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p class="text-xs text-text-secondary">
                  {{ getProjectType(project) === "long" ? "尚未添加章节" : "步骤 1/4" }}
                </p>
              </div>

              <!-- 项目信息 -->
              <div>
                <div class="mb-2 flex items-center gap-2">
                  <h3 class="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                    {{ project.name }}
                  </h3>
                  <span class="shrink-0 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-400">
                    {{ getProjectType(project) === "long" ? "长篇" : "短篇" }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1 text-xs text-text-secondary">
                    <svg
                      class="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <span>0</span>
                  </div>
                  <span class="text-[11px] text-text-muted">
                    {{ formatTime(project.createdAt) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div
            v-if="filteredProjects.length === 0 && searchKeyword"
            class="text-center text-text-muted text-sm py-20"
          >
            未找到匹配的项目
          </div>
        </div>
      </div>
    </main>

    <CreateProjectDialog
      v-model="showCreateDialog"
      :submitting="isCreating"
      @create="handleCreateProject"
    />

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="删除项目"
      :content="deleteDialogContent"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { BookOpen } from "lucide-vue-next";
import { useProjectStore } from "@comic/stores/project";
import type { ComicProject, ComicProjectType } from "@comic/types";
import ConfirmDialog from "@comic/components/ConfirmDialog.vue";
import CreateProjectDialog from "@comic/components/CreateProjectDialog.vue";
import { useToast } from "@comic/composables/useToast";

const router = useRouter();
const projectStore = useProjectStore();
const toast = useToast();
const projects = ref<ComicProject[]>([]);
const searchKeyword = ref("");
const showCreateDialog = ref(false);
const isCreating = ref(false);

const showDeleteDialog = ref(false);
const deletingProject = ref<ComicProject | null>(null);

const deleteDialogContent = computed(() => {
  if (!deletingProject.value) return "删除后无法恢复，是否确认删除？";
  return `确定要删除项目「${deletingProject.value.name}」吗？项目下的资产、素材和生图任务将一并删除，无法恢复。`;
});

const filteredProjects = computed(() => {
  if (!searchKeyword.value.trim()) return projects.value;
  const kw = searchKeyword.value.trim().toLowerCase();
  return projects.value.filter((p) => p.name.toLowerCase().includes(kw));
});

const loadProjects = async () => {
  await projectStore.loadProjects();
  projects.value = projectStore.projects;
};

const formatTime = (ts: number): string => {
  const now = Date.now();
  const diff = now - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  return `${Math.floor(diff / day)} 天前`;
};

const getProjectType = (project: ComicProject): ComicProjectType => {
  return project.projectType === "long" ? "long" : "short";
};

const getProjectPath = (project: ComicProject): string => {
  return getProjectType(project) === "long"
    ? `/comic/long-project/${project.id}`
    : `/comic/project-editor/${project.id}`;
};

const openProject = (project: ComicProject) => {
  router.push(getProjectPath(project));
};

const handleCreateProject = async (payload: { name: string; projectType: ComicProjectType }) => {
  if (isCreating.value) return;
  isCreating.value = true;
  try {
    const project = await projectStore.createProject(payload.name, payload.projectType);
    showCreateDialog.value = false;
    await router.push(getProjectPath(project));
  } catch (error) {
    console.error("创建漫画项目失败", error);
    toast.error("项目创建失败，请重试");
  } finally {
    isCreating.value = false;
  }
};

const handleDeleteClick = (project: ComicProject) => {
  deletingProject.value = project;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!deletingProject.value) return;
  await projectStore.deleteProject(deletingProject.value.id);
  showDeleteDialog.value = false;
  deletingProject.value = null;
  await loadProjects();
};

onMounted(() => {
  loadProjects();
});
</script>
