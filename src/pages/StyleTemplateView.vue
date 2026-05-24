<template>
  <section class="w-full h-full flex flex-col bg-slate-50">
    <header class="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-3">
        <button
          class="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          @click="$router.back()"
        >
          <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 class="text-lg font-bold text-slate-800">样式模板</h1>
          <p class="text-xs text-slate-500 mt-0.5">管理正文编辑用的样式模板，支持增删改查</p>
        </div>
      </div>
      <button
        class="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
        @click="openCreateDialog"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        新建样式
      </button>
    </header>

    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="styleTemplateStore.allTemplates.length === 0" class="text-center py-12 text-slate-400">
        <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
        <p class="text-sm">暂无样式模板</p>
        <p class="text-xs mt-1">点击右上角「新建样式」创建</p>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="tpl in styleTemplateStore.allTemplates"
          :key="tpl.id"
          class="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group"
        >
          <div class="p-4 border-b border-slate-100">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-slate-800 text-sm">{{ tpl.name }}</h3>
                <p class="text-xs text-slate-400 mt-0.5">{{ tpl.description }}</p>
              </div>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  class="p-1.5 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                  title="编辑"
                  @click="openEditDialog(tpl)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button
                  class="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  title="删除"
                  @click="handleDelete(tpl)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div class="p-4 bg-slate-50/50">
            <div class="p-3 bg-white rounded-lg border border-slate-100" v-html="tpl.html"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <Teleport to="body">
      <div
        v-if="showDialog"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center"
        @click.self="showDialog = false"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[85vh] flex flex-col overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 class="font-bold text-slate-800">{{ isEditing ? '编辑样式' : '新建样式' }}</h3>
            <button class="text-slate-400 hover:text-slate-600" @click="showDialog = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">名称</label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="例如：热门推荐"
                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">描述</label>
              <input
                v-model="formData.description"
                type="text"
                placeholder="例如：HOT 热门推荐标题"
                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">HTML 代码</label>
              <textarea
                v-model="formData.html"
                rows="8"
                placeholder="输入 HTML 样式代码..."
                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">预览</label>
              <div class="p-4 bg-white rounded-lg border border-slate-200 min-h-[60px]">
                <div v-if="formData.html" v-html="formData.html"></div>
                <p v-else class="text-slate-300 text-sm text-center">输入 HTML 后显示预览</p>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              @click="showDialog = false"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              :disabled="!formData.name.trim() || !formData.html.trim()"
              @click="handleSave"
            >
              {{ isEditing ? '保存修改' : '创建样式' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useStyleTemplateStore } from '../stores/styleTemplate';
import type { StyleTemplate } from '../types';

const styleTemplateStore = useStyleTemplateStore();

const showDialog = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const formData = reactive({
  name: '',
  description: '',
  html: '',
});

function resetForm() {
  formData.name = '';
  formData.description = '';
  formData.html = '';
  isEditing.value = false;
  editingId.value = null;
}

function openCreateDialog() {
  resetForm();
  showDialog.value = true;
}

function openEditDialog(tpl: StyleTemplate) {
  formData.name = tpl.name;
  formData.description = tpl.description || '';
  formData.html = tpl.html;
  isEditing.value = true;
  editingId.value = tpl.id;
  showDialog.value = true;
}

function handleSave() {
  if (!formData.name.trim() || !formData.html.trim()) return;

  if (isEditing.value && editingId.value) {
    styleTemplateStore.updateCustomTemplate(editingId.value, {
      name: formData.name.trim(),
      description: formData.description.trim(),
      html: formData.html.trim(),
    });
  } else {
    styleTemplateStore.addCustomTemplate({
      name: formData.name.trim(),
      description: formData.description.trim(),
      html: formData.html.trim(),
    });
  }

  showDialog.value = false;
  resetForm();
}

function handleDelete(tpl: StyleTemplate) {
  if (confirm(`确定删除「${tpl.name}」吗？`)) {
    styleTemplateStore.removeCustomTemplate(tpl.id);
  }
}
</script>
