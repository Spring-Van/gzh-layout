import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { StyleTemplate } from '../types';
import { dbGetAllStyleTemplates, dbSaveStyleTemplate, dbDeleteStyleTemplate } from '../api/native';

const BUILT_IN_TEMPLATES: Omit<StyleTemplate, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'hot-title',
    name: '热门推荐',
    description: 'HOT 热门推荐标题',
    html: '<section style="text-align:center;margin:16px 0;"><p style="font-size:28px;font-weight:bold;color:#7CB342;margin:0;font-style:italic;">HOT</p><p style="font-size:18px;font-weight:bold;color:#333;margin:4px 0 0 0;letter-spacing:4px;">热门推荐</p></section>',
  },
  {
    id: 'follow-us',
    name: '关注我们',
    description: '引导关注样式',
    html: '<section style="text-align:center;margin:20px 0;"><p style="margin:0 0 12px 0;"><span style="display:inline-block;border:2px solid #C8A96E;border-radius:8px;padding:6px 14px;margin:0 4px;color:#C8A96E;font-size:16px;font-weight:bold;">关</span><span style="display:inline-block;border:2px solid #7CB342;border-radius:8px;padding:6px 14px;margin:0 4px;color:#7CB342;font-size:16px;font-weight:bold;">注</span><span style="display:inline-block;border:2px solid #5C9BD1;border-radius:8px;padding:6px 14px;margin:0 4px;color:#5C9BD1;font-size:16px;font-weight:bold;">我</span><span style="display:inline-block;border:2px solid #D47C7C;border-radius:8px;padding:6px 14px;margin:0 4px;color:#D47C7C;font-size:16px;font-weight:bold;">们</span></p></section>',
  },
  {
    id: 'divider-line',
    name: '分隔线',
    description: '简约分隔线',
    html: '<section style="text-align:center;margin:16px 0;"><div style="width:60px;height:2px;background:#ddd;margin:0 auto;"></div></section>',
  },
  {
    id: 'daily-share',
    name: '每日分享',
    description: '每日分享标题',
    html: '<section style="text-align:center;margin:16px 0;"><p style="font-size:20px;font-weight:bold;color:#576b95;margin:0;letter-spacing:2px;">每日分享</p><p style="font-size:12px;color:#999;margin:6px 0 0 0;">DAILY SHARE</p></section>',
  },
  {
    id: 'tips-box',
    name: '提示框',
    description: '温馨提示框',
    html: '<section style="margin:16px 0;padding:12px 16px;background:#f8f9fa;border-left:4px solid #7CB342;border-radius:4px;"><p style="margin:0;font-size:14px;color:#555;line-height:1.6;">温馨提示：点击上方图片即可保存到手机相册</p></section>',
  },
];

const MIGRATION_KEY = 'style-templates-migrated-v1';

export const useStyleTemplateStore = defineStore('styleTemplate', () => {
  const templates = ref<StyleTemplate[]>([]);
  const isLoading = ref(false);
  const isLoaded = ref(false);

  const allTemplates = computed(() => templates.value);

  async function loadCustomTemplates() {
    if (isLoaded.value) return;
    isLoading.value = true;
    try {
      const stored = await dbGetAllStyleTemplates();
      if (stored.length === 0 && !localStorage.getItem(MIGRATION_KEY)) {
        const now = new Date().toISOString();
        for (const t of BUILT_IN_TEMPLATES) {
          const full: StyleTemplate = { ...t, createdAt: now, updatedAt: now };
          await dbSaveStyleTemplate(full);
          templates.value.push(full);
        }
        localStorage.setItem(MIGRATION_KEY, '1');
      } else {
        templates.value = stored;
        if (!localStorage.getItem(MIGRATION_KEY)) {
          localStorage.setItem(MIGRATION_KEY, '1');
        }
      }
      isLoaded.value = true;
    } catch (error) {
      console.error('加载样式模板失败:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function addCustomTemplate(template: Omit<StyleTemplate, 'id' | 'createdAt' | 'updatedAt'>) {
    const newTemplate: StyleTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    templates.value.push(newTemplate);
    try {
      await dbSaveStyleTemplate(newTemplate);
    } catch (error) {
      console.error('保存样式模板失败:', error);
    }
    return newTemplate;
  }

  async function removeCustomTemplate(id: string) {
    templates.value = templates.value.filter((t) => t.id !== id);
    try {
      await dbDeleteStyleTemplate(id);
    } catch (error) {
      console.error('删除样式模板失败:', error);
    }
  }

  async function updateCustomTemplate(id: string, data: Partial<Omit<StyleTemplate, 'id' | 'createdAt' | 'updatedAt'>>) {
    const idx = templates.value.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const updated: StyleTemplate = {
        ...templates.value[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      templates.value[idx] = updated;
      try {
        await dbSaveStyleTemplate(updated);
      } catch (error) {
        console.error('更新样式模板失败:', error);
      }
    }
  }

  function getTemplateById(id: string): StyleTemplate | undefined {
    return templates.value.find((t) => t.id === id);
  }

  return {
    templates,
    allTemplates,
    isLoading,
    isLoaded,
    loadCustomTemplates,
    addCustomTemplate,
    removeCustomTemplate,
    updateCustomTemplate,
    getTemplateById,
  };
});
