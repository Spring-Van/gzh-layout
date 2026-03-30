import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CoverTemplate } from '../types';
import { dbGetAllCoverTemplates, dbSaveCoverTemplate, dbDeleteCoverTemplate } from '../api/native';

const builtInTemplates: CoverTemplate[] = [
  {
    id: 'built-in-wallpaper',
    name: '壁纸展示',
    description: '适合展示多张壁纸的封面模板',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    html: `
      <div style="width: 100%; height: 100%; display: flex; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; box-sizing: border-box;">
        <div style="flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 10px;">
          <img src="https://via.placeholder.com/200x300" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);" />
          <img src="https://via.placeholder.com/200x300" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);" />
          <img src="https://via.placeholder.com/200x300" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);" />
          <img src="https://via.placeholder.com/200x300" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);" />
          <img src="https://via.placeholder.com/200x300" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);" />
          <img src="https://via.placeholder.com/200x300" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);" />
        </div>
        <div style="flex: 0 0 160px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 10px;">
          <div style="color: white; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; margin-bottom: 8px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">精选壁纸</div>
            <div style="font-size: 14px; opacity: 0.9;">每日更新</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'built-in-avatar',
    name: '头像展示',
    description: '适合展示多张头像的封面模板',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    html: `
      <div style="width: 100%; height: 100%; display: flex; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 20px; box-sizing: border-box;">
        <div style="flex: 0 0 160px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 10px;">
          <div style="color: #333; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; margin-bottom: 8px;">精选头像</div>
            <div style="font-size: 14px; opacity: 0.8;">情侣/闺蜜/个性</div>
          </div>
        </div>
        <div style="flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; padding: 10px; align-items: center; justify-items: center;">
          <img src="https://via.placeholder.com/150x150" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2);" />
          <img src="https://via.placeholder.com/150x150" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2);" />
          <img src="https://via.placeholder.com/150x150" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2);" />
          <img src="https://via.placeholder.com/150x150" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2);" />
        </div>
      </div>
    `
  }
];

export const useCoverTemplateStore = defineStore('coverTemplate', () => {
  const userTemplates = ref<CoverTemplate[]>([]);
  const isLoading = ref(false);
  const showEditor = ref(false);
  const editingTemplate = ref<CoverTemplate | null>(null);

  const coverTemplates = computed(() => [...builtInTemplates, ...userTemplates.value]);
  const hasCoverTemplates = computed(() => coverTemplates.value.length > 0);
  const isBuiltInTemplate = (templateId: string) => builtInTemplates.some(t => t.id === templateId);

  async function loadCoverTemplates() {
    isLoading.value = true;
    try {
      const templates = await dbGetAllCoverTemplates();
      userTemplates.value = templates;
    } catch (error) {
      console.error('加载封面模板失败:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function addCoverTemplate(template: CoverTemplate) {
    userTemplates.value.push(template);
    await dbSaveCoverTemplate(template);
  }

  async function updateCoverTemplate(template: CoverTemplate) {
    if (isBuiltInTemplate(template.id)) {
      console.warn('不能编辑内置模板');
      return;
    }
    const index = userTemplates.value.findIndex(t => t.id === template.id);
    if (index !== -1) {
      userTemplates.value[index] = { ...template, updatedAt: new Date().toISOString() };
      await dbSaveCoverTemplate(userTemplates.value[index]);
    }
  }

  async function deleteCoverTemplate(templateId: string) {
    if (isBuiltInTemplate(templateId)) {
      console.warn('不能删除内置模板');
      return;
    }
    userTemplates.value = userTemplates.value.filter(t => t.id !== templateId);
    try {
      await dbDeleteCoverTemplate(templateId);
    } catch (error) {
      console.error('删除封面模板失败:', error);
    }
  }

  function openEditor(template?: CoverTemplate) {
    if (template && isBuiltInTemplate(template.id)) {
      console.warn('不能编辑内置模板');
      return;
    }
    if (template) {
      editingTemplate.value = { ...template };
    } else {
      editingTemplate.value = null;
    }
    showEditor.value = true;
  }

  function closeEditor() {
    showEditor.value = false;
    editingTemplate.value = null;
  }

  function saveCoverTemplateToStore(template: CoverTemplate) {
    if (editingTemplate.value) {
      updateCoverTemplate(template);
    } else {
      addCoverTemplate(template);
    }
    closeEditor();
  }

  return {
    coverTemplates,
    isLoading,
    showEditor,
    editingTemplate,
    hasCoverTemplates,
    isBuiltInTemplate,
    loadCoverTemplates,
    addCoverTemplate,
    updateCoverTemplate,
    deleteCoverTemplate,
    openEditor,
    closeEditor,
    saveCoverTemplateToStore,
  };
});
