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
  }

  async function updateCoverTemplate(template: CoverTemplate) {
    const index = userTemplates.value.findIndex(t => t.id === template.id);
    if (index !== -1) {
      userTemplates.value[index] = { ...template, updatedAt: new Date().toISOString() };
      await dbSaveCoverTemplate(userTemplates.value[index]);
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
