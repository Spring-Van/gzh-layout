import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CoverTemplate } from '../types';
import { dbGetAllCoverTemplates, dbSaveCoverTemplate, dbDeleteCoverTemplate } from '../api/native';

export const useCoverTemplateStore = defineStore('coverTemplate', () => {
  const userTemplates = ref<CoverTemplate[]>([]);
  const isLoading = ref(false);
  const showEditor = ref(false);
  const editingTemplate = ref<CoverTemplate | null>(null);

  const coverTemplates = computed(() => userTemplates.value);
  const hasCoverTemplates = computed(() => coverTemplates.value.length > 0);

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
    if (template.isDefault) {
      await clearOtherDefaults(template.id);
    }
  }

  async function updateCoverTemplate(template: CoverTemplate) {
    const updatedTemplate = { ...template, updatedAt: new Date().toISOString() };
    const index = userTemplates.value.findIndex(t => t.id === template.id);
    if (index !== -1) {
      userTemplates.value[index] = updatedTemplate;
    } else {
      userTemplates.value.push(updatedTemplate);
    }
    await dbSaveCoverTemplate(updatedTemplate);
    if (template.isDefault) {
      await clearOtherDefaults(template.id);
    }
  }

  async function clearOtherDefaults(currentTemplateId: string) {
    for (const t of userTemplates.value) {
      if (t.id !== currentTemplateId && t.isDefault) {
        t.isDefault = false;
        await dbSaveCoverTemplate(t);
      }
    }
  }

  async function deleteCoverTemplate(templateId: string) {
    userTemplates.value = userTemplates.value.filter(t => t.id !== templateId);
    try {
      await dbDeleteCoverTemplate(templateId);
    } catch (error) {
      console.error('删除封面模板失败:', error);
    }
  }

  function openEditor(template?: CoverTemplate) {
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
    loadCoverTemplates,
    addCoverTemplate,
    updateCoverTemplate,
    deleteCoverTemplate,
    openEditor,
    closeEditor,
    saveCoverTemplateToStore,
  };
});
