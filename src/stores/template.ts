import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CustomTemplate } from '../types';
import { dbGetAllTemplates, dbSaveTemplate, dbDeleteTemplate } from '../api/native';

export const useTemplateStore = defineStore('template', () => {
  // 自定义模板列表
  const customTemplates = ref<CustomTemplate[]>([]);
  const currentTemplateId = ref<string>('flow');
  const showEditor = ref(false);
  const isLoading = ref(false);

  // 计算属性
  const hasCustomTemplates = computed(() => customTemplates.value.length > 0);

  // Actions
  async function loadTemplates() {
    isLoading.value = true;
    try {
      const templates = await dbGetAllTemplates();
      customTemplates.value = templates;
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function addTemplate(template: CustomTemplate) {
    customTemplates.value.push(template);
    await saveTemplateToDb(template);
    if (template.isDefault) {
      await clearOtherDefaults(template.id);
    }
  }

  async function updateTemplate(template: CustomTemplate) {
    const updatedTemplate = { ...template, updatedAt: new Date().toISOString() };
    const index = customTemplates.value.findIndex(t => t.id === template.id);
    if (index !== -1) {
      customTemplates.value[index] = updatedTemplate;
    } else {
      customTemplates.value.push(updatedTemplate);
    }
    await saveTemplateToDb(updatedTemplate);
    if (template.isDefault) {
      await clearOtherDefaults(template.id);
    }
  }

  async function clearOtherDefaults(currentTemplateId: string) {
    for (const t of customTemplates.value) {
      if (t.id !== currentTemplateId && t.isDefault) {
        t.isDefault = false;
        await saveTemplateToDb(t);
      }
    }
  }

  async function deleteTemplate(templateId: string) {
    customTemplates.value = customTemplates.value.filter(t => t.id !== templateId);
    try {
      await dbDeleteTemplate(templateId);
    } catch (error) {
      console.error('删除模板失败:', error);
    }
  }

  async function saveTemplateToDb(template: CustomTemplate) {
    try {
      await dbSaveTemplate(template);
    } catch (error) {
      console.error('保存模板失败:', error);
    }
  }

  function setCurrentTemplateId(id: string) {
    currentTemplateId.value = id;
  }

  function toggleEditor() {
    showEditor.value = !showEditor.value;
  }

  function openEditor() {
    showEditor.value = true;
  }

  function closeEditor() {
    showEditor.value = false;
  }

  return {
    // State
    customTemplates,
    currentTemplateId,
    showEditor,
    isLoading,

    // Computed
    hasCustomTemplates,

    // Actions
    addTemplate,
    updateTemplate,
    deleteTemplate,
    setCurrentTemplateId,
    toggleEditor,
    openEditor,
    closeEditor,
    loadTemplates,
  };
});
