import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ProjectConfig, ImageFile, ProjectStatus, SyncStatus, ArticleConfig } from '../types';
import { dbGetAllProjects, dbSaveProject, dbDeleteProject } from '../api/native';

export const useProjectStore = defineStore('project', () => {
  // 当前项目
  const currentProject = ref<ProjectConfig | null>(null);
  const projectList = ref<ProjectConfig[]>([]);
  const projectStatus = ref<ProjectStatus>('idle');
  const syncStatus = ref<SyncStatus>('idle');
  const isLoading = ref(false);

  // 选中的图片
  const selectedImages = ref<string[]>([]);

  // 文章配置
  const articleConfig = ref<ArticleConfig>({
    title: '',
    summary: '',
    coverImage: '',
    templateId: 'minimal',
    images: [],
    footerText: '感谢观看，欢迎关注',
    showImageCaption: false,
    themeColor: '#6ca8ff',
    borderRadius: 12,
    imageGap: 16,
  });

  // 计算属性
  const hasProject = computed(() => currentProject.value !== null);
  const images = computed(() => currentProject.value?.images ?? []);
  const enabledImages = computed(() => images.value.filter(img => img.enabled));
  const totalSize = computed(() => images.value.reduce((sum, img) => sum + img.size, 0));

  // Actions
  function setCurrentProject(project: ProjectConfig | null) {
    currentProject.value = project;
    if (project) {
      articleConfig.value = {
        ...articleConfig.value,
        title: project.articleTitle,
        summary: project.articleSummary || '',
        coverImage: project.coverImage || '',
        templateId: project.templateId,
        images: project.images,
      };
    }
  }

  function setProjectStatus(status: ProjectStatus) {
    projectStatus.value = status;
  }

  function setSyncStatus(status: SyncStatus) {
    syncStatus.value = status;
  }

  async function updateArticleConfig(config: Partial<ArticleConfig>) {
    articleConfig.value = { ...articleConfig.value, ...config };
    if (currentProject.value) {
      currentProject.value.articleTitle = articleConfig.value.title;
      currentProject.value.articleSummary = articleConfig.value.summary;
      currentProject.value.coverImage = articleConfig.value.coverImage;
      currentProject.value.templateId = articleConfig.value.templateId;
      currentProject.value.images = articleConfig.value.images;
      await saveProject();
    }
  }

  async function updateImages(images: ImageFile[]) {
    if (currentProject.value) {
      currentProject.value.images = images;
      articleConfig.value.images = images;
      await saveProject();
    }
  }

  function toggleImageSelection(imageId: string) {
    const index = selectedImages.value.indexOf(imageId);
    if (index > -1) {
      selectedImages.value.splice(index, 1);
    } else {
      selectedImages.value.push(imageId);
    }
  }

  async function setCoverImage(imageId: string) {
    if (currentProject.value) {
      currentProject.value.images.forEach(img => {
        img.isCover = img.id === imageId;
      });
      const coverImg = currentProject.value.images.find(img => img.id === imageId);
      articleConfig.value.coverImage = coverImg?.path || '';
      currentProject.value.coverImage = coverImg?.path || '';
      await saveProject();
    }
  }

  async function toggleImageEnabled(imageId: string) {
    const img = images.value.find(i => i.id === imageId);
    if (img) {
      img.enabled = !img.enabled;
      await saveProject();
    }
  }

  async function reorderImages(newOrder: string[]) {
    if (currentProject.value) {
      const imgMap = new Map(images.value.map(img => [img.id, img]));
      currentProject.value.images = newOrder
        .map(id => imgMap.get(id))
        .filter(Boolean)
        .map((img, idx) => ({ ...img!, order: idx }));
      articleConfig.value.images = currentProject.value.images;
      await saveProject();
    }
  }

  async function createGroups(images: ImageFile[], splitCount: number) {
    if (currentProject.value) {
      const groups: Array<{ id: string; images: ImageFile[] }> = [];
      for (let i = 0; i < images.length; i += splitCount) {
        groups.push({
          id: `group-${Date.now()}-${i}`,
          images: images.slice(i, i + splitCount),
        });
      }
      currentProject.value.groups = groups;
      await saveProject();
    }
  }

  async function loadProjectList() {
    isLoading.value = true;
    try {
      const projects = await dbGetAllProjects();
      projectList.value = projects;
    } catch (error) {
      console.error('加载项目列表失败:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function saveProject() {
    if (currentProject.value) {
      currentProject.value.updatedAt = new Date().toISOString();
      try {
        await dbSaveProject(currentProject.value);
      } catch (error) {
        console.error('保存项目失败:', error);
      }
    }
  }

  async function addProjectToDb(project: ProjectConfig) {
    projectList.value.push(project);
    try {
      await dbSaveProject(project);
    } catch (error) {
      console.error('保存项目失败:', error);
    }
  }

  async function deleteProjectFromDb(projectId: string) {
    projectList.value = projectList.value.filter(p => p.projectId !== projectId);
    if (currentProject.value?.projectId === projectId) {
      currentProject.value = null;
    }
    try {
      await dbDeleteProject(projectId);
    } catch (error) {
      console.error('删除项目失败:', error);
    }
  }

  function createProject(name: string, sourceFolder: string): ProjectConfig {
    const now = new Date().toISOString();
    const project: ProjectConfig = {
      projectId: crypto.randomUUID(),
      projectName: name,
      sourceFolder,
      templateId: 'minimal',
      articleTitle: name,
      articleSummary: '',
      status: 'idle',
      syncStatus: 'idle',
      images: [],
      groups: [],
      createdAt: now,
      updatedAt: now,
    };
    return project;
  }

  return {
    // State
    currentProject,
    projectList,
    projectStatus,
    syncStatus,
    selectedImages,
    articleConfig,
    isLoading,

    // Computed
    hasProject,
    images,
    enabledImages,
    totalSize,

    // Actions
    setCurrentProject,
    setProjectStatus,
    setSyncStatus,
    updateArticleConfig,
    updateImages,
    toggleImageSelection,
    setCoverImage,
    toggleImageEnabled,
    reorderImages,
    createGroups,
    loadProjectList,
    saveProject,
    addProjectToDb,
    deleteProjectFromDb,
    createProject,
  };
});
